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
                'midterm' => $g->midterm, 'finals' => $g->finals, 'finalGrade' => Resources::finalGrade($g),
            ];
        }
        ksort($terms);

        return array_values($terms);
    }

    // GET /api/grades
    public function index(Request $request)
    {
        $this->need($request, 'grades.manage');

        return Grade::orderBy('grade_id')->get()->map(fn ($g) => Resources::grade($g));
    }

    // PATCH /api/grades/{id}   { prelim, midterm, finals }   percentages 0-100, null = not posted yet
    public function update(Request $request, int $id)
    {
        $actor = $this->need($request, 'grades.manage');
        $grade = Grade::find($id) ?? throw new ApiError('Grade record not found.', 404);

        $patch = [];
        foreach (['prelim', 'midterm', 'finals'] as $period) {
            $value = $request->input($period);
            if ($value === null || $value === '') {
                $patch[$period] = null;
            } elseif (! is_numeric($value) || $value < 0 || $value > 100) {
                throw new ApiError('Grades must be between 0 and 100.');
            } else {
                $patch[$period] = round((float) $value, 2);
            }
        }
        $grade->update($patch + ['posted_by' => $actor->user_id]);

        $student = User::findOrFail($grade->student_id);
        Rules::notify('student', "Your grade in {$grade->course_code} ({$grade->description}) was updated.", $student->user_id, page: 'grades');
        $this->log($request, "Updated {$grade->course_code} grades for {$student->name}", 'grade', $id);

        return Resources::grade($grade->fresh());
    }
}
