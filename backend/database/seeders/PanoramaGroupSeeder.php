<?php

namespace Database\Seeders;

use App\Models\Group;
use App\Models\Project;
use Illuminate\Database\Seeder;

class PanoramaGroupSeeder extends Seeder
{
    public function run(): void
    {
        Project::query()->each(function (Project $project) {
            $group = $project->groups()->where('name', 'General')->first();
            if (!$group) {
                $group = Group::create(['name' => 'General']);
                $project->groups()->attach($group->id);
            }
        });
    }
}
