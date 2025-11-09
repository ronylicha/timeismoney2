<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Track when alerts were sent to avoid duplicates
            $table->timestamp('vat_alert_80_sent_at')->nullable()->after('vat_threshold_exceeded_at');
            $table->timestamp('vat_alert_90_sent_at')->nullable()->after('vat_alert_80_sent_at');
            $table->timestamp('vat_alert_100_sent_at')->nullable()->after('vat_alert_90_sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'vat_alert_80_sent_at',
                'vat_alert_90_sent_at',
                'vat_alert_100_sent_at',
            ]);
        });
    }
};
