<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teaching_materials', function (Blueprint $table) {
            $table->id();
            $table->string('external_id', 21)->unique();
            $table->unsignedBigInteger('school_id');
            $table->unsignedBigInteger('class_id')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('file_path');
            $table->string('file_original_name');
            $table->string('file_mime_type', 160);
            $table->string('file_extension', 24)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->string('version', 50)->nullable();
            $table->boolean('is_visible_to_students')->default(true);
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('school_id')->references('id')->on('schools')->cascadeOnDelete();
            $table->foreign('class_id')->references('id')->on('classes')->nullOnDelete();
        });

        Schema::create('teaching_material_subject', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('teaching_material_id');
            $table->unsignedBigInteger('subject_id');
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['teaching_material_id', 'subject_id']);
            $table->foreign('teaching_material_id')->references('id')->on('teaching_materials')->cascadeOnDelete();
            $table->foreign('subject_id')->references('id')->on('subjects')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teaching_material_subject');
        Schema::dropIfExists('teaching_materials');
    }
};
