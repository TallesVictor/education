<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CepController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SchoolClassController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::get('/cep/{cep}', [CepController::class, 'show']);

Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    Route::middleware('permission:users.manage')->group(function () {
        Route::get('/users/template', [UserController::class, 'template']);
        Route::post('/users/import', [UserController::class, 'import']);
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{external_id}', [UserController::class, 'show']);
        Route::put('/users/{external_id}', [UserController::class, 'update']);
        Route::delete('/users/{external_id}', [UserController::class, 'destroy']);
    });

    Route::middleware('permission:schools.manage')->group(function () {
        Route::get('/schools', [SchoolController::class, 'index']);
        Route::post('/schools', [SchoolController::class, 'store']);
        Route::get('/schools/{external_id}', [SchoolController::class, 'show']);
        Route::put('/schools/{external_id}', [SchoolController::class, 'update']);
        Route::delete('/schools/{external_id}', [SchoolController::class, 'destroy']);
    });

    Route::middleware('permission:subjects.manage')->group(function () {
        Route::get('/subjects', [SubjectController::class, 'index']);
        Route::post('/subjects', [SubjectController::class, 'store']);
        Route::get('/subjects/{external_id}', [SubjectController::class, 'show']);
        Route::put('/subjects/{external_id}', [SubjectController::class, 'update']);
        Route::delete('/subjects/{external_id}', [SubjectController::class, 'destroy']);
    });

    Route::middleware('permission:classes.manage')->group(function () {
        Route::get('/classes', [SchoolClassController::class, 'index']);
        Route::post('/classes', [SchoolClassController::class, 'store']);
        Route::get('/classes/{external_id}', [SchoolClassController::class, 'show']);
        Route::put('/classes/{external_id}', [SchoolClassController::class, 'update']);
        Route::delete('/classes/{external_id}', [SchoolClassController::class, 'destroy']);
        Route::post('/classes/{external_id}/subjects', [SchoolClassController::class, 'attachSubjects']);
        Route::delete('/classes/{external_id}/subjects/{subject_external_id}', [SchoolClassController::class, 'detachSubject']);
    });

    Route::middleware('permission:roles.manage')->group(function () {
        Route::get('/roles', [RoleController::class, 'index']);
        Route::post('/roles', [RoleController::class, 'store']);
        Route::get('/roles/{external_id}', [RoleController::class, 'show']);
        Route::put('/roles/{external_id}', [RoleController::class, 'update']);
        Route::delete('/roles/{external_id}', [RoleController::class, 'destroy']);
        Route::put('/roles/{external_id}/permissions', [RoleController::class, 'updatePermissions']);
    });

    Route::middleware('permission:permissions.manage')->group(function () {
        Route::get('/permissions', [PermissionController::class, 'index']);
        Route::post('/permissions', [PermissionController::class, 'store']);
        Route::get('/permissions/{external_id}', [PermissionController::class, 'show']);
        Route::put('/permissions/{external_id}', [PermissionController::class, 'update']);
        Route::delete('/permissions/{external_id}', [PermissionController::class, 'destroy']);
    });

    Route::middleware('permission:enrollments.manage')->group(function () {
        Route::get('/enrollments', [EnrollmentController::class, 'index']);
        Route::post('/enrollments', [EnrollmentController::class, 'store']);
        Route::post('/enrollments/bulk', [EnrollmentController::class, 'bulk']);
        Route::delete('/enrollments/{external_id}', [EnrollmentController::class, 'destroy']);
        Route::get('/enrollments/student/{user_external_id}', [EnrollmentController::class, 'byStudent']);
    });
});
