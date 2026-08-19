<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The former panorama_groups table stored group records. Move those
        // records to groups, then use panorama_groups as the relationship
        // table requested by the new hierarchy.
        if (Schema::hasTable('panorama_groups') && !Schema::hasTable('groups')) {
            Schema::rename('panorama_groups', 'groups');
        }

        if (!Schema::hasTable('groups')) {
            Schema::create('groups', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
                $table->timestamps();
            });
        }

        if (Schema::hasColumn('groups', 'client_id')) {
            // Older migrations used the pre-rename table name in the
            // constraint, so the generated Laravel name is not reliable.
            $foreignKeys = DB::select(
                "SELECT DISTINCT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups'
                 AND COLUMN_NAME = 'client_id' AND REFERENCED_TABLE_NAME IS NOT NULL"
            );
            foreach ($foreignKeys as $foreignKey) {
                DB::statement('ALTER TABLE `groups` DROP FOREIGN KEY `'.$foreignKey->CONSTRAINT_NAME.'`');
            }

            Schema::table('groups', function (Blueprint $table) {
                $table->dropColumn('client_id');
            });
        }

        if (Schema::hasTable('panorama_group_panorama') && !Schema::hasTable('panorama_groups')) {
            Schema::rename('panorama_group_panorama', 'panorama_groups');
        }

        if (Schema::hasTable('panorama_groups') && Schema::hasColumn('panorama_groups', 'panorama_group_id')) {
            Schema::table('panorama_groups', function (Blueprint $table) {
                $table->renameColumn('panorama_group_id', 'group_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('panorama_groups') && !Schema::hasTable('panorama_group_panorama')) {
            Schema::rename('panorama_groups', 'panorama_group_panorama');
        }

        if (Schema::hasTable('panorama_group_panorama') && Schema::hasColumn('panorama_group_panorama', 'group_id')) {
            Schema::table('panorama_group_panorama', function (Blueprint $table) {
                $table->renameColumn('group_id', 'panorama_group_id');
            });
        }

        if (Schema::hasTable('groups') && !Schema::hasTable('panorama_groups')) {
            Schema::rename('groups', 'panorama_groups');
        }
    }
};
