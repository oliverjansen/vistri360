<?php

namespace App\Http\Controllers;

use App\Models\Hotspot;
use App\Models\HotspotPanorama;
use App\Models\Panorama;
use App\Models\Group;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class HotspotController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {

            $paginate = request('paginate', 10);
            $cursor = request('cursor', '');

            // paylaod
            $project_id = request('project_id', 1);

            $hotspots = Hotspot::when($project_id, function ($query) use ($project_id) {
                $query->whereHas('panorama', fn ($panoramaQuery) => $panoramaQuery->where('project_id', $project_id));
            })->get();

            return response()->json([
                'message' => 'Successfully retreived the hotspots',
                'data' => $hotspots,
            ]);

        } catch (Exception $e) {
            Log::error($e->getMessage());

            return response()->json([
                'message' => 'Failed to fetch hotspots',
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
    public function updateProject(Request $request)
    {
        // Explicitly hydrate JSON bodies before validation. This keeps the
        // endpoint reliable for the complete all-scenes manual-save payload.
        if (!$request->has('hotspots') && $request->getContent() !== '') {
            $jsonPayload = json_decode($request->getContent(), true);
            if (is_array($jsonPayload)) {
                $request->merge($jsonPayload);
            }
        }

        $normalizedHotspots = collect($request->input('panorama', []))
            ->flatMap(function ($entries, $panoramaId) use ($request) {
                return collect($entries)->map(function ($entry) use ($panoramaId, $request) {
                    $hotspot = $entry['hotspot'] ?? [];
                    $hotspot['panorama_id'] ??= $panoramaId;

                    return $hotspot;
                });
            })->values()->all();

        $request->merge(['hotspots' => $normalizedHotspots]);

        $validated = $request->validate([
            'project_id' => 'required|integer|exists:projects,id',
            'first_scene_id' => 'sometimes|nullable|integer|exists:panoramas,id',
            'group_id' => 'sometimes|nullable|integer|exists:groups,id',
            'panorama' => 'present|array',
            'panorama.*' => 'array',
            'panorama.*.*.hotspot' => 'required|array',
            'panorama.*.*.hotspot.details' => 'sometimes|array',
            'remove_panorama_ids' => 'sometimes|array',
            'remove_panorama_ids.*' => 'integer|exists:panoramas,id',
            'remove_panorama_groups' => 'sometimes|array',
            'remove_panorama_groups.*.group_id' => 'required|integer|exists:groups,id',
            'remove_panorama_groups.*.panorama_ids' => 'required|array',
            'remove_panorama_groups.*.panorama_ids.*' => 'integer|exists:panoramas,id',
            'remove_next_panorama_ids' => 'sometimes|array',
            'remove_next_panorama_ids.*' => 'integer|exists:panoramas,id',
            'hotspots' => 'present|array',
            'hotspots.*.unique_id' => 'required',
            'hotspots.*.type' => 'required|in:INFO,LINK',
            'hotspots.*.image_id' => 'sometimes|exists:project_images,id',
            'hotspots.*.next_panorama_id' => 'nullable|integer',
            'hotspots.*.title' => 'nullable|string|max:255',
            'hotspots.*.description' => 'nullable|string|max:5000',
            'hotspots.*.yaw' => 'nullable|numeric',
            'hotspots.*.pitch' => 'nullable|numeric',
            'hotspots.*.rotation' => 'nullable|numeric',
            'hotspots.*.details' => 'sometimes|array',
            'hotspots.*.details.type' => 'nullable|in:INFO,LINK',
            'hotspots.*.details.yaw' => 'nullable|numeric',
            'hotspots.*.details.pitch' => 'nullable|numeric',
            'hotspots.*.details.rotation' => 'nullable|numeric',
            'hotspots.*.details.title' => 'nullable|string|max:255',
            'hotspots.*.details.description' => 'nullable|string|max:5000',
            'hotspots.*.panorama_id' => 'required|integer',
        ]);

        $projectId = $validated['project_id'];
        $referencedPanoramaIds = collect($validated['hotspots'])
            ->flatMap(fn ($hotspot) => [$hotspot['panorama_id'], $hotspot['next_panorama_id'] ?? null])
            ->filter()
            ->unique()
            ->values();
        $referencedPanoramas = Panorama::query()
            ->whereIn('id', $referencedPanoramaIds)
            ->get(['id', 'project_id'])
            ->keyBy('id');

        foreach ($validated['hotspots'] as $index => $hotspot) {
            $title = $hotspot['title'] ?? ($hotspot['details']['title'] ?? null);
            $sourcePanorama = $referencedPanoramas->get($hotspot['panorama_id']);

            if (!$sourcePanorama || (int) $sourcePanorama->project_id !== (int) $projectId) {
                throw ValidationException::withMessages([
                    "hotspots.{$index}.panorama_id" => 'The hotspot panorama must belong to the selected project.',
                ]);
            }

            if ($hotspot['type'] === 'INFO' && blank($title)) {
                throw ValidationException::withMessages([
                    "hotspots.{$index}.title" => 'An information tag title is required.',
                ]);
            }

            if ($hotspot['type'] === 'LINK' && empty($hotspot['next_panorama_id'])) {
                throw ValidationException::withMessages([
                    "hotspots.{$index}.next_panorama_id" => 'A navigation hotspot requires a destination panorama.',
                ]);
            }

            $destinationPanorama = $hotspot['next_panorama_id']
                ? $referencedPanoramas->get($hotspot['next_panorama_id'])
                : null;
            if ($hotspot['type'] === 'LINK' && (!$destinationPanorama || (int) $destinationPanorama->project_id !== (int) $projectId)) {
                throw ValidationException::withMessages([
                    "hotspots.{$index}.next_panorama_id" => 'The destination panorama must belong to the selected project.',
                ]);
            }
        }

        if (!empty($validated['group_id']) && !Group::where('id', $validated['group_id'])
            ->whereHas('projects', fn ($query) => $query->whereKey($projectId))
            ->exists()) {
            throw ValidationException::withMessages([
                'group_id' => 'The selected group must belong to the selected project.',
            ]);
        }
        foreach ($validated['remove_panorama_groups'] ?? [] as $index => $removal) {
            if (!Group::whereKey($removal['group_id'])
                ->whereHas('projects', fn ($query) => $query->whereKey($projectId))
                ->exists()) {
                throw ValidationException::withMessages([
                    "remove_panorama_groups.{$index}.group_id" => 'The removal group must belong to the selected project.',
                ]);
            }
        }
        if (!empty($validated['first_scene_id']) && !Panorama::where('id', $validated['first_scene_id'])->where('project_id', $projectId)->exists()) {
            throw ValidationException::withMessages([
                'first_scene_id' => 'The first scene must belong to the selected project.',
            ]);
        }
        try {

            $now = now();
            $hotspotItems = collect($validated['hotspots']);
            $existingHotspots = Hotspot::query()
                ->whereHas('panorama', fn ($query) => $query->where('project_id', $projectId))
                ->whereIn('unique_id', $hotspotItems->pluck('unique_id')->unique()->values())
                ->get(['id', 'panorama_id', 'unique_id', 'yaw', 'pitch', 'rotation', 'title', 'description', 'next_panorama_id', 'image_id'])
                ->keyBy(fn ($hotspot) => $hotspot->panorama_id.'|'.$hotspot->unique_id);

            $data = $hotspotItems->map(function ($item) use ($now, $existingHotspots) {
                $existingHotspot = $existingHotspots->get($item['panorama_id'].'|'.$item['unique_id']);
                $incomingDetails = is_array($item['details'] ?? null) ? $item['details'] : [];

                return [
                    'unique_id' => $item['unique_id'],
                    'panorama_id' => $item['panorama_id'],
                    'next_panorama_id' => array_key_exists('next_panorama_id', $item)
                        ? $item['next_panorama_id']
                        : $existingHotspot?->next_panorama_id,
                    'image_id' => $item['image_id'] ?? null,
                    'type' => $item['type'],
                    'yaw' => $item['yaw'] ?? ($incomingDetails['yaw'] ?? $existingHotspot?->yaw),
                    'pitch' => $item['pitch'] ?? ($incomingDetails['pitch'] ?? $existingHotspot?->pitch),
                    'rotation' => $item['rotation'] ?? ($incomingDetails['rotation'] ?? $existingHotspot?->rotation ?? 0),
                    'title' => $item['title'] ?? ($incomingDetails['title'] ?? $existingHotspot?->title ?? ''),
                    'description' => $item['description'] ?? ($incomingDetails['description'] ?? $existingHotspot?->description ?? ''),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

            })
                // A save request must contain one row per existing hotspot.
                // If the client submits the same hotspot more than once, keep
                // the last version instead of allowing duplicate upsert rows.
                ->keyBy(fn ($item) => $item['panorama_id'].'|'.$item['unique_id'])
                ->values()
                ->toArray();

            DB::transaction(function () use ($data, $projectId, $validated) {
                if (!empty($validated['remove_next_panorama_ids'])) {
                    $sourcePanoramaQuery = Panorama::query()->where('project_id', $projectId);
                    if (!empty($validated['group_id'])) {
                        $sourcePanoramaQuery->whereHas('groups', fn ($query) => $query->whereKey($validated['group_id']));
                    }

                    Hotspot::whereIn('panorama_id', $sourcePanoramaQuery->pluck('id'))
                        ->whereIn('next_panorama_id', $validated['remove_next_panorama_ids'])
                        ->delete();
                }

                $groupRemovalRequests = collect($validated['remove_panorama_groups'] ?? []);
                if (!empty($validated['remove_panorama_ids']) && !empty($validated['group_id'])) {
                    $groupRemovalRequests->push([
                        'group_id' => $validated['group_id'],
                        'panorama_ids' => $validated['remove_panorama_ids'],
                    ]);
                }

                if ($groupRemovalRequests->isNotEmpty()) {
                    $groupRemovalRequests->each(function (array $removal) {
                        DB::table('group_panoramas')
                            ->where('group_id', $removal['group_id'])
                            ->whereIn('panorama_id', $removal['panorama_ids'])
                            ->delete();
                    });

                    $removedPanoramaIds = $groupRemovalRequests
                        ->flatMap(fn (array $removal) => $removal['panorama_ids'])
                        ->unique()
                        ->values();

                    // A panorama is a project asset and may be shared by
                    // multiple groups. Only discard its hotspot records after
                    // it has been removed from every group in the project.
                    $orphanedPanoramaIds = Panorama::query()
                        ->where('project_id', $projectId)
                        ->whereIn('id', $removedPanoramaIds)
                        ->whereDoesntHave('groups')
                        ->pluck('id');

                    if ($orphanedPanoramaIds->isNotEmpty()) {
                        Hotspot::whereIn('panorama_id', $orphanedPanoramaIds)->delete();
                        HotspotPanorama::where('project_id', $projectId)
                            ->whereIn('panorama_id', $orphanedPanoramaIds)
                            ->delete();
                    }
                }

                $submittedPanoramaIds = collect(array_keys($validated['panorama']))
                    ->filter()
                    ->map(fn ($id) => (int) $id)
                    ->unique()
                    ->values();

                if ($submittedPanoramaIds->isNotEmpty()) {
                    $incomingHotspotKeys = collect($data)->mapWithKeys(fn ($item) => [
                        (int) $item['panorama_id'].'|'.$item['unique_id'] => true,
                    ]);
                    $staleHotspotIds = Hotspot::query()
                        ->whereHas('panorama', fn ($query) => $query->where('project_id', $projectId))
                        ->whereIn('panorama_id', $submittedPanoramaIds)
                        ->get(['id', 'panorama_id', 'unique_id'])
                        ->filter(fn ($hotspot) => !$incomingHotspotKeys->has((int) $hotspot->panorama_id.'|'.$hotspot->unique_id))
                        ->pluck('id');

                    if ($staleHotspotIds->isNotEmpty()) {
                        Hotspot::whereIn('id', $staleHotspotIds)->delete();
                    }
                }

                Hotspot::upsert(
                    $data,
                    ['panorama_id', 'unique_id'],
                    ['panorama_id', 'next_panorama_id', 'image_id', 'type', 'yaw', 'pitch', 'rotation', 'title', 'description', 'updated_at']
                );

                $this->saveHotspotPanoramas($projectId, $validated);
            });

            return response()->json(['message' => 'Hotspots synced successfully'], 200);

        } catch (\Throwable $th) {
            Log::error('Upsert failed: '.$th->getMessage());

            return response()->json(['message' => 'Error syncing data'], 500);
        }
    }

    private function saveHotspotPanoramas(int $projectId, array $validated): void
    {
        $groupId = $validated['group_id'] ?? null;
        $groupPanoramaIds = $groupId
            ? Panorama::where('project_id', $projectId)
                ->whereHas('groups', fn ($query) => $query->whereKey($groupId))
                ->pluck('id')
            : null;

        $registryQuery = HotspotPanorama::where('project_id', $projectId);
        if ($groupPanoramaIds !== null) {
            $registryQuery->whereIn('panorama_id', $groupPanoramaIds);
        }
        $registryQuery->delete();

        if (!empty($validated['first_scene_id'])) {
            HotspotPanorama::where('project_id', $projectId)->update(['first_scene' => false]);
        }

        $registeredPanoramaIds = array_keys($validated['panorama']);
        $firstSceneId = $validated['first_scene_id'] ?? null;

        $registeredPanoramaIds = collect($registeredPanoramaIds)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        // A destination in another group is referenced by the link hotspot,
        // but it must not be registered as a scene in the active group. This
        // also prevents reverse links from inserting a duplicate registry row
        // when both groups point to each other.
        if ($groupPanoramaIds !== null) {
            $registeredPanoramaIds = $registeredPanoramaIds
                ->intersect($groupPanoramaIds)
                ->values();
        }

        if ($registeredPanoramaIds->isEmpty()) {
            if ($groupPanoramaIds !== null && $groupPanoramaIds->isNotEmpty()) {
                Hotspot::whereIn('panorama_id', $groupPanoramaIds)->delete();

            DB::table('group_panoramas')
                ->where('group_id', $groupId)
                    ->whereIn('panorama_id', $groupPanoramaIds)
                    ->delete();
            }

            return;
        }

        $timestamp = now();
        HotspotPanorama::insert($registeredPanoramaIds->map(fn ($panoramaId) => [
            'project_id' => $projectId,
            'panorama_id' => $panoramaId,
            'first_scene' => (int) $firstSceneId === $panoramaId,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ])->all());
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
    public function delete()
    {
        try {

            request()->validate([
                'panoramaId' => 'required_without:hotspotId',
                'hotspotId' => 'required_without:panoramaId',
            ]);

            $panoramaId = request('panoramaId');
            $hotspotId = request('hotspotId');

            Hotspot::when($hotspotId, function ($query) use ($panoramaId) {
                $query->where('panorama_id', $panoramaId);
            })->when($panoramaId, function ($query) use ($panoramaId) {
                $query->where('panorama_id', $panoramaId);
            })->delete();

            return response()->json([
                'message' => 'Successfully deleted the hotspot',
            ]);
        } catch (\Throwable $th) {
            Log::error('Failed to delete Hotspot: '.$th->getMessage());

            return response()->json(['message' => 'Error syncing data'], 500);
        }
    }
}
