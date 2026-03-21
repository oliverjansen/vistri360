<?php

namespace App\Http\Controllers;

use App\Models\Hotspot;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpParser\Node\Stmt\TryCatch;

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
   public function updateHotspost()
    {
        $validated = request()->validate([
            'hotspots' => 'required|array',
            'hotspots.*.project_id' => 'required|exists:projects,id',
            'hotspots.*.unique_id' => 'required',
            'hotspots.*.image_id' => 'sometimes|exists:project_images,id',
            'hotspots.*.details' => 'required'
        ]);

        // Add timestamps to each item before sending to the DB
        $now = now();
        $data = collect($validated['hotspots'])->map(function ($item) use ($now) {
            return [
                'project_id' => $item['project_id'],
                'unique_id'  => $item['unique_id'],
                'details'    => json_encode($item['details']), // <--- THE FIX
                'created_at' => $now,
                'updated_at' => $now,
            ];
        })->toArray();

        try {
            // THE UPSERT COMMAND
            Hotspot::upsert(
                $data,                    // The array of hotspots
                ['unique_id'],            // Check if this ID already exists
                ['details', 'updated_at'] // Only update these if it exists
            );

            return response()->json(['message' => 'Hotspots synced successfully'], 200);

        } catch (\Throwable $th) {
            Log::error('Upsert failed: ' . $th->getMessage());
            return response()->json(['message' => 'Error syncing data'], 500);
        }
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
    public function destroy()
    {

    }
}
