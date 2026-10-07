<?php

namespace App\Support;

use App\Models\Assessment;
use App\Models\Clearance;
use App\Models\Department;
use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\StudentProfile;
use App\Models\Transaction;
use App\Models\User;

/** Turns database rows into the JSON shapes the React pages consume (names, programs, balances are joined here). */
class Resources
{
    public const PASSING_PERCENT = 75;

    private const SCALE = [[97, 1.0], [94, 1.25], [91, 1.5], [88, 1.75], [85, 2.0], [82, 2.25], [79, 2.5], [76, 2.75], [75, 3.0]];

    private static array $deptCodes = [];

    public static function deptCode(?int $id): string
    {
        return $id ? (self::$deptCodes[$id] ??= Department::where('department_id', $id)->value('code') ?? '—') : '—';
    }

    public static function programOf(int $studentId): string
    {
        return StudentProfile::where('user_id', $studentId)->value('program') ?? '';
    }

    /** 'BS Information Technology' -> 'BSIT' */
    public static function programCode(string $program): string
    {
        $words = preg_split('/\s+/', trim($program));
        $first = array_shift($words) ?? '';

        return $first.implode('', array_map(fn ($w) => mb_substr($w, 0, 1), $words));
    }

    public static function toGradePoint(?float $percent): ?float
    {
        if ($percent === null) {
            return null;
        }
        foreach (self::SCALE as [$min, $point]) {
            if ($percent >= $min) {
                return $point;
            }
        }

        return 5.0;
    }

    /** The final grade exists only when all three periods are posted. */
    public static function finalGrade(Grade $g): ?float
    {
        if ($g->prelim === null || $g->midterm === null || $g->finals === null) {
            return null;
        }

        return round(($g->prelim + $g->midterm + $g->finals) / 3, 2);
    }

    public static function user(User $u): array
    {
        $u->loadMissing('role');
        $base = [
            'id' => $u->username, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role->key, 'roleLabel' => $u->role->label,
            'permissions' => $u->permissionKeys(), 'departmentId' => $u->department_id, 'department' => self::deptCode($u->department_id),
            'contact' => $u->contact, 'status' => $u->status, 'mustChangePassword' => (bool) $u->must_change_password,
        ];
        if (! $u->isStudent()) {
            return $base;
        }
        $p = StudentProfile::where('user_id', $u->user_id)->first();

        return $base + [
            'program' => $p?->program, 'yearLevel' => $p?->year_level, 'enrollmentStatus' => Rules::enrollmentStatusOf($u->user_id),
            'birthdate' => $p?->birthdate?->format('Y-m-d'), 'birthday' => Fmt::longDate($p?->birthdate), 'age' => Rules::ageOf($p?->birthdate),
            'address' => $p?->address, 'emergencyName' => $p?->emergency_name, 'emergencyContact' => $p?->emergency_contact,
        ];
    }

    /** The signed-in user, including the profile picture (kept out of lists because it is large). */
    public static function sessionUser(User $u): array
    {
        return self::user($u) + ['photo' => $u->profile_photo];
    }

    public static function enrollment(Enrollment $e): array
    {
        $s = User::find($e->student_id);
        $profile = StudentProfile::where('user_id', $e->student_id)->first();

        return [
            'id' => $e->enrollment_id, 'studentId' => $s?->username, 'studentName' => $s?->name, 'program' => $profile?->program ?? '',
            'yearLevel' => $profile?->year_level, 'departmentId' => $s?->department_id, 'term' => $e->term, 'status' => $e->status === 'Enrolled' ? 'Enrolled' : 'Not Enrolled',
            'subjects' => Rules::subjectCodesOf($e), 'units' => Rules::enrollmentUnits($e), 'submittedAt' => Fmt::date($e->submitted_at),
        ];
    }

    public static function grade(Grade $g): array
    {
        $final = self::finalGrade($g);
        $s = User::find($g->student_id);

        return [
            'id' => $g->grade_id, 'studentId' => $s?->username, 'studentName' => $s?->name, 'program' => self::programOf($g->student_id), 'departmentId' => $s?->department_id,
            'code' => $g->course_code, 'subject' => $g->description, 'units' => $g->units, 'academicYear' => $g->academic_year,
            'semester' => $g->semester, 'term' => "A.Y. {$g->academic_year}, {$g->semester}", 'prelim' => $g->prelim, 'midterm' => $g->midterm,
            'finals' => $g->finals, 'finalGrade' => $final, 'gradePoint' => self::toGradePoint($final),
        ];
    }

