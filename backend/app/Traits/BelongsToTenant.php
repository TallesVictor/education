<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder): void {
            if (!app()->bound('tenant')) {
                return;
            }

            $tenantId = app('tenant');
            if (empty($tenantId)) {
                return;
            }

            $builder->where($builder->getModel()->getTable().'.school_id', $tenantId);
        });

        static::creating(function ($model): void {
            if (!empty($model->school_id)) {
                return;
            }

            if (!app()->bound('tenant')) {
                return;
            }

            $model->school_id = app('tenant');
        });
    }
}
