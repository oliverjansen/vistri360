<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hotspot extends Model
{
    public function hotspotImage(){
        return $this->hasMany(HotspotImage::class);
    }
    public function project()
    {
        return $this->belongsTo(Project::class);
    }
    public function image(){
        return $this->belongsTo(ProjectImage::class);
    }
}
