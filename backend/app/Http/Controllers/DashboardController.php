<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\ActivityLog;
use App\Models\Assessment;
use App\Models\Clearance;
use App\Models\Department;
use App\Models\DocumentRequest;
use App\Models\Enrollment;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;

class DashboardController extends ApiController
{
    private function studentCount(?int $dept = null): int
    {
        return User::whereHas('role', fn ($q) => $q->where('key', 'student'))->when($dept, fn ($q) => $q->where('department_id', $dept))->count();
    }

    // GET /api/dashboard/cashier
    public function cashier(Request $request)
    {
        $user = $this->need($request, 'payments.manage');
        $assessments = Assessment::where('term', Rules::currentTerm())->get();
        $balances = $assessments->mapWithKeys(fn ($a) => [$a->assessment_id => Rules::balanceOf($a)]);

        return [
            'totals' => [
                'transactions' => Transaction::count(),
                'today' => Transaction::whereDate('created_at', today())->count(),
                'pending' => $assessments->filter(fn ($a) => $a->tuition_pending || $balances[$a->assessment_id] > 0)->count()
                    + Transaction::where('type', 'document_fee')->where('status', 'Pending')->count(),
                'paid' => Transaction::where('status', 'Paid')->count(),
                'outstanding' => round($balances->sum(), 2),
            ],
            'topBalances' => $assessments->filter(fn ($a) => $balances[$a->assessment_id] > 0)
                ->map(fn ($a) => Resources::assessment($a))->sortByDesc('balance')->take(5)->values(),
            'activities' => Rules::feedFor($user),
        ];
    }

    // GET /api/dashboard/registrar
    public function registrar(Request $request)
    {
        $user = $this->need($request, 'enrollment.manage', 'documents.process');

        return [
            'totals' => [
                'students' => $this->studentCount(),
                'enrollmentRequests' => \App\Models\AdmissionApplication::where('status','Pending')->count(),
                'pendingClearance' => Clearance::where('term', Rules::currentTerm())->where('office', 'Registrar')->where('status', '!=', 'Cleared')->count(),
                'pendingRequests' => DocumentRequest::whereIn('status', ['Submitted', 'Under Review', 'Payment Recorded'])->count(),
            ],
            'activities' => Rules::feedFor($user),
            'recentRequests' => DocumentRequest::orderByDesc('created_at')->orderByDesc('document_request_id')->limit(5)->get()->map(fn ($r) => Resources::document($r)),
        ];
    }

    // GET /api/dashboard/department/{id}
    public function department(Request $request, int $id)
    {
        $user = $this->need($request, 'clearance.department', 'documents.review');
        if ($user->department_id && $user->department_id !== $id) {
            throw new ApiError('This is another department.', 403);
        }
        $mine = User::where('department_id', $id)->select('user_id');
        $pending = Clearance::where('term', Rules::currentTerm())->where('office', 'Department')->where('status', '!=', 'Cleared')->whereIn('student_id', $mine)->orderBy('clearance_id')->get();

        return [
            'totals' => [
                'students' => $this->studentCount($id),
                'pendingClearance' => $pending->count(),
                'requests' => DocumentRequest::whereIn('student_id', $mine)->whereNotIn('status', ['Completed', 'Rejected'])->count(),
            ],
            'pending' => $pending->take(5)->map(fn ($c) => Resources::clearance($c))->values(),
            'activities' => Rules::feedFor($user),
        ];
    }

    // GET /api/dashboard/admin
    public function admin(Request $request)
    {
        $actor = $this->need($request, 'users.manage');
        if ($actor->role->key !== 'admin') throw new ApiError('Only administrators can access this dashboard.',403);
        $students = $this->studentCount();

        return [
            'totals' => [
                'students' => $students,
                'staff' => User::count() - $students,
                'departments' => Department::count(),
                'pendingRequests' => DocumentRequest::where('status', 'Submitted')->count(),
                'todayTransactions' => Transaction::whereDate('created_at', today())->count(),
            ],
            'logs' => ActivityLog::with('actor')->whereIn('entity_type', ['user','role','settings','student','enrollment','admission','security'])->whereNotIn('action', ['Updated own profile','Changed own password','Updated own profile picture','Removed own profile picture'])->orderByDesc('created_at')->orderByDesc('activity_log_id')->limit(50)->get()->filter(fn ($l) => Rules::auditable($l->actor,$l->action,$l->entity_type))->take(5)->values()->map(fn ($l) => Resources::log($l)),
            'usersByRole' => Role::orderBy('role_id')->get()->map(fn ($r) => ['label' => $r->label, 'value' => User::where('role_id', $r->role_id)->count()]),
        ];
    }
}
