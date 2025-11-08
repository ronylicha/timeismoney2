<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('notification_type');
            $table->boolean('channel_email')->default(true);
            $table->boolean('channel_push')->default(true);
            $table->boolean('channel_inapp')->default(true);
            $table->string('frequency')->default('realtime'); // realtime, daily, weekly
            $table->json('quiet_hours')->nullable(); // {enabled: true, start: "22:00", end: "08:00"}
            $table->timestamps();

            $table->unique(['user_id', 'notification_type']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};