<?php

namespace App\Http\Middleware;

use App\Models\BannedIp;
use App\Models\Notification;
use App\Models\Role;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class ApiRateLimitMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $ban = BannedIp::where('ip_address', $ip)->where('banned_until', '>', now())->first();
        if ($ban) return response()->json(['message' => 'This IP address is temporarily banned.'], 429);

        $key = 'api-requests:'.$ip.':'.now()->format('YmdHi');
        $count = Cache::increment($key);
        Cache::put($key, $count, now()->addMinute());

        if ($count > 200) {
            $ban = BannedIp::firstOrCreate(['ip_address' => $ip], ['banned_until' => now()->addWeek(), 'reason' => 'Exceeded 200 API requests per minute']);
            if ($ban->wasRecentlyCreated) {
                $adminIds = Role::where('name', 'admin')->first()?->users()->pluck('users.id') ?? collect();
                foreach ($adminIds as $adminId) {
                    Notification::create(['user_id' => $adminId, 'type' => 'security', 'title' => 'IP address banned', 'message' => "{$ip} exceeded the API request limit and was banned for one week.", 'metadata' => ['ip_address' => $ip]]);
                }
            }
            return response()->json(['message' => 'Too many requests. This IP has been banned for one week.'], 429);
        }

        return $next($request);
    }
}
