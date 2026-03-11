<?php

use App\Http\Controllers\HotspotController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


Route::controller(HotspotController::class)->prefix('hotspots')->group(function () {
    Route::get('/', 'index');
});
