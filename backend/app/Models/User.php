<?php

namespace App\Models;

use App\Notifications\QueuedResetPasswordNotification;
use App\Traits\HasExternalId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasExternalId;
    use HasFactory;
    use Notifiable;
    use SoftDeletes;

    protected $fillable = [
        'school_id',
        'name',
        'social_name',
        'email',
        'password',
        'cpf',
        'phone',
    ];

    protected $hidden = [
        'id',
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function schoolRoles(): HasMany
    {
        return $this->hasMany(UserSchoolRole::class);
    }

    public function displayName(): string
    {
        return $this->social_name ?: $this->name;
    }

    public function isAdmin(): bool
    {
        return $this->schoolRoles()
            ->whereHas('role', fn ($query) => $query->where('name', 'Admin'))
            ->exists();
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new QueuedResetPasswordNotification($token));
    }
}
