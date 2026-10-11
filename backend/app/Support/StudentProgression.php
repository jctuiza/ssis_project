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
            'failedSubjects' => [], 'incompleteSubjects' => [], 'issues' => [], 'passedSubjects' => 0, 'classification' => 'Regular', 'requiresReview' => false];
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
        $program = AcademicAssignments::program($student->department_id, $profile->program);
        $maximumYear = (int) ($program?->duration_years ?: 5);
        $result['toYear'] = min($maximumYear, $year + 1);
        if (! $program || ! $student->department_id) {
            $result['issues'][] = 'Unknown department or program assignment.';
        }
        $enrollments = Enrollment::where('student_id', $student->user_id)->where('status', 'Enrolled')->get();
        $grades = Grade::where('student_id', $student->user_id)->where('academic_year', $sourceYear)->get();
        foreach (['First Semester', 'Second Semester'] as $semester) {
            $enrollment = $enrollments->first(fn ($row) => Rules::termParts($row->term) === [$sourceYear, $semester]);
            if (! $enrollment || (int) $enrollment->year_level !== $year || $enrollment->program_snapshot !== $profile->program) {
                $result['issues'][] = 'Missing completed enrollment or matching program/year snapshot for '.$semester.'.';
            }
            $term = $semester.', A.Y. '.$sourceYear;
            $required = $enrollment?->assignment_mode === 'manual' ? collect() : Rules::offeredSubjects($student->department_id, $profile->program, $year, $term)->keyBy('subject_code');
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
        if ($year >= $maximumYear) {
            $result['issues'][] = ($maximumYear === 5 ? 'Fifth Year is the final level' : 'The program final year has been reached').'; the student remains at the final level. Completion/graduation requires separate review.';
        }
        $outstanding = StudentStanding::outstanding($student, 'First Semester, A.Y. '.$targetYear);
        foreach ($outstanding as $record) {
            if (! collect($result['records'])->contains(fn ($existing) => $existing['code'] === $record['code'] && $existing['academicYear'] === $record['academicYear'] && $existing['semester'] === $record['semester'])) {
                $result['records'][] = $record;
            }
        }
        $result['failedSubjects'] = $outstanding->where('status', 'Failed')->values()->all();
        $result['incompleteSubjects'] = $outstanding->where('status', 'Incomplete')->values()->all();
        $result['classification'] = $outstanding->isEmpty() ? 'Regular' : 'Irregular';
        $result['requiresReview'] = ! $outstanding->isEmpty();
        $result['eligible'] = ! $result['issues'];
        $result['reason'] = ! $result['eligible'] ? implode(' ', $result['issues']) : ($result['requiresReview']
            ? 'Eligible for reviewed advancement as Irregular. Failed/incomplete subjects remain outstanding; Admin approval under school policy is required.'
            : 'Required subjects passed (60 or higher) in both semesters; awaiting Admin confirmation.');

        return $result;
    }
}
