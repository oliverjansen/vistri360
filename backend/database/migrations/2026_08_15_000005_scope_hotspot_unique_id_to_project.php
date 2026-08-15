<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->dropUnique('hotspots_unique_id_unique');
            $table->unique(['project_id', 'unique_id'], 'hotspots_project_unique_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->dropUnique('hotspots_project_unique_id_unique');
            $table->unique('unique_id', 'hotspots_unique_id_unique');
        });
    }
};
