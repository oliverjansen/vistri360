<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function show($id){

        try {

            $project = Project::with('hotspots.hotspotImage')->find($id);

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
