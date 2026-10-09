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
 * The subjects (courses) offered each term. Department staff maintain their own catalog. When a student enrolls, they are enrolled in the
 * subjects offered to their college: Assignments are scoped by department, program, year, semester and academic year.
 */
class SubjectController extends ApiController
{
    private function resource(Subject $s, array $counts): array
    {
        return [
            'code' => $s->subject_code, 'name' => $s->name, 'units' => $s->units, 'schedule' => $s->schedule ?? '',
            'departmentId' => $s->department_id, 'department' => $s->department_id ? Resources::deptCode($s->department_id) : 'All colleges',
            'program' => $s->program ?? '', 'yearLevel'=>$s->year_level, 'sharedYearLevels'=>$s->shared_year_levels ?? [], 'semester'=>$s->semester, 'academicYear'=>$s->academic_year,
            'enrolled' => (int) ($counts[$s->subject_code] ?? 0),
        ];
    }

    private function counts(?int $departmentId = null): array
    {
        return EnrollmentSubject::when($departmentId, fn ($q) => $q->whereIn('enrollment_id', \App\Models\Enrollment::whereIn('student_id', \App\Models\User::where('department_id',$departmentId)->select('user_id'))->select('enrollment_id')))->selectRaw('subject_code, COUNT(*) AS total')->groupBy('subject_code')->pluck('total', 'subject_code')->all();
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
            $known = \App\Models\AcademicProgram::where('department_id',$dept)->pluck('name');
            if (! $known->contains($program)) {
                $e['program'] = 'Select a program under the chosen department.';
            }
        }
        $assignment=validator($in,[
            'yearLevel'=>'required|integer|between:1,5', 'semester'=>'required|in:First Semester,Second Semester',
            'academicYear'=>['sometimes','nullable','regex:/^\d{4}-\d{4}$/'], 'sharedYearLevels'=>'sometimes|array',
            'sharedYearLevels.*'=>'integer|between:1,5|distinct',
        ])->validate();
        $academicYear = array_key_exists('academicYear', $in) ? ($assignment['academicYear'] ?? null) : ($existing ? $existing->academic_year : (\App\Support\Rules::termParts(\App\Support\Rules::currentTerm())[0] ?? null));
        if ($academicYear && (int) substr($academicYear, 5) !== (int) substr($academicYear, 0, 4) + 1) {
            $e['academicYear'] = 'Use consecutive years, for example 2026-2027.';
        }
        if (! $dept || $program === '') {
            $e['program'] = 'Select a program belonging to your department.';
        }
        if ($e) {
            throw new ApiError('Please correct the highlighted fields.', 422, $e);
        }

