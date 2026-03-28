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
            $cursor = request('cursor','');

            //paylaod
            $project_id = request('project_id', 1);

            $hotspots = Hotspot::when($project_id,function($query) use ($project_id){
                $query->where('project_id',$project_id);
            })->get();

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
            'hotspots.*.details' => 'required',
            'hotspots.*.panorama_id' => 'required|exists:panoramas,id'
        ]);

        try {

        // Add timestamps to each item before sending to the DB
        $uniqueHotspotId = [];
        $now = now();
        $data = collect($validated['hotspots'])->map(function ($item) use ($now, &$uniqueHotspotId) {

            $uniqueHotspotId[] = $item['unique_id'];

            return [
                'project_id' => $item['project_id'],
                'unique_id'  => $item['unique_id'],
                'panorama_id' => $item['project_id'],
                'details'    => json_encode($item['details']), // <--- THE FIX
                'created_at' => $now,
                'updated_at' => $now,
            ];

        })->toArray();

            if(!empty($uniqueHotspotId)){
               Hotspot::whereIn('unique_id',$uniqueHotspotId)->delete();
            }

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
