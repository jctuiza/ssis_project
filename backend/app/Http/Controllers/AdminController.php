<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use App\Support\Check;
use App\Support\Fmt;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;

class AdminController extends ApiController
{
    // The system has exactly one Admin account (created by the seeder). Roles are predefined by the system.
    private const SINGLE_ADMIN = 'The system has only one Admin account. Admin accounts cannot be created or assigned.';

    private const FIX_FIELDS = 'Please correct the highlighted fields.';

    private function fieldError(string $key, string $message): ApiError
    {
        return new ApiError($message, 422, [$key => $message]);
    }

    // ---- users and passwords --------------------------------------------------------------------------
    // GET /api/users
    public function users(Request $request)
    {
        $this->need($request, 'users.manage');

        return User::with('role')->orderBy('user_id')->get()->map(fn ($u) => Resources::user($u));
    }

    // POST /api/users   Admin creates a staff account (Registrar, Cashier or Department).
    public function createUser(Request $request)
    {
        $admin = $this->need($request, 'users.manage');
        $in = $request->all();
        $errors = Check::staff($in);
        $username = strtolower(trim((string) ($in['username'] ?? '')));
        $email = trim((string) ($in['email'] ?? ''));

        if (! isset($errors['username']) && User::where('username', $username)->exists()) {
            $errors['username'] = 'That username is already taken.';
        }
        if (! isset($errors['email']) && User::whereRaw('LOWER(email) = ?', [strtolower($email)])->exists()) {
            $errors['email'] = 'That email is already used by another account.';
        }
        $role = null;
        if (! isset($errors['role'])) {
            if (($in['role'] ?? '') === 'admin') {
                $errors['role'] = self::SINGLE_ADMIN;
            } else {
                $role = Role::where('key', $in['role'])->first();
                if (! $role || $role->key === 'student') {
                    $errors['role'] = 'Select a staff role.';
                }
            }
        }
        $dept = ! empty($in['departmentId']) ? (int) $in['departmentId'] : null;
        if ($dept && ! Department::where('department_id', $dept)->exists()) {
            $errors['departmentId'] = 'Department not found.';
        }
        if ($errors) {
            throw new ApiError(self::FIX_FIELDS, 422, $errors);
        }

        $temporary = $this->temporaryPassword();
        $user = User::create([
            'username' => $username, 'email' => $email, 'password' => $temporary, 'name' => trim($in['name']), 'role_id' => $role->role_id,
            'department_id' => $dept, 'contact' => trim((string) ($in['contact'] ?? '')), 'status' => 'Active', 'must_change_password' => true,
        ]);
        $this->log($request, "Created {$role->label} account {$username}", 'user', $username);

        return ['user' => Resources::user($user->load('role')), 'credentials' => ['username' => $username, 'temporaryPassword' => $temporary]];
    }

