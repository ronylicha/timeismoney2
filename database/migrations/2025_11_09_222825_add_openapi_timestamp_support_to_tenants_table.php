<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add OpenAPI.com support to timestamp settings
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Update timestamp_provider enum to include openapi
            $table->enum('timestamp_provider', ['simple', 'universign', 'chambersign', 'certeurope', 'openapi'])
                  ->default('simple')
                  ->change();
            
            // Add OpenAPI.com specific fields
            $table->string('timestamp_certificate_id')->nullable()->after('timestamp_api_secret');
            $table->boolean('timestamp_include_certificate')->default(false)->after('timestamp_certificate_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Remove OpenAPI.com specific fields
            $table->dropColumn(['timestamp_certificate_id', 'timestamp_include_certificate']);
            
            // Revert timestamp_provider enum (note: this might not work in all MySQL versions)
            $table->enum('timestamp_provider', ['simple', 'universign', 'chambersign', 'certeurope'])
                  ->default('simple')
                  ->change();
        });
    }
};
