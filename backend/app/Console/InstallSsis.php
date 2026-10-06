<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Builds the SSIS tables on an empty database (for example on Render) from database/ssis_db.sql, the same file
 * that is imported by hand during development, so both always have the identical structure.
 */
class InstallSsis extends Command
{
    protected $signature = 'ssis:install {--force : Drop and recreate the SSIS tables even if they already exist (deletes all data!)}';

    protected $description = 'Create the SSIS tables and reference data from database/ssis_db.sql';

    public function handle(): int
    {
        if (Schema::hasTable('users') && ! $this->option('force')) {
            $this->warn('The SSIS tables already exist. Nothing was changed. (Use --force to rebuild them; this deletes all data.)');

            return self::SUCCESS;
        }
        if ($this->option('force') && ! $this->confirm('This will DELETE all SSIS data. Continue?')) {
            return self::FAILURE;
        }

        $sql = file_get_contents(database_path('ssis_db.sql'));
        $sql = preg_replace('/^\s*--.*$/m', '', $sql);          // full-line comments
        $sql = preg_replace('/\s--\s[^\n]*/', '', $sql);        // trailing comments
        $sql = preg_replace('/^\s*(CREATE DATABASE|USE)\b[^;]*;/mi', '', $sql); // the connection already selects the database

        foreach (preg_split('/;\s*\n/', $sql) as $statement) {
            if (trim($statement) !== '') {
                DB::unprepared($statement);
            }
        }

        $this->info('SSIS tables created. Next: php artisan migrate && php artisan db:seed');

        return self::SUCCESS;
    }
}
