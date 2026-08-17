<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'contact_name', 'type', 'status', 'email'];

    public function projects()
    {
        return $this->hasMany(Project::class);
    }
}
