<?php

namespace App\Traits;

use Hidehalo\Nanoid\Client;

trait HasExternalId
{
    public static function bootHasExternalId(): void
    {
        static::creating(function ($model): void {
            if (!empty($model->external_id)) {
                return;
            }

            $nanoid = new Client();
            $model->external_id = $nanoid->generateId(21);
        });
    }

    public function getRouteKeyName(): string
    {
        return 'external_id';
    }
}
