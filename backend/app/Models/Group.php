<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    protected $table = 'groups';

    protected $fillable = ['name'];

    public function projects()
    {
        return $this->belongsToMany(Project::class, 'project_groups', 'group_id', 'project_id');
    }

    public function panoramas()
    {
        return $this->belongsToMany(
            Panorama::class,
            'group_panoramas',
            'group_id',
            'panorama_id'
        );
    }
}
