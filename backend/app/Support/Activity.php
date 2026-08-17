<?php

namespace App\Support;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

class Activity
{
    public static function log(string $action, ?Request $request = null, $subject = null, array $metadata = []): void
    {
        ActivityLog::create([
            'user_id' => $request?->user()?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'metadata' => $metadata,
            'ip_address' => $request?->ip(),
        ]);
    }
}
