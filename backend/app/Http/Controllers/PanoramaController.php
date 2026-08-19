<?php

namespace App\Http\Controllers;

use App\Models\Hotspot;
use App\Models\HotspotPanorama;
use App\Models\Panorama;
use App\Models\Group;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PanoramaController extends Controller
{
    private const MAX_UPLOAD_SIZE_KB = 51200; // 50 MB per panorama.

    public function index(Request $request)
    {
        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'group_id' => ['sometimes', 'integer', 'exists:groups,id'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Authentication is required to retrieve panoramas.'], 401);
        }

        try {
            $panoramas = Panorama::query()
                ->select(['id', 'user_id', 'project_id', 'image_path', 'created_at', 'updated_at'])
                ->with([
                    'project:id,name,client_id',
                    'project.client:id,name',
                    'groups:id,name',
                    'hotspotPanorama' => function ($hotspotPanoramaQuery) {
                        $hotspotPanoramaQuery->select(['id', 'panorama_id', 'project_id', 'first_scene'])
                            ->with(['hotspots:id,panorama_id,unique_id,next_panorama_id,image_id,type,yaw,pitch,rotation,title,description']);
                    },
                ])
                ->where('user_id', $user->id)
                ->where('project_id', $validated['project_id'])
                ->when(isset($validated['group_id']), fn ($query) => $query->whereHas('groups', fn ($groupQuery) => $groupQuery->whereKey($validated['group_id'])))
                ->when(isset($validated['limit']), fn ($query) => $query->limit($validated['limit']))
                ->get();

            return response()->json([
                'message' => 'Panoramas retrieved successfully',
                'data' => $panoramas,
            ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                ->header('Pragma', 'no-cache');
        } catch (\Throwable $exception) {
            Log::error('Panorama listing failed', ['exception' => $exception::class]);

            return response()->json(['message' => 'Unable to retrieve panoramas.'], 500);
        }
    }

    public function groups(Request $request, int $projectId)
    {
        $project = Project::findOrFail($projectId);
        $clientId = $request->integer('client_id') ?: null;
        if ($clientId !== null && (int) $project->client_id !== $clientId) {
            return response()->json(['message' => 'The selected client does not own this project.'], 422);
        }

        $group = $project->groups()->first();
        if (!$group) {
            $group = Group::create(['name' => 'General']);
            $project->groups()->attach($group->id);
        }

        $groups = Group::query()
            ->select(['groups.id', 'groups.name'])
            ->whereHas('projects', fn ($query) => $query->whereKey($project->id))
            ->withCount(['panoramas' => function ($query) use ($project, $request) {
            $query->where('panoramas.project_id', $project->id)
                ->when($request->user(), fn ($panoramaQuery) => $panoramaQuery->where('panoramas.user_id', $request->user()->id));
        }])
            ->with(['panoramas' => function ($query) use ($projectId, $request) {
                $query->select(['panoramas.id', 'panoramas.user_id', 'panoramas.project_id', 'panoramas.image_path', 'panoramas.created_at', 'panoramas.updated_at'])
                    ->where('panoramas.project_id', $projectId)
                    ->when($request->user(), fn ($panoramaQuery) => $panoramaQuery->where('panoramas.user_id', $request->user()->id))
                    ->with(['hotspotPanorama' => function ($hotspotPanoramaQuery) {
                        $hotspotPanoramaQuery->select(['id', 'panorama_id', 'project_id', 'first_scene'])
                            ->with(['hotspots:id,panorama_id,unique_id,next_panorama_id,image_id,type,yaw,pitch,rotation,title,description']);
                    }]);
            }])
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $groups,
            'selected_group_id' => $group->id,
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }

    public function attach(Request $request, Panorama $panorama)
    {
        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'group_id' => ['required', 'integer', 'exists:groups,id'],
            'allow_cross_group' => ['sometimes', 'boolean'],
            'move_from_group_id' => ['sometimes', 'nullable', 'integer', 'exists:groups,id'],
        ]);

        $user = $request->user();
        $group = Group::query()
            ->whereKey($validated['group_id'])
            ->whereHas('projects', fn ($query) => $query->whereKey($validated['project_id']))
            ->first();

        if (!$user || (int) $panorama->user_id !== (int) $user->id) {
            return response()->json(['message' => 'You can only select panoramas that you uploaded.'], 403);
        }

        if (!$group) {
            return response()->json(['message' => 'The selected group does not belong to this project.'], 422);
        }

        if ($panorama->project_id !== null && (int) $panorama->project_id !== (int) $validated['project_id']) {
            return response()->json([
                'message' => 'A panorama already assigned to another project cannot be moved into this project.',
            ], 422);
        }

        $attachedPanorama = DB::transaction(function () use ($user, $validated, $group, $panorama) {
            $attachedPanorama = Panorama::query()->lockForUpdate()->findOrFail($panorama->id);

            if (!empty($validated['move_from_group_id'])) {
                $canMoveFromGroup = Group::whereKey($validated['move_from_group_id'])
                    ->whereHas('projects', fn ($query) => $query->whereKey($validated['project_id']))
                    ->exists();

                if (!$canMoveFromGroup || (int) $validated['move_from_group_id'] === (int) $group->id) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'move_from_group_id' => 'The panorama cannot be moved from the selected group.',
                    ]);
                }

                // A pending client-side move may refer to a pivot that was
                // already removed by an earlier save. Deleting an absent
                // pivot is intentionally idempotent; the ownership check
                // below still prevents attaching a panorama owned by a
                // different group.
                DB::table('group_panoramas')
                    ->where('group_id', $validated['move_from_group_id'])
                    ->where('panorama_id', $attachedPanorama->id)
                    ->delete();
            }

            $alreadyAssignedToAnotherGroup = DB::table('group_panoramas as group_panorama')
                ->join('project_groups as project_group', 'project_group.group_id', '=', 'group_panorama.group_id')
                ->where('group_panorama.panorama_id', $attachedPanorama->id)
                ->where('project_group.project_id', $validated['project_id'])
                ->where('group_panorama.group_id', '<>', $group->id)
                ->exists();

            if ($alreadyAssignedToAnotherGroup && !($validated['allow_cross_group'] ?? false)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'panorama_id' => 'This panorama is already assigned to another group in this project.',
                ]);
            }

            // Reuse the existing project asset. Normal asset selection keeps
            // one group owner, while an explicitly selected link destination
            // may also be attached to the current group.
            if ($attachedPanorama->project_id === null) {
                $attachedPanorama->forceFill([
                    'project_id' => $validated['project_id'],
                ])->save();
            }

            $attachedPanorama->groups()->syncWithoutDetaching([$group->id]);

            return $attachedPanorama;
        });

        return response()->json([
            'message' => 'Panorama selected successfully',
            'data' => $attachedPanorama->load([
                'project:id,name,client_id',
                'groups:id,name',
            ]),
        ], 201);
    }

    public function storeGroup(Request $request, int $projectId)
    {
        $project = Project::findOrFail($projectId);
        $validated = $request->validate(['name' => ['required', 'string', 'max:120']]);
        $group = Group::create([
            'name' => trim($validated['name']),
        ]);
        $project->groups()->attach($group->id);

        return response()->json(['data' => $group->loadCount('panoramas')], 201);
    }

    public function updateGroup(Request $request, int $projectId, int $groupId)
    {
        $project = Project::findOrFail($projectId);
        $group = $project->groups()->whereKey($groupId)->firstOrFail();
        $validated = $request->validate(['name' => ['required', 'string', 'max:120']]);
        $group->name = trim($validated['name']);
        $group->save();

        return response()->json(['data' => $group->loadCount('panoramas')]);
    }

    public function destroyGroup(Request $request, int $projectId, int $groupId)
    {
        $project = Project::findOrFail($projectId);
        $group = $project->groups()->whereKey($groupId)->firstOrFail();

        if ($project->groups()->count() <= 1) {
            return response()->json(['message' => 'The project must keep at least one panorama group.'], 422);
        }

        DB::transaction(function () use ($project, $group) {
            $groupPanoramas = $group->panoramas()
                ->with('groups:id')
                ->get();
            $groupOnlyPanoramaIds = $groupPanoramas
                ->filter(fn ($panorama) => $panorama->groups->every(
                    fn ($assignedGroup) => (int) $assignedGroup->id === (int) $group->id
                ))
                ->pluck('id');

            if ($groupOnlyPanoramaIds->isNotEmpty()) {
                Hotspot::whereIn('panorama_id', $groupOnlyPanoramaIds)->delete();
                Hotspot::whereIn('next_panorama_id', $groupOnlyPanoramaIds)->delete();
                HotspotPanorama::whereIn('panorama_id', $groupOnlyPanoramaIds)->delete();
            }

            $group->panoramas()->detach();
            $project->groups()->detach($group->id);
            $group->delete();
        });

        return response()->json(['message' => 'Panorama group deleted successfully']);
    }

    public function show(Panorama $panorama)
    {
        try {
            return response()->json([
                'message' => 'Panorama retrieved successfully',
                'data' => $panorama,
            ]);
        } catch (\Throwable $exception) {
            Log::error('Panorama retrieval failed', [
                'panorama_id' => $panorama->getKey(),
                'exception' => $exception::class,
            ]);

            return response()->json(['message' => 'Unable to retrieve panorama.'], 500);
        }
    }

    public function upload(Request $request)
    {
        $validated = $request->validate([
            'panoramas' => ['required', 'array', 'min:1', 'max:20'],
            'panoramas.*' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:'.self::MAX_UPLOAD_SIZE_KB],
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'client_id' => ['sometimes', 'integer', 'exists:clients,id'],
            'group_id' => ['sometimes', 'nullable', 'integer', 'exists:groups,id'],
            'user_id' => ['sometimes', 'integer'],
        ], [
            'panoramas.*.file' => 'Each panorama must be a valid JPG or PNG upload. Check that the file is not larger than 50 MB and that the server upload limits are configured correctly.',
            'panoramas.*.mimes' => 'Each panorama must be a JPG or PNG image.',
            'panoramas.*.max' => 'Each panorama must be 50 MB or smaller.',
        ]);

        try {
            $project = Project::findOrFail($validated['project_id']);
            if (isset($validated['client_id']) && (int) $project->client_id !== (int) $validated['client_id']) {
                return response()->json(['message' => 'The selected client does not own this project.'], 422);
            }

            $uploaderId = $request->user()?->id ?? $validated['user_id'] ?? 1;
            $incomingFilenames = collect($request->file('panoramas'))
                ->map(fn ($pano) => strtolower(basename(str_replace('\\', '/', $pano->getClientOriginalName()))));
            $duplicateBatchFilename = $incomingFilenames->duplicates()->first();
            if ($duplicateBatchFilename) {
                return response()->json([
                    'message' => "The panorama filename '{$duplicateBatchFilename}' appears more than once in this upload.",
                ], 422);
            }

            $existingFilenames = Panorama::query()
                ->where('project_id', $validated['project_id'])
                ->pluck('image_path')
                ->map(fn ($path) => strtolower(basename(str_replace('\\', '/', $path))));
            $alreadyUploadedFilename = $incomingFilenames->first(
                fn ($filename) => $existingFilenames->contains($filename)
            );
            if ($alreadyUploadedFilename) {
                return response()->json([
                    'message' => "A panorama named '{$alreadyUploadedFilename}' has already been uploaded.",
                ], 422);
            }

            $groupId = $validated['group_id'] ?? null;

            if ($groupId !== null && !Group::where('id', $groupId)
                ->whereHas('projects', fn ($query) => $query->whereKey($validated['project_id']))
                ->exists()) {
                return response()->json(['message' => 'The selected group must belong to the selected project.'], 422);
            }

            $uploadedAt = now();
            $imageData = collect($request->file('panoramas'))->map(fn ($pano) => [
                'user_id' => $uploaderId,
                'project_id' => $validated['project_id'],
                'image_path' => $pano->storeAs(
                    'panoramas',
                    basename($pano->getClientOriginalName()),
                    'public'
                ),
                'created_at' => $uploadedAt,
                'updated_at' => $uploadedAt,
            ])->all();

            $uploadedPanoramaIds = [];
            DB::transaction(function () use ($imageData, $uploaderId, $validated, $groupId, $uploadedAt, &$uploadedPanoramaIds) {
                Panorama::insert($imageData);

                $uploadedPanoramaIds = Panorama::query()
                    ->where('user_id', $uploaderId)
                    ->where('project_id', $validated['project_id'])
                    ->where('created_at', $uploadedAt)
                    ->whereIn('image_path', array_column($imageData, 'image_path'))
                    ->pluck('id')
                    ->all();

                if ($groupId !== null) {
                    DB::table('group_panoramas')->insertOrIgnore(collect($uploadedPanoramaIds)->map(fn ($panoramaId) => [
                        'panorama_id' => $panoramaId,
                        'group_id' => $groupId,
                        'created_at' => $uploadedAt,
                        'updated_at' => $uploadedAt,
                    ])->all());
                }
            });

            return response()->json([
                'message' => 'Images uploaded and recorded successfully',
                'data' => Panorama::whereIn('id', $uploadedPanoramaIds)
                    ->with(['hotspotPanorama.hotspots', 'groups:id,name'])
                    ->latest()->get(),
            ]);
        } catch (\Throwable $exception) {
            Log::error('Panorama upload failed', [
                'project_id' => $validated['project_id'],
                'exception' => $exception::class,
            ]);

            return response()->json(['message' => 'Unable to upload panoramas.'], 500);
        }
    }
}
