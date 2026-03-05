<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\HasExternalId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SchoolClass extends Model
{
    use BelongsToTenant;
    use HasExternalId;
    use HasFactory;
    use SoftDeletes;

    protected $table = 'classes';

    protected $fillable = [
        'school_id',
        'name',
        'year',
    ];

    protected $hidden = ['id'];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'class_subjects', 'class_id', 'subject_id')
            ->wherePivotNull('deleted_at');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'class_id');
    }

    public function teachingMaterials(): HasMany
    {
        return $this->hasMany(TeachingMaterial::class, 'class_id');
    }
}
