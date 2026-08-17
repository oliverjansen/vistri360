<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\HotspotController;
use App\Http\Controllers\HotspotImageController;
use App\Http\Controllers\PanoramaController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectImageController;
use App\Http\Controllers\ShareController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/shares/{token}', [ShareController::class, 'show'])->middleware('share.rate')->where('token', '[A-Za-z0-9]{48}');

Route::middleware('auth:api')->group(function () {
Route::post('/auth/logout', [AuthController::class, 'logout']);
Route::get('/auth/me', [AuthController::class, 'me']);
Route::get('/notifications', [NotificationController::class, 'index']);
Route::patch('/notifications/{notification}/read', [NotificationController::class, 'read']);
Route::get('/profile', [ProfileController::class, 'show']);
Route::put('/profile', [ProfileController::class, 'update']);

Route::prefix('projects')->group(function () {
    Route::get('/', [ProjectController::class, 'index']);
    Route::post('/', [ProjectController::class, 'store']);
    // project images
    Route::controller(ProjectImageController::class)->prefix('images')->group(function () {
        Route::get('/', 'index');
        Route::post('upload', 'upload');
    });

    Route::controller(HotspotController::class)->prefix('hotspots')->group(function () {
        Route::get('/', 'index');
        Route::put('/updateHotspost', 'updateHotspost');
        Route::delete('/deleteHotspot', 'delete');
        Route::controller(HotspotImageController::class)->prefix('images')->group(function () {
            Route::get('/', 'index');
        });
    });

    // projects routes
    Route::get('/{project}', [ProjectController::class, 'show']);
});

Route::prefix('clients')->controller(ClientController::class)->group(function () {
    Route::get('/', 'index');
    Route::post('/', 'store');
    Route::post('/{client}/restore', 'restore');
    Route::delete('/{client}', 'destroy');
    Route::get('/{client}', 'show');
    Route::get('/{client}/projects', 'projects');
});

Route::prefix('panorama')->group(function () {
    Route::controller(PanoramaController::class)->group(function () {
        Route::post('upload', 'upload');
        Route::get('/{panorama}', 'show');
        Route::get('/', 'index');
    });
});

Route::post('/projects/{project}/share', [ShareController::class, 'store']);
Route::put('/projects/{project}/share', [ShareController::class, 'update']);
});
