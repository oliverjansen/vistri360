<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('hotspot_panoramas', 'hotspot_id')) {
            Schema::table('hotspot_panoramas', function (Blueprint $table) {
                $table->dropForeign(['hotspot_id']);
                $table->dropColumn('hotspot_id');
            });
        }

        if (Schema::hasColumn('hotspot_panoramas', 'name')) {
            Schema::table('hotspot_panoramas', function (Blueprint $table) {
                $table->dropColumn('name');
            });
        }
    }

    public function down(): void
    {
        Schema::table('hotspot_panoramas', function (Blueprint $table) {
            $table->longText('name')->nullable();
            $table->foreignId('hotspot_id')->nullable()->after('id')->constrained('panoramas')->nullOnDelete();
        });
    }
};
