<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotspot_panoramas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('panorama_id')->constrained('panoramas')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->boolean('first_scene')->default(false);
            $table->timestamps();
            $table->unique(['project_id', 'panorama_id']);
        });

        $timestamp = now();
        $legacyFirstScenes = DB::table('panoramas')
            ->whereNotNull('project_id')
            ->where('first_scene', true)
            ->get(['project_id', 'id']);

        if ($legacyFirstScenes->isNotEmpty()) {
            DB::table('hotspot_panoramas')->insert($legacyFirstScenes->map(fn ($panorama) => [
                'project_id' => $panorama->project_id,
                'panorama_id' => $panorama->id,
                'first_scene' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ])->all());
        }

    }

    public function down(): void
    {
        Schema::dropIfExists('hotspot_panoramas');
    }
};
