<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\Grade;
use App\Models\User;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;

class GradeController extends ApiController
{
    // GET /api/grades/terms/{studentId}   (grades per academic year and semester, oldest first)
    public function terms(Request $request, string $id)
    {
        $student = $this->ownOrStaff($request, $id, 'grades.manage', 'records.view', 'students.view');
        $order = ['First Semester' => 1, 'Second Semester' => 2];
        $terms = [];
        foreach (Grade::where('student_id', $student->user_id)->orderBy('grade_id')->get() as $g) {
            $key = $g->academic_year.'-'.$order[$g->semester];
            $terms[$key] ??= [
                'id' => $key, 'studentId' => $student->username, 'academicYear' => $g->academic_year, 'semester' => $g->semester,
                'program' => Resources::programCode(Resources::programOf($student->user_id)), 'courses' => [],
            ];
            $terms[$key]['courses'][] = [
                'code' => $g->course_code, 'description' => $g->description, 'units' => $g->units, 'prelim' => $g->prelim,
                'midterm' => $g->midterm, 'finals' => $g->finals, 'finalGrade' => Resources::finalGrade($g), 'status' => Resources::gradeStatus(Resources::finalGrade($g)),
            ];
        }
        ksort($terms);

        return array_values($terms);
    }

    // GET /api/grades
    public function index(Request $request)
    {
        $actor = $this->need($request, 'grades.manage');
        if ($actor->role->key !== 'department' || ! $actor->department_id) throw new ApiError('Only assigned department staff can manage grades.', 403);

        $grades = Grade::query()->whereIn('student_id', User::where('department_id', $actor->department_id)->select('user_id'))
            ->when($request->query('department_id'), fn ($q, $dept) => $q->whereIn('student_id', User::where('department_id', $dept)->select('user_id')))
            
            ->when($request->query('subject'), fn ($q, $subject) => $q->where('course_code', $subject))
            ->when($request->query('academic_year'), fn ($q, $year) => $q->where('academic_year', $year))
            ->when($request->query('semester'), fn ($q, $semester) => $q->where('semester', $semester))
            ->whereExists(function ($query) {
                $query->selectRaw('1')->from('enrollments')->join('enrollment_subjects', 'enrollment_subjects.enrollment_id', '=', 'enrollments.enrollment_id')
                    ->whereColumn('enrollments.student_id', 'grades.student_id')->whereColumn('enrollment_subjects.subject_code', 'grades.course_code')->where('enrollments.status', 'Enrolled');
            })
            ->orderBy('grade_id')->get();
        $enrollments = \App\Models\Enrollment::whereIn('student_id', $grades->pluck('student_id'))->where('status', 'Enrolled')->get();
        $links = \App\Models\EnrollmentSubject::whereIn('enrollment_id', $enrollments->pluck('enrollment_id'))->get()->groupBy('enrollment_id');
        $byStudent = $enrollments->groupBy('student_id');
        return $grades->filter(fn ($grade) => ($byStudent->get($grade->student_id) ?? collect())->contains(
            fn ($enrollment) => Rules::termParts($enrollment->term) === [$grade->academic_year, $grade->semester]
                && (! $request->query('year_level') || (int)$enrollment->year_level === (int)$request->query('year_level'))
                && (! $request->query('program') || ($enrollment->program_snapshot ?? \App\Models\StudentProfile::find($grade->student_id)?->program) === $request->query('program'))
                && ($links->get($enrollment->enrollment_id) ?? collect())->contains('subject_code', $grade->course_code),
        ))->map(function ($grade) use ($byStudent) {
            $enrollment=$byStudent->get($grade->student_id)->first(fn ($e)=>Rules::termParts($e->term) === [$grade->academic_year,$grade->semester]);
            return Resources::grade($grade) + ['yearLevel'=>$enrollment?->year_level,'programSnapshot'=>$enrollment?->program_snapshot];
        })->values();
    }

    // PATCH /api/grades/{id}   { prelim, midterm, finals }   percentages 0-100, null = not posted yet
    public function update(Request $request, int $id)
    {
        $actor = $this->need($request, 'grades.manage');
        if ($actor->role->key !== 'department' || ! $actor->department_id) throw new ApiError('Only assigned department staff can manage grades.', 403);
        $grade = Grade::find($id) ?? throw new ApiError('Grade record not found.', 404);
        if (! $this->inScope($actor, $grade->student_id)) throw new ApiError('This grade belongs to another department.', 403);
        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $actor, $grade, $id) {
            User::whereKey($grade->student_id)->lockForUpdate()->firstOrFail();
            $grade = Grade::whereKey($id)->lockForUpdate()->firstOrFail();
            $valid = \App\Models\Enrollment::where('student_id', $grade->student_id)->where('status','Enrolled')->get()->contains(fn ($e) => Rules::termParts($e->term) === [$grade->academic_year, $grade->semester] && in_array($grade->course_code, Rules::subjectCodesOf($e), true));
            if (! $valid) throw new ApiError('This grade does not belong to a completed enrollment for its term.', 422);

            $request->validate(['status' => 'prohibited', 'finalGrade' => 'prohibited', 'prelim' => 'sometimes|nullable|numeric|between:0,100', 'midterm' => 'sometimes|nullable|numeric|between:0,100', 'finals' => 'sometimes|nullable|numeric|between:0,100']);
            $patch = [];
            foreach (['prelim', 'midterm', 'finals'] as $period) {
                if (! $request->exists($period)) { continue; }
                $value = $request->input($period);
                if ($value === null || $value === '') {
                    $patch[$period] = null;
                } elseif (! is_numeric($value) || $value < 0 || $value > 100) {
                    throw new ApiError('Grades must be between 0 and 100.');
                } else {
                    $patch[$period] = round((float) $value, 2);
                }
            }
            if (collect($patch)->every(fn ($value, $key) => $grade->{$key} === $value)) return Resources::grade($grade);
            $grade->update($patch + ['posted_by' => $actor->user_id]);

            $student = User::findOrFail($grade->student_id);
            Rules::notify('student', "Your grade in {$grade->course_code} ({$grade->description}) was updated.", $student->user_id, page: 'grades');
            $this->log($request, "Updated {$grade->course_code} grades for {$student->name}", 'grade', $id);

            return Resources::grade($grade->fresh());
        });
    }
}
