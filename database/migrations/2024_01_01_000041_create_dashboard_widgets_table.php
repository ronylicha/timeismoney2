<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dashboard_widgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('widget_type'); // revenue_chart, time_tracker, project_status, team_activity, etc.
            $table->string('title');
            $table->json('settings'); // Widget-specific settings
            $table->integer('position_x')->default(0);
            $table->integer('position_y')->default(0);
            $table->integer('width')->default(4); // Grid columns (1-12)
            $table->integer('height')->default(2); // Grid rows
            $table->boolean('is_visible')->default(true);
            $table->integer('refresh_interval')->default(300); // seconds
            $table->timestamps();

            $table->index(['tenant_id', 'user_id', 'is_visible']);
            $table->index('widget_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_widgets');
    }
};