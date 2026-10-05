<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\Assessment;
use App\Models\Clearance;
use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Models\Enrollment;
use App\Models\EnrollmentSubject;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Subject;
use App\Models\SystemSetting;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Business rules shared by several modules (the same rules the prototype kept in services/rules.js).
 * Paid amounts, balances, payment status, enrollment status and the Cashier clearance are always derived
 * from the rows, never stored twice.
 */
class Rules
{
    public const OFFICES = ['Registrar', 'Cashier', 'Department'];

    private static array $roleIds = [];

    // ---- settings and enrollment --------------------------------------------------------------------
    public static function settings(): SystemSetting
    {
        return SystemSetting::query()->orderBy('setting_id')->firstOrFail();
    }

    public static function currentTerm(): string
    {
        return self::settings()->current_term;
    }

    public static function enrollmentFor(int $studentId): ?Enrollment
    {
        return Enrollment::where('student_id', $studentId)->where('term', self::currentTerm())->first();
    }

    public static function enrollmentStatusOf(int $studentId): string
    {
        return self::enrollmentFor($studentId)?->status ?? 'Not Enrolled';
    }

    public static function subjectCodesOf(?Enrollment $enrollment): array
    {
        return $enrollment
            ? EnrollmentSubject::where('enrollment_id', $enrollment->enrollment_id)->orderBy('enrollment_subject_id')->pluck('subject_code')->all()
            : [];
    }

    public static function enrollmentUnits(?Enrollment $enrollment): int
    {
        $codes = self::subjectCodesOf($enrollment);

        return $codes ? (int) Subject::whereIn('subject_code', $codes)->sum('units') : 0;
    }

    public static function offeredSubjects(?int $departmentId)
    {
        return Subject::query()
            ->where(fn ($q) => $q->whereNull('department_id')->orWhere('department_id', $departmentId))
            ->orderBy('subject_code')->get();
    }

    // ---- billing -------------------------------------------------------------------------------------
    public static function tuitionPaid(int $assessmentId): float
    {
        return (float) Transaction::where('assessment_id', $assessmentId)->where('type', 'tuition')->where('status', 'Paid')->sum('amount');
    }

    public static function assessmentFor(int $studentId): ?Assessment
    {
        return Assessment::where('student_id', $studentId)->where('term', self::currentTerm())->orderByDesc('assessment_id')->first();
    }

    public static function totalOf(Assessment $a): float
    {
        return $a->tuition + $a->misc_fees;
    }

    public static function balanceOf(Assessment $a): float
    {
        return max(0.0, round(self::totalOf($a) - self::tuitionPaid($a->assessment_id), 2));
    }

    public static function paymentStatusOf(Assessment $a): string
    {
        return self::balanceOf($a) <= 0 ? 'Fully Paid' : (self::tuitionPaid($a->assessment_id) > 0 ? 'Partially Paid' : 'Unpaid');
    }

    /** Remaining balance right after a confirmed tuition payment (ledger order = payment time, then id). */
    public static function balanceAfter(Transaction $t): ?float
    {
        if ($t->type !== 'tuition' || $t->status !== 'Paid' || ! $t->assessment_id) {
            return null;
        }
        $a = Assessment::find($t->assessment_id);
        if (! $a) {
            return null;
        }
        $paid = (float) Transaction::where('assessment_id', $a->assessment_id)->where('type', 'tuition')->where('status', 'Paid')
            ->where(fn ($q) => $q->where('paid_at', '<', $t->paid_at)
                ->orWhere(fn ($q2) => $q2->where('paid_at', $t->paid_at)->where('transaction_id', '<=', $t->transaction_id)))
            ->sum('amount');

        return max(0.0, round(self::totalOf($a) - $paid, 2));
    }

    /** REQ-1042 style reference: highest existing number in that series + 1 (series start at $base + 1). */
    public static function nextReference(string $table, string $prefix, int $base): string
    {
        $skip = strlen($prefix) + 2; // "REQ-" is 4 characters, so the number starts at character 5
        $max = (int) DB::table($table)->where('reference_no', 'like', $prefix.'-%')
            ->selectRaw("MAX(CAST(SUBSTRING(reference_no, {$skip}) AS UNSIGNED)) AS m")->value('m');

        return $prefix.'-'.(max($max, $base) + 1);
    }

    public static function recordTuitionPayment(Assessment $a, float $amount, string $description, string $method, ?User $by): Transaction
    {
        return Transaction::create([
            'reference_no' => self::nextReference('transactions', 'TXN', 5000), 'student_id' => $a->student_id,
            'assessment_id' => $a->assessment_id, 'document_request_id' => null, 'type' => 'tuition',
            'description' => $description, 'amount' => $amount, 'method' => $method, 'status' => 'Paid',
            'paid_at' => now(), 'recorded_by' => $by?->user_id,
        ]);
    }

    public static function pendingPayments(int $assessmentId): float
    {
        return (float) Transaction::where('assessment_id', $assessmentId)->where('type', 'tuition')->where('status', 'Pending')->sum('amount');
    }

    public static function paymentDescription(Assessment $a, float $amount): string
    {
        $paid = self::tuitionPaid($a->assessment_id);
        if ($amount >= self::balanceOf($a)) {
            return $paid > 0 ? 'Tuition – final payment' : 'Tuition – full payment';
        }

        return $paid > 0 ? 'Tuition – installment' : 'Tuition – down payment';
    }

