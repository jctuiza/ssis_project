<?php

namespace App\Support;

use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StudentProgression
{
    public static function evaluate(User $student, string $sourceYear, string $targetYear): array
    {
        $profile = StudentProfile::find($student->user_id);
        $year = AcademicAssignments::year($profile?->year_level);
        $result = ['id' => $student->user_id, 'studentId' => $student->username, 'name' => $student->name,
            'program' => $profile?->program, 'fromYear' => $year, 'toYear' => $year ? min(5, $year + 1) : null,
            'eligible' => false, 'reason' => '', 'academicYear' => $sourceYear, 'records' => [],
            'failedSubjects' => [], 'incompleteSubjects' => [], 'issues' => [], 'passedSubjects' => 0];
        if (DB::table('student_promotions')->where('student_id', $student->user_id)->where('academic_year', $targetYear)->exists()) {
            $result['issues'][] = 'Already promoted for this academic year.';
        }
        if ($student->status !== 'Active' || ! $year || ! $profile?->program) {
            $result['reason'] = 'Inactive account or unknown program/year level.';
            return $result;
        }
        if ($profile->admission_term && (Rules::termParts($profile->admission_term)[0] ?? '') >= $targetYear) {
            $result['reason'] = 'New entrant in the target academic year.';
            return $result;
        }
        $enrollments = Enrollment::where('student_id', $student->user_id)->where('status', 'Enrolled')->get();
        $grades = Grade::where('student_id', $student->user_id)->where('academic_year', $sourceYear)->get();
        foreach (['First Semester', 'Second Semester'] as $semester) {
            $enrollment = $enrollments->first(fn ($row) => Rules::termParts($row->term) === [$sourceYear, $semester]);
            if (! $enrollment || (int) $enrollment->year_level !== $year || $enrollment->program_snapshot !== $profile->program) {
                $result['issues'][] = 'Missing completed enrollment or matching program/year snapshot for '.$semester.'.';
            }
            $term = $semester.', A.Y. '.$sourceYear;
            $required = Rules::offeredSubjects($student->department_id, $profile->program, $year, $term)->keyBy('subject_code');
            $assigned = Rules::enrollmentSubjects($enrollment)->keyBy('code');
            if ($required->isEmpty() && $assigned->isEmpty()) {
                $result['issues'][] = 'No required subject records for '.$semester.'; staff review is needed.';
            }
            foreach (array_unique(array_merge($required->keys()->all(), $assigned->keys()->all())) as $code) {
                $code = (string) $code;
                $grade = $grades->first(fn ($row) => $row->course_code === $code && $row->semester === $semester);
                $final = $grade ? Resources::finalGrade($grade) : null;
                $status = Resources::gradeStatus($final);
                if (! $assigned->has($code)) {
                    $result['issues'][] = 'Required subject '.$code.' is missing from '.$semester.' enrollment.';
                    $status = 'Incomplete';
                }
                $record = ['code' => $code, 'subject' => $assigned->get($code)['name'] ?? $required->get($code)?->name ?? $code,
                    'academicYear' => $sourceYear, 'semester' => $semester, 'finalGrade' => $final, 'status' => $status];
                $result['records'][] = $record;
                if ($status === 'Failed') {
                    $result['failedSubjects'][] = $record;
                } elseif ($status === 'Incomplete') {
                    $result['incompleteSubjects'][] = $record;
                } else {
                    $result['passedSubjects']++;
                }
            }
        }
        if ($year === 5) {
            $result['issues'][] = 'Fifth Year is the final level; the student remains at Fifth Year. Completion/graduation requires separate review.';
        }
        if ($result['failedSubjects']) {
            $result['issues'][] = 'Failed subjects: '.implode(', ', array_map(fn ($row) => $row['code'].' ('.$row['semester'].')', $result['failedSubjects'])).'.';
        }
        if ($result['incompleteSubjects']) {
            $result['issues'][] = 'Missing or incomplete grades: '.implode(', ', array_map(fn ($row) => $row['code'].' ('.$row['semester'].')', $result['incompleteSubjects'])).'.';
        }
        $result['eligible'] = ! $result['issues'];
        $result['reason'] = $result['eligible'] ? 'Required subjects passed (60 or higher) in both semesters; awaiting Admin confirmation.' : implode(' ', $result['issues']);
        return $result;
    }
}
