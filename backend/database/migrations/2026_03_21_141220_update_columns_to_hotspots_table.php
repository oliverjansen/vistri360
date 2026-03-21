<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->bigInteger('unique_id')->unique();
            $table->longText('details');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->dropColumn(['details','unique_id']);
        });
    }
};
