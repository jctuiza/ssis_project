<?php

namespace App\Support;

use App\Models\AcademicProgram;
use App\Models\StudentProfile;
use App\Models\User;

class AcademicAssignments
{
    public static function year(?string $label): ?int
    {
        return preg_match('/([1-5])/', $label ?? '', $matches) ? (int) $matches[1] : null;
    }

    public static function label(int $year): string
    {
        return [1 => '1st Year', 2 => '2nd Year', 3 => '3rd Year', 4 => '4th Year', 5 => '5th Year'][$year];
    }

    public static function program(?int $department, ?string $name): ?AcademicProgram
    {
        return AcademicProgram::where('department_id', $department)->where('name', $name)->first();
    }

    public static function snapshot(User $student): array
    {
        $profile = StudentProfile::find($student->user_id);
        return ['year_level' => self::year($profile?->year_level), 'program_snapshot' => $profile?->program];
    }
}
