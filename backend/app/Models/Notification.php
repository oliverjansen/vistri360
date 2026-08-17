<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = ['user_id', 'type', 'title', 'message', 'read_at', 'metadata'];
    protected $casts = ['read_at' => 'datetime', 'metadata' => 'array'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
