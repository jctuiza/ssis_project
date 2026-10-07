<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\Announcement;
use App\Models\Clearance;
use App\Models\Department;
use App\Models\DocumentRequest;
use App\Models\Enrollment;
use App\Models\EnrollmentSubject;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\Transaction;
use App\Models\User;
use App\Support\Check;
use App\Support\Fmt;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentController extends ApiController
{
    // GET /api/students?department_id=
    public function index(Request $request)
    {
        $user = $this->need($request, 'students.view');
        $dept = $this->scopeDepartment($user, $request->query('department_id'));

        return User::with('role')->whereHas('role', fn ($q) => $q->where('key', 'student'))
            ->when($dept, fn ($q) => $q->where('department_id', $dept))
            ->orderBy('username')->get()->map(fn ($u) => Resources::user($u));
    }

    // GET /api/students/{id}/dashboard   (the Student Homepage)
    public function dashboard(Request $request, string $id)
    {
        $student = $this->ownOrStaff($request, $id, 'students.view');
        $clearances = Clearance::where('term', Rules::currentTerm())->where('student_id', $student->user_id)->get();
        $assessment = Rules::assessmentFor($student->user_id);
        $requests = DocumentRequest::where('student_id', $student->user_id)->orderByDesc('created_at')->orderByDesc('document_request_id')->get();

        return [
            'student' => Resources::user($student),
            'term' => Rules::currentTerm(),
            'clearance' => ['cleared' => $clearances->where('status', 'Cleared')->count(), 'total' => $clearances->count()],
            'balance' => $assessment ? Rules::balanceOf($assessment) : 0,
            'payment' => $assessment ? Resources::assessment($assessment) + ['pendingAmount' => Rules::pendingPayments($assessment->assessment_id)] : null,
            'pendingRequests' => $requests->whereNotIn('status', ['Completed', 'Rejected'])->count(),
            'awaitingPayment' => $requests->where('status', 'Pending Payment')->count(),
            'requests' => $requests->take(4)->map(fn ($r) => Resources::document($r))->values(),
            'transactions' => Transaction::where('student_id', $student->user_id)->orderByDesc('created_at')->orderByDesc('transaction_id')->limit(4)->get()->map(fn ($t) => Resources::transaction($t)),
            'notifications' => Rules::feedFor($student, 5),
            'announcements' => Announcement::orderByDesc('created_at')->orderByDesc('announcement_id')->limit(5)->get()
                ->map(fn ($a) => ['id' => $a->announcement_id, 'title' => $a->title, 'body' => $a->body, 'date' => Fmt::date($a->created_at)]),
        ];
    }

    // GET /api/students/{id}/id-card   (the photo comes from the signed-in user's profile picture)
    public function idCard(Request $request, string $id)
    {
        $u = $this->ownOrStaff($request, $id, 'students.view');
        $p = StudentProfile::where('user_id', $u->user_id)->first();

        return [
            'id' => $u->username, 'name' => $u->name, 'program' => $p?->program, 'email' => $u->email, 'contact' => $u->contact,
            'term' => Rules::currentTerm(), 'address' => $p?->address, 'birthday' => Fmt::longDate($p?->birthdate),
            'emergencyName' => $p?->emergency_name, 'emergencyContact' => $p?->emergency_contact, 'signature' => $p?->signature ?: $u->name,
        ];
    }

    /** Validates the register/edit form; returns the cleaned values plus the resolved department id. */
    private function clean(array $input, User $actor, ?int $existingUserId = null): array
    {
        $v = [];
        foreach ($input as $key => $value) {
            $v[$key] = is_string($value) ? trim($value) : $value;
        }
        $errors = Check::student($v, requireDepartment: ! $actor->department_id);
        if ($errors) {
            throw new ApiError('Please correct the highlighted fields.', 422, $errors);
        }
        $duplicate = User::whereRaw('LOWER(email) = ?', [strtolower($v['email'])])
            ->when($existingUserId, fn ($q) => $q->where('user_id', '!=', $existingUserId))->exists();
        if ($duplicate) {
            $message = 'That email is already used by another account.';
            throw new ApiError($message, 422, ['email' => $message]);
        }
        $departmentId = $actor->department_id ?: (int) ($v['departmentId'] ?? 0);
        if (! Department::where('department_id', $departmentId)->exists()) {
            throw new ApiError('Choose a department.', 422, ['departmentId' => 'Select a department.']);
        }

        return $v + ['_department' => $departmentId];
    }

    // POST /api/students   Registrar registers a newly enrolled student (student number + temporary password).
    public function store(Request $request)
    {
        $actor = $this->need($request, 'students.manage');
        $v = $this->clean($request->all(), $actor);
        $temporary = $this->temporaryPassword();

        $student = DB::transaction(function () use ($v, $actor, $temporary) {
            $username = Rules::nextStudentNumber();
            $student = User::create([
                'username' => $username, 'email' => $v['email'], 'password' => $temporary, 'name' => $v['name'],
                'role_id' => Role::where('key', 'student')->value('role_id'), 'department_id' => $v['_department'],
                'contact' => $v['contact'], 'status' => 'Active', 'must_change_password' => true,
            ]);
            StudentProfile::create([
                'user_id' => $student->user_id, 'program' => $v['program'], 'year_level' => $v['yearLevel'], 'birthdate' => $v['birthdate'],
                'address' => $v['address'], 'emergency_name' => $v['emergencyName'] ?? '', 'emergency_contact' => $v['emergencyContact'] ?? '',
                'signature' => $v['name'],
            ]);
            $enrollment = Enrollment::create([
                'student_id' => $student->user_id, 'term' => Rules::currentTerm(), 'status' => 'Not Enrolled', 'submitted_at' => now(),
                'reviewed_by' => $actor->user_id, 'reviewed_at' => now(), 'remarks' => 'Registered by the Registrar.',
            ]);
            foreach (Rules::offeredSubjects($v['_department'], $v['program']) as $subject) {
                EnrollmentSubject::create(['enrollment_id' => $enrollment->enrollment_id, 'subject_code' => $subject->subject_code, 'subject_name' => $subject->name, 'units' => $subject->units, 'schedule' => $subject->schedule]);
            }
            foreach (Rules::OFFICES as $office) {
                Clearance::create([
                    'student_id' => $student->user_id, 'term' => Rules::currentTerm(), 'office' => $office, 'status' => $office === 'Registrar' ? 'Cleared' : 'Pending',
                    'remarks' => '', 'updated_by' => $office === 'Registrar' ? $actor->user_id : null,
                ]);
            }
            Rules::ensureAssessment($student);
            Rules::syncCashierClearance($student->user_id, silent: true);
            Rules::notify('department', "New student {$v['name']} ({$username}) was registered in your department.", departmentId: $v['_department'], page: 'students');
            Rules::logActivity($actor, "Registered student {$v['name']} ({$username})", 'student', $username);

            return $student;
        });

        return ['student' => Resources::user($student->load('role')), 'credentials' => ['studentNumber' => $student->username, 'temporaryPassword' => $temporary]];
    }

    // PATCH /api/students/{id}   Registrar edits student information.
    public function update(Request $request, string $id)
    {
        $actor = $this->need($request, 'students.manage');
        $student = $this->studentByUsername($id);
        if ($actor->department_id && $student->department_id !== $actor->department_id) {
            throw new ApiError('This student belongs to another department.', 403);
        }
        $v = $this->clean($request->all(), $actor, $student->user_id);

        DB::transaction(function () use ($student, $v, $actor) {
            $student->update(['name' => $v['name'], 'email' => $v['email'], 'contact' => $v['contact'], 'department_id' => $v['_department']]);
            StudentProfile::where('user_id', $student->user_id)->update([
                'program' => $v['program'], 'year_level' => $v['yearLevel'], 'birthdate' => $v['birthdate'], 'address' => $v['address'],
                'emergency_name' => $v['emergencyName'] ?? '', 'emergency_contact' => $v['emergencyContact'] ?? '', 'signature' => $v['name'],
            ]);
            \App\Support\AcademicEnrollment::prepare($student->fresh());
            Rules::notify('student', 'The Registrar updated your student information.', $student->user_id, page: 'profile');
            Rules::logActivity($actor, "Updated student information of {$v['name']} ({$student->username})", 'student', $student->username);
        });

        return Resources::user($student->fresh('role'));
    }
}
