<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('panorama_location_panorama')) {
            Schema::create('panorama_location_panorama', function (Blueprint $table) {
                $table->id();
                $table->foreignId('panorama_id')->constrained('panoramas')->cascadeOnDelete();
                $table->foreignId('panorama_location_id')->constrained('panorama_locations')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['panorama_id', 'panorama_location_id'], 'panorama_location_panorama_unique');
            });
        }

        if (Schema::hasColumn('panoramas', 'location_panorama_id')) {
            DB::table('panoramas')
                ->whereNotNull('location_panorama_id')
                ->orderBy('id')
                ->get(['id', 'location_panorama_id', 'created_at', 'updated_at'])
                ->each(function ($panorama) {
                    DB::table('panorama_location_panorama')->insertOrIgnore([
                        'panorama_id' => $panorama->id,
                        'panorama_location_id' => $panorama->location_panorama_id,
                        'created_at' => $panorama->created_at ?? now(),
                        'updated_at' => $panorama->updated_at ?? now(),
                    ]);
                });

            Schema::table('panoramas', function (Blueprint $table) {
                $table->dropForeign(['location_panorama_id']);
                $table->dropColumn('location_panorama_id');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('panoramas', 'location_panorama_id')) {
            Schema::table('panoramas', function (Blueprint $table) {
                $table->foreignId('location_panorama_id')->nullable()->after('project_id')->constrained('panorama_locations')->nullOnDelete();
            });
        }

        DB::table('panorama_location_panorama')
            ->orderBy('id')
            ->get(['panorama_id', 'panorama_location_id'])
            ->each(function ($link) {
                DB::table('panoramas')
                    ->where('id', $link->panorama_id)
                    ->whereNull('location_panorama_id')
                    ->update(['location_panorama_id' => $link->panorama_location_id]);
            });

        Schema::dropIfExists('panorama_location_panorama');
    }
};
