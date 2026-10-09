<?php
namespace App\Console\Commands;
use Illuminate\Console\Command;
use App\Models\Assessment;
use App\Support\Rules;
class AuditAssessments extends Command {
    protected $signature='ssis:audit-assessments';
    protected $description='Read-only audit for repeated assessments of the same student and academic term';
    public function handle(): int {
        $groups=Assessment::orderBy('assessment_id')->get()->groupBy(fn($a)=>$a->student_id.'|'.json_encode(Rules::termParts($a->term) ?? [$a->term]));
        $duplicates=$groups->filter(fn($g)=>$g->count()>1);
        if($duplicates->isEmpty()) { $this->info('No duplicate academic-term assessments found.');return self::SUCCESS; }
        $this->warn('Potential duplicates found. No records or payments were changed. Review the ledger before making corrections.');
        foreach($duplicates as $rows) $this->line('Student '.$rows->first()->student_id.': assessment IDs '.$rows->pluck('assessment_id')->implode(', '));
        return self::FAILURE;
    }
}
