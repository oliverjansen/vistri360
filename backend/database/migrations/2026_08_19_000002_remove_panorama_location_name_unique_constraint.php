<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('panorama_locations', function (Blueprint $table) {
            // Keep the supporting project index required by the project FK,
            // while removing the name uniqueness rule.
            $table->index('project_id', 'panorama_locations_project_id_index');
            $table->dropUnique('panorama_locations_project_id_name_unique');
        });
    }

    public function down(): void
    {
        Schema::table('panorama_locations', function (Blueprint $table) {
            $table->unique(['project_id', 'name'], 'panorama_locations_project_id_name_unique');
            $table->dropIndex('panorama_locations_project_id_index');
        });
    }
};