    /** New student numbers look like 2026-0001: current year + next free sequence for that year. */
    public static function nextStudentNumber(): string
    {
        $year = now()->year;
        $max = (int) User::where('username', 'like', "{$year}-%")->selectRaw('MAX(CAST(SUBSTRING(username, 6) AS UNSIGNED)) AS m')->value('m');

        return $year.'-'.str_pad((string) ($max + 1), 4, '0', STR_PAD_LEFT);
    }

    public static function ageOf($birthdate): ?int
    {
        return $birthdate ? (int) \Carbon\Carbon::parse($birthdate)->age : null;
    }

    public static function openFeeTransaction(DocumentRequest $r, DocumentType $type): Transaction
    {
        return Transaction::create([
            'reference_no' => self::nextReference('transactions', 'TXN', 5000), 'student_id' => $r->student_id,
            'assessment_id' => null, 'document_request_id' => $r->document_request_id, 'type' => 'document_fee',
            'description' => "Document fee – {$type->name} ({$r->reference_no})", 'amount' => $r->fee_amount,
            'method' => null, 'status' => 'Pending', 'paid_at' => null, 'recorded_by' => null,
        ]);
    }

    public static function documentFeeFor(DocumentRequest $r): ?Transaction
    {
        return Transaction::where('document_request_id', $r->document_request_id)->where('type', 'document_fee')->where('status', '!=', 'Cancelled')->first();
    }

    /** Creates the tuition assessment when an enrollment is approved and none exists yet. */
    public static function ensureAssessment(User $student): ?Assessment
    {
        if (self::assessmentFor($student->user_id)) {
            return null;
        }
        $units = self::enrollmentUnits(self::enrollmentFor($student->user_id));
        $a = Assessment::create(['student_id' => $student->user_id, 'term' => self::currentTerm(), 'tuition' => $units * 1500, 'misc_fees' => 6500]);
        self::notify('cashier', 'New assessment of '.Fmt::peso(self::totalOf($a))." created for {$student->name}.", page: 'assessments');
        self::notify('student', 'Your assessment of '.Fmt::peso(self::totalOf($a)).' is ready. Settle it at the Cashier.', $student->user_id, page: 'payments');

        return $a;
    }

    // ---- clearance -----------------------------------------------------------------------------------
    public static function missingClearances(int $studentId, array $offices): array
    {
        return array_values(array_filter($offices, fn ($office) => Clearance::where('student_id', $studentId)->where('office', $office)->value('status') !== 'Cleared'));
    }

    /** Cashier clearance follows the tuition balance. Call after any payment or assessment change. */
    public static function syncCashierClearance(int $studentId, bool $silent = false, ?User $by = null): void
    {
        $row = Clearance::where('student_id', $studentId)->where('office', 'Cashier')->first();
        if (! $row) {
            return;
        }
        $a = self::assessmentFor($studentId);
        $balance = $a ? self::balanceOf($a) : null;
        $status = $a && $balance <= 0 ? 'Cleared' : 'Pending';
        $remarks = $status === 'Cleared' ? '' : ($a ? 'Remaining tuition balance of '.Fmt::peso($balance).' must be settled.' : 'No assessment has been issued yet.');
        if ($row->status === $status && (string) $row->remarks === $remarks) {
            return;
        }
        $previous = $row->status;
        $row->update(['status' => $status, 'remarks' => $remarks, 'updated_by' => $by?->user_id]);
        if (! $silent && $previous !== $status) {
            self::notify('student', 'Your Cashier clearance is now '.strtolower($status).'.', $studentId, page: 'clearance');
        }
    }

    // ---- notifications and audit trail ----------------------------------------------------------------
    private static function roleId(string $key): ?int
    {
        return self::$roleIds[$key] ??= Role::where('key', $key)->value('role_id');
    }

    /** Address a notification to one user ($userId), a whole role, or one department's staff ($departmentId). */
    public static function notify(string $role, string $message, ?int $userId = null, ?int $departmentId = null, ?string $page = null): void
    {
        $roleId = self::roleId($role);
        if (! $roleId) {
            return;
        }
        Notification::create(['recipient_role_id' => $roleId, 'recipient_id' => $userId, 'department_id' => $departmentId, 'message' => $message, 'page' => $page]);
    }

    public static function logActivity(?User $actor, string $action, ?string $type = null, $id = null): void
    {
        ActivityLog::create(['actor_id' => $actor?->user_id, 'action' => $action, 'entity_type' => $type, 'entity_id' => $id === null ? null : (string) $id]);
    }

    public static function visibleNotifications(User $u)
    {
        return Notification::where('recipient_role_id', $u->role_id)
            ->where(fn ($q) => $q->whereNull('recipient_id')->orWhere('recipient_id', $u->user_id))
            ->where(fn ($q) => $q->whereNull('department_id')->orWhere('department_id', $u->department_id));
    }

    /** Latest notifications for a user: powers the bell and every "Recent activity" panel. */
    public static function feedFor(User $u, int $limit = 6): array
    {
        $rows = self::visibleNotifications($u)->orderByDesc('created_at')->orderByDesc('notification_id')->limit($limit)->get();
        $read = DB::table('notification_reads')->where('user_id', $u->user_id)->whereIn('notification_id', $rows->pluck('notification_id'))->pluck('notification_id')->all();

        return $rows->map(fn ($n) => [
            'id' => $n->notification_id, 'text' => $n->message, 'time' => Fmt::timeAgo($n->created_at),
            'page' => $n->page, 'read' => in_array($n->notification_id, $read, true),
        ])->all();
    }
}
