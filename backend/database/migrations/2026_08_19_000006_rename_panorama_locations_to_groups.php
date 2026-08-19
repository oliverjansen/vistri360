<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('panorama_locations') && !Schema::hasTable('panorama_groups')) {
            Schema::rename('panorama_locations', 'panorama_groups');
        }

        if (Schema::hasTable('panorama_location_panorama') && !Schema::hasTable('panorama_group_panorama')) {
            Schema::rename('panorama_location_panorama', 'panorama_group_panorama');
        }

        if (Schema::hasTable('panorama_group_panorama') && Schema::hasColumn('panorama_group_panorama', 'panorama_location_id')) {
            Schema::table('panorama_group_panorama', function (Blueprint $table) {
                $table->renameColumn('panorama_location_id', 'panorama_group_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('panorama_group_panorama') && Schema::hasColumn('panorama_group_panorama', 'panorama_group_id')) {
            Schema::table('panorama_group_panorama', function (Blueprint $table) {
                $table->renameColumn('panorama_group_id', 'panorama_location_id');
            });
        }

        if (Schema::hasTable('panorama_group_panorama') && !Schema::hasTable('panorama_location_panorama')) {
            Schema::rename('panorama_group_panorama', 'panorama_location_panorama');
        }

        if (Schema::hasTable('panorama_groups') && !Schema::hasTable('panorama_locations')) {
            Schema::rename('panorama_groups', 'panorama_locations');
        }
    }
};
