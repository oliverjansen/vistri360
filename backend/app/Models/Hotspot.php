<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hotspot extends Model
{
    protected $fillable = [
        'unique_id',
        'panorama_id',
        'type',
        'yaw',
        'pitch',
        'rotation',
        'title',
        'description',
        'next_panorama_id',
        'image_id',
    ];

    protected $casts = [
        'yaw' => 'float',
        'pitch' => 'float',
        'rotation' => 'float',
    ];

    public function hotspotImage(){
        return $this->hasMany(HotspotImage::class);
    }
    public function image(){
        return $this->belongsTo(ProjectImage::class);
    }

    public function panorama(){
        return $this->belongsTo(Panorama::class);
    }
}
