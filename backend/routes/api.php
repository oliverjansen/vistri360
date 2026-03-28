<?php

use App\Http\Controllers\HotspotController;
use App\Http\Controllers\HotspotImageController;
use App\Http\Controllers\PanoramaController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectImageController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


Route::prefix('projects')->group(function () {
    //project images
    Route::controller(ProjectImageController::class)->prefix('images')->group(function () {
        Route::get('/', 'index');
        Route::post('upload', 'upload');
    });

Route::controller(HotspotController::class)->prefix('hotspots')->group(function () {
        Route::get('/', 'index');
        Route::put('/updateHotspost', 'updateHotspost');
        Route::controller(HotspotImageController::class)->prefix('images')->group(function () {
            Route::get('/', 'index');
        });
    });

    //projects routes
    Route::get('/{id}', [ProjectController::class, 'show']);
});


Route::prefix('panorama')->group(function(){
    Route::controller(PanoramaController::class)->group(function(){
        Route::post('upload','upload');
        Route::get('/{id}', 'show');
        Route::get('/', 'index');
    });
});



