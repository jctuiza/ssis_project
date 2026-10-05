<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Models\Transaction;
use App\Models\User;
use App\Support\Fmt;
use App\Support\Resources;
use App\Support\Rules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Document requests: Student -> Registrar -> Cashier -> Student.
 *  Submitted -> Under Review -> (Registrar approves) -> Pending Payment -> (Cashier records payment) -> Payment Recorded
 *  -> Processing -> Ready for Release -> Completed.   Rejected is possible before payment is recorded.
 */
class DocumentController extends ApiController
{
    private const REVIEW_MOVES = ['Submitted' => ['Under Review', 'Rejected'], 'Under Review' => ['Rejected']];

    private const PROCESS_MOVES = [
        'Submitted' => ['Under Review', 'Rejected'],
        'Under Review' => ['Approved', 'Rejected'],
        'Pending Payment' => ['Rejected'],
        'Payment Recorded' => ['Processing', 'Ready for Release'],
        'Processing' => ['Ready for Release'],
        'Ready for Release' => ['Completed'],
    ];

    private function listing($rows)
    {
        return $rows->sortByDesc(fn ($r) => sprintf('%s-%010d', $r->created_at, $r->document_request_id))->values()->map(fn ($r) => Resources::document($r));
    }

    // GET /api/documents/types
    public function types()
    {
        return DocumentType::orderBy('document_type_id')->get()->map(fn ($t) => Resources::documentType($t));
    }

    // GET /api/documents/student/{id}
    public function forStudent(Request $request, string $id)
    {
        $student = $this->ownOrStaff($request, $id, 'documents.process', 'documents.review');

        return $this->listing(DocumentRequest::where('student_id', $student->user_id)->get());
    }

    // GET /api/documents?department_id=   (staff only; department staff only see their own department)
    public function index(Request $request)
    {
        $user = $this->need($request, 'documents.process', 'documents.review');
        $dept = $this->scopeDepartment($user, $request->query('department_id'));

        return $this->listing(
            DocumentRequest::query()
                ->when($dept, fn ($q) => $q->whereIn('student_id', User::where('department_id', $dept)->select('user_id')))
                ->get(),
        );
    }

    // POST /api/documents   { type, purpose }   (the student is the signed-in user)
    public function submit(Request $request)
    {
        $user = $request->user();
        if (! $user->isStudent()) {
            throw new ApiError('Only students can request documents.', 403);
        }
        if (! Rules::settings()->document_requests_open) {
            throw new ApiError('Document requests are currently closed by the administrator.');
        }
        $docType = DocumentType::where('name', (string) $request->input('type'))->first() ?? throw new ApiError('Select a valid document type.');
        $missing = Rules::missingClearances($user->user_id, $docType->requiredOffices());
        if ($missing) {
            throw new ApiError("{$docType->name} requires clearance from: ".implode(', ', $missing).'. Please settle your pending clearance first.');
        }
        $purpose = trim((string) $request->input('purpose', ''));

        $row = DB::transaction(fn () => DocumentRequest::create([
            'reference_no' => Rules::nextReference('document_requests', 'REQ', 1000), 'student_id' => $user->user_id,
            'document_type_id' => $docType->document_type_id, 'purpose' => mb_substr($purpose ?: 'Personal copy', 0, 255), 'status' => 'Submitted',
            'remarks' => '', 'fee_amount' => $docType->fee, 'fee_status' => 'Unpaid', 'prepared' => false, 'processed_by' => null,
        ]));

        Rules::notify('student', "Your {$docType->name} request ({$row->reference_no}) was submitted. The Registrar will review it.", $user->user_id, page: 'documents');
        Rules::notify('registrar', "{$user->name} submitted a {$docType->name} request ({$row->reference_no}).", page: 'documents');
        Rules::notify('department', "{$user->name} requested a {$docType->name} ({$row->reference_no}).", departmentId: $user->department_id, page: 'requests');
        $this->log($request, "Submitted document request {$row->reference_no}", 'document_request', $row->reference_no);

        return Resources::document($row);
    }

