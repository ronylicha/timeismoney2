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
        Schema::table('clients', function (Blueprint $table) {
            // Add missing fields that the frontend/API uses
            $table->boolean('is_company')->default(false)->after('company_name');
            $table->decimal('hourly_rate', 10, 2)->nullable()->after('discount_rate');
            $table->string('currency', 3)->default('EUR')->after('hourly_rate');

            // Rename discount_rate to discount_percentage for consistency with API
            $table->renameColumn('discount_rate', 'discount_percentage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // Rename back
            $table->renameColumn('discount_percentage', 'discount_rate');

            // Drop added columns
            $table->dropColumn(['is_company', 'hourly_rate', 'currency']);
        });
    }
};
