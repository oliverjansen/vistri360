<?php

namespace App\Http\Controllers;

use App\Models\Panorama;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PanoramaController extends Controller
{

    public function index(){

        request()->validate([
            'user_id' => 'sometimes'
        ]);

        try {

            $userId = request('user_id');

            $panoramas = Panorama::where('user_id',$userId)->get();

            return response()->json([
                'message' => 'Panoramas retrieved successfully',
                'data' => $panoramas,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error retrieving project: ' . $e->getMessage(),
            ], 500);
        }


    }
    public function show($id){

        try {

            $project = Panorama::findOrFail($id);


            return response()->json([
                'message' => 'Project retrieved successfully',
                'data' => $project,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error retrieving project: ' . $e->getMessage(),
            ], 500);
        }

    }
      public function upload(Request $request) // Type-hinting Request is safer for files
    {

        DB::beginTransaction();

        try {


            $request->validate([
                'panoramas'   => 'required|array',
                'panoramas.*' => 'required|file|mimes:jpg,jpeg,png|max:10240'
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

                Log::info($path);


                $imageData[] = [
                    'user_id' => $request->user_id,
                    'image_path'  => $path,
                ];
            }


            //save project
            Panorama::insert($imageData);

            // Fetch the updated list for this specific hotspot
            $data = Panorama::where('user_id', $request->user_id)->get();

            DB::commit();

            return response()->json([
                'message' => 'Images uploaded and recorded successfully',
                'data'    => $data
            ]);

        } catch (\Throwable $th) {
            DB::rollBack();
            Log::error('Error uploading image: ' . $th->getMessage());
            return response()->json([
                'message' => 'Server Error: ' . $th->getMessage(),
            ], 500);
        }
    }
}
