<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\Assessment;
use App\Models\Clearance;
use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Models\Enrollment;
use App\Models\EnrollmentSubject;
use App\Models\Grade;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Subject;
use App\Models\SystemSetting;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
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
    private const SETTINGS_KEY = 'ssis:settings:attributes:v1';

    private const CACHE_SECONDS = 600; // 10 minutes


    /**
     * The system settings are read on almost every request and change rarely, so they are cached (Redis when CACHE_STORE=redis).
     * The cache is cleared as soon as the Admin saves new settings (see forgetSettings).
     */
    public static function settings(): SystemSetting
    {
        // Cache scalar attributes, not a serialized model: cache.serializable_classes stays false.
        $attributes = Cache::remember(
            self::SETTINGS_KEY,
            self::CACHE_SECONDS,
            fn () => SystemSetting::query()->orderBy('setting_id')->firstOrFail()->getAttributes(),
        );

        return (new SystemSetting)->newFromBuilder($attributes);
    }

    public static function forgetSettings(): void
    {
        Cache::forget(self::SETTINGS_KEY);
        Cache::forget('ssis:settings'); // Remove the legacy serialized-model cache too.
    }

    public static function currentTerm(): string
    {
        return self::settings()->current_term;
    }

    /**
     * Reads the academic year and semester out of the term text, for example
     * '1st Semester, A.Y. 2026-2027' -> ['2026-2027', 'First Semester']. Returns null when the text has no year range or semester.
     */
    public static function termParts(?string $term = null): ?array
    {
        $term ??= self::currentTerm();
        if (! preg_match('/(\d{4})\D{1,3}(\d{4})/u', $term, $years)) {
            return null;
        }
        $semester = preg_match('/\b(2nd|second)\b/i', $term) ? 'Second Semester' : (preg_match('/\b(1st|first)\b/i', $term) ? 'First Semester' : null);

        return $semester ? [$years[1].'-'.$years[2], $semester] : null;
    }

    /**
     * Gives an enrolled student one empty grade row per enrolled subject for the current term, so the Registrar can post grades.
     * Safe to call again: rows that exist are left alone. Returns how many rows were created.
     */
    public static function createGradeRows(User $student, ?Enrollment $enrollment = null): int
    {
        $enrollment ??= self::enrollmentFor($student->user_id);
        if (! $enrollment || $enrollment->status !== 'Enrolled') {
            return 0;
        }
        $parts = self::termParts($enrollment->term);
        if (! $parts) {
            throw new \App\Exceptions\ApiError('The enrollment term must include an academic year and First or Second Semester before grades can be created.');
        }
        [$year, $semester] = $parts;
        $created = 0;
        foreach (self::enrollmentSubjects($enrollment) as $subject) {
            $row = Grade::firstOrCreate(
                ['student_id' => $student->user_id, 'course_code' => $subject['code'], 'academic_year' => $year, 'semester' => $semester],
                ['description' => $subject['name'], 'units' => $subject['units']],
            );
            $created += $row->wasRecentlyCreated ? 1 : 0;
        }

        return $created;
    }

    public static function enrollmentFor(int $studentId): ?Enrollment
    {
        return Enrollment::where('student_id', $studentId)->where('term', self::currentTerm())->first();
    }

    public static function enrollmentStatusOf(int $studentId): string
    {
        return self::enrollmentFor($studentId)?->status === 'Enrolled' ? 'Enrolled' : 'Not Enrolled';
    }

    public static function subjectCodesOf(?Enrollment $enrollment): array
    {
        return $enrollment
            ? EnrollmentSubject::where('enrollment_id', $enrollment->enrollment_id)->orderBy('enrollment_subject_id')->pluck('subject_code')->all()
            : [];
    }

    public static function enrollmentUnits(?Enrollment $enrollment): int
    {
        return (int) self::enrollmentSubjects($enrollment)->sum('units');
    }

    /** Enrollment snapshots keep past units, names and schedules stable after catalog edits. */
    public static function enrollmentSubjects(?Enrollment $enrollment): \Illuminate\Support\Collection
    {
        if (! $enrollment) {
            return collect();
        }
        return EnrollmentSubject::where('enrollment_id', $enrollment->enrollment_id)
            ->orderBy('enrollment_subject_id')->get()->map(fn ($row) => [
                'code' => $row->subject_code, 'name' => $row->subject_name,
                'units' => (int) $row->units, 'schedule' => $row->schedule ?? '',
            ]);
    }

    public static function offeredSubjects(?int $departmentId, ?string $program = null)
    {
        return Subject::query()
            ->where(fn ($q) => $q->whereNull('department_id')->orWhere('department_id', $departmentId))
            ->where(fn ($q) => $q->whereNull('program')->orWhere('program', $program))
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
        return ! $a->tuition_pending && self::balanceOf($a) <= 0 ? 'Fully Paid' : (self::tuitionPaid($a->assessment_id) > 0 ? 'Partially Paid' : 'Unpaid');
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

    /** Issue known fees immediately; finalize provisional tuition once subjects are available. */
    public static function ensureAssessment(User $student): ?Assessment
    {
        $existing = self::assessmentFor($student->user_id);
        $units = self::enrollmentUnits(self::enrollmentFor($student->user_id));
        if ($existing) {
            if ($existing->tuition_pending && $units > 0) {
                $existing->update(['tuition' => $units * $existing->tuition_rate, 'tuition_pending' => false]);
                self::notify('student', 'Your tuition assessment is ready. Your remaining balance is '.Fmt::peso(self::balanceOf($existing)).'.', $student->user_id, page: 'payments');
                self::notify('cashier', "Tuition assessment finalized for {$student->name}.", page: 'assessments');
                return $existing;
            }
            return null;
        }
        $settings = self::settings();
        $perUnit = (float) ($settings->tuition_per_unit ?? 1500);
        $misc = (float) ($settings->misc_fees ?? 6500);
        $a = Assessment::create([
            'student_id' => $student->user_id, 'term' => self::currentTerm(),
            'tuition' => $units * $perUnit, 'misc_fees' => $misc,
            'tuition_pending' => $units === 0, 'tuition_rate' => $perUnit,
        ]);
        $note = $a->tuition_pending ? ' Tuition is awaiting subject assignment.' : '';
        self::notify('cashier', 'New assessment of '.Fmt::peso(self::totalOf($a))." created for {$student->name}.".$note, page: 'assessments');
        self::notify('student', 'Your assessment of '.Fmt::peso(self::totalOf($a)).' is ready. Settle it at the Cashier.'.$note, $student->user_id, page: 'payments');
        return $a;
    }

    // ---- clearance -----------------------------------------------------------------------------------
    public static function missingClearances(int $studentId, array $offices): array
    {
        return array_values(array_filter($offices, fn ($office) => Clearance::where('term', self::currentTerm())->where('student_id', $studentId)->where('office', $office)->value('status') !== 'Cleared'));
    }

    /** Cashier clearance follows the tuition balance. Call after any payment or assessment change. */
    public static function syncCashierClearance(int $studentId, bool $silent = false, ?User $by = null, bool $attemptEnrollment = true): void
    {
        $row = Clearance::where('term', self::currentTerm())->where('student_id', $studentId)->where('office', 'Cashier')->first();
        if (! $row) {
            return;
        }
        $a = self::assessmentFor($studentId);
        $balance = $a ? self::balanceOf($a) : null;
        $status = $a && ! $a->tuition_pending && $balance <= 0 ? 'Cleared' : 'Pending';
        $remarks = $a?->tuition_pending ? 'Tuition is awaiting subject assignment by the Registrar.' : ($status === 'Cleared' ? '' : ($a ? 'Remaining tuition balance of '.Fmt::peso($balance).' must be settled.' : 'No assessment has been issued yet.'));
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
