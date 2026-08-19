<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Http\Controllers\HotspotController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Support\Activity;

class ProjectController extends Controller
{
    private const PROJECT_COLUMNS = [
        'id',
        'client_id',
        'name',
        'status',
        'description',
        'public_share_token',
        'public_share_expires_at',
    ];

    public function index(Request $request)
    {
        $validated = $request->validate([
            'client_id' => ['sometimes', 'integer', 'exists:clients,id'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        try {
            $projects = Project::query()
                ->select(self::PROJECT_COLUMNS)
                ->when(isset($validated['client_id']), fn ($query) => $query->whereHas('clients', fn ($clientQuery) => $clientQuery->whereKey($validated['client_id'])))
                ->withCount('projectImages')
                ->latest()
                ->limit($validated['limit'] ?? 50)
                ->get();

            return response()->json([
                'message' => 'Projects retrieved successfully',
                'data' => $projects,
            ]);
        } catch (\Throwable $exception) {
            Log::error('Project listing failed', ['exception' => $exception::class]);

            return response()->json(['message' => 'Unable to retrieve projects.'], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'name' => 'required|string|max:255',
            'status' => 'nullable|string|max:80',
            'description' => 'nullable|string',
        ]);

        try {
            $project = Project::create([
                'client_id' => $validated['client_id'],
                'name' => $validated['name'],
                'status' => $validated['status'] ?? 'Draft',
                'description' => $validated['description'] ?? null,
                'user_id' => $request->user()?->id ?? 1,
            ]);
            $project->clients()->syncWithoutDetaching([$validated['client_id']]);
            Activity::log('project.created', $request, $project);

            $project->loadCount('projectImages');

            return response()->json([
                'message' => 'Project created successfully',
                'data' => $this->projectPayload($project, true),
            ], 201);
        } catch (\Throwable $exception) {
            Log::error('Project creation failed', ['exception' => $exception::class]);

            return response()->json(['message' => 'Unable to create project.'], 500);
        }
    }

    public function show(Project $project)
    {
        try {
            return response()->json([
                'message' => 'Project retrieved successfully',
                'data' => $this->projectPayload($project),
            ]);
        } catch (\Throwable $exception) {
            Log::error('Project retrieval failed', [
                'project_id' => $project->getKey(),
                'exception' => $exception::class,
            ]);

            return response()->json(['message' => 'Unable to retrieve project.'], 500);
        }
    }

    public function update(Request $request, Project $project)
    {
        $projectChanges = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string'],
        ]);

        if ($projectChanges !== []) {
            $project->update($projectChanges);
        }

        $request->merge(['project_id' => $project->id]);

        return app(HotspotController::class)->updateProject($request);
    }

    private function projectPayload(Project $project, bool $includeImageCount = false): array
    {
        $columns = self::PROJECT_COLUMNS;
        if ($includeImageCount) {
            $columns[] = 'project_images_count';
        }

        return $project->only($columns);
    }
}
