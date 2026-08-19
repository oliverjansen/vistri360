<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('panoramas', function (Blueprint $table) {
            $table->foreignId('location_panorama_id')->nullable()->after('project_id')->constrained('panorama_locations')->nullOnDelete();
        });

        DB::table('projects')->orderBy('id')->each(function ($project) {
            $locationId = DB::table('panorama_locations')->insertGetId([
                'name' => 'General',
                'client_id' => $project->client_id,
                'project_id' => $project->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('panoramas')->where('project_id', $project->id)->update([
                'location_panorama_id' => $locationId,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('panoramas', function (Blueprint $table) {
            $table->dropForeign(['location_panorama_id']);
            $table->dropColumn('location_panorama_id');
        });
    }
};
