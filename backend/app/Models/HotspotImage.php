<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HotspotImage extends Model
{
    public function hotspot(){
        return $this->belongsTo(Hotspot::class);
    }
}
