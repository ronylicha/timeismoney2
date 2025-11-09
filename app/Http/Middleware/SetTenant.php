<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenant
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->check()) {
            $user = auth()->user();

            // Super-admins have global access and don't belong to any tenant
            if ($user->hasRole('super-admin')) {
                // Clear any tenant restrictions for super-admin
                session(['tenant_id' => null]);
                session(['is_super_admin' => true]);
                config(['tenant.id' => null]);
                config(['tenant.current' => null]);
            } else {
                // Normal users belong to a tenant
                session(['tenant_id' => $user->tenant_id]);
                session(['is_super_admin' => false]);

                // Set tenant in config for any services that might need it
                config(['tenant.id' => $user->tenant_id]);

                // Load tenant object if needed
                if ($user->tenant) {
                    session(['tenant' => $user->tenant]);
                    config(['tenant.current' => $user->tenant]);
                }
            }
        }

        return $next($request);
    }
}