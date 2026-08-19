<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->dropColumn('details');
            $table->double('yaw')->nullable()->after('type');
            $table->double('pitch')->nullable()->after('yaw');
            $table->double('rotation')->default(0)->after('pitch');
            $table->string('title')->nullable()->after('rotation');
            $table->text('description')->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->dropColumn(['yaw', 'pitch', 'rotation', 'title', 'description']);
            $table->longText('details')->nullable();
        });
    }
};
