<?php

namespace App\Http\Controllers;

use App\Models\HotspotImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class HotspotImageController extends Controller
{
    public function index (){
        try {

            $data = HotspotImage::where('project_id',1 )->get();

            return response()->json([
                'message' => 'Successfully retreived the hotspot images',
                'data' => $data
            ]);

        } catch (\Throwable $th) {
            Log::error('Error retreiving hotspot image'. $th->getMessage());
            return response()->json([
                'message' => 'Error retreiving hotspot image'. $th->getMessage(),
            ]);
        }
    }
    public function upload(Request $request) // Type-hinting Request is safer for files
    {
        try {

            $request->validate([
                'panoramas'   => 'required|array',
                'panoramas.*' => 'required|file|mimes:jpg,jpeg,png|max:10240',
                'project_id'  => 'required|integer|exists:projects,id',
                'hotspot_id'  => 'required|integer|exists:hotspots,id',
            ]);

            if(!public_path('storage')){
                return response()->json([
                    'message'=> 'No Storage Link!'
                ],404);
            }

            $imageData = [];
            $now = now(); // Create one timestamp for the whole batch

            // Use $request->file() to ensure Laravel treats them as UploadedFile objects
            foreach($request->file('panoramas') as $pano) {

                // Generate unique filename
                $fileName = time() . '_' . $pano->getClientOriginalName();

                // FIX: Use storeAs() to specify the filename.
                // store() would try to find a disk named after your filename!
                $path = $pano->storeAs('panoramas', $fileName,'public');

                log::info($path);


                $imageData[] = [
                    'hotspot_id' => $request->hotspot_id,
                    'project_id' => $request->project_id,
                    'image_path'  => $path,
                    'created_at' => $now, // Required for Bulk Insert
                    'updated_at' => $now,
                ];
            }

            // Use a Transaction: if one fails, none are saved
            \DB::transaction(function () use ($imageData) {
                HotspotImage::insert($imageData);
            });

            // Fetch the updated list for this specific hotspot
            $data = HotspotImage::where('hotspot_id', $request->hotspot_id)->get();

            return response()->json([
                'message' => 'Images uploaded and recorded successfully',
                'data'    => $data
            ]);

        } catch (\Throwable $th) {
            Log::error('Error uploading image: ' . $th->getMessage());
            return response()->json([
                'message' => 'Server Error: ' . $th->getMessage(),
            ], 500);
        }
    }

}
