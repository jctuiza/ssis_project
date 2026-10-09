<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Clearance;
use App\Models\Department;
use App\Models\DocumentRequest;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\StudentProfile;
use App\Models\Transaction;
use App\Models\User;
use App\Support\Fmt;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;

class ReportController extends ApiController
{
    /** [['label' => x, 'value' => n], ...] in first-seen order. */
    private function countBy($items, callable $fn): array
    {
        $counts = [];
        foreach ($items as $item) {
            $key = (string) $fn($item);
            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }

        return array_map(fn ($label, $value) => ['label' => (string) $label, 'value' => $value], array_keys($counts), array_values($counts));
    }

    // GET /api/records?department_id=
    // GWA is computed from posted final grades (weighted by units); standing follows the latest graded term.
    public function records(Request $request)
    {
        $user = $this->need($request, 'records.view');
        $dept = $this->scopeDepartment($user, $request->query('department_id'));

        $students = User::with('role')->whereHas('role', fn ($q) => $q->where('key', 'student'))
            ->when($dept, fn ($q) => $q->where('department_id', $dept))->orderBy('username')->get();
        $grades = Grade::whereIn('student_id', $students->pluck('user_id'))->get()->groupBy('student_id');
        $profiles = StudentProfile::whereIn('user_id', $students->pluck('user_id'))->get()->keyBy('user_id');

        return $students->map(function ($s) use ($grades, $profiles) {
            $graded = ($grades[$s->user_id] ?? collect())->map(fn ($g) => ['g' => $g, 'final' => Resources::finalGrade($g)])->filter(fn ($x) => $x['final'] !== null)->values();
            $units = $graded->filter(fn ($x) => $x['final'] >= Resources::PASSING_PERCENT)->sum(fn ($x) => $x['g']->units);
            $weighted = function ($rows) {
                $total = $rows->sum(fn ($x) => $x['g']->units);

                return $total ? $rows->sum(fn ($x) => Resources::toGradePoint($x['final']) * $x['g']->units) / $total : null;
            };
            $termKey = fn ($x) => $x['g']->academic_year.'-'.($x['g']->semester === 'First Semester' ? 1 : 2);
            $latest = $graded->map($termKey)->sort()->last();
            $gwa = $weighted($graded);
            $latestGwa = $weighted($graded->filter(fn ($x) => $termKey($x) === $latest));

            return [
                'id' => $s->username, 'name' => $s->name, 'program' => $profiles[$s->user_id]->program ?? '', 'yearLevel' => $profiles[$s->user_id]->year_level ?? null,
                'department' => Resources::deptCode($s->department_id), 'enrollmentStatus' => Rules::enrollmentStatusOf($s->user_id), 'units' => (int) $units,
                'gwa' => $gwa === null ? '—' : round($gwa, 2),
                'standing' => $latestGwa === null ? 'No grades yet' : ($latestGwa <= 1.5 ? "Dean's Lister" : 'Regular'),
            ];
        })->values();
    }

    // GET /api/reports/{kind}?department_id=
    public function report(Request $request, string $kind)
    {
        $user = $this->need($request, 'reports.view');
        $dept = $this->scopeDepartment($user, $request->query('department_id'));

        $students = User::whereHas('role', fn ($q) => $q->where('key', 'student'))->get();
        $mine = $dept ? $students->where('department_id', $dept) : $students;
        $ids = $mine->pluck('user_id')->all();
        $requests = DocumentRequest::whereIn('student_id', $ids)->get();
        $assessments = Assessment::where('term', Rules::currentTerm())->get();
        $transactions = Transaction::all();
        $clearances = Clearance::where('term', Rules::currentTerm())->get();

        if ($kind === 'cashier') {
            return [
                'cards' => [
                    ['label' => 'Total collected', 'value' => Fmt::peso($transactions->where('status', 'Paid')->sum('amount'))],
                    ['label' => 'Outstanding balance', 'value' => Fmt::peso($assessments->sum(fn ($a) => Rules::balanceOf($a)))],
                    ['label' => 'Transactions', 'value' => $transactions->count()],
                    ['label' => 'Accounts fully paid', 'value' => $assessments->filter(fn ($a) => Rules::balanceOf($a) <= 0)->count()],
                ],
                'sections' => [
                    ['title' => 'Accounts by payment status', 'items' => $this->countBy($assessments, fn ($a) => Rules::paymentStatusOf($a))],
                    ['title' => 'Transactions by method', 'items' => $this->countBy($transactions->filter(fn ($t) => $t->method), fn ($t) => $t->method)],
                    ['title' => 'Transactions by status', 'items' => $this->countBy($transactions, fn ($t) => $t->status)],
                ],
            ];
        }
        if ($kind === 'department') {
            $own = $clearances->filter(fn ($c) => in_array($c->student_id, $ids, true) && $c->office === 'Department');
            $profiles = StudentProfile::whereIn('user_id', $ids)->get()->keyBy('user_id');

            return [
                'cards' => [
                    ['label' => 'Students', 'value' => $mine->count()],
                    ['label' => 'Enrolled', 'value' => $mine->filter(fn ($s) => Rules::enrollmentStatusOf($s->user_id) === 'Enrolled')->count()],
                    ['label' => 'Pending requests', 'value' => $requests->where('status', 'Submitted')->count()],
                    ['label' => 'Cleared (Department)', 'value' => $own->where('status', 'Cleared')->count()],
                ],
                'sections' => [
                    ['title' => 'Students by year level', 'items' => $this->countBy($mine, fn ($s) => $profiles[$s->user_id]->year_level ?? '—')],
                    ['title' => 'Department clearance', 'items' => $this->countBy($own, fn ($c) => $c->status)],
                    ['title' => 'Requests by status', 'items' => $this->countBy($requests, fn ($r) => $r->status)],
                ],
            ];
        }
        if ($kind === 'admin') {
            $staff = User::with('role')->whereHas('role', fn ($q) => $q->where('key', '!=', 'student'))->get();
            $all = DocumentRequest::all();

            return [
                'cards' => [
                    ['label' => 'Students', 'value' => $students->count()],
                    ['label' => 'Staff', 'value' => $staff->count()],
                    ['label' => 'Departments', 'value' => Department::count()],
                    ['label' => 'Document requests', 'value' => $all->count()],
                ],
                'sections' => [
                    ['title' => 'Students per department', 'items' => $this->countBy($students, fn ($s) => Resources::deptCode($s->department_id))],
                    ['title' => 'Requests by status', 'items' => $this->countBy($all, fn ($r) => $r->status)],
                    ['title' => 'Staff by role', 'items' => $this->countBy($staff, fn ($s) => $s->role->label)],
                ],
            ];
        }
        // registrar
        $all = DocumentRequest::all();

        return [
            'cards' => [
                ['label' => 'Total students', 'value' => $students->count()],
                ['label' => 'Enrolled', 'value' => $students->filter(fn ($s) => Rules::enrollmentStatusOf($s->user_id) === 'Enrolled')->count()],
                ['label' => 'Document requests', 'value' => $all->count()],
                ['label' => 'Pending clearances', 'value' => $clearances->where('status', '!=', 'Cleared')->count()],
            ],
            'sections' => [
                ['title' => 'Enrollment by status', 'items' => $this->countBy(Enrollment::all(), fn ($e) => $e->status)],
                ['title' => 'Document requests by status', 'items' => $this->countBy($all, fn ($r) => $r->status)],
                ['title' => 'Clearance by status', 'items' => $this->countBy($clearances, fn ($c) => $c->status)],
            ],
        ];
    }
}