    // PATCH /api/users/{id}   { name?, email?, departmentId?, status?, role? }
    public function updateUser(Request $request, string $id)
    {
        $admin = $this->need($request, 'users.manage');
        $user = $this->userByUsername($id);
        $patch = $request->all();

        $check = Check::staff(['name' => $patch['name'] ?? $user->name, 'email' => $patch['email'] ?? $user->email], isNew: false);
        $errors = [];
        if (array_key_exists('name', $patch) && isset($check['name'])) {
            $errors['name'] = $check['name'];
        }
        if (array_key_exists('email', $patch)) {
            if (isset($check['email'])) {
                $errors['email'] = $check['email'];
            } elseif (User::whereRaw('LOWER(email) = ?', [strtolower(trim($patch['email']))])->where('user_id', '!=', $user->user_id)->exists()) {
                $errors['email'] = 'That email is already used by another account.';
            }
        }
        $dept = ! empty($patch['departmentId']) ? (int) $patch['departmentId'] : null;
        if (array_key_exists('departmentId', $patch) && $dept && ! Department::where('department_id', $dept)->exists()) {
            $errors['departmentId'] = 'Department not found.';
        }
        if ($errors) {
            throw new ApiError(self::FIX_FIELDS, 422, $errors);
        }

        $changes = [];
        if (array_key_exists('name', $patch)) {
            $changes['name'] = trim($patch['name']);
        }
        if (array_key_exists('email', $patch)) {
            $changes['email'] = trim($patch['email']);
        }
        if (array_key_exists('departmentId', $patch)) {
            $changes['department_id'] = $dept;
        }
        if (array_key_exists('status', $patch)) {
            if (! in_array($patch['status'], ['Active', 'Inactive'], true)) {
                throw new ApiError('Invalid account status.');
            }
            if ($user->user_id === $admin->user_id && $patch['status'] !== 'Active') {
                throw new ApiError('You cannot disable your own account.');
            }
            $changes['status'] = $patch['status'];
        }
        $newRole = null;
        if (array_key_exists('role', $patch) && $patch['role'] !== $user->role->key) {
            if ($patch['role'] === 'admin' || $user->role->key === 'admin') {
                throw $this->fieldError('role', self::SINGLE_ADMIN);
            }
            if ($user->role->key === 'student' || $patch['role'] === 'student') {
                throw $this->fieldError('role', 'Student accounts keep the Student role.');
            }
            $newRole = Role::where('key', $patch['role'])->first() ?? throw $this->fieldError('role', 'Role not found.');
            $changes['role_id'] = $newRole->role_id;
        }

        $user->update($changes);
        if (($changes['status'] ?? 'Active') === 'Inactive') {
            $user->tokens()->delete(); // a disabled account is signed out everywhere immediately
        }
        $action = $newRole ? "Changed role of {$id} to {$newRole->label}"
            : (array_key_exists('status', $patch) ? ($patch['status'] === 'Active' ? 'Enabled' : 'Disabled')." account {$id}" : "Updated user {$id}");
        $this->log($request, $action, 'user', $id);

        return Resources::user($user->fresh('role'));
    }

    // POST /api/users/{id}/reset-password   { password? }
    // Without a password a temporary one is generated. The user must change it at the next login. The reset is audited.
    public function resetPassword(Request $request, string $id)
    {
        $this->need($request, 'users.manage');
        $user = $this->userByUsername($id);
        $password = (string) $request->input('password', '');
        if ($password !== '' && ($issue = Check::passwordIssue($password))) {
            throw $this->fieldError('password', $issue);
        }
        $temporary = $password !== '' ? $password : $this->temporaryPassword();
        $user->update(['password' => $temporary, 'must_change_password' => true]);
        $user->tokens()->delete();
        $this->log($request, "Reset password of {$user->name} ({$id}, {$user->role->label})", 'password_reset', $id);

        return ['id' => $id, 'temporaryPassword' => $temporary];
    }

    // ---- roles, departments, logs ---------------------------------------------------------------------
    // GET /api/roles   (predefined by the system, read-only)
    public function roles(Request $request)
    {
        $this->need($request, 'roles.manage', 'users.manage');

        return Role::with('permissions')->orderBy('role_id')->get()->map(fn ($r) => [
            'key' => $r->key, 'label' => $r->label, 'description' => $r->description,
            'permissions' => $r->permissions->pluck('key')->values(), 'users' => User::where('role_id', $r->role_id)->count(),
        ]);
    }

    // GET /api/departments
    public function departments(Request $request)
    {
        $user = $request->user();
        if (! $this->can($user, 'departments.view', 'users.manage', 'students.manage', 'enrollment.manage', 'grades.manage')) {
            throw new ApiError('You do not have permission to do that.', 403);
        }
        $studentRole = Role::where('key', 'student')->value('role_id');

        return Department::orderBy('department_id')->get()->map(fn ($d) => [
            'programs' => collect(config('academic_programs.'.strtoupper($d->code), []))->merge(\App\Models\StudentProfile::whereIn('user_id', User::where('department_id', $d->department_id)->select('user_id'))->pluck('program'))->merge(\App\Models\Subject::where('department_id', $d->department_id)->whereNotNull('program')->pluck('program'))->filter()->unique()->values()->all(),
            'id' => $d->department_id, 'code' => $d->code, 'name' => $d->name, 'head' => $d->head_name,
            'students' => User::where('department_id', $d->department_id)->where('role_id', $studentRole)->count(),
            'staff' => User::where('department_id', $d->department_id)->where('role_id', '!=', $studentRole)->count(),
        ]);
    }

    // GET /api/activity-logs
    public function logs(Request $request)
    {
        $this->need($request, 'logs.view');

        return ActivityLog::orderByDesc('created_at')->orderByDesc('activity_log_id')->limit(500)->get()->map(fn ($l) => Resources::log($l));
    }

