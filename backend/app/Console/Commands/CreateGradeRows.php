<?php

namespace App\Console\Commands;

use App\Models\Enrollment;
use App\Models\User;
use App\Support\Rules;
use Illuminate\Console\Command;

/** One-time catch-up: gives every student already enrolled this term the empty grade rows they should have. Safe to run again. */
class CreateGradeRows extends Command
{
    protected $signature = 'ssis:create-grades';

    protected $description = 'Create the missing (empty) grade rows of every enrolled student for the current term';

    public function handle(): int
    {
        $term = Rules::currentTerm();
        if (! Rules::termParts()) {
            $this->error("The current term \"{$term}\" has no year range and semester (for example \"1st Semester, A.Y. 2026-2027\"). Fix it in Settings first.");

            return self::FAILURE;
        }

        $total = 0;
        foreach (Enrollment::where('term', $term)->where('status', 'Enrolled')->lazyById(200, 'enrollment_id') as $enrollment) {
            if ($student = User::find($enrollment->student_id)) {
                $total += Rules::createGradeRows($student, $enrollment);
            }
        }
        $this->info("Created {$total} grade rows.");

        return self::SUCCESS;
    }
}
