<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subject_schools', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('subject_id');
            $table->unsignedBigInteger('school_id');
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['subject_id', 'school_id']);
            $table->foreign('subject_id')->references('id')->on('subjects')->cascadeOnDelete();
            $table->foreign('school_id')->references('id')->on('schools')->cascadeOnDelete();
        });

        $rows = DB::table('subjects')
            ->whereNotNull('school_id')
            ->select(['id as subject_id', 'school_id'])
            ->get()
            ->map(fn ($row) => [
                'subject_id' => $row->subject_id,
                'school_id' => $row->school_id,
                'created_at' => now(),
                'updated_at' => now(),
            ])
            ->all();

        if (!empty($rows)) {
            DB::table('subject_schools')->insert($rows);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subject_schools');
    }
};
