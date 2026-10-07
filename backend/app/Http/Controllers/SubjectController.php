<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\Department;
use App\Models\EnrollmentSubject;
use App\Models\Grade;
use App\Models\Subject;
use App\Support\Resources;
use Illuminate\Http\Request;

/**
 * The subjects (courses) offered each term. The Registrar maintains them. When a student enrolls, they are enrolled in the
 * subjects offered to their college: subjects without a department are offered to every college.
 */
class SubjectController extends ApiController
{
    private function resource(Subject $s, array $counts): array
    {
        return [
            'code' => $s->subject_code, 'name' => $s->name, 'units' => $s->units, 'schedule' => $s->schedule ?? '',
            'departmentId' => $s->department_id, 'department' => $s->department_id ? Resources::deptCode($s->department_id) : 'All colleges',
            'program' => $s->program ?? '',
            'enrolled' => (int) ($counts[$s->subject_code] ?? 0),
        ];
    }

    private function counts(): array
    {
        return EnrollmentSubject::selectRaw('subject_code, COUNT(*) AS total')->groupBy('subject_code')->pluck('total', 'subject_code')->all();
    }

    /** Validates the form; returns the cleaned values. $existing is the subject being edited (its code cannot change). */
    private function clean(array $in, ?Subject $existing = null): array
    {
        $e = [];
        $code = $existing?->subject_code ?? strtoupper(trim((string) ($in['code'] ?? '')));
        if (! $existing) {
            if ($code === '') {
                $e['code'] = 'Enter the subject code.';
            } elseif (! preg_match('/^[A-Z0-9][A-Z0-9 .\-]{1,19}$/', $code)) {
                $e['code'] = 'Use 2 to 20 letters, numbers, spaces, dots or dashes, for example IT101.';
            } elseif (Subject::where('subject_code', $code)->exists()) {
                $e['code'] = 'That subject code already exists.';
            }
        }

        $name = trim((string) ($in['name'] ?? ''));
        if ($name === '') {
            $e['name'] = 'Enter the subject name.';
        } elseif (mb_strlen($name) < 2 || mb_strlen($name) > 150) {
            $e['name'] = 'Use 2 to 150 characters.';
        }

        $units = $in['units'] ?? null;
        if (! is_numeric($units) || (int) $units != $units || $units < 1 || $units > 9) {
            $e['units'] = 'Units must be a whole number from 1 to 9.';
        }

        $schedule = trim((string) ($in['schedule'] ?? ''));
        if (mb_strlen($schedule) > 60) {
            $e['schedule'] = 'Keep the schedule under 60 characters.';
        }

        $rawDept = $in['departmentId'] ?? null;
        $dept = $rawDept === '' || $rawDept === null ? null : filter_var($rawDept, FILTER_VALIDATE_INT);
        if ($dept !== null && ($dept === false || $dept < 1 || ! Department::where('department_id', $dept)->exists())) {
            $e['departmentId'] = 'Select a valid department.';
        }


        $program = trim((string) ($in['program'] ?? ''));
        if (mb_strlen($program) > 150 || ($program !== '' && ! $dept)) {
            $e['program'] = 'Select a department before assigning a program.';
        }
        if ($program !== '' && $dept) {
            $department = Department::find($dept);
            $known = collect(config('academic_programs.'.strtoupper($department?->code ?? ''), []))
                ->merge(\App\Models\StudentProfile::whereIn('user_id', \App\Models\User::where('department_id', $dept)->select('user_id'))->pluck('program'))
                ->merge(Subject::where('department_id', $dept)->whereNotNull('program')->pluck('program'));
            if (! $known->contains($program)) {
                $e['program'] = 'Select a program under the chosen department.';
            }
        }
        if ($e) {
            throw new ApiError('Please correct the highlighted fields.', 422, $e);
        }

        return ['code' => $code, 'name' => $name, 'units' => (int) $units, 'schedule' => $schedule === '' ? null : $schedule, 'department_id' => $dept, 'program' => $program === '' ? null : $program];
    }

    // GET /api/subjects
    public function index(Request $request): \Illuminate\Support\Collection
    {
        $this->need($request, 'enrollment.manage');
        $counts = $this->counts();

        return Subject::query()
            ->when($request->query('department_id'), fn ($q, $dept) => $q->where(fn ($sub) => $sub->whereNull('department_id')->orWhere('department_id', $dept)))
            ->when($request->query('program'), fn ($q, $program) => $q->where(fn ($sub) => $sub->whereNull('program')->orWhere('program', $program)))
            ->orderBy('subject_code')->get()->map(fn ($s) => $this->resource($s, $counts))->values();
    }

    // POST /api/subjects   { code, name, units, schedule?, departmentId? }
    public function store(Request $request): array
    {
        $this->need($request, 'enrollment.manage');
        $v = $this->clean($request->all());
        $subject = Subject::create(['subject_code' => $v['code'], 'name' => $v['name'], 'units' => $v['units'], 'schedule' => $v['schedule'], 'department_id' => $v['department_id'], 'program' => $v['program']]);
        $this->log($request, "Added subject {$subject->subject_code} ({$subject->name})", 'subject', $subject->subject_code);

        \App\Support\AcademicEnrollment::syncAll();
        return $this->resource($subject->fresh(), []);
    }

    // PATCH /api/subjects/{code}   Changes apply to students who enroll from now on; existing enrollment snapshots and grades keep their own copy.
    public function update(Request $request, string $code): array
    {
        $this->need($request, 'enrollment.manage');
        $subject = Subject::find($code) ?? throw new ApiError('Subject not found.', 404);
        $v = $this->clean($request->all(), $subject);
        $subject->update(['name' => $v['name'], 'units' => $v['units'], 'schedule' => $v['schedule'], 'department_id' => $v['department_id'], 'program' => $v['program']]);
        $this->log($request, "Updated subject {$subject->subject_code}", 'subject', $subject->subject_code);

        \App\Support\AcademicEnrollment::syncAll();
        return $this->resource($subject->fresh(), $this->counts());
    }

    // DELETE /api/subjects/{code}   Only a subject nobody enrolled in can be deleted.
    public function destroy(Request $request, string $code): array
    {
        $this->need($request, 'enrollment.manage');
        $subject = Subject::find($code) ?? throw new ApiError('Subject not found.', 404);
        if (EnrollmentSubject::where('subject_code', $code)->exists() || Grade::where('course_code', $code)->exists()) {
            throw new ApiError('This subject is already part of student enrollment or grade records, so it cannot be deleted.');
        }
        $subject->delete();
        $this->log($request, "Deleted subject {$code}", 'subject', $code);

        return ['ok' => true];
    }
}
