<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PanoramaControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_panorama_upload_preserves_the_original_filename(): void
    {
        Storage::fake('public');
        $projectId = (int) DB::table('projects')->insertGetId([
            'user_id' => 1,
            'name' => 'Filename project',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $file = UploadedFile::fake()->image('living-room-360.jpg');

        $response = $this->post('/api/panorama/upload', [
            'project_id' => $projectId,
            'panoramas' => [$file],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('panoramas', [
            'project_id' => $projectId,
            'image_path' => 'panoramas/living-room-360.jpg',
        ]);
        Storage::disk('public')->assertExists('panoramas/living-room-360.jpg');
    }

    public function test_panorama_retrieval_includes_the_hotspot_panorama_registry(): void
    {
        $projectId = (int) DB::table('projects')->insertGetId([
            'user_id' => 1,
            'name' => 'Registry project',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $panoramaId = (int) DB::table('panoramas')->insertGetId([
            'user_id' => 1,
            'project_id' => $projectId,
            'image_path' => 'panoramas/linked.jpg',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('panorama_hotspots')->insert([
            'project_id' => $projectId,
            'panorama_id' => $panoramaId,
            'first_scene' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $hotspotId = (int) DB::table('hotspots')->insertGetId([
            'project_id' => $projectId,
            'panorama_id' => $panoramaId,
            'unique_id' => 9901,
            'details' => json_encode([
                'type' => 'INFO',
                'title' => 'Registry hotspot',
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->getJson('/api/panorama?project_id='.$projectId);

        $response->assertOk()
            ->assertJsonPath('data.0.id', $panoramaId)
            ->assertJsonPath('data.0.hotspot_panorama.first_scene', true)
            ->assertJsonMissingPath('data.0.first_scene')
            ->assertJsonPath('data.0.hotspot_panorama.project_id', $projectId)
            ->assertJsonPath('data.0.hotspot_panorama.hotspots.0.id', $hotspotId)
            ->assertJsonPath('data.0.hotspot_panorama.hotspots.0.details.title', 'Registry hotspot');
    }
}
