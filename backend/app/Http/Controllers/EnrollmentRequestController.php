<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\Assessment;
use App\Models\Clearance;
use App\Models\Enrollment;
use App\Models\EnrollmentRequest;
use App\Models\EnrollmentSubject;
use App\Models\Grade;
use App\Models\StudentProfile;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\AcademicAssignments;
use App\Support\AcademicEnrollment;
use App\Support\Resources;
use App\Support\Rules;
use App\Support\StudentStanding;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EnrollmentRequestController extends ApiController
{
    private function authorizeStaff(Request $request): User
    {
        $actor = $this->need($request, 'enrollment.manage', 'subjects.manage');
        if (! in_array($actor->role->key, ['registrar', 'department'], true)) {
            throw new ApiError('Only Registrar and assigned Department staff can review enrollment requests.', 403);
        }

        return $actor;
    }

    private function registrar(Request $request): User
    {
        $actor = $this->need($request, 'enrollment.manage');
        if ($actor->role->key !== 'registrar') {
            throw new ApiError('Only the Registrar can finalize enrollment requests.', 403);
        }

        return $actor;
    }

    private function accessible(Request $request, int $id): EnrollmentRequest
    {
        $row = EnrollmentRequest::find($id) ?? throw new ApiError('Enrollment request not found.', 404);
        $actor = $request->user();
        if ($actor->isStudent()) {
            if ($row->student_id !== $actor->user_id) {
                throw new ApiError('You can only view your own enrollment requests.', 403);
            }
        } else {
            $this->authorizeStaff($request);
            if (($actor->role->key === 'department' && $row->department_id !== $actor->department_id) || ! $this->inScope($actor, $row->student_id)) {
                throw new ApiError('This request belongs to another department.', 403);
            }
        }

        return $row;
    }

    private function resource(EnrollmentRequest $row): array
    {
        $student = $row->student;

        return ['id' => $row->id, 'studentId' => $student->username, 'studentName' => $student->name,
            'eligible' => in_array($row->type, StudentStanding::requestTypes($student), true) || ($row->type === 'Returning' && in_array($row->status, ['Approved', 'Confirmed'], true)),
            'classification' => StudentStanding::classification($student), 'eligibleRequestTypes' => StudentStanding::requestTypes($student), 'accountStatus' => $student->status, 'departmentId' => $row->department_id, 'program' => $row->program,
            'yearLevel' => $row->year_level, 'term' => $row->term, 'type' => $row->type, 'status' => $row->status,
            'notes' => $row->notes ?? '', 'subjectCodes' => $row->subject_codes ?? [], 'recommendation' => $row->recommendation ?? '',
            'reviewNotes' => $row->review_notes ?? '', 'submittedAt' => $row->created_at?->toIso8601String(),
            'confirmedAt' => $row->confirmed_at?->toIso8601String(), 'currentTerm' => Rules::termParts($row->term) === Rules::termParts(Rules::currentTerm())];
    }

    public function index(Request $request): array
    {
        $actor = $request->user();
        if (! $actor->isStudent()) {
            $this->authorizeStaff($request);
        }

        return EnrollmentRequest::with('student')->when($actor->isStudent(), fn ($q) => $q->where('student_id', $actor->user_id))
            ->when(! $actor->isStudent() && $actor->department_id, fn ($q) => $q->where('department_id', $actor->department_id))
            ->orderByDesc('id')->get()->map(fn ($row) => $this->resource($row))->all();
    }

    public function store(Request $request): array
    {
        $actor = $request->user();
        $input = $request->validate(['type' => 'required|in:Irregular,Returning', 'notes' => 'required|string|max:2000', 'studentId' => 'sometimes|string|max:50']);
        if ($actor->isStudent()) {
            if (isset($input['studentId']) && $input['studentId'] !== $actor->username) {
                throw new ApiError('You can only request enrollment for yourself.', 403);
            }
            $student = $actor;
        } else {
            $this->registrar($request);
            $student = $this->studentByUsername($input['studentId'] ?? '');
            if (! $this->inScope($actor, $student->user_id)) {
                throw new ApiError('Outside your assigned department.', 403);
            }
        }

        return DB::transaction(function () use ($student, $actor, $input) {
            SystemSetting::query()->lockForUpdate()->firstOrFail();
            $student = User::whereKey($student->user_id)->lockForUpdate()->firstOrFail();
            if (! Rules::settings()->enrollment_open) {
                throw new ApiError('Enrollment is currently closed.', 409);
            }
            if ($student->status !== 'Active' && $input['type'] !== 'Returning') {
                throw new ApiError('Inactive accounts require a returning-student review.', 409);
            }
            $parts = Rules::termParts(Rules::currentTerm());
            $snapshot = AcademicAssignments::snapshot($student);
            if (! $parts || ! $student->department_id || ! $snapshot['year_level'] || ! AcademicAssignments::program($student->department_id, $snapshot['program_snapshot'])) {
                throw new ApiError('The active term and student department, program and year level must be configured.', 422);
            }
            $row = EnrollmentRequest::where('student_id', $student->user_id)->where('term_key', implode('|', $parts))->lockForUpdate()->first();
            if ($row && ! in_array($row->status, ['Returned', 'Rejected'], true)) {
                if ($row->type !== $input['type'] || $row->notes !== $input['notes']) {
                    throw new ApiError('A request already exists for this term. Wait for review or resubmit a returned request.', 409);
                }

                $this->validateEligibility($student, $input['type'], $row);

                return $this->resource($row);
            }
            $enrollment = Enrollment::where('student_id', $student->user_id)->get()->first(fn ($e) => Rules::termParts($e->term) === $parts);
            if ($enrollment?->status === 'Enrolled' || Grade::where('student_id', $student->user_id)->where('academic_year', $parts[0])->where('semester', $parts[1])->exists()) {
                throw new ApiError('This term already has enrollment or academic records. Contact the Registrar for a separate correction.', 409);
            }
            $this->validateEligibility($student, $input['type']);
            $enrollment ??= Enrollment::create(['student_id' => $student->user_id, 'term' => Rules::currentTerm(), 'status' => 'Not Enrolled'] + $snapshot);
            $enrollment->update(['assignment_mode' => 'manual']);
            EnrollmentSubject::where('enrollment_id', $enrollment->enrollment_id)->delete();
            foreach (Rules::OFFICES as $office) {
                Clearance::firstOrCreate(['student_id' => $student->user_id, 'office' => $office, 'term' => Rules::currentTerm()], ['status' => 'Pending', 'remarks' => '']);
            }
            $values = ['department_id' => $student->department_id, 'program' => $snapshot['program_snapshot'], 'year_level' => $snapshot['year_level'],
                'term' => Rules::currentTerm(), 'type' => $input['type'], 'notes' => $input['notes'], 'status' => 'Pending',
                'subject_codes' => [], 'recommendation' => null, 'recommended_by' => null, 'recommended_at' => null,
                'review_notes' => null, 'reviewed_by' => null, 'confirmed_at' => null, 'created_by' => $actor->user_id];
            if ($row) {
                $row->update($values);
            } else {
                $row = EnrollmentRequest::create(['student_id' => $student->user_id, 'term_key' => implode('|', $parts)] + $values);
            }
            Rules::notify('department', $student->name.' submitted an '.$input['type'].' enrollment request.', departmentId: $student->department_id, page: 'enrollment-requests');
            Rules::notify('registrar', $student->name.' requested existing-student enrollment.', page: 'enrollment');
            $this->logActivity($actor, $row, 'Submitted');

            return $this->resource($row->fresh());
        }, 3);
    }

    private function logActivity(User $actor, EnrollmentRequest $row, string $action): void
    {
        Rules::logActivity($actor, $action.' '.$row->type.' request for '.$row->term, 'enrollment_request', $row->id);
    }

    private function validateEligibility(User $student, string $type, ?EnrollmentRequest $row = null): void
    {
        if ($type === 'Returning' && $row && in_array($row->status, ['Approved', 'Confirmed'], true)) {
            return;
        }
        if (! in_array($type, StudentStanding::requestTypes($student), true)) {
            throw new ApiError('This student is not eligible for '.$type.' enrollment. Regular students must use regular enrollment; returning review requires recorded previous attendance and an attendance gap or inactive account.', 422);
        }
    }

    private function validateCurrent(EnrollmentRequest $row, User $student, bool $checkEligibility = true): void
    {
        if (! Rules::settings()->enrollment_open || Rules::termParts($row->term) !== Rules::termParts(Rules::currentTerm())) {
            throw new ApiError('This request is not for the open active term.', 409);
        }
        if ($checkEligibility) {
            $this->validateEligibility($student, $row->type, $row);
        }
        if ($student->department_id !== $row->department_id || $student->profile?->program !== $row->program) {
            throw new ApiError('The student department or program changed. Return the request for a fresh review.', 409);
        }
    }

    private function choices(EnrollmentRequest $row, bool $lock = false): Collection
    {
        return StudentStanding::availableSubjects($row->student, $row->year_level, $row->program, $row->term, returning: $row->type === 'Returning', lock: $lock);
    }

    public function show(Request $request, int $id): array
    {
        $row = $this->accessible($request, $id);
        $student = $row->student;
        $outstanding = StudentStanding::outstanding($student, $row->term)->pluck('code');
        $parts = Rules::termParts($row->term);

        return $this->resource($row) + [
            'subjects' => $this->choices($row)->map(fn ($s) => ['code' => $s->subject_code, 'name' => $s->name, 'units' => $s->units, 'yearLevel' => $s->year_level,
                'semester' => $parts[1], 'academicYear' => $parts[0], 'retake' => $outstanding->contains($s->subject_code)])->all(),
            'records' => Grade::where('student_id', $row->student_id)->orderBy('academic_year')->orderBy('semester')->get()->map(fn ($g) => [
                'code' => $g->course_code, 'subject' => $g->description, 'academicYear' => $g->academic_year, 'semester' => $g->semester,
                'grade' => Resources::finalGrade($g), 'status' => Resources::gradeStatus(Resources::finalGrade($g)),
            ])->all(),
            'assessments' => Assessment::where('student_id', $row->student_id)->get()->map(fn ($a) => ['term' => $a->term, 'balance' => Rules::balanceOf($a)])->all(),
            'pendingOffices' => Rules::missingClearances($student->user_id, array_values(array_diff(Rules::OFFICES, ['Cashier']))),
        ];
    }

    public function recommend(Request $request, int $id): array
    {
        $actor = $this->need($request, 'subjects.manage');
        if ($actor->role->key !== 'department') {
            throw new ApiError('Only the assigned Department can recommend subjects.', 403);
        }
        $original = $this->accessible($request, $id);
        $input = $request->validate(['subjectCodes' => 'required|array|min:1|max:50', 'subjectCodes.*' => 'required|string|max:20|distinct', 'recommendation' => 'required|string|max:2000']);

        return DB::transaction(function () use ($original, $input, $actor) {
            SystemSetting::query()->lockForUpdate()->firstOrFail();
            $student = User::whereKey($original->student_id)->lockForUpdate()->firstOrFail();
            $row = EnrollmentRequest::whereKey($original->id)->lockForUpdate()->firstOrFail();
            $this->validateCurrent($row, $student);
            if (! in_array($row->status, ['Pending', 'Recommended'], true)) {
                throw new ApiError('This request is no longer awaiting Department review.', 409);
            }
            $allowed = $this->choices($row)->pluck('subject_code')->all();
            if (array_diff($input['subjectCodes'], $allowed)) {
                throw new ApiError('Choose only unpassed subjects in the student program and active term. Refresh the request.', 422);
            }
            $row->update(['status' => 'Recommended', 'subject_codes' => array_values($input['subjectCodes']), 'recommendation' => $input['recommendation'], 'recommended_by' => $actor->user_id, 'recommended_at' => now()]);
            Rules::notify('registrar', $student->name.' has a Department subject recommendation ready for review.', page: 'enrollment');
            Rules::notify('student', 'Your Department recommended subjects. Awaiting Registrar confirmation.', $student->user_id, page: 'enrollment');
            $this->logActivity($actor, $row, 'Recommended');

            return $this->resource($row->fresh());
        }, 3);
    }

    public function decide(Request $request, int $id): array
    {
        $actor = $this->registrar($request);
        $original = $this->accessible($request, $id);
        $input = $request->validate(['action' => 'required|in:Confirm,Return,Reject', 'yearLevel' => 'required_if:action,Confirm|integer|between:1,5', 'reviewNotes' => 'required|string|max:2000']);

        return DB::transaction(function () use ($original, $input, $actor) {
            SystemSetting::query()->lockForUpdate()->firstOrFail();
            $student = User::with('profile')->whereKey($original->student_id)->lockForUpdate()->firstOrFail();
            $row = EnrollmentRequest::whereKey($original->id)->lockForUpdate()->firstOrFail();
            if (! $this->inScope($actor, $student->user_id)) {
                throw new ApiError('Outside your assigned department.', 403);
            }
            if ($row->status === 'Confirmed' || ($row->status === 'Approved' && $input['action'] === 'Confirm')) {
                if ($input['action'] !== 'Confirm' || (int) $input['yearLevel'] !== (int) $row->year_level || $input['reviewNotes'] !== $row->review_notes) {
                    throw new ApiError('This enrollment was already confirmed with different details.', 409);
                }

                return $this->resource($row);
            }
            if (in_array($row->status, ['Returned', 'Rejected'], true)) {
                throw new ApiError('The student must resubmit this request before another review.', 409);
            }
            if ($input['action'] !== 'Confirm') {
                if ($row->status === 'Approved') {
                    $this->validateCurrent($row, $student, checkEligibility: false);
                    $draft = Rules::enrollmentFor($student->user_id);
                    if (! $draft || $draft->status === 'Enrolled') {
                        throw new ApiError('Enrollment was already finalized. A separate correction is required.', 409);
                    }
                    EnrollmentSubject::where('enrollment_id', $draft->enrollment_id)->delete();
                    Rules::ensureAssessment($student);
                    Rules::syncCashierClearance($student->user_id, silent: true);
                }
                $row->update(['status' => $input['action'] === 'Return' ? 'Returned' : 'Rejected', 'review_notes' => $input['reviewNotes'], 'reviewed_by' => $actor->user_id]);
                if ($row->type === 'Irregular' && StudentStanding::classification($student) === 'Regular'
                    && Rules::termParts($row->term) === Rules::termParts(Rules::currentTerm())) {
                    $draft = Rules::enrollmentFor($student->user_id);
                    if ($draft && $draft->status !== 'Enrolled') {
                        $draft->update(['assignment_mode' => 'automatic']);
                        AcademicEnrollment::prepare($student);
                    }
                }
                Rules::notify('student', 'Your enrollment request was '.$row->status.'. Review the Registrar remarks in Enrollment.', $student->user_id, page: 'enrollment');
                $this->logActivity($actor, $row, $row->status);

                return $this->resource($row->fresh());
            }
            $this->validateCurrent($row, $student);
            if ($row->status !== 'Recommended' || ! $row->subject_codes) {
                throw new ApiError('Department subject recommendation is required before confirmation.', 409);
            }
            if ($student->status !== 'Active' && $row->type !== 'Returning') {
                throw new ApiError('Only a reviewed returning request may reactivate an inactive student.', 409);
            }
            if ($row->type === 'Irregular' && (int) $input['yearLevel'] !== AcademicAssignments::year($student->profile?->year_level)) {
                throw new ApiError('Irregular enrollment uses the official year level. Process promotions through Academic Year Review first.', 422);
            }
            $row->year_level = (int) $input['yearLevel'];
            Clearance::where('student_id', $student->user_id)->where('term', Rules::currentTerm())->lockForUpdate()->get();
            $pending = Rules::missingClearances($student->user_id, array_values(array_diff(Rules::OFFICES, ['Cashier'])));
            if ($pending) {
                throw new ApiError('Complete non-Cashier clearance first: '.implode(', ', $pending).'.', 422);
            }
            $subjects = $this->choices($row, lock: true)->whereIn('subject_code', $row->subject_codes);
            if ($subjects->count() !== count($row->subject_codes)) {
                throw new ApiError('Recommended subjects changed or were already passed. Ask the Department to revise the recommendation.', 409);
            }
            $enrollment = Enrollment::where('student_id', $student->user_id)->get()->first(fn ($e) => Rules::termParts($e->term) === Rules::termParts($row->term));
            if (! $enrollment || $enrollment->status === 'Enrolled') {
                throw new ApiError('Enrollment is missing or was finalized outside this request.', 409);
            }
            $parts = Rules::termParts($row->term);
            if (Grade::where('student_id', $student->user_id)->where('academic_year', $parts[0])->where('semester', $parts[1])->exists()) {
                throw new ApiError('Academic records already exist for this term. A separate correction is required.', 409);
            }
            EnrollmentSubject::where('enrollment_id', $enrollment->enrollment_id)->delete();
            foreach ($subjects as $subject) {
                EnrollmentSubject::create(['enrollment_id' => $enrollment->enrollment_id, 'subject_code' => $subject->subject_code,
                    'subject_name' => $subject->name, 'units' => $subject->units, 'schedule' => $subject->schedule]);
            }
            $enrollment->update(['assignment_mode' => 'manual', 'year_level' => $input['yearLevel'], 'program_snapshot' => $row->program,
                'status' => 'Not Enrolled', 'submitted_at' => null, 'reviewed_at' => now(), 'reviewed_by' => $actor->user_id, 'remarks' => 'Registrar approved '.$row->type.' subjects. Awaiting student confirmation after all clearances.']);
            StudentProfile::whereKey($student->user_id)->update(['year_level' => AcademicAssignments::label($input['yearLevel'])]);
            if ($student->status !== 'Active') {
                $student->update(['status' => 'Active']);
            }
            $assessment = Assessment::where('student_id', $student->user_id)->where('term', $enrollment->term)->lockForUpdate()->first();
            if ($assessment && $assessment->tuition_rate === null) {
                $assessment->update(['tuition_rate' => (float) Rules::settings()->tuition_per_unit]);
            }
            Rules::ensureAssessment($student, $enrollment->term);
            Rules::syncCashierClearance($student->user_id, silent: true, attemptEnrollment: false);
            $row->update(['status' => 'Approved', 'year_level' => $input['yearLevel'], 'review_notes' => $input['reviewNotes'], 'reviewed_by' => $actor->user_id, 'confirmed_at' => null]);
            Rules::notify('student', 'Your '.$row->type.' subjects were approved. Complete all clearances, then confirm enrollment in the Student Portal.', $student->user_id, page: 'enrollment');
            $this->logActivity($actor, $row, 'Approved');

            return $this->resource($row->fresh());
        }, 3);
    }
}
