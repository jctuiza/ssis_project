<?php

namespace App\Console\Commands;

use App\Support\AcademicEnrollment;
use Illuminate\Console\Command;

class SyncAcademicEnrollment extends Command
{
    protected $signature = 'ssis:sync-enrollment';
    protected $description = 'Prepare current-term billing and clearance without enrolling students';

    public function handle(): int
    {
        $count = AcademicEnrollment::syncAll();
        $this->info("Prepared billing and clearance for {$count} students.");
        return self::SUCCESS;
    }
}
