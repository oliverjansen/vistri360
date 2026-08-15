<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\HotspotController;
use App\Http\Controllers\HotspotImageController;
use App\Http\Controllers\PanoramaController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectImageController;
use Illuminate\Support\Facades\Route;

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
