<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('panoramas', 'first_scene')) {
            return;
        }

        $timestamp = now();
        DB::table('panoramas')->where('first_scene', true)->get(['id', 'project_id'])
            ->each(function ($panorama) use ($timestamp) {
                DB::table('hotspot_panoramas')->updateOrInsert(
                    ['project_id' => $panorama->project_id, 'panorama_id' => $panorama->id],
                    ['first_scene' => true, 'created_at' => $timestamp, 'updated_at' => $timestamp]
                );
            });

        Schema::table('panoramas', function (Blueprint $table) {
            $table->dropColumn('first_scene');
        });
    }

    public function down(): void
    {
        Schema::table('panoramas', function (Blueprint $table) {
            $table->boolean('first_scene')->default(false)->after('image_path');
        });

        DB::table('hotspot_panoramas')->where('first_scene', true)->get(['panorama_id'])
            ->each(fn ($registry) => DB::table('panoramas')->where('id', $registry->panorama_id)
                ->update(['first_scene' => true]));
    }
};
