<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('panoramas', function (Blueprint $table) {
            $table->boolean('first_scene')->default(false)->after('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('panoramas', function (Blueprint $table) {
            $table->dropColumn('first_scene');
        });
    }
};
