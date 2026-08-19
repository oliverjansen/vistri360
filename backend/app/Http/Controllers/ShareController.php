<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;

class ShareController extends Controller
{
    public function store(Request $request, Project $project)
    {
        $this->authorizeManagement($request, $project);
        if (!$project->public_share_token) {
            do {
                $token = Str::random(48);
            } while (Project::where('public_share_token', $token)->exists());

            $project->public_share_token = $token;
        } else {
            $token = $project->public_share_token;
        }

        if (!$project->public_share_expires_at || $project->public_share_expires_at->isPast()) {
            $project->public_share_expires_at = Carbon::now()->addDay();
        }
        $project->save();

        return response()->json([
            'message' => 'Share link created successfully',
            'data' => [
                'token' => $token,
                'expires_at' => $project->public_share_expires_at,
            ],
        ], 201);
    }

    public function update(Request $request, Project $project)
    {
        $this->authorizeManagement($request, $project);
        $validated = $request->validate(['expires_at' => ['nullable', 'date']]);

        abort_unless($project->public_share_token, 422, 'Create a public share link before setting its expiration.');
        $project->public_share_expires_at = $validated['expires_at'] ?? null;
        $project->save();

        return response()->json(['data' => $project->fresh()]);
    }

    public function show(string $token)
    {
        $project = Project::where('public_share_token', $token)->first();

        if (!$project) {
            return response()->json(['message' => 'This share link is invalid.'], 404);
        }

        if ($project->public_share_expires_at && $project->public_share_expires_at->isPast()) {
            return response()->json(['message' => 'This public share link has expired.', 'code' => 'share_expired'], 410);
        }

        return response()->json(['data' => $this->snapshot($project)])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    private function snapshot(Project $project): array
    {
        $project->load([
            'groups' => fn ($query) => $query
                ->select(['groups.id', 'groups.name'])
                ->with(['panoramas' => fn ($panoramaQuery) => $panoramaQuery
                    ->select(['panoramas.id', 'panoramas.project_id', 'panoramas.image_path'])
                    ->with(['hotspotPanorama' => fn ($registryQuery) => $registryQuery
                        ->select(['panorama_id', 'first_scene'])
                        ->with(['hotspots:panorama_id,next_panorama_id,type,yaw,pitch,rotation,title,description'])
                    ])
                ]),
        ]);

        return [
            'project' => ['name' => $project->name],
            'groups' => $project->groups,
        ];
    }

    private function authorizeManagement(Request $request, Project $project): void
    {
        abort_unless(
            $request->user()?->id === $project->user_id || $request->user()?->hasRole('admin'),
            403,
            'You do not have permission to manage this public tour.'
        );
    }
}
