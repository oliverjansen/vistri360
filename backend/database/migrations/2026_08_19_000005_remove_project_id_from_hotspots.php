<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->dropUnique('hotspots_project_unique_id_unique');
            $table->unique(['panorama_id', 'unique_id'], 'hotspots_panorama_unique_id_unique');
            $table->dropColumn('project_id');
        });
    }

    public function down(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->unsignedBigInteger('project_id')->nullable()->after('id');
        });

        DB::table('hotspots')->orderBy('id')->get(['id', 'panorama_id'])->each(function ($hotspot) {
            $projectId = DB::table('panoramas')->where('id', $hotspot->panorama_id)->value('project_id');
            DB::table('hotspots')->where('id', $hotspot->id)->update(['project_id' => $projectId]);
        });

        Schema::table('hotspots', function (Blueprint $table) {
            $table->dropUnique('hotspots_panorama_unique_id_unique');
            $table->unique(['project_id', 'unique_id'], 'hotspots_project_unique_id_unique');
        });
    }
};
