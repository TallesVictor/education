<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\HasExternalId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeachingMaterial extends Model
{
    use BelongsToTenant;
    use HasExternalId;
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'school_id',
        'class_id',
        'title',
        'description',
        'file_path',
        'file_original_name',
        'file_mime_type',
        'file_extension',
        'file_size',
        'published_at',
        'version',
        'is_visible_to_students',
    ];

    protected $hidden = ['id'];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'is_visible_to_students' => 'boolean',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'teaching_material_subject', 'teaching_material_id', 'subject_id')
            ->wherePivotNull('deleted_at');
    }
}
