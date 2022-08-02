<?php

namespace App\Http\Middleware;

use Closure;

class ThrottlePreloads
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        $lastPreloadTime = $request->session()->get("lastPreloadTime");
        $now = time();
        $request->session()->put("lastPreloadTime", $now);
        $minTimeDifference = 1;

        if (($now - $lastPreloadTime) < $minTimeDifference) {
            return response("Too many requests, slow down pre-loading tables", 429);
        }

        return $next($request);
    }
}
