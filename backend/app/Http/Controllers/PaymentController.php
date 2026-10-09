<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiError;
use App\Models\Assessment;
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
 * Tuition payments (full or installment) and document fees. Paid amounts, balances and the payment status are
 * derived from the transaction ledger. Students can only view their account; the Cashier records every payment.
 */
class PaymentController extends ApiController
{
    private const METHODS = ['Cash', 'GCash', 'Bank transfer'];

    private function newest($query)
    {
        return $query->orderByDesc('created_at')->orderByDesc('transaction_id');
    }

    private function amount($value): float
    {
        if (! is_numeric($value)) {
            throw new ApiError('Enter an amount greater than zero.');
        }
        $amount = round((float) $value, 2);
        if (! is_finite($amount) || $amount <= 0) {
            throw new ApiError('Enter an amount greater than zero.');
        }

        return $amount;
    }

    // GET /api/payments/student/{id}   (read-only; a student can only open their own account)
    public function account(Request $request, string $id)
    {
        $student = $this->ownOrStaff($request, $id, 'payments.manage');
        $assessment = Rules::assessmentFor($student->user_id);

        return [
            'assessment' => $assessment ? Resources::assessment($assessment) + ['pendingAmount' => Rules::pendingPayments($assessment->assessment_id)] : null,
            'history' => $this->newest(Transaction::where('student_id', $student->user_id))->get()->map(fn ($t) => Resources::transaction($t)),
            'documentFees' => Transaction::where('student_id', $student->user_id)->where('type', 'document_fee')->where('status', 'Pending')->get()->map(fn ($t) => Resources::transaction($t)),
        ];
    }

    // GET /api/assessments
    public function assessments(Request $request)
    {
        $this->need($request, 'payments.manage');

        return Assessment::where('term', Rules::currentTerm())->orderBy('assessment_id')->get()->map(fn ($a) => Resources::assessment($a));
    }

    // GET /api/transactions   (Cashier, and the Admin in read-only mode)
    public function transactions(Request $request)
    {
        $this->need($request, 'payments.manage', 'transactions.view');

        return $this->newest(Transaction::query())->get()->map(fn ($t) => Resources::transaction($t));
    }

    // POST /api/assessments/{id}/payments   { amount, method }   Cashier records a payment received face-to-face
    public function recordPayment(Request $request, int $id)
    {
        $actor = $this->need($request, 'payments.manage');
        $assessment = Assessment::find($id) ?? throw new ApiError('Assessment not found.', 404);
        $value = $this->amount($request->input('amount'));
        $method = (string) $request->input('method', 'Cash');
        if (! in_array($method, self::METHODS, true)) {
            throw new ApiError('Choose a valid payment method.');
        }

        $txn = DB::transaction(function () use ($assessment, $value, $method, $actor) {
            // Lock the assessment row so two simultaneous payments cannot overpay the same balance.
            $assessment = Assessment::where('assessment_id', $assessment->assessment_id)->lockForUpdate()->firstOrFail();
            $balance = Rules::balanceOf($assessment);
            if ($balance <= 0) {
                throw new ApiError('This account is already fully paid.');
            }
            if ($value > $balance) {
                throw new ApiError('The payment cannot be more than the remaining balance of '.Fmt::peso($balance).'.');
            }
            $txn = Rules::recordTuitionPayment($assessment, $value, Rules::paymentDescription($assessment, $value), $method, $actor);
            if ($assessment->term === Rules::currentTerm()) {
                Rules::syncCashierClearance($assessment->student_id, by: $actor);
            }

            return $txn;
        });

        $remaining = Rules::balanceOf($assessment);
        $to = fn (string $message) => Rules::notify('student', $message, $assessment->student_id, page: 'payments');
        if ($remaining > 0 || $assessment->tuition_pending) {
            $to('Partial payment of '.Fmt::peso($value)." recorded ({$txn->reference_no}). Total paid so far: ".Fmt::peso(Rules::tuitionPaid($assessment->assessment_id)).'.');
        } else {
            $to('Payment of '.Fmt::peso($value)." recorded ({$txn->reference_no}). Your balance is fully paid. Thank you!");
        }
        $this->log($request, "Recorded payment {$txn->reference_no}", 'transaction', $txn->transaction_id);

        return Resources::assessment($assessment->fresh());
    }

    // GET /api/document-payments   Document requests the Registrar approved (fee waiting, paid, or already released)
    public function documentPayments(Request $request)
    {
        $this->need($request, 'payments.manage');
        $ids = Transaction::where('type', 'document_fee')->where('status', '!=', 'Cancelled')->pluck('document_request_id');

        return DocumentRequest::whereIn('document_request_id', $ids)->orderByDesc('created_at')->orderByDesc('document_request_id')->get()
            ->map(fn ($r) => Resources::documentPayment($r));
    }

    // POST /api/document-payments/{ref}   { method }   Cashier records the document fee received face-to-face
    // Pending Payment -> Payment Recorded (or straight to Ready for Release when the Registrar already prepared it).
    public function recordDocumentPayment(Request $request, string $ref)
    {
        $actor = $this->need($request, 'payments.manage');
        $method = (string) $request->input('method', 'Cash');
        if (! in_array($method, self::METHODS, true)) {
            throw new ApiError('Choose a valid payment method.');
        }

        $result = DB::transaction(function () use ($ref, $method, $actor) {
            $row = DocumentRequest::where('reference_no', $ref)->lockForUpdate()->first() ?? throw new ApiError('Request not found.', 404);
            if ($row->status !== 'Pending Payment') {
                throw new ApiError('This request is not waiting for payment.');
            }
            $txn = Rules::documentFeeFor($row);
            if (! $txn || $txn->status !== 'Pending') {
                throw new ApiError('No unpaid fee was found for this request.');
            }
            $txn->update(['status' => 'Paid', 'method' => $method, 'paid_at' => now(), 'recorded_by' => $actor->user_id]);
            $ready = (bool) $row->prepared;
            $row->update(['fee_status' => 'Paid', 'status' => $ready ? 'Ready for Release' : 'Payment Recorded']);

            return [$row, $txn, $ready];
        });
        [$row, $txn, $ready] = $result;

        $student = User::findOrFail($row->student_id);
        $type = DocumentType::findOrFail($row->document_type_id)->name;
        $to = fn (string $message) => Rules::notify('student', $message, $student->user_id, page: 'documents');
        Rules::notify('student', 'Your payment of '.Fmt::peso($txn->amount)." for {$type} ({$ref}) was recorded ({$txn->reference_no}).", $student->user_id, page: 'payments');
        if ($ready) {
            $to("Your {$type} ({$ref}) is ready for release. You may claim it at the Registrar's window.");
            Rules::notify('registrar', "Fee for {$ref} ({$student->name}) was paid. The document is ready for release.", page: 'documents');
        } else {
            $to("Your {$type} request ({$ref}) is paid and will now be processed by the Registrar.");
            Rules::notify('registrar', "Fee for {$ref} ({$student->name}) was paid. You can now process and release the document.", page: 'documents');
        }
        $this->log($request, "Recorded document fee payment {$txn->reference_no} for {$ref}", 'transaction', $txn->transaction_id);

        return Resources::documentPayment($row->fresh());
    }
}
