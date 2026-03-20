<?php

use App\Http\Controllers\HotspotController;
use App\Http\Controllers\HotspotImageController;
use App\Http\Controllers\ProjectController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


Route::prefix('projects')->group(function () {
    Route::get('/{id}', [ProjectController::class, 'show']);

    Route::controller(HotspotController::class)->prefix('hotspots')->group(function () {
        Route::get('/', 'index');
        Route::controller(HotspotImageController::class)->prefix('images')->group(function () {
            Route::post('/upload', 'upload');
            Route::get('/', 'index');
        });
    });
});