    public static function clearance(Clearance $c): array
    {
        $s = User::find($c->student_id);

        return [
            'id' => $c->clearance_id, 'studentId' => $s?->username, 'studentName' => $s?->name, 'program' => self::programOf($c->student_id),
            'departmentId' => $s?->department_id, 'office' => $c->office, 'status' => $c->status, 'remarks' => $c->remarks ?? '',
            'updatedAt' => Fmt::date($c->updated_at),
        ];
    }

    public static function assessment(Assessment $a): array
    {
        $s = User::find($a->student_id);
        $paid = Rules::tuitionPaid($a->assessment_id);
        $total = Rules::totalOf($a);

        return [
            'id' => $a->assessment_id, 'code' => 'ASM-'.str_pad((string) $a->assessment_id, 4, '0', STR_PAD_LEFT), 'studentId' => $s?->username,
            'studentName' => $s?->name, 'program' => self::programOf($a->student_id), 'departmentId' => $s?->department_id, 'term' => $a->term,
            'tuition' => $a->tuition, 'misc' => $a->misc_fees, 'total' => $total, 'paid' => $paid, 'balance' => max(0.0, round($total - $paid, 2)),
            'status' => Rules::paymentStatusOf($a), 'tuitionPending' => (bool) $a->tuition_pending,
            'paymentCount' => Transaction::where('assessment_id', $a->assessment_id)->where('type', 'tuition')->where('status', 'Paid')->count(),
        ];
    }

    public static function transaction(Transaction $t): array
    {
        $s = User::find($t->student_id);

        return [
            'id' => $t->transaction_id, 'reference' => $t->reference_no, 'studentId' => $s?->username, 'studentName' => $s?->name ?? 'Unknown user',
            'type' => $t->type, 'date' => Fmt::date($t->paid_at ?? $t->created_at), 'description' => $t->description, 'amount' => $t->amount,
            'method' => $t->method ?? '—', 'status' => $t->status, 'balanceAfter' => Rules::balanceAfter($t),
        ];
    }

    public static function documentType(DocumentType $t): array
    {
        return ['id' => $t->document_type_id, 'name' => $t->name, 'fee' => $t->fee, 'processing' => $t->processing_time, 'requiredClearances' => $t->requiredOffices()];
    }

    public static function document(DocumentRequest $r): array
    {
        $type = DocumentType::find($r->document_type_id);
        $s = User::find($r->student_id);

        return [
            'ref' => $r->reference_no, 'studentId' => $s?->username, 'studentName' => $s?->name, 'departmentId' => $s?->department_id,
            'type' => $type?->name, 'date' => Fmt::date($r->created_at), 'status' => $r->status, 'remarks' => $r->remarks ?? '',
            'purpose' => $r->purpose, 'fee' => $r->fee_amount, 'feeStatus' => $r->fee_status, 'processing' => $type?->processing_time ?? '—',
            'prepared' => (bool) $r->prepared,
        ];
    }

    /** A document request as the Cashier sees it: the request plus its fee transaction. */
    public static function documentPayment(DocumentRequest $r): array
    {
        $txn = Rules::documentFeeFor($r);

        return self::document($r) + [
            'program' => self::programOf($r->student_id), 'transactionRef' => $txn?->reference_no ?? '—',
            'paidOn' => $txn?->paid_at ? Fmt::date($txn->paid_at) : '—',
        ];
    }

    public static function log(\App\Models\ActivityLog $l): array
    {
        $actor = $l->actor_id ? User::with('role')->find($l->actor_id) : null;

        return [
            'id' => $l->activity_log_id, 'actor' => $actor?->name ?? 'System', 'role' => $actor?->role->key, 'roleLabel' => $actor ? $actor->role->label : 'System',
            'action' => $l->action, 'time' => Fmt::dateTime($l->created_at), 'createdAt' => $l->created_at?->toIso8601String(),
        ];
    }
}
