<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\Clearance;
use App\Models\User;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;

class ClearanceController extends ApiController
{
    private const OFFICE_BY_PERMISSION = ['clearance.registrar' => 'Registrar', 'clearance.department' => 'Department'];

    // GET /api/clearance/student/{id}
    public function forStudent(Request $request, string $id)
    {
        $student = $this->ownOrStaff($request, $id, 'students.view', 'clearance.registrar', 'clearance.department', 'payments.manage');

        return Clearance::where('term', Rules::currentTerm())->where('student_id', $student->user_id)->get()
            ->sortBy(fn ($c) => array_search($c->office, Rules::OFFICES, true))->values()
            ->map(fn ($c) => Resources::clearance($c));
    }

    // GET /api/clearance?office=&department_id=
    public function byOffice(Request $request)
    {
        $user = $this->need($request, ...array_keys(self::OFFICE_BY_PERMISSION));
        $office = (string) $request->query('office');
        if (! in_array($office, Rules::OFFICES, true)) {
            throw new ApiError('Choose a valid office.');
        }
        $dept = $this->scopeDepartment($user, $request->query('department_id'));

        return Clearance::where('term', Rules::currentTerm())->where('office', $office)
            ->when($dept, fn ($q) => $q->whereIn('student_id', User::where('department_id', $dept)->select('user_id')))
            ->orderBy('clearance_id')->get()->map(fn ($c) => Resources::clearance($c));
    }

    // PATCH /api/clearance/{id}   { status, remarks }
    // A role may update only the offices its permissions allow. Cashier clearance is automatic (follows payments).
    public function update(Request $request, int $id)
    {
        $user = $this->need($request, ...array_keys(self::OFFICE_BY_PERMISSION));
        $row = Clearance::where('term', Rules::currentTerm())->find($id) ?? throw new ApiError('Clearance record not found.', 404);
        $allowed = array_values(array_filter(array_map(fn ($p) => self::OFFICE_BY_PERMISSION[$p] ?? null, $user->permissionKeys())));
        if (! in_array($row->office, $allowed, true)) {
            throw new ApiError("Your role cannot update {$row->office} clearance.", 403);
        }
        if (! $this->inScope($user, $row->student_id)) {
            throw new ApiError('This student belongs to another department.', 403);
        }
        $status = (string) $request->input('status');
        if (! in_array($status, ['Cleared', 'Pending', 'On Hold'], true)) {
            throw new ApiError('Invalid clearance status.');
        }

        $student = User::findOrFail($row->student_id);
        $row->update(['status' => $status, 'remarks' => mb_substr((string) $request->input('remarks', ''), 0, 500), 'updated_by' => $user->user_id]);
        Rules::notify('student', "Your {$row->office} clearance was marked as ".strtolower($status).'.', $student->user_id, page: 'clearance');
        $this->log($request, "Marked {$row->office} clearance of {$student->name} as ".strtolower($status), 'clearance', $id);

        return Resources::clearance($row->fresh());
    }
}
