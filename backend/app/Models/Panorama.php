<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Panorama extends Model
{
    protected $fillable = ['user_id', 'project_id', 'image_path', 'name'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function hotspotPanorama()
    {
        return $this->hasOne(HotspotPanorama::class);
    }

    public function groups()
    {
        return $this->belongsToMany(
            Group::class,
            'group_panoramas',
            'panorama_id',
            'group_id'
        );
    }
}
