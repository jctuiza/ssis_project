<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\Enrollment;
use App\Models\EnrollmentSubject;
use App\Models\Subject;
use App\Models\User;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnrollmentController extends ApiController
{
    // GET /api/enrollment/student/{id}
    public function forStudent(Request $request, string $id)
    {
        $student = $this->ownOrStaff($request, $id, 'students.view', 'enrollment.manage');
        $enrollment = Rules::enrollmentFor($student->user_id);
        $open = Rules::settings()->enrollment_open;
        $subjects = collect(Rules::subjectCodesOf($enrollment))->map(fn ($code) => Subject::find($code))->filter()
            ->map(fn ($s) => ['code' => $s->subject_code, 'name' => $s->name, 'units' => $s->units, 'schedule' => $s->schedule])->values();

        return [
            'enrollment' => $enrollment ? Resources::enrollment($enrollment) : null,
            'subjects' => $subjects,
            'totalUnits' => $enrollment ? Rules::enrollmentUnits($enrollment) : 0,
            'enrollmentOpen' => $open,
            'canSubmit' => $open && (! $enrollment || in_array($enrollment->status, ['Not Enrolled', 'Rejected'], true)),
        ];
    }

    // GET /api/enrollment
    public function index(Request $request)
    {
        $this->need($request, 'enrollment.manage');

        return Enrollment::orderBy('enrollment_id')->get()->map(fn ($e) => Resources::enrollment($e));
    }

    // POST /api/enrollment   (student requests enrollment for the current term)
    public function submit(Request $request)
    {
        $user = $request->user();
        if (! $user->isStudent()) {
            throw new ApiError('Only students can submit an enrollment request.', 403);
        }
        if ($user->status !== 'Active') {
            throw new ApiError('Your account is inactive. Please contact the registrar.', 403);
        }
        if (! Rules::settings()->enrollment_open) {
            throw new ApiError('Enrollment is currently closed.');
        }
        $existing = Rules::enrollmentFor($user->user_id);
        if ($existing && ! in_array($existing->status, ['Not Enrolled', 'Rejected'], true)) {
            throw new ApiError('Your enrollment is already '.strtolower($existing->status).'.');
        }

        $row = DB::transaction(function () use ($user, $existing) {
            $fresh = ['status' => 'Pending', 'submitted_at' => now(), 'reviewed_by' => null, 'reviewed_at' => null, 'remarks' => ''];
            if ($existing) {
                $existing->update($fresh);
                $row = $existing;
                EnrollmentSubject::where('enrollment_id', $row->enrollment_id)->delete();
            } else {
                $row = Enrollment::create(['student_id' => $user->user_id, 'term' => Rules::currentTerm()] + $fresh);
            }
            foreach (Rules::offeredSubjects($user->department_id) as $s) {
                EnrollmentSubject::create(['enrollment_id' => $row->enrollment_id, 'subject_code' => $s->subject_code]);
            }

            return $row;
        });

        Rules::notify('registrar', "{$user->name} submitted an enrollment request.", page: 'enrollment');
        Rules::notify('student', 'Your enrollment request was submitted and is waiting for the Registrar.', $user->user_id, page: 'enrollment');
        $this->log($request, 'Submitted enrollment request for '.Rules::currentTerm(), 'enrollment', $row->enrollment_id);

        return Resources::enrollment($row->fresh());
    }

    // PATCH /api/enrollment/{id}   { status }   Registrar approves or rejects
    public function updateStatus(Request $request, int $id)
    {
        $actor = $this->need($request, 'enrollment.manage');
        $row = Enrollment::find($id) ?? throw new ApiError('Enrollment record not found.', 404);
        $status = (string) $request->input('status');
        if ($row->status !== 'Pending') {
            throw new ApiError('Only pending enrollment requests can be reviewed.');
        }
        if (! in_array($status, ['Enrolled', 'Rejected'], true)) {
            throw new ApiError('Invalid enrollment status.');
        }

        $student = User::findOrFail($row->student_id);
        DB::transaction(function () use ($row, $status, $actor, $student) {
            $row->update(['status' => $status, 'reviewed_by' => $actor->user_id, 'reviewed_at' => now()]);
            Rules::notify('student', "Your enrollment for {$row->term} was ".($status === 'Enrolled' ? 'approved' : 'rejected').'.', $student->user_id, page: 'enrollment');
            if ($status === 'Enrolled') {
                Rules::ensureAssessment($student);
                Rules::syncCashierClearance($student->user_id, by: $actor);
            }
            Rules::logActivity($actor, ($status === 'Enrolled' ? 'Approved' : 'Rejected')." enrollment for {$student->name}", 'enrollment', $row->enrollment_id);
        });

        return Resources::enrollment($row->fresh());
    }
}
