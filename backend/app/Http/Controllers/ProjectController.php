<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProjectController extends Controller
{
    public function show($id){

        try {

            $project = Project::with('projectImages','hotspots.image')->find($id);

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

}