    // PATCH /api/documents/{ref}   { status, remarks, prepared? }
    // documents.process (Registrar): review, approve (forwards to Cashier), reject, process, release, complete.
    // documents.review (Department): start review or reject only.
    // 'Approved' is a decision, not a resting status: it moves the request straight to 'Pending Payment' (or 'Processing' when no fee is due).
    public function updateStatus(Request $request, string $ref)
    {
        $user = $this->need($request, 'documents.process', 'documents.review');
        $row = DocumentRequest::where('reference_no', $ref)->first() ?? throw new ApiError('Request not found.', 404);
        $student = User::findOrFail($row->student_id);
        if (! $this->inScope($user, $student->user_id)) {
            throw new ApiError('This request belongs to another department.', 403);
        }
        $status = (string) $request->input('status');
        $remarks = mb_substr((string) $request->input('remarks', ''), 0, 500);
        $canProcess = $this->can($user, 'documents.process');
        $allowed = [$row->status, ...(($canProcess ? self::PROCESS_MOVES : self::REVIEW_MOVES)[$row->status] ?? [])];
        if (! in_array($status, $allowed, true)) {
            throw new ApiError("Your role cannot change a {$row->status} request to {$status}.");
        }

        $type = DocumentType::findOrFail($row->document_type_id);
        $previousStatus = $row->status;
        $previousRemarks = (string) $row->remarks;
        $patch = ['remarks' => $remarks, 'processed_by' => $user->user_id];
        $target = $status;
        $forwarded = false;

        DB::transaction(function () use ($row, $type, $status, $request, &$patch, &$target, &$forwarded) {
            if ($status === 'Approved') {
                $owes = $row->fee_amount > 0 && $row->fee_status !== 'Paid';
                $target = $owes ? 'Pending Payment' : 'Processing';
                $patch['prepared'] = $request->boolean('prepared');
                if ($owes) {
                    if (! Rules::documentFeeFor($row)) {
                        Rules::openFeeTransaction($row, $type);
                    }
                    $forwarded = true;
                }
            }
            if (in_array($target, ['Ready for Release', 'Completed'], true) && $row->fee_status !== 'Paid') {
                throw new ApiError('The document fee must be paid at the Cashier before this request can be released.');
            }
            if ($target === 'Rejected' && $row->fee_status === 'Unpaid') {
                $patch['fee_status'] = 'Waived';
                Transaction::where('document_request_id', $row->document_request_id)->where('status', 'Pending')->update(['status' => 'Cancelled']);
            }
            $patch['status'] = $target;
            $row->update($patch);
        });

        $statusChanged = $target !== $previousStatus;
        $remarksChanged = $remarks !== $previousRemarks;
        $name = "{$type->name} request ({$ref})";
        $to = fn (string $message, string $page = 'documents') => Rules::notify('student', $message, $student->user_id, page: $page);

        if ($statusChanged) {
            if ($status === 'Approved') {
                $to("Your {$name} was approved.");
            }
            if ($forwarded) {
                $to("Your {$name} was sent to the Cashier. Please pay the ".Fmt::peso($row->fee_amount)." fee in person at the Cashier's Office.");
                Rules::notify('cashier', "{$student->name}'s {$type->name} ({$ref}) was approved. Fee of ".Fmt::peso($row->fee_amount).' is waiting for payment.', page: 'document-fees');
            }
            match ($target) {
                'Under Review' => $to("Your {$name} is now under review."),
                'Processing' => $to("Your {$name} is now being processed."),
                'Ready for Release' => $to("Your {$name} is ready for release. You may claim it at the Registrar's window."),
                'Completed' => $to("Your {$name} is completed and released."),
                'Rejected' => $to("Your {$name} was rejected.".($remarks !== '' ? " Reason: {$remarks}" : '')),
                default => null,
            };
            $this->log($request, $status === 'Approved' ? "Approved {$ref}".($forwarded ? ' and sent it to the Cashier' : '') : "Updated {$ref} to {$target}", 'document_request', $ref);
        } elseif ($remarksChanged) {
            $to("Your {$name} has a new remark.");
            $this->log($request, "Updated remarks of {$ref}", 'document_request', $ref);
        }

        return Resources::document($row->fresh());
    }
}
