<?php

use App\Models\Hotspot;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->foreignId('next_panorama_id')->nullable()->after('panorama_id')->constrained('panoramas')->nullOnDelete();
        });

        Hotspot::query()->each(function (Hotspot $hotspot) {
            $details = is_array($hotspot->details) ? $hotspot->details : [];
            $legacyDestination = $details['next_scene_id'] ?? null;

            if ($legacyDestination) {
                DB::table('hotspots')->where('id', $hotspot->id)->update([
                    'next_panorama_id' => $legacyDestination,
                ]);
            }

            unset($details['first_scene'], $details['next_scene_id'], $details['next_scene_path']);
            DB::table('hotspots')->where('id', $hotspot->id)->update([
                'details' => json_encode($details, JSON_UNESCAPED_UNICODE),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->dropForeign(['next_panorama_id']);
            $table->dropColumn('next_panorama_id');
        });
    }
};
