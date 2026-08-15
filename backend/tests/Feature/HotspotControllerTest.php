<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HotspotControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_hotspot_sync_removes_only_stale_hotspots_from_the_submitted_project_and_panorama(): void
    {
        $projectId = $this->createProject('Primary project');
        $otherProjectId = $this->createProject('Other project');
        $panoramaId = $this->createPanorama($projectId, 'primary.jpg');
        $otherPanoramaId = $this->createPanorama($projectId, 'other-room.jpg');
        $otherProjectPanoramaId = $this->createPanorama($otherProjectId, 'other-project.jpg');

        $this->createHotspot($projectId, $panoramaId, 101, ['title' => 'Remove me']);
        $this->createHotspot($projectId, $panoramaId, 102, ['title' => 'Keep and update']);
        $this->createHotspot($projectId, $otherPanoramaId, 201, ['title' => 'Other panorama']);
        $this->createHotspot($otherProjectId, $otherProjectPanoramaId, 301, ['title' => 'Other project']);

        $response = $this->putJson('/api/projects/hotspots/updateHotspost', $this->payload($projectId, [[
                'project_id' => $projectId,
                'unique_id' => 102,
                'panorama_id' => $panoramaId,
                'type' => 'INFO',
                'details' => ['title' => 'Updated'],
            ]]));

        $response->assertOk();
        $this->assertDatabaseMissing('hotspots', ['project_id' => $projectId, 'panorama_id' => $panoramaId, 'unique_id' => 101]);
        $this->assertDatabaseHas('hotspots', ['project_id' => $projectId, 'panorama_id' => $panoramaId, 'unique_id' => 102]);
        $this->assertDatabaseHas('hotspots', ['project_id' => $projectId, 'panorama_id' => $otherPanoramaId, 'unique_id' => 201]);
        $this->assertDatabaseHas('hotspots', ['project_id' => $otherProjectId, 'panorama_id' => $otherProjectPanoramaId, 'unique_id' => 301]);

        $this->assertEquals(
            ['title' => 'Updated', 'description' => '', 'type' => 'INFO', 'rotation' => 0],
            json_decode(DB::table('hotspots')->where('project_id', $projectId)->where('unique_id', 102)->value('details'), true)
        );
    }

    public function test_updating_information_tag_preserves_existing_coordinates_on_the_same_hotspot(): void
    {
        $projectId = $this->createProject('Metadata project');
        $panoramaId = $this->createPanorama($projectId, 'metadata-room.jpg');

        $this->createHotspot($projectId, $panoramaId, 501, [
            'unique_id' => 501,
            'type' => 'INFO',
            'yaw' => 1.25,
            'pitch' => -0.35,
            'title' => 'Original title',
            'description' => 'Original description',
        ]);

        $response = $this->putJson('/api/projects/hotspots/updateHotspost', $this->payload($projectId, [[
                'project_id' => $projectId,
                'unique_id' => 501,
                'panorama_id' => $panoramaId,
                'type' => 'INFO',
                // This reproduces the partial request that previously caused
                // "Undefined array key details" in HotspotController.
                'title' => 'Updated title',
                'description' => 'Updated description',
            ]]));

        $response->assertOk();

        $this->assertSame(1, DB::table('hotspots')
            ->where('project_id', $projectId)
            ->where('unique_id', 501)
            ->count());

        $savedDetails = json_decode(DB::table('hotspots')
            ->where('project_id', $projectId)
            ->where('unique_id', 501)
            ->value('details'), true);

        $this->assertSame(501, $savedDetails['unique_id']);
        $this->assertSame('INFO', $savedDetails['type']);
        $this->assertSame(1.25, $savedDetails['yaw']);
        $this->assertSame(-0.35, $savedDetails['pitch']);
        $this->assertSame('Updated title', $savedDetails['title']);
        $this->assertSame('Updated description', $savedDetails['description']);
    }

    public function test_navigation_hotspot_requires_type_and_persists_navigation_metadata(): void
    {
        $projectId = $this->createProject('Navigation project');
        $panoramaId = $this->createPanorama($projectId, 'current-room.jpg');
        $destinationId = $this->createPanorama($projectId, 'next-room.jpg');

        $missingTypeResponse = $this->putJson('/api/projects/hotspots/updateHotspost', $this->payload($projectId, [[
                'project_id' => $projectId,
                'unique_id' => 601,
                'panorama_id' => $panoramaId,
                'next_panorama_id' => $destinationId,
            ]]));

        $missingTypeResponse
            ->assertStatus(422)
            ->assertJsonValidationErrors(['hotspots.0.type']);

        $response = $this->putJson('/api/projects/hotspots/updateHotspost', $this->payload($projectId, [[
                'project_id' => $projectId,
                'unique_id' => 601,
                'panorama_id' => $panoramaId,
                'type' => 'LINK',
                'rotation' => 90,
                'next_panorama_id' => $destinationId,
                'details' => [
                    'yaw' => 0.75,
                    'pitch' => -0.2,
                ],
            ]]));

        $response->assertOk();

        $savedDetails = json_decode(DB::table('hotspots')
            ->where('project_id', $projectId)
            ->where('unique_id', 601)
            ->value('details'), true);

        $this->assertSame('LINK', $savedDetails['type']);
        $this->assertSame(90, $savedDetails['rotation']);
        $this->assertSame(0.75, $savedDetails['yaw']);
        $this->assertSame(-0.2, $savedDetails['pitch']);
        $this->assertArrayNotHasKey('first_scene', $savedDetails);
        $this->assertArrayNotHasKey('next_scene_id', $savedDetails);
        $this->assertSame($destinationId, DB::table('hotspots')->where('project_id', $projectId)->where('unique_id', 601)->value('next_panorama_id'));
        $this->assertDatabaseHas('hotspot_panoramas', [
            'project_id' => $projectId,
            'panorama_id' => $destinationId,
            'first_scene' => false,
        ]);
    }

    public function test_manual_save_accepts_hotspots_from_multiple_panorama_scenes(): void
    {
        $projectId = $this->createProject('All scenes project');
        $firstPanoramaId = $this->createPanorama($projectId, 'first-room.jpg');
        $secondPanoramaId = $this->createPanorama($projectId, 'second-room.jpg');

        $response = $this->putJson('/api/projects/hotspots/updateHotspost', $this->payload($projectId, [[
                    'project_id' => $projectId,
                    'unique_id' => 801,
                    'panorama_id' => $firstPanoramaId,
                    'type' => 'LINK',
                    'next_panorama_id' => $secondPanoramaId,
                    'details' => ['type' => 'LINK'],
                ], [
                    'project_id' => $projectId,
                    'unique_id' => 802,
                    'panorama_id' => $secondPanoramaId,
                    'type' => 'INFO',
                    'details' => [
                        'type' => 'INFO',
                        'title' => 'Second room',
                    ],
                ]], ['first_scene_id' => $secondPanoramaId]));

        $response->assertOk();
        $this->assertDatabaseHas('hotspots', [
            'project_id' => $projectId,
            'panorama_id' => $firstPanoramaId,
            'unique_id' => 801,
        ]);
        $this->assertDatabaseHas('hotspots', [
            'project_id' => $projectId,
            'panorama_id' => $secondPanoramaId,
            'unique_id' => 802,
        ]);
        $this->assertDatabaseHas('hotspot_panoramas', [
            'project_id' => $projectId,
            'panorama_id' => $firstPanoramaId,
            'first_scene' => false,
        ]);
        $this->assertDatabaseHas('hotspot_panoramas', [
            'project_id' => $projectId,
            'panorama_id' => $secondPanoramaId,
            'first_scene' => true,
        ]);
    }

    public function test_manual_save_removes_hotspots_targeting_removed_panorama_destinations(): void
    {
        $projectId = $this->createProject('Removed destination project');
        $otherProjectId = $this->createProject('Unrelated project');
        $sourcePanoramaId = $this->createPanorama($projectId, 'source.jpg');
        $removedDestinationId = $this->createPanorama($projectId, 'removed.jpg');
        $otherDestinationId = $this->createPanorama($otherProjectId, 'other-destination.jpg');

        $this->createHotspot($projectId, $sourcePanoramaId, 901, ['type' => 'LINK']);
        DB::table('hotspots')->where('project_id', $projectId)->where('unique_id', 901)->update([
            'next_panorama_id' => $removedDestinationId,
        ]);

        $otherSourcePanoramaId = $this->createPanorama($otherProjectId, 'other-source.jpg');
        $this->createHotspot($otherProjectId, $otherSourcePanoramaId, 902, ['type' => 'LINK']);
        DB::table('hotspots')->where('project_id', $otherProjectId)->where('unique_id', 902)->update([
            'next_panorama_id' => $otherDestinationId,
        ]);

        $response = $this->putJson('/api/projects/hotspots/updateHotspost', $this->payload($projectId, [], [
            'remove_next_panorama_ids' => [$removedDestinationId],
        ]));

        $response->assertOk();
        $this->assertDatabaseMissing('hotspots', [
            'project_id' => $projectId,
            'unique_id' => 901,
        ]);
        $this->assertDatabaseHas('hotspots', [
            'project_id' => $otherProjectId,
            'unique_id' => 902,
            'next_panorama_id' => $otherDestinationId,
        ]);
    }

    public function test_information_hotspot_requires_only_title_and_allows_empty_description(): void
    {
        $projectId = $this->createProject('Information project');
        $panoramaId = $this->createPanorama($projectId, 'information-room.jpg');

        $response = $this->putJson('/api/projects/hotspots/updateHotspost', $this->payload($projectId, [[
                'project_id' => $projectId,
                'unique_id' => 701,
                'panorama_id' => $panoramaId,
                'type' => 'INFO',
                'title' => 'Room details',
            ]]));

        $response->assertOk();

        $savedDetails = json_decode(DB::table('hotspots')
            ->where('project_id', $projectId)
            ->where('unique_id', 701)
            ->value('details'), true);

        $this->assertSame('Room details', $savedDetails['title']);
        $this->assertSame('', $savedDetails['description']);
    }

    public function test_manual_save_deletes_an_information_hotspot_when_a_scene_has_no_remaining_hotspots(): void
    {
        $projectId = $this->createProject('Information deletion project');
        $panoramaId = $this->createPanorama($projectId, 'information-delete.jpg');
        $this->createHotspot($projectId, $panoramaId, 703, [
            'type' => 'INFO',
            'title' => 'Delete me',
        ]);

        $response = $this->putJson('/api/projects/hotspots/updateHotspost', $this->payload($projectId, [], [
            'panorama' => [(string) $panoramaId => []],
        ]));

        $response->assertOk();
        $this->assertDatabaseMissing('hotspots', [
            'project_id' => $projectId,
            'panorama_id' => $panoramaId,
            'unique_id' => 703,
        ]);
    }

    public function test_manual_save_clears_first_scene_when_all_scenes_are_removed(): void
    {
        $projectId = $this->createProject('First scene removal project');
        $panoramaId = $this->createPanorama($projectId, 'only-scene.jpg');
        DB::table('hotspot_panoramas')->insert([
            'project_id' => $projectId,
            'panorama_id' => $panoramaId,
            'first_scene' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->putJson('/api/projects/hotspots/updateHotspost', $this->payload($projectId, [], [
            'first_scene_id' => null,
            'panorama' => [(string) $panoramaId => []],
        ]));

        $response->assertOk();
        $this->assertDatabaseHas('hotspot_panoramas', [
            'panorama_id' => $panoramaId,
            'project_id' => $projectId,
            'first_scene' => false,
        ]);
    }

    public function test_manual_save_removes_hotspot_panorama_registry_when_all_scenes_are_removed(): void
    {
        $projectId = $this->createProject('Registry removal project');
        $panoramaId = $this->createPanorama($projectId, 'only-scene.jpg');
        DB::table('hotspot_panoramas')->insert([
            'project_id' => $projectId,
            'panorama_id' => $panoramaId,
            'first_scene' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $hotspotId = DB::table('hotspots')->insertGetId([
            'project_id' => $projectId,
            'panorama_id' => $panoramaId,
            'unique_id' => 904,
            'details' => json_encode(['type' => 'INFO', 'title' => 'Scene hotspot']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->putJson('/api/projects/hotspots/updateHotspost', $this->payload($projectId, [], [
            'first_scene_id' => null,
            'remove_panorama_ids' => [$panoramaId],
        ]));

        $response->assertOk();
        $this->assertDatabaseMissing('hotspot_panoramas', [
            'project_id' => $projectId,
            'panorama_id' => $panoramaId,
        ]);
        $this->assertDatabaseMissing('hotspots', ['id' => $hotspotId]);
    }

    private function payload(int $projectId, array $hotspots, array $overrides = []): array
    {
        $panorama = [];

        foreach ($hotspots as $hotspot) {
            $hotspot['project_id'] ??= $projectId;
            $hotspot['details'] ??= array_filter([
                'type' => $hotspot['type'] ?? null,
                'title' => $hotspot['title'] ?? null,
                'description' => $hotspot['description'] ?? null,
            ], static fn ($value) => $value !== null);
            $panorama[(string) $hotspot['panorama_id']][] = ['hotspot' => $hotspot];

            if (!empty($hotspot['next_panorama_id'])) {
                $panorama[(string) $hotspot['next_panorama_id']] ??= [];
            }
        }

        return array_merge([
            'project_id' => $projectId,
            'panorama' => $panorama,
        ], $overrides);
    }

    private function createProject(string $name): int
    {
        return (int) DB::table('projects')->insertGetId([
            'user_id' => 1,
            'name' => $name,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createPanorama(int $projectId, string $imagePath): int
    {
        return (int) DB::table('panoramas')->insertGetId([
            'user_id' => 1,
            'project_id' => $projectId,
            'image_path' => $imagePath,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createHotspot(int $projectId, int $panoramaId, int $uniqueId, array $details): void
    {
        DB::table('hotspots')->insert([
            'project_id' => $projectId,
            'panorama_id' => $panoramaId,
            'unique_id' => $uniqueId,
            'details' => json_encode($details),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
