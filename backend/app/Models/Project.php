<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['user_id', 'client_id', 'name', 'status', 'description'];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function hotspots()
    {
        return $this->hasMany(Hotspot::class);
    }

    public function projectImages(){
        return $this->hasMany(ProjectImage::class,'project_id');
    }

    public function panoramas()
    {
        return $this->hasMany(Panorama::class);
    }

}