    // ---- settings ---------------------------------------------------------------------------------------
    private function settingsResource($s): array
    {
        return [
            'systemName' => $s->system_name, 'currentTerm' => $s->current_term, 'enrollmentOpen' => $s->enrollment_open,
            'documentRequestsOpen' => $s->document_requests_open, 'emailNotifications' => $s->email_notifications, 'maintenanceMode' => $s->maintenance_mode,
            'academicTerms' => \App\Models\Enrollment::query()->pluck('term')->merge(\App\Models\Assessment::query()->pluck('term'))->push($s->current_term)->unique()->sortDesc()->values()->all(),
            'tuitionPerUnit' => (float) ($s->tuition_per_unit ?? 1500), 'miscFees' => (float) ($s->misc_fees ?? 6500),
        ];
    }

    // GET /api/settings
    public function settings()
    {
        return $this->settingsResource(Rules::settings());
    }

    // PUT /api/settings
    public function saveSettings(Request $request)
    {
        $this->need($request, 'settings.manage');
        $name = trim((string) $request->input('systemName'));
        $term = trim((string) $request->input('currentTerm'));
        if ($name === '' || $term === '') {
            throw new ApiError('System name and academic term are required.');
        }
        if (! Rules::termParts($term)) {
            throw new ApiError('Select a term containing an academic year and First or Second Semester.', 422, ['currentTerm' => 'For example: 1st Semester, A.Y. 2026–2027']);
        }
        // Fees: only amounts between 0 and 1,000,000; they apply to assessments created from now on.
        $fees = [];
        foreach (['tuitionPerUnit' => 'tuition_per_unit', 'miscFees' => 'misc_fees'] as $key => $column) {
            $value = $request->input($key);
            if ($value === null || $value === '') {
                continue;
            }
            if (! is_numeric($value) || $value < 0 || $value > 1000000) {
                throw new ApiError('Fees must be amounts between 0 and 1,000,000.', 422, [$key => 'Enter an amount between 0 and 1,000,000.']);
            }
            $fees[$column] = round((float) $value, 2);
        }
        $settings = Rules::settings();
        $settings->update($fees + [
            'system_name' => mb_substr($name, 0, 150), 'current_term' => mb_substr($term, 0, 60),
            'enrollment_open' => $request->boolean('enrollmentOpen'), 'document_requests_open' => $request->boolean('documentRequestsOpen'),
            'email_notifications' => $request->boolean('emailNotifications'), 'maintenance_mode' => $request->boolean('maintenanceMode'),
        ]);
        Rules::forgetSettings(); // the settings are cached; clear them so every request sees the new values immediately
        \App\Support\AcademicEnrollment::syncAll();
        $this->log($request, 'Updated system settings', 'settings', 1);

        return $this->settingsResource($settings->fresh());
    }

    // ---- announcements ----------------------------------------------------------------------------------
    // GET /api/announcements
    public function announcements()
    {
        return Announcement::orderByDesc('created_at')->orderByDesc('announcement_id')->get()->map(fn ($a) => [
            'id' => $a->announcement_id, 'title' => $a->title, 'body' => $a->body, 'date' => Fmt::date($a->created_at),
            'author' => User::where('user_id', $a->created_by)->value('name') ?? '—',
        ]);
    }

    // POST /api/announcements
    public function createAnnouncement(Request $request)
    {
        $admin = $this->need($request, 'announcements.manage');
        $title = trim((string) $request->input('title'));
        $body = trim((string) $request->input('body'));
        if ($title === '' || $body === '') {
            throw new ApiError('Add a title and a message.');
        }
        $row = Announcement::create(['title' => mb_substr($title, 0, 200), 'body' => mb_substr($body, 0, 5000), 'created_by' => $admin->user_id]);
        Rules::notify('student', "New announcement: {$row->title}", page: 'home');
        $this->log($request, "Published announcement \"{$row->title}\"", 'announcement', $row->announcement_id);

        return ['id' => $row->announcement_id];
    }

    // DELETE /api/announcements/{id}
    public function deleteAnnouncement(Request $request, int $id)
    {
        $this->need($request, 'announcements.manage');
        $row = Announcement::find($id) ?? throw new ApiError('Announcement not found.', 404);
        $row->delete();
        $this->log($request, "Removed announcement \"{$row->title}\"", 'announcement', $id);

        return ['ok' => true];
    }
}
