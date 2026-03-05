<?php

namespace App\Models;

use App\Traits\HasExternalId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ForumTopic extends Model
{
    use HasExternalId;
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'scope',
        'school_id',
        'class_id',
        'created_by_user_id',
        'title',
        'description',
        'attachment_path',
        'attachment_original_name',
        'attachment_mime_type',
        'attachment_extension',
        'attachment_size',
        'tags',
        'expires_at',
        'is_pinned',
    ];

    protected $hidden = ['id'];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'expires_at' => 'datetime',
            'is_pinned' => 'boolean',
            'attachment_size' => 'integer',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function discussions(): HasMany
    {
        return $this->hasMany(ForumDiscussion::class, 'topic_id');
    }
}
