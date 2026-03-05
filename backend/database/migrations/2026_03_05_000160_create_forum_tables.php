<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forum_topics', function (Blueprint $table) {
            $table->id();
            $table->string('external_id', 21)->unique();
            $table->string('scope', 10);
            $table->unsignedBigInteger('school_id')->nullable();
            $table->unsignedBigInteger('class_id')->nullable();
            $table->unsignedBigInteger('created_by_user_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('attachment_path')->nullable();
            $table->string('attachment_original_name')->nullable();
            $table->string('attachment_mime_type', 160)->nullable();
            $table->string('attachment_extension', 24)->nullable();
            $table->unsignedBigInteger('attachment_size')->default(0);
            $table->json('tags')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['scope', 'school_id', 'class_id']);
            $table->index('created_by_user_id');
            $table->foreign('school_id')->references('id')->on('schools')->cascadeOnDelete();
            $table->foreign('class_id')->references('id')->on('classes')->cascadeOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('forum_discussions', function (Blueprint $table) {
            $table->id();
            $table->string('external_id', 21)->unique();
            $table->unsignedBigInteger('topic_id');
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->text('content');
            $table->unsignedTinyInteger('depth')->default(1);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['topic_id', 'parent_id']);
            $table->index('user_id');
            $table->foreign('topic_id')->references('id')->on('forum_topics')->cascadeOnDelete();
            $table->foreign('parent_id')->references('id')->on('forum_discussions')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('forum_discussion_likes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('discussion_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();

            $table->unique(['discussion_id', 'user_id']);
            $table->foreign('discussion_id')->references('id')->on('forum_discussions')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_discussion_likes');
        Schema::dropIfExists('forum_discussions');
        Schema::dropIfExists('forum_topics');
    }
};
