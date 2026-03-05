<?php

namespace App\Models;

use App\Traits\HasExternalId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subject extends Model
{
    use HasExternalId;
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'school_id',
        'name',
        'description',
        'image_path',
    ];

    protected $hidden = ['id'];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function schools(): BelongsToMany
    {
        return $this->belongsToMany(School::class, 'subject_schools', 'subject_id', 'school_id')
            ->wherePivotNull('deleted_at');
    }

    public function classes(): BelongsToMany
    {
        return $this->belongsToMany(SchoolClass::class, 'class_subjects', 'subject_id', 'class_id')
            ->wherePivotNull('deleted_at');
    }

    public function teachingMaterials(): BelongsToMany
    {
        return $this->belongsToMany(TeachingMaterial::class, 'teaching_material_subject', 'subject_id', 'teaching_material_id')
            ->wherePivotNull('deleted_at');
    }
}
