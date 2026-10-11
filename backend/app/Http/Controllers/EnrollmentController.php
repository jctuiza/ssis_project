<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\Grade;
use App\Models\User;
use App\Support\AcademicEnrollment;
use App\Support\Resources;
use App\Support\Rules;
use App\Support\StudentStanding;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class EnrollmentController extends ApiController
{
    public function forStudent(Request $request, string $id): array
    {
        $student = $this->ownOrStaff($request, $id, 'students.view', 'enrollment.manage');
        AcademicEnrollment::prepare($student);
        $enrollment = Rules::enrollmentFor($student->user_id);
        $assessment = Rules::assessmentFor($student->user_id);
        $outstanding = StudentStanding::outstanding($student);
        $parts = Rules::termParts($enrollment?->term ?? Rules::currentTerm());
        $attempts = Grade::where('student_id', $student->user_id)->get();

        return [
            'enrollment' => $enrollment ? Resources::enrollment($enrollment) : null,
            'assessment' => $assessment ? Resources::assessment($assessment) : null,
            'term' => Rules::currentTerm(), 'subjects' => Rules::enrollmentSubjects($enrollment)->map(fn ($subject) => $subject + StudentStanding::attemptDetails(new Grade(['student_id' => $student->user_id, 'course_code' => $subject['code'], 'academic_year' => $parts[0], 'semester' => $parts[1]]), $attempts)),
            'totalUnits' => Rules::enrollmentUnits($enrollment), 'enrollmentOpen' => Rules::settings()->enrollment_open,
            'classification' => StudentStanding::classification($student),
            'eligibleRequestTypes' => StudentStanding::requestTypes($student),
            'outstandingSubjects' => $outstanding,
            'availableSubjects' => StudentStanding::availableSubjects($student)->map(fn ($s) => ['code' => $s->subject_code, 'name' => $s->name, 'yearLevel' => $s->year_level, 'units' => $s->units, 'schedule' => $s->schedule, 'retake' => $outstanding->contains('code', $s->subject_code)]),
            'reviewApproved' => $enrollment && AcademicEnrollment::reviewApproved($enrollment),
            'canSubmit' => AcademicEnrollment::canConfirm($student, $enrollment) && $student->status === 'Active' && Rules::settings()->enrollment_open && $enrollment?->status !== 'Enrolled' && Rules::enrollmentUnits($enrollment) > 0 && ! Rules::missingClearances($student->user_id, Rules::OFFICES), 'pendingOffices' => Rules::missingClearances($student->user_id, Rules::OFFICES),
        ];
    }

    /** Includes students without an enrollment row; manual approval is no longer required. */
    public function index(Request $request): Collection
    {
        $this->need($request, 'enrollment.manage');

        return User::whereHas('role', fn ($query) => $query->where('key', 'student'))->with('profile')->orderBy('user_id')->get()->map(function ($student) {
            $row = Rules::enrollmentFor($student->user_id);

            return $row ? Resources::enrollment($row) : [
                'id' => 'student-'.$student->user_id, 'studentId' => $student->username, 'studentName' => $student->name,
                'program' => $student->profile?->program ?? '', 'yearLevel' => $student->profile?->year_level,
                'units' => 0, 'submittedAt' => null, 'term' => Rules::currentTerm(), 'status' => 'Not Enrolled',
            ];
        });
    }

    /** Compatibility endpoint: never bypass the clearance gate. */
    public function submit(Request $request): array
    {
        $student = $request->user();
        if (! $student->isStudent()) {
            throw new ApiError('Only students can access enrollment.', 403);
        }
        AcademicEnrollment::prepare($student);
        if (! AcademicEnrollment::canConfirm($student, Rules::enrollmentFor($student->user_id))) {
            throw new ApiError('This enrollment requires Department subject review and Registrar approval before student confirmation.', 409);
        }
        if ($request->input('confirmed') !== true) {
            throw new ApiError('Please confirm enrollment before proceeding.');
        }
        if (Rules::missingClearances($student->user_id, Rules::OFFICES)) {
            throw new ApiError('Please clear all required clearances before enrolling.');
        }
        if (! Rules::settings()->enrollment_open) {
            throw new ApiError('Enrollment is currently closed.');
        }
        AcademicEnrollment::prepare($student);
        if (Rules::missingClearances($student->user_id, Rules::OFFICES)) {
            throw new ApiError('Please clear all required clearances before enrolling.');
        }
        AcademicEnrollment::enrollIfCleared($student, confirmed: true);
        $row = Rules::enrollmentFor($student->user_id);
        if (! $row || $row->status !== 'Enrolled') {
            throw new ApiError('Enrollment is not ready. Contact the Registrar to check your account and assigned subjects.');
        }

        return Resources::enrollment($row);
    }

    public function updateStatus(Request $request, int $id): array
    {
        $this->need($request, 'enrollment.manage');
        throw new ApiError('Enrollment must be confirmed by the student after completing clearance.', 409);
    }
}
