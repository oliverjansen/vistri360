<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ShareRateLimitMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $key = 'share-view:' . $request->ip() . ':' . $request->route('token') . ':' . now()->format('YmdHi');
        $count = Cache::increment($key);
        Cache::put($key, $count, now()->addMinute());

        if ($count > 60) {
            return response()->json(['message' => 'Too many requests for this public tour. Please try again shortly.'], 429);
        }

        return $next($request);
    }
}
