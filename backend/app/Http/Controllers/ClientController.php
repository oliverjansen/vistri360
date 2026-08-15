<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'with_trashed' => ['sometimes', 'boolean'],
            'only_trashed' => ['sometimes', 'boolean'],
        ]);

        try {
            $query = Client::query();

            if ($validated['only_trashed'] ?? false) {
                $query->onlyTrashed();
            } elseif ($validated['with_trashed'] ?? false) {
                $query->withTrashed();
            }

            $clients = $query
                ->withCount('projects')
                ->latest()
                ->limit($validated['limit'] ?? 50)
                ->get();

            return response()->json(['message' => 'Clients retrieved successfully', 'data' => $clients]);
        } catch (\Throwable $exception) {
            Log::error('Client listing failed', ['exception' => $exception::class]);

            return response()->json(['message' => 'Unable to retrieve clients.'], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:100',
            'status' => 'nullable|string|max:80',
            'email' => 'nullable|email|max:255',
        ]);

        try {
            $client = Client::create($validated);

            return response()->json([
                'message' => 'Client created successfully',
                'data' => $client->loadCount('projects'),
            ], 201);
        } catch (\Throwable $exception) {
            Log::error('Client creation failed', ['exception' => $exception::class]);

            return response()->json(['message' => 'Unable to create client.'], 500);
        }
    }

    public function show(Client $client)
    {
        try {
            return response()->json([
                'message' => 'Client retrieved successfully',
                'data' => $client->loadCount('projects'),
            ]);
        } catch (\Throwable $exception) {
            Log::error('Client retrieval failed', [
                'client_id' => $client->getKey(),
                'exception' => $exception::class,
            ]);

            return response()->json(['message' => 'Unable to retrieve client.'], 500);
        }
    }

    public function projects(Request $request, Client $client)
    {
        $validated = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        try {
            return response()->json([
                'message' => 'Client projects retrieved successfully',
                'data' => $client->projects()
                    ->withCount('projectImages')
                    ->latest()
                    ->limit($validated['limit'] ?? 50)
                    ->get(),
            ]);
        } catch (\Throwable $exception) {
            Log::error('Client projects retrieval failed', [
                'client_id' => $client->getKey(),
                'exception' => $exception::class,
            ]);

            return response()->json(['message' => 'Unable to retrieve client projects.'], 500);
        }
    }

    public function destroy(Client $client)
    {
        try {
            $client->delete();

            return response()->json(['message' => 'Client deleted successfully']);
        } catch (\Throwable $exception) {
            Log::error('Client deletion failed', [
                'client_id' => $client->getKey(),
                'exception' => $exception::class,
            ]);

            return response()->json(['message' => 'Unable to delete client.'], 500);
        }
    }

    public function restore($client)
    {
        try {
            $client = Client::withTrashed()->findOrFail($client);
            $client->restore();

            return response()->json([
                'message' => 'Client restored successfully',
                'data' => $client->loadCount('projects'),
            ]);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Client not found.'], 404);
        } catch (\Throwable $exception) {
            Log::error('Client restoration failed', ['exception' => $exception::class]);

            return response()->json(['message' => 'Unable to restore client.'], 500);
        }
    }
}
