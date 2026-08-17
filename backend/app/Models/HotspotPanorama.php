<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HotspotPanorama extends Model
{
    protected $fillable = ['panorama_id', 'project_id', 'first_scene'];

    protected $casts = [
        'first_scene' => 'boolean',
    ];

    public function panorama()
    {
        return $this->belongsTo(Panorama::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function hotspots()
    {
        return $this->hasMany(Hotspot::class, 'panorama_id', 'panorama_id');
    }
};
