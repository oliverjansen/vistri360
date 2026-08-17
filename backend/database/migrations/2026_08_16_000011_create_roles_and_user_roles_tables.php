<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
        });
        Schema::create('user_roles', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->primary(['user_id', 'role_id']);
        });

        $adminRole = DB::table('roles')->insertGetId(['name' => 'admin']);
        $userRole = DB::table('roles')->insertGetId(['name' => 'user']);
        $now = now();
        DB::table('users')->insert([
            ['name' => 'Demo Admin', 'email' => 'admin@vistri.test', 'password' => Hash::make('password123'), 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Demo User', 'email' => 'user@vistri.test', 'password' => Hash::make('password123'), 'created_at' => $now, 'updated_at' => $now],
        ]);
        $adminId = DB::table('users')->where('email', 'admin@vistri.test')->value('id');
        $userId = DB::table('users')->where('email', 'user@vistri.test')->value('id');
        DB::table('user_roles')->insert([['user_id' => $adminId, 'role_id' => $adminRole], ['user_id' => $userId, 'role_id' => $userRole]]);
    }

    public function down(): void
    {
        DB::table('user_roles')->whereIn('user_id', DB::table('users')->whereIn('email', ['admin@vistri.test', 'user@vistri.test'])->pluck('id'))->delete();
        DB::table('users')->whereIn('email', ['admin@vistri.test', 'user@vistri.test'])->delete();
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('roles');
    }
};