        return ['code' => $code, 'name' => $name, 'units' => (int) $units, 'schedule' => $schedule === '' ? null : $schedule, 'department_id' => $dept, 'program' => $program === '' ? null : $program, 'year_level'=>(int)$assignment['yearLevel'], 'semester'=>$assignment['semester'], 'academic_year'=>$academicYear, 'shared_year_levels'=>array_values(array_map('intval',$assignment['sharedYearLevels'] ?? []))];
    }

    // GET /api/subjects
    public function index(Request $request): \Illuminate\Support\Collection
    {
        $actor = $this->need($request, 'subjects.manage');
        if ($actor->role->key !== 'department' || ! $actor->department_id) throw new ApiError('Only assigned department staff can manage subjects.', 403);
        $counts = $this->counts($actor->department_id);

        return Subject::query()
            ->where('department_id', $actor->department_id)
            ->when($request->query('department_id'), fn ($q, $dept) => $q->where(fn ($sub) => $sub->whereNull('department_id')->orWhere('department_id', $dept)))
            ->when($request->query('program'), fn ($q, $program) => $q->where(fn ($sub) => $sub->whereNull('program')->orWhere('program', $program)))
            ->when($request->query('year_level'),fn ($q,$y)=>$q->where(fn ($sub)=>$sub->where('year_level',$y)->orWhereJsonContains('shared_year_levels',(int)$y)))
            ->when($request->query('semester'),fn ($q,$v)=>$q->where('semester',$v))
            ->when($request->query('academic_year'),fn ($q,$v)=>$q->where(fn ($sub)=>$sub->whereNull('academic_year')->orWhere('academic_year',$v)))
            ->orderBy('subject_code')->get()->map(fn ($s) => $this->resource($s, $counts))->values();
    }

    // POST /api/subjects   { code, name, units, schedule?, departmentId? }
    public function store(Request $request): array
    {
        $actor = $this->need($request, 'subjects.manage');
        if ($actor->role->key !== 'department' || ! $actor->department_id) throw new ApiError('Only assigned department staff can manage subjects.', 403);
        if ($request->filled('departmentId') && (int)$request->input('departmentId') !== (int)$actor->department_id) { throw new ApiError('Outside your assigned department.',403); }
        $v = $this->clean(array_merge($request->all(), ['departmentId'=>$actor->department_id]));
        if ((int) $v['department_id'] !== (int) $actor->department_id || ! $v['program']) throw new ApiError('Choose your department and a specific program.', 403);
        $subject = Subject::create(['subject_code' => $v['code'], 'name' => $v['name'], 'units' => $v['units'], 'schedule' => $v['schedule'], 'department_id' => $v['department_id'], 'program' => $v['program'], 'year_level'=>$v['year_level'], 'shared_year_levels'=>$v['shared_year_levels'], 'semester'=>$v['semester'], 'academic_year'=>$v['academic_year']]);
        $this->log($request, "Added subject {$subject->subject_code} ({$subject->name})", 'subject', $subject->subject_code);

        \App\Support\AcademicEnrollment::syncAll();
        return $this->resource($subject->fresh(), []);
    }

    // PATCH /api/subjects/{code}   Changes apply to students who enroll from now on; existing enrollment snapshots and grades keep their own copy.
    public function update(Request $request, string $code): array
    {
        $actor = $this->need($request, 'subjects.manage');
        if ($actor->role->key !== 'department' || ! $actor->department_id) throw new ApiError('Only assigned department staff can manage subjects.', 403);
        $subject = Subject::find($code) ?? throw new ApiError('Subject not found.', 404);
        if ((int) $subject->department_id !== (int) $actor->department_id) throw new ApiError('This subject is outside your department or is shared and read-only.', 403);
        if ($request->filled('departmentId') && (int)$request->input('departmentId') !== (int)$actor->department_id) { throw new ApiError('Outside your assigned department.',403); }
        $v = $this->clean(array_merge($request->all(), ['departmentId'=>$actor->department_id]), $subject);
        if ((int) $v['department_id'] !== (int) $actor->department_id || ! $v['program']) throw new ApiError('Choose your department and a specific program.', 403);
        $subject->update(['name' => $v['name'], 'units' => $v['units'], 'schedule' => $v['schedule'], 'department_id' => $v['department_id'], 'program' => $v['program'], 'year_level'=>$v['year_level'], 'shared_year_levels'=>$v['shared_year_levels'], 'semester'=>$v['semester'], 'academic_year'=>$v['academic_year']]);
        $this->log($request, "Updated subject {$subject->subject_code}", 'subject', $subject->subject_code);

        \App\Support\AcademicEnrollment::syncAll();
        return $this->resource($subject->fresh(), $this->counts($actor->department_id));
    }

    // DELETE /api/subjects/{code}   Only a subject nobody enrolled in can be deleted.
    public function destroy(Request $request, string $code): array
    {
        $actor = $this->need($request, 'subjects.manage');
        if ($actor->role->key !== 'department' || ! $actor->department_id) throw new ApiError('Only assigned department staff can manage subjects.', 403);
        $subject = Subject::find($code) ?? throw new ApiError('Subject not found.', 404);
        if ((int) $subject->department_id !== (int) $actor->department_id) throw new ApiError('This subject is outside your department or is shared and read-only.', 403);
        if (EnrollmentSubject::where('subject_code', $code)->exists() || Grade::where('course_code', $code)->exists()) {
            throw new ApiError('This subject is already part of student enrollment or grade records, so it cannot be deleted.');
        }
        $subject->delete();
        $this->log($request, "Deleted subject {$code}", 'subject', $code);

        return ['ok' => true];
    }
}
