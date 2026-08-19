<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('client_projectable')) {
            Schema::create('client_projectable', function (Blueprint $table) {
                $table->id();
                $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
                $table->unsignedBigInteger('projectable_id');
                $table->string('projectable_type');
                $table->timestamps();
                $table->unique(['client_id', 'projectable_id', 'projectable_type'], 'client_projectable_unique');
            });
        }

        DB::table('projects')->whereNotNull('client_id')->orderBy('id')->get(['id', 'client_id'])->each(function ($project) {
            DB::table('client_projectable')->insertOrIgnore([
                'client_id' => $project->client_id,
                'projectable_id' => $project->id,
                'projectable_type' => 'App\\Models\\Project',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        if (!Schema::hasTable('project_groups')) {
            Schema::create('project_groups', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
                $table->foreignId('group_id')->constrained('groups')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['project_id', 'group_id'], 'project_groups_unique');
            });
        }

        if (Schema::hasColumn('groups', 'project_id')) {
            DB::table('groups')->orderBy('id')->get(['id', 'project_id'])->each(function ($group) {
                if ($group->project_id) {
                    DB::table('project_groups')->insertOrIgnore([
                        'project_id' => $group->project_id,
                        'group_id' => $group->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });

            $foreignKeys = DB::select(
                "SELECT DISTINCT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups'
                 AND COLUMN_NAME = 'project_id' AND REFERENCED_TABLE_NAME IS NOT NULL"
            );
            foreach ($foreignKeys as $foreignKey) {
                DB::statement('ALTER TABLE `groups` DROP FOREIGN KEY `'.$foreignKey->CONSTRAINT_NAME.'`');
            }

            $uniqueIndexes = DB::select(
                "SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups'
                 AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'"
            );
            foreach ($uniqueIndexes as $index) {
                DB::statement('ALTER TABLE `groups` DROP INDEX `'.$index->INDEX_NAME.'`');
            }

            Schema::table('groups', function (Blueprint $table) {
                $table->dropColumn('project_id');
            });
        }

        if (Schema::hasTable('panorama_groups') && !Schema::hasTable('group_panoramas')) {
            Schema::rename('panorama_groups', 'group_panoramas');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('group_panoramas') && !Schema::hasTable('panorama_groups')) {
            Schema::rename('group_panoramas', 'panorama_groups');
        }

        if (!Schema::hasColumn('groups', 'project_id')) {
            Schema::table('groups', function (Blueprint $table) {
                $table->foreignId('project_id')->nullable()->after('name')->constrained('projects')->nullOnDelete();
            });
        }

        DB::table('project_groups')->orderBy('id')->get(['project_id', 'group_id'])->each(function ($link) {
            DB::table('groups')->where('id', $link->group_id)->whereNull('project_id')->update(['project_id' => $link->project_id]);
        });

        Schema::dropIfExists('project_groups');
        Schema::dropIfExists('client_projectable');
    }
};
