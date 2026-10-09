<?php

namespace App\Support;

use App\Models\Clearance;
use App\Models\Enrollment;
use App\Models\EnrollmentSubject;
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
            User::whereKey($student->user_id)->lockForUpdate()->firstOrFail();
            $term = Rules::currentTerm();
            $enrollment = Enrollment::firstOrCreate(['student_id' => $student->user_id, 'term' => $term], ['status' => 'Not Enrolled'] + AcademicAssignments::snapshot($student));
            if ($enrollment->status !== 'Enrolled') {
                $enrollment->update(AcademicAssignments::snapshot($student));
            }
            $subjects = Rules::offeredSubjects($student->department_id, $enrollment->program_snapshot, $enrollment->year_level, $term);
            if ($enrollment->status !== 'Enrolled') {
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
            $fresh = User::whereKey($student->user_id)->lockForUpdate()->firstOrFail();
            if (! $fresh->isStudent() || $fresh->status !== 'Active' || ! Rules::settings()->enrollment_open) {
                return false;
            }
            $enrollment = Rules::enrollmentFor($fresh->user_id);
            if (! $enrollment || $enrollment->status === 'Enrolled' || Rules::missingClearances($fresh->user_id, Rules::OFFICES)) {
                return false;
            }
            if (! Rules::termParts($enrollment->term) || Rules::enrollmentUnits($enrollment) === 0) {
                return false;
            }
            $enrollment->update(['status' => 'Enrolled', 'submitted_at' => now(), 'reviewed_at' => now(), 'remarks' => 'Enrollment confirmed by the student after completing clearance.']);
            \App\Models\StudentProfile::where('user_id', $fresh->user_id)->whereNull('enrolled_on')->update(['enrolled_on'=>now()]);
            Rules::createGradeRows($fresh, $enrollment);
            Rules::notify('student', 'Your confirmed enrollment is complete for '.$enrollment->term.'.', $fresh->user_id, page: 'enrollment');
            Rules::notify('registrar', $fresh->name.' confirmed enrollment after completing clearance.', page: 'enrollment');
            Rules::logActivity($fresh, 'Student confirmed enrollment for '.$fresh->name.' after clearance', 'enrollment', $enrollment->enrollment_id);
            return true;
        });
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
