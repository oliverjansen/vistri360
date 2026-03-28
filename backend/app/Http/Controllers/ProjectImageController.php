<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Models\ProjectImage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProjectImageController extends Controller
{
    public function index(){

        $projectId = request('projectId');
        try {
            //asda
            $data = ProjectImage::where('project_id', $projectId)->get();

            return response()->json([
                'data' => $data
            ]);


        } catch (\Throwable $th) {
            Log::error('Error retrival of Project Images' . $th->getMessage());

            return response()->json([
                'message' => 'Error retrival of Project Images'
            ], 500);
        }
    }
     public function upload(Request $request) // Type-hinting Request is safer for files
    {

        DB::beginTransaction();

        try {


            $request->validate([
                'panoramas'   => 'required|array',
                'panoramas.*' => 'required|file|mimes:jpg,jpeg,png|max:10240',
                'project_id'  => 'required|integer|exists:projects,id',
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
                    'project_id' => $request->project_id,
                    'image_path'  => $path,
                ];
            }


            //save project
            ProjectImage::insert($imageData);

            // Fetch the updated list for this specific hotspot
            $data = ProjectImage::where('project_id', $request->project_id)->get();

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
