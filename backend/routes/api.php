<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CepController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\ForumDiscussionController;
use App\Http\Controllers\ForumTopicController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SchoolClassController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\TeachingMaterialController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::pattern('external_id', '[A-Za-z0-9_-]{21}');
Route::pattern('subject_external_id', '[A-Za-z0-9_-]{21}');
Route::pattern('user_external_id', '[A-Za-z0-9_-]{21}');

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth-password-reset');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth-password-reset');
});

Route::get('/cep/{cep}', [CepController::class, 'show']);

Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    Route::middleware('permission:users')->group(function () {
        Route::get('/users/template', [UserController::class, 'template']);
        Route::post('/users/import', [UserController::class, 'import']);
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{external_id}', [UserController::class, 'show']);
        Route::put('/users/{external_id}', [UserController::class, 'update']);
        Route::delete('/users/{external_id}', [UserController::class, 'destroy']);
    });

    Route::middleware('permission:schools')->group(function () {
        Route::get('/schools', [SchoolController::class, 'index']);
        Route::post('/schools', [SchoolController::class, 'store']);
        Route::get('/schools/{external_id}', [SchoolController::class, 'show']);
        Route::put('/schools/{external_id}', [SchoolController::class, 'update']);
        Route::delete('/schools/{external_id}', [SchoolController::class, 'destroy']);
    });

    Route::middleware('permission:subjects')->group(function () {
        Route::get('/subjects', [SubjectController::class, 'index']);
        Route::post('/subjects', [SubjectController::class, 'store']);
        Route::get('/subjects/{external_id}', [SubjectController::class, 'show']);
        Route::put('/subjects/{external_id}', [SubjectController::class, 'update']);
        Route::delete('/subjects/{external_id}', [SubjectController::class, 'destroy']);
    });

    Route::middleware('permission:classes')->group(function () {
        Route::get('/classes', [SchoolClassController::class, 'index']);
        Route::post('/classes', [SchoolClassController::class, 'store']);
        Route::get('/classes/{external_id}', [SchoolClassController::class, 'show']);
        Route::put('/classes/{external_id}', [SchoolClassController::class, 'update']);
        Route::delete('/classes/{external_id}', [SchoolClassController::class, 'destroy']);
        Route::post('/classes/{external_id}/subjects', [SchoolClassController::class, 'attachSubjects']);
        Route::delete('/classes/{external_id}/subjects/{subject_external_id}', [SchoolClassController::class, 'detachSubject']);
    });

    Route::middleware('permission:materials.view')->group(function () {
        Route::get('/materials', [TeachingMaterialController::class, 'index']);
        Route::get('/materials/{external_id}', [TeachingMaterialController::class, 'show']);
    });

    Route::middleware('permission:materials.manage')->group(function () {
        Route::post('/materials', [TeachingMaterialController::class, 'store']);
        Route::put('/materials/{external_id}', [TeachingMaterialController::class, 'update']);
        Route::delete('/materials/{external_id}', [TeachingMaterialController::class, 'destroy']);
    });

    Route::middleware('permission:roles')->group(function () {
        Route::get('/roles', [RoleController::class, 'index']);
        Route::post('/roles', [RoleController::class, 'store']);
        Route::get('/roles/{external_id}', [RoleController::class, 'show']);
        Route::put('/roles/{external_id}', [RoleController::class, 'update']);
        Route::delete('/roles/{external_id}', [RoleController::class, 'destroy']);
        Route::put('/roles/{external_id}/permissions', [RoleController::class, 'updatePermissions']);
    });

    Route::middleware('permission:permissions')->group(function () {
        Route::get('/permissions', [PermissionController::class, 'index']);
        Route::post('/permissions', [PermissionController::class, 'store']);
        Route::get('/permissions/{external_id}', [PermissionController::class, 'show']);
        Route::put('/permissions/{external_id}', [PermissionController::class, 'update']);
        Route::delete('/permissions/{external_id}', [PermissionController::class, 'destroy']);
    });

    Route::middleware('permission:enrollments')->group(function () {
        Route::get('/enrollments', [EnrollmentController::class, 'index']);
        Route::post('/enrollments', [EnrollmentController::class, 'store']);
        Route::post('/enrollments/bulk', [EnrollmentController::class, 'bulk']);
        Route::delete('/enrollments/{external_id}', [EnrollmentController::class, 'destroy']);
        Route::get('/enrollments/student/{user_external_id}', [EnrollmentController::class, 'byStudent']);
    });

    Route::middleware('permission:forums.view')->group(function () {
        Route::get('/forums/context', [ForumTopicController::class, 'context']);
        Route::get('/forums/topics', [ForumTopicController::class, 'index']);
        Route::get('/forums/topics/{external_id}', [ForumTopicController::class, 'show']);
        Route::get('/forums/topics/{external_id}/discussions', [ForumDiscussionController::class, 'index']);
    });

    Route::middleware('permission:forums.topics')->group(function () {
        Route::post('/forums/topics', [ForumTopicController::class, 'store']);
        Route::put('/forums/topics/{external_id}', [ForumTopicController::class, 'update']);
        Route::delete('/forums/topics/{external_id}', [ForumTopicController::class, 'destroy']);
    });

    Route::middleware('permission:forums.discussions')->group(function () {
        Route::post('/forums/topics/{external_id}/discussions', [ForumDiscussionController::class, 'store']);
        Route::put('/forums/discussions/{external_id}', [ForumDiscussionController::class, 'update']);
        Route::delete('/forums/discussions/{external_id}', [ForumDiscussionController::class, 'destroy']);
        Route::post('/forums/discussions/{external_id}/like', [ForumDiscussionController::class, 'toggleLike']);
    });
});
