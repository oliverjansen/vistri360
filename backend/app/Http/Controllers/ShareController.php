<?php

namespace App\Http\Controllers;

use App\Models\Hotspot;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ShareController extends Controller
{
    public function store(Request $request, Project $project)
    {
        if (!$project->public_share_token) {
            do {
                $token = Str::random(48);
            } while (Project::where('public_share_token', $token)->exists());

            $project->public_share_token = $token;
            $project->save();
        } else {
            $token = $project->public_share_token;
        }

        return response()->json([
            'message' => 'Share link created successfully',
            'data' => [
                'token' => $token,
            ],
        ], 201);
    }

    public function show(string $token)
    {
        $project = Project::where('public_share_token', $token)->first();

        if (!$project) {
            return response()->json(['message' => 'This share link is invalid.'], 404);
        }

        return response()->json(['data' => $this->snapshot($project)]);
    }

    private function snapshot(Project $project): array
    {
        $project->load('panoramas.hotspotPanorama');
        $hotspots = Hotspot::where('project_id', $project->id)->get()->map(function ($hotspot) {
            $details = is_array($hotspot->details) ? $hotspot->details : [];

            return [
                'unique_id' => $hotspot->unique_id,
                'panorama_id' => $hotspot->panorama_id,
                'next_panorama_id' => $hotspot->next_panorama_id,
                'type' => $details['type'] ?? $hotspot->type ?? null,
                'yaw' => $details['yaw'] ?? null,
                'pitch' => $details['pitch'] ?? null,
                'rotation' => $details['rotation'] ?? 0,
                'title' => $details['title'] ?? '',
                'description' => $details['description'] ?? '',
            ];
        })->values();

        return [
            'project' => ['id' => $project->id, 'name' => $project->name],
            // The scene strip is the source of truth for a tour. The manual
            // save creates one hotspot_panorama row for every included scene.
            'panoramas' => $project->panoramas
                ->filter(fn ($panorama) => $panorama->hotspotPanorama !== null)
                ->map(fn ($panorama) => [
                'id' => $panorama->id,
                'image_path' => $panorama->image_path,
                'first_scene' => (bool) optional($panorama->hotspotPanorama)->first_scene,
                ])->values(),
            'hotspots' => $hotspots,
        ];
    }
}
