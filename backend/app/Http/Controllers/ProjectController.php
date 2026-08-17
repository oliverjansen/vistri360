<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Support\Activity;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'client_id' => ['sometimes', 'integer', 'exists:clients,id'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        try {
            $projects = Project::query()
                ->when(isset($validated['client_id']), fn ($query) => $query->where('client_id', $validated['client_id']))
                ->withCount('projectImages')
                ->latest()
                ->limit($validated['limit'] ?? 50)
                ->get();

            return response()->json(['message' => 'Projects retrieved successfully', 'data' => $projects]);
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
            Activity::log('project.created', $request, $project);

            return response()->json([
                'message' => 'Project created successfully',
                'data' => $project->loadCount('projectImages'),
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
                'data' => $project->load('client', 'projectImages', 'hotspots.image'),
            ]);
        } catch (\Throwable $exception) {
            Log::error('Project retrieval failed', [
                'project_id' => $project->getKey(),
                'exception' => $exception::class,
            ]);

            return response()->json(['message' => 'Unable to retrieve project.'], 500);
        }
    }
}
