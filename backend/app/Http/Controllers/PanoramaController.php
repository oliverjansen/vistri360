<?php

namespace App\Http\Controllers;

use App\Models\Panorama;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PanoramaController extends Controller
{
    private const MAX_UPLOAD_SIZE_KB = 51200; // 50 MB per panorama.

    public function index(Request $request)
    {
        $validated = $request->validate([
            'user_id' => ['sometimes', 'integer'],
            'project_id' => ['sometimes', 'integer', 'exists:projects,id'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        try {
            $panoramas = Panorama::query()
                ->with('hotspotPanorama.hotspots')
                ->when(isset($validated['user_id']), fn ($query) => $query->where('user_id', $validated['user_id']))
                ->when(isset($validated['project_id']), fn ($query) => $query->where('project_id', $validated['project_id']))
                ->latest()
                ->limit($validated['limit'] ?? 100)
                ->get();

            return response()->json([
                'message' => 'Panoramas retrieved successfully',
                'data' => $panoramas,
            ]);
        } catch (\Throwable $exception) {
            Log::error('Panorama listing failed', ['exception' => $exception::class]);

            return response()->json(['message' => 'Unable to retrieve panoramas.'], 500);
        }
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
            'user_id' => ['sometimes', 'integer'],
        ], [
            'panoramas.*.file' => 'Each panorama must be a valid JPG or PNG upload. Check that the file is not larger than 50 MB and that the server upload limits are configured correctly.',
            'panoramas.*.mimes' => 'Each panorama must be a JPG or PNG image.',
            'panoramas.*.max' => 'Each panorama must be 50 MB or smaller.',
        ]);

        try {
            $imageData = collect($request->file('panoramas'))->map(fn ($pano) => [
                'user_id' => $request->user()?->id ?? $validated['user_id'] ?? 1,
                'project_id' => $validated['project_id'],
                'image_path' => $pano->storeAs(
                    'panoramas',
                    basename($pano->getClientOriginalName()),
                    'public'
                ),
                'created_at' => now(),
                'updated_at' => now(),
            ])->all();

            DB::transaction(fn () => Panorama::insert($imageData));

            return response()->json([
                'message' => 'Images uploaded and recorded successfully',
                'data' => Panorama::where('project_id', $validated['project_id'])->latest()->get(),
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
