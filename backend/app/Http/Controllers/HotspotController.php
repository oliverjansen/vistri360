<?php

namespace App\Http\Controllers;

use App\Models\Hotspot;
use App\Models\HotspotPanorama;
use App\Models\Panorama;
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
                $query->where('project_id', $project_id);
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
    public function updateHotspost(Request $request)
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
                    $hotspot['project_id'] ??= $request->input('project_id');
                    $hotspot['panorama_id'] ??= $panoramaId;

                    return $hotspot;
                });
            })->values()->all();

        $request->merge(['hotspots' => $normalizedHotspots]);

        $validated = $request->validate([
            'project_id' => 'required|integer|exists:projects,id',
            'first_scene_id' => 'sometimes|nullable|integer|exists:panoramas,id',
            'panorama' => 'present|array',
            'panorama.*' => 'array',
            'panorama.*.*.hotspot' => 'required|array',
            'panorama.*.*.hotspot.details' => 'required|array',
            'remove_panorama_ids' => 'sometimes|array',
            'remove_panorama_ids.*' => 'integer|exists:panoramas,id',
            'remove_next_panorama_ids' => 'sometimes|array',
            'remove_next_panorama_ids.*' => 'integer|exists:panoramas,id',
            'hotspots' => 'present|array',
            'hotspots.*.project_id' => 'required|exists:projects,id',
            'hotspots.*.unique_id' => 'required',
            'hotspots.*.type' => 'required|in:INFO,LINK',
            'hotspots.*.image_id' => 'sometimes|exists:project_images,id',
            'hotspots.*.next_panorama_id' => 'nullable|integer|exists:panoramas,id',
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
            'hotspots.*.panorama_id' => 'required|exists:panoramas,id',
        ]);

        foreach ($validated['hotspots'] as $index => $hotspot) {
            $title = $hotspot['title'] ?? ($hotspot['details']['title'] ?? null);

            if (!Panorama::where('id', $hotspot['panorama_id'])
                ->where('project_id', $hotspot['project_id'])
                ->exists()) {
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

            if ($hotspot['type'] === 'LINK' && !Panorama::where('id', $hotspot['next_panorama_id'])
                ->where('project_id', $hotspot['project_id'])
                ->exists()) {
                throw ValidationException::withMessages([
                    "hotspots.{$index}.next_panorama_id" => 'The destination panorama must belong to the selected project.',
                ]);
            }
        }

        $projectId = $validated['project_id'];
        if (!empty($validated['first_scene_id']) && !Panorama::where('id', $validated['first_scene_id'])->where('project_id', $projectId)->exists()) {
            throw ValidationException::withMessages([
                'first_scene_id' => 'The first scene must belong to the selected project.',
            ]);
        }
        try {

            $now = now();

            $data = collect($validated['hotspots'])->map(function ($item) use ($now) {
                $existingHotspot = Hotspot::where('project_id', $item['project_id'])
                    ->where('unique_id', $item['unique_id'])
                    ->first();

                $existingDetails = $existingHotspot?->details ?? [];
                $incomingDetails = $item['details'] ?? [];
                $details = array_merge($existingDetails, $incomingDetails);
                unset($details['first_scene'], $details['next_scene_id'], $details['next_scene_path']);

                foreach (['yaw', 'pitch'] as $coordinate) {
                    if (array_key_exists($coordinate, $item)) {
                        $details[$coordinate] = $item[$coordinate];
                    }
                }
                if (array_key_exists('rotation', $item)) {
                    $details['rotation'] = $item['rotation'];
                } elseif (!array_key_exists('rotation', $details)) {
                    $details['rotation'] = 0;
                }
                $details['type'] = $item['type'];
                $details['title'] = $item['title'] ?? ($details['title'] ?? '');
                $details['description'] = $item['description'] ?? ($details['description'] ?? '');

                return [
                    'project_id' => $item['project_id'],
                    'unique_id' => $item['unique_id'],
                    'panorama_id' => $item['panorama_id'],
                    'next_panorama_id' => array_key_exists('next_panorama_id', $item)
                        ? $item['next_panorama_id']
                        : $existingHotspot?->next_panorama_id,
                    'image_id' => $item['image_id'] ?? null,
                    'details' => json_encode($details, JSON_UNESCAPED_UNICODE),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

            })
                // A save request must contain one row per existing hotspot.
                // If the client submits the same hotspot more than once, keep
                // the last version instead of allowing duplicate upsert rows.
                ->keyBy(fn ($item) => $item['project_id'].'|'.$item['unique_id'])
                ->values()
                ->toArray();

            $scopes = collect($data)
                ->groupBy(fn ($item) => $item['project_id'].'|'.$item['panorama_id'])
                ->values();

            DB::transaction(function () use ($data, $scopes, $projectId, $validated) {
                if (!empty($validated['remove_next_panorama_ids'])) {
                    Hotspot::where('project_id', $projectId)
                        ->whereIn('next_panorama_id', $validated['remove_next_panorama_ids'])
                        ->delete();
                }

                if (!empty($validated['remove_panorama_ids'])) {
                    Hotspot::where('project_id', $projectId)
                        ->whereIn('panorama_id', $validated['remove_panorama_ids'])
                        ->delete();
                    HotspotPanorama::where('project_id', $projectId)
                        ->whereIn('panorama_id', $validated['remove_panorama_ids'])
                        ->delete();
                }

                foreach ($scopes as $scope) {
                    $projectId = $scope->first()['project_id'];
                    $panoramaId = $scope->first()['panorama_id'];
                    $uniqueIds = $scope->pluck('unique_id')->all();

                    Hotspot::where('project_id', $projectId)
                        ->where('panorama_id', $panoramaId)
                        ->whereNotIn('unique_id', $uniqueIds)
                        ->delete();
                }

                // A scene with zero hotspots has no row in $scopes. Delete
                // its previously saved hotspots when the client explicitly
                // includes all scene IDs in a manual-save request.
                $scopedPanoramaIds = $scopes
                    ->map(fn ($scope) => (int) $scope->first()['panorama_id'])
                    ->all();

                foreach (array_keys($validated['panorama']) as $panoramaId) {
                    if (!in_array((int) $panoramaId, $scopedPanoramaIds, true)) {
                        Hotspot::where('project_id', $projectId)
                            ->where('panorama_id', $panoramaId)
                            ->delete();
                    }
                }

                Hotspot::upsert(
                    $data,
                    ['project_id', 'unique_id'],
                    ['panorama_id', 'next_panorama_id', 'image_id', 'details', 'updated_at']
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
        HotspotPanorama::where('project_id', $projectId)->delete();

        $registeredPanoramaIds = array_keys($validated['panorama']);
        $firstSceneId = $validated['first_scene_id'] ?? null;

        $registeredPanoramaIds = collect($registeredPanoramaIds)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($registeredPanoramaIds->isEmpty()) {
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
