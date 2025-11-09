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
        Schema::table('projects', function (Blueprint $table) {
            // Taux Journalier Moyen (TJM) for fixed pricing
            $table->decimal('daily_rate', 10, 2)->nullable()->after('hourly_rate');

            // Estimated days for fixed pricing
            $table->decimal('estimated_days', 8, 2)->nullable()->after('estimated_hours');

            // Monthly amount for retainer/maintenance
            $table->decimal('monthly_amount', 10, 2)->nullable()->after('budget');

            // Contract duration in months for retainer
            $table->integer('contract_duration')->nullable()->after('monthly_amount');

            // Billing frequency for retainer/maintenance
            $table->enum('billing_frequency', ['monthly', 'quarterly', 'yearly'])
                ->nullable()
                ->after('contract_duration');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'daily_rate',
                'estimated_days',
                'monthly_amount',
                'contract_duration',
                'billing_frequency'
            ]);
        });
    }
};
