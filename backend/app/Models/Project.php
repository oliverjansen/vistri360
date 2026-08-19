<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['user_id', 'client_id', 'name', 'status', 'description'];

    protected $casts = ['public_share_expires_at' => 'datetime'];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function clients()
    {
        return $this->morphToMany(Client::class, 'projectable', 'client_projectable');
    }

    public function hotspots()
    {
        return $this->hasManyThrough(Hotspot::class, Panorama::class, 'project_id', 'panorama_id');
    }

    public function projectImages(){
        return $this->hasMany(ProjectImage::class,'project_id');
    }

    public function panoramas()
    {
        return $this->hasMany(Panorama::class);
    }

    public function groups()
    {
        return $this->belongsToMany(Group::class, 'project_groups', 'project_id', 'group_id');
    }

}
