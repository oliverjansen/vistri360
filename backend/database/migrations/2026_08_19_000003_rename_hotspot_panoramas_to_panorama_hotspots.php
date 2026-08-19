<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('hotspot_panoramas') && !Schema::hasTable('panorama_hotspots')) {
            Schema::rename('hotspot_panoramas', 'panorama_hotspots');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('panorama_hotspots') && !Schema::hasTable('hotspot_panoramas')) {
            Schema::rename('panorama_hotspots', 'hotspot_panoramas');
        }
    }
};
