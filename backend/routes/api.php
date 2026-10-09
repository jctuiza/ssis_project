<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClearanceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\SubjectController;
use Illuminate\Support\Facades\Route;

Route::get('admissions/options', [\App\Http\Controllers\AdmissionController::class, 'options'])->middleware('throttle:60,1');
Route::post('admissions', [\App\Http\Controllers\AdmissionController::class, 'store'])->middleware('throttle:5,1');

// Public: the login pages need the role list, and the login itself is rate limited (brute-force protection).
Route::get('roles/public', [AuthController::class, 'publicRoles']);
Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');

// Everything else needs a valid bearer token. Permissions are checked again inside each controller.
Route::middleware(['auth:sanctum', \App\Http\Middleware\ValidatePortalSession::class, 'throttle:api'])->group(function () {
    Route::post('admissions/{id}/registrar-credentials', [\App\Http\Controllers\AdmissionController::class, 'registrarCredentials'])->whereNumber('id')->middleware('throttle:10,1');
    Route::post('admissions/{id}/email-credentials', [\App\Http\Controllers\AdmissionController::class, 'emailCredentials'])->whereNumber('id')->middleware('throttle:5,1');
    Route::get('academic/programs', [\App\Http\Controllers\AcademicProgressionController::class, 'programs']);
    Route::patch('academic/programs/{id}', [\App\Http\Controllers\AcademicProgressionController::class, 'updateProgram'])->whereNumber('id');
    Route::post('academic/promotions/preview', [\App\Http\Controllers\AcademicProgressionController::class, 'preview']);
    Route::post('academic/promotions/activate', [\App\Http\Controllers\AcademicProgressionController::class, 'activate']);
    Route::get('admissions/{id}/readiness', [\App\Http\Controllers\AdmissionController::class, 'readiness'])->whereNumber('id');
    Route::get('admissions', [\App\Http\Controllers\AdmissionController::class, 'index']);
    Route::patch('admissions/{id}', [\App\Http\Controllers\AdmissionController::class, 'decide'])->whereNumber('id');
    Route::delete('notifications', [AccountController::class, 'deleteNotifications']);
    Route::get('me', [AuthController::class, 'me']);
    Route::post('logout', [AuthController::class, 'logout']);

    Route::put('account/password', [AccountController::class, 'changePassword']);
    Route::patch('account/profile', [AccountController::class, 'updateProfile']);
    Route::post('account/photo', [AccountController::class, 'updatePhoto']);
    Route::get('notifications', [AccountController::class, 'notifications']);
    Route::post('notifications/read', [AccountController::class, 'markRead']);

    Route::get('students', [StudentController::class, 'index']);
    Route::post('students', [StudentController::class, 'store']);
    Route::patch('students/{id}', [StudentController::class, 'update']);
    Route::get('students/{id}/dashboard', [StudentController::class, 'dashboard']);
    Route::get('students/{id}/id-card', [StudentController::class, 'idCard']);

    Route::get('enrollment', [EnrollmentController::class, 'index']);
    Route::post('enrollment', [EnrollmentController::class, 'submit']);
    Route::get('enrollment/student/{id}', [EnrollmentController::class, 'forStudent']);
    Route::patch('enrollment/{id}', [EnrollmentController::class, 'updateStatus'])->whereNumber('id');

    Route::get('subjects', [SubjectController::class, 'index']);
    Route::post('subjects', [SubjectController::class, 'store']);
    Route::patch('subjects/{code}', [SubjectController::class, 'update'])->where('code', '[A-Za-z0-9 .\-]+');
    Route::delete('subjects/{code}', [SubjectController::class, 'destroy'])->where('code', '[A-Za-z0-9 .\-]+');

    Route::get('grades', [GradeController::class, 'index']);
    Route::get('grades/terms/{id}', [GradeController::class, 'terms']);
    Route::patch('grades/{id}', [GradeController::class, 'update'])->whereNumber('id');

    Route::get('clearance', [ClearanceController::class, 'byOffice']);
    Route::get('clearance/student/{id}', [ClearanceController::class, 'forStudent']);
    Route::patch('clearance/{id}', [ClearanceController::class, 'update'])->whereNumber('id');

    Route::get('documents/types', [DocumentController::class, 'types']);
    Route::get('documents', [DocumentController::class, 'index']);
    Route::post('documents', [DocumentController::class, 'submit']);
    Route::get('documents/student/{id}', [DocumentController::class, 'forStudent']);
    Route::patch('documents/{ref}', [DocumentController::class, 'updateStatus']);

    Route::get('payments/student/{id}', [PaymentController::class, 'account']);
    Route::get('assessments', [PaymentController::class, 'assessments']);
    Route::post('assessments/{id}/payments', [PaymentController::class, 'recordPayment'])->whereNumber('id');
    Route::get('transactions', [PaymentController::class, 'transactions']);
    Route::get('document-payments', [PaymentController::class, 'documentPayments']);
    Route::post('document-payments/{ref}', [PaymentController::class, 'recordDocumentPayment']);

    Route::get('dashboard/cashier', [DashboardController::class, 'cashier']);
    Route::get('dashboard/registrar', [DashboardController::class, 'registrar']);
    Route::get('dashboard/department/{id}', [DashboardController::class, 'department'])->whereNumber('id');
    Route::get('dashboard/admin', [DashboardController::class, 'admin']);

    Route::get('records', [ReportController::class, 'records']);
    Route::get('reports/{kind}', [ReportController::class, 'report']);

    Route::get('users', [AdminController::class, 'users']);
    Route::post('users', [AdminController::class, 'createUser']);
    Route::patch('users/{id}', [AdminController::class, 'updateUser']);
    Route::post('users/{id}/reset-password', [AdminController::class, 'resetPassword']);
    Route::get('roles', [AdminController::class, 'roles']);
    Route::get('departments', [AdminController::class, 'departments']);
    Route::get('activity-logs', [AdminController::class, 'logs']);
    Route::get('settings', [AdminController::class, 'settings']);
    Route::put('settings', [AdminController::class, 'saveSettings']);
    Route::get('announcements', [AdminController::class, 'announcements']);
    Route::post('announcements', [AdminController::class, 'createAnnouncement']);
    Route::delete('announcements/{id}', [AdminController::class, 'deleteAnnouncement'])->whereNumber('id');
});
