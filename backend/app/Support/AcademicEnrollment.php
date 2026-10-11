<?php

namespace App\Support;

use App\Exceptions\ApiError;
use App\Models\Clearance;
use App\Models\Enrollment;
use App\Models\EnrollmentRequest;
use App\Models\EnrollmentSubject;
use App\Models\StudentProfile;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AcademicEnrollment
{
    /** Prepare billing and office clearance before enrollment, avoiding a payment/enrollment cycle. */
    public static function prepare(User $student): void
    {
        if (! $student->isStudent() || $student->status !== 'Active') {
            return;
        }
        DB::transaction(function () use ($student) {
            SystemSetting::query()->lockForUpdate()->firstOrFail();
            $student = User::whereKey($student->user_id)->lockForUpdate()->firstOrFail();
            if ($student->status !== 'Active') {
                return;
            }
            $term = Rules::currentTerm();
            $enrollment = Enrollment::firstOrCreate(['student_id' => $student->user_id, 'term' => $term], ['status' => 'Not Enrolled'] + AcademicAssignments::snapshot($student));
            if ($enrollment->assignment_mode !== 'manual' && $enrollment->status !== 'Enrolled') {
                $enrollment->update(AcademicAssignments::snapshot($student));
            }
            $subjects = $enrollment->assignment_mode === 'manual' ? collect() : StudentStanding::availableSubjects($student, $enrollment->year_level, $enrollment->program_snapshot, $term);
            if ($enrollment->status === 'Enrolled') {
                $backlog = StudentStanding::outstanding($student, $term)->pluck('code');
                $subjects = $subjects->filter(fn ($subject) => ! $backlog->contains($subject->subject_code)
                    && ((int) $subject->year_level === (int) $enrollment->year_level
                        || in_array((int) $enrollment->year_level, $subject->shared_year_levels ?? [], true)));
            }
            if ($enrollment->assignment_mode !== 'manual' && $enrollment->status !== 'Enrolled') {
                EnrollmentSubject::where('enrollment_id', $enrollment->enrollment_id)->whereNotIn('subject_code', $subjects->pluck('subject_code'))->delete();
            }
            foreach ($subjects as $subject) {
                $key = ['enrollment_id' => $enrollment->enrollment_id, 'subject_code' => $subject->subject_code];
                $values = ['subject_name' => $subject->name, 'units' => $subject->units, 'schedule' => $subject->schedule];
                if ($enrollment->status === 'Enrolled') {
                    EnrollmentSubject::firstOrCreate($key, $values);
                } else {
                    EnrollmentSubject::updateOrCreate($key, $values);
                }
            }
            if ($enrollment->status === 'Enrolled') {
                Rules::createGradeRows($student, $enrollment);
            }
            foreach (Rules::OFFICES as $office) {
                Clearance::firstOrCreate(['student_id' => $student->user_id, 'office' => $office, 'term' => $term], ['status' => 'Pending', 'remarks' => '']);
            }
            if ($enrollment->assignment_mode === 'manual' && $enrollment->status !== 'Enrolled' && ! self::reviewApproved($enrollment)) {
                return;
            }
            Rules::ensureAssessment($student);
            Rules::syncCashierClearance($student->user_id, silent: true, attemptEnrollment: false);
        });
    }

    /** Lock the student so repeated confirmation requests enroll and notify only once. */
    public static function enrollIfCleared(User $student, bool $confirmed = false): bool
    {
        if (! $confirmed) {
            return false;
        }

        return DB::transaction(function () use ($student) {
            SystemSetting::query()->lockForUpdate()->firstOrFail();
            $fresh = User::whereKey($student->user_id)->lockForUpdate()->firstOrFail();
            if (! $fresh->isStudent() || $fresh->status !== 'Active' || ! Rules::settings()->enrollment_open) {
                return false;
            }
            Clearance::where('student_id', $fresh->user_id)->where('term', Rules::currentTerm())->lockForUpdate()->get();
            $enrollment = Rules::enrollmentFor($fresh->user_id);
            if (! $enrollment || $enrollment->status === 'Enrolled' || Rules::missingClearances($fresh->user_id, Rules::OFFICES)) {
                return false;
            }
            if (! self::canConfirm($fresh, $enrollment)) {
                return false;
            }
            $request = self::reviewRequest($enrollment);
            $available = StudentStanding::availableSubjects($fresh, $enrollment->year_level, $enrollment->program_snapshot, $enrollment->term, returning: $request?->type === 'Returning', lock: true)->keyBy('subject_code');
            if (array_diff(Rules::subjectCodesOf($enrollment), $available->keys()->all())) {
                throw new ApiError('Assigned subjects are no longer available or were already passed. Ask staff to review the subject list again.', 409);
            }
            foreach (Rules::enrollmentSubjects($enrollment) as $assigned) {
                $offered = $available->get($assigned['code']);
                if ((int) $offered->units !== (int) $assigned['units'] || (string) $offered->schedule !== (string) $assigned['schedule']) {
                    throw new ApiError('Subject units or schedule changed after review. Ask staff to review the subject list again.', 409);
                }
            }
            if (! Rules::termParts($enrollment->term) || Rules::enrollmentUnits($enrollment) === 0) {
                return false;
            }
            $enrollment->update(['status' => 'Enrolled', 'submitted_at' => now(), 'reviewed_at' => now(), 'remarks' => 'Enrollment confirmed by the student after completing clearance.']);
            StudentProfile::where('user_id', $fresh->user_id)->whereNull('enrolled_on')->update(['enrolled_on' => now()]);
            Rules::createGradeRows($fresh, $enrollment);
            if ($request?->status === 'Approved') {
                $request->update(['status' => 'Confirmed', 'confirmed_at' => now()]);
            }
            Rules::notify('student', 'Your confirmed enrollment is complete for '.$enrollment->term.'.', $fresh->user_id, page: 'enrollment');
            Rules::notify('registrar', $fresh->name.' confirmed enrollment after completing clearance.', page: 'enrollment');
            Rules::logActivity($fresh, 'Student confirmed enrollment for '.$fresh->name.' after clearance', 'enrollment', $enrollment->enrollment_id);

            return true;
        });
    }

    public static function reviewRequest(Enrollment $enrollment): ?EnrollmentRequest
    {
        $parts = Rules::termParts($enrollment->term);

        return $parts ? EnrollmentRequest::where('student_id', $enrollment->student_id)->where('term_key', implode('|', $parts))->first() : null;
    }

    public static function reviewApproved(Enrollment $enrollment): bool
    {
        return in_array(self::reviewRequest($enrollment)?->status, ['Approved', 'Confirmed'], true);
    }

    public static function canConfirm(User $student, ?Enrollment $enrollment): bool
    {
        if (! $enrollment) {
            return false;
        }
        if ($enrollment->assignment_mode === 'manual') {
            return self::reviewApproved($enrollment) && (self::reviewRequest($enrollment)?->type === 'Returning'
                || in_array(self::reviewRequest($enrollment)?->type, StudentStanding::requestTypes($student), true));
        }

        return StudentStanding::classification($student) === 'Regular';
    }

    public static function syncAll(): int
    {
        $count = 0;
        foreach (User::whereHas('role', fn ($query) => $query->where('key', 'student'))->where('status', 'Active')->lazyById(100, 'user_id') as $student) {
            self::prepare($student);
            $count++;
        }

        return $count;
    }
}
