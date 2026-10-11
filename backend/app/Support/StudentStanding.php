<?php

namespace App\Support;

use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Support\Collection;

class StudentStanding
{
    /** Passed attempts resolve a backlog without altering any earlier attempt. */
    public static function passedCodes(User $student, ?string $term = null): Collection
    {
        $parts = Rules::termParts($term ?? Rules::currentTerm());

        return Grade::where('student_id', $student->user_id)->get()
            ->filter(fn ($grade) => (! $parts || self::period($grade->academic_year, $grade->semester) <= self::period(...$parts))
                && Resources::gradeStatus(Resources::finalGrade($grade)) === 'Passed')
            ->pluck('course_code')->unique()->values();
    }

    private static function period(string $year, string $semester): string
    {
        return $year.'|'.($semester === 'Second Semester' ? '2' : '1');
    }

    /** Only earlier terms create backlog; blank grades in the active term are still in progress. */
    public static function outstanding(User $student, ?string $term = null): Collection
    {
        $parts = Rules::termParts($term ?? Rules::currentTerm());
        if (! $parts) {
            return collect();
        }
        $cutoff = self::period(...$parts);
        $passed = self::passedCodes($student, $term)->all();
        $records = collect();
        $profile = StudentProfile::find($student->user_id);
        $grades = Grade::where('student_id', $student->user_id)->orderBy('academic_year')->orderBy('semester')->orderBy('grade_id')->get();
        foreach ($grades as $grade) {
            if (self::period($grade->academic_year, $grade->semester) >= $cutoff || in_array($grade->course_code, $passed, true)) {
                continue;
            }
            $records->put($grade->course_code, ['code' => $grade->course_code, 'subject' => $grade->description,
                'academicYear' => $grade->academic_year, 'semester' => $grade->semester,
                'finalGrade' => Resources::finalGrade($grade), 'status' => Resources::gradeStatus(Resources::finalGrade($grade))]);
        }
        foreach (Enrollment::where('student_id', $student->user_id)->where('status', 'Enrolled')->get() as $enrollment) {
            $previous = Rules::termParts($enrollment->term);
            if (! $previous || self::period(...$previous) >= $cutoff || $enrollment->program_snapshot !== $profile?->program) {
                continue;
            }
            $required = $enrollment->assignment_mode === 'manual' ? collect() : Rules::offeredSubjects($student->department_id, $enrollment->program_snapshot, $enrollment->year_level, $enrollment->term)
                ->toBase()->map(fn ($subject) => ['code' => $subject->subject_code, 'name' => $subject->name]);
            foreach ($required->merge(Rules::enrollmentSubjects($enrollment)) as $subject) {
                if (! in_array($subject['code'], $passed, true) && ! $records->has($subject['code'])) {
                    $records->put($subject['code'], ['code' => $subject['code'], 'subject' => $subject['name'],
                        'academicYear' => $previous[0], 'semester' => $previous[1], 'finalGrade' => null, 'status' => 'Incomplete']);
                }
            }
        }

        return $records->values();
    }

    public static function classification(User $student, ?string $term = null): string
    {
        $parts = Rules::termParts($term ?? Rules::currentTerm());
        $passed = self::passedCodes($student, $term);
        $failed = $parts && Grade::where('student_id', $student->user_id)->where('academic_year', $parts[0])
            ->where('semester', $parts[1])->get()->contains(fn ($grade) => ! $passed->contains($grade->course_code)
                && Resources::gradeStatus(Resources::finalGrade($grade)) === 'Failed');

        return $failed || ! self::outstanding($student, $term)->isEmpty() ? 'Irregular' : 'Regular';
    }

    public static function requestTypes(User $student): array
    {
        $types = self::classification($student) === 'Irregular' && $student->status === 'Active' ? ['Irregular'] : [];
        $parts = Rules::termParts(Rules::currentTerm());
        $profile = StudentProfile::find($student->user_id);
        $previous = $parts ? ($parts[1] === 'Second Semester' ? [$parts[0], 'First Semester']
            : [((int) substr($parts[0], 0, 4) - 1).'-'.substr($parts[0], 0, 4), 'Second Semester']) : null;
        $periods = Enrollment::where('student_id', $student->user_id)->where('status', 'Enrolled')->get()
            ->map(fn ($row) => Rules::termParts($row->term))->filter()->toBase()
            ->merge(Grade::where('student_id', $student->user_id)->get()->map(fn ($row) => [$row->academic_year, $row->semester])->toBase());
        $returning = $student->status === 'Inactive' && ($profile?->enrolled_on || $periods->isNotEmpty());
        $returning = $returning || ($previous && $periods->contains(fn ($period) => $period < $previous)
            && ! $periods->contains(fn ($period) => $period >= $previous));
        if ($returning) {
            $types[] = 'Returning';
        }

        return $types;
    }

    /** Earlier attempts are read-only metadata; every period retains its own grade row. */
    public static function attemptDetails(Grade $grade, Collection $attempts): array
    {
        $history = $attempts->filter(fn ($old) => $old->student_id === $grade->student_id
            && $old->course_code === $grade->course_code
            && self::period($old->academic_year, $old->semester) < self::period($grade->academic_year, $grade->semester))
            ->sortBy(fn ($old) => self::period($old->academic_year, $old->semester))->values()
            ->map(fn ($old) => ['id' => $old->grade_id, 'academicYear' => $old->academic_year, 'semester' => $old->semester,
                'finalGrade' => Resources::finalGrade($old), 'status' => Resources::gradeStatus(Resources::finalGrade($old))]);

        return ['retake' => $history->contains(fn ($old) => $old['status'] !== 'Passed'), 'previousAttempts' => $history];
    }

    /** Regular offerings follow the active term; unresolved attempts remain available for staff-reviewed retakes. */
    public static function availableSubjects(User $student, ?int $yearLevel = null, ?string $program = null, ?string $term = null, bool $returning = false, bool $lock = false): Collection
    {
        $profile = StudentProfile::find($student->user_id);
        $yearLevel ??= AcademicAssignments::year($profile?->year_level);
        $program ??= $profile?->program;
        $term ??= Rules::currentTerm();
        $parts = Rules::termParts($term);
        if (! $parts || ! $student->department_id || ! $program || ! $yearLevel || $yearLevel < 1 || $yearLevel > 5) {
            return collect();
        }
        $backlog = self::outstanding($student, $term)->pluck('code');
        $passed = self::passedCodes($student, $term);

        return Subject::where('department_id', $student->department_id)->where('program', $program)
            ->whereNotIn('subject_code', $passed)
            ->where(function ($q) use ($parts, $yearLevel, $backlog, $returning) {
                $q->whereIn('subject_code', $backlog)
                    ->orWhere(function ($offered) use ($parts, $yearLevel, $returning) {
                        $offered->where('semester', $parts[1])
                            ->where(fn ($year) => $year->whereNull('academic_year')->orWhere('academic_year', $parts[0]))
                            ->where(function ($levels) use ($yearLevel, $returning) {
                                $levels->where('year_level', $yearLevel)->orWhereJsonContains('shared_year_levels', $yearLevel);
                                if ($returning) {
                                    $levels->orWhere(fn ($lower) => $lower->where('year_level', '<', $yearLevel)->whereBetween('year_level', [1, 5]));
                                }
                            });
                    });
            })
            ->when($lock, fn ($q) => $q->lockForUpdate())->orderBy('year_level')->orderBy('subject_code')->get();
    }
}
