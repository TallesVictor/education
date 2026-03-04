<?php

namespace App\Models;

use App\Traits\HasExternalId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class School extends Model
{
    use HasExternalId;
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'cnpj',
        'type',
        'zip_code',
        'street',
        'neighborhood',
        'city',
        'state',
        'number',
        'complement',
    ];

    protected $hidden = ['id'];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
