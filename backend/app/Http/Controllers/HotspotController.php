<?php

namespace App\Http\Controllers;

use App\Models\Hotspot;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class HotspotController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $paginate = request('paginate', 10);
            $page = request('page',1);

            $hotspots = Hotspot::with('hotspotImage')->simplePaginate($paginate);

            return response()->json([
                'message' => 'Successfully retreived the hotspots',
                'data' => $hotspots
            ]);
            
        } catch (Exception $e) {
            Log::error($e->getMessage());
             return response()->json([
                'message' => 'Failed to fetch hotspots'
            ], 500);
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Hotspot $hotspot)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Hotspot $hotspot)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Hotspot $hotspot)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Hotspot $hotspot)
    {
        //
    }
}
