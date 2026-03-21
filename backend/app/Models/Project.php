<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    public function hotspots()
    {
        return $this->hasMany(Hotspot::class);
    }

    public function projectImages(){
        return $this->hasMany(ProjectImage::class,'project_id');
    }

}
