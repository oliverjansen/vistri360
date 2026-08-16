<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        abort_unless($request->user()?->hasRole($role), 403, 'You do not have permission to access this resource.');
        return $next($request);
    }
}
