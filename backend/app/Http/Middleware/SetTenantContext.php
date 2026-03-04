<?php

namespace App\Http\Middleware;

use App\Models\School;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()) {
            return $next($request);
        }

        $user = $request->user();
        $tenantId = null;

        if ($user->isAdmin()) {
            $schoolExternalId = $request->header('X-School-External-Id');

            if ($schoolExternalId) {
                $tenantId = School::query()
                    ->where('external_id', $schoolExternalId)
                    ->value('id');
            }
        } else {
            $tenantId = $user->school_id;
        }

        if ($tenantId) {
            app()->instance('tenant.school_id', $tenantId);
            $request->attributes->set('tenant_school_id', $tenantId);
        }

        return $next($request);
    }
}
