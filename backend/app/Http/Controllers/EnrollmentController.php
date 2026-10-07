<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\User;
use App\Support\AcademicEnrollment;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;

class EnrollmentController extends ApiController
{
    public function forStudent(Request $request, string $id): array
    {
        $student = $this->ownOrStaff($request, $id, 'students.view', 'enrollment.manage');
        $enrollment = Rules::enrollmentFor($student->user_id);
        $assessment = Rules::assessmentFor($student->user_id);
        return [
            'enrollment' => $enrollment ? Resources::enrollment($enrollment) : null,
            'assessment' => $assessment ? Resources::assessment($assessment) : null,
            'term' => Rules::currentTerm(), 'subjects' => Rules::enrollmentSubjects($enrollment),
            'totalUnits' => Rules::enrollmentUnits($enrollment), 'enrollmentOpen' => Rules::settings()->enrollment_open,
            'canSubmit' => $student->status === 'Active' && Rules::settings()->enrollment_open && $enrollment?->status !== 'Enrolled' && Rules::enrollmentUnits($enrollment) > 0 && ! Rules::missingClearances($student->user_id, Rules::OFFICES), 'pendingOffices' => Rules::missingClearances($student->user_id, Rules::OFFICES),
        ];
    }

    /** Includes students without an enrollment row; manual approval is no longer required. */
    public function index(Request $request): \Illuminate\Support\Collection
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
