<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add PDP configuration columns to tenants table
     * Each tenant will have its own PDP integration settings
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // PDP Activation
            $table->boolean('pdp_enabled')->default(false)->after('stripe_connected_at');
            
            // PDP Mode (simulation or production)
            $table->enum('pdp_mode', ['simulation', 'production'])->default('simulation')->after('pdp_enabled');
            
            // PDP API Configuration
            $table->string('pdp_base_url')->nullable()->after('pdp_mode');
            $table->string('pdp_oauth_url')->nullable()->after('pdp_base_url');
            $table->string('pdp_client_id')->nullable()->after('pdp_oauth_url');
            $table->string('pdp_client_secret')->nullable()->after('pdp_client_id');
            $table->string('pdp_scope')->default('invoice_submit invoice_read')->after('pdp_client_secret');
            
            // PDP Settings
            $table->integer('pdp_timeout')->default(30)->after('pdp_scope');
            $table->integer('pdp_retry_attempts')->default(3)->after('pdp_timeout');
            $table->integer('pdp_retry_delay')->default(5)->after('pdp_retry_attempts');
            
            // PDP Simulation Settings
            $table->boolean('pdp_simulation_auto_approve')->default(true)->after('pdp_retry_delay');
            $table->integer('pdp_simulation_processing_delay')->default(30)->after('pdp_simulation_auto_approve');
            $table->integer('pdp_simulation_error_rate')->default(0)->after('pdp_simulation_processing_delay');
            
            // PDP Webhook Settings
            $table->boolean('pdp_webhook_enabled')->default(false)->after('pdp_simulation_error_rate');
            $table->string('pdp_webhook_url')->nullable()->after('pdp_webhook_enabled');
            $table->string('pdp_webhook_secret')->nullable()->after('pdp_webhook_url');
            
            // PDP Notification Settings
            $table->boolean('pdp_notifications_email_enabled')->default(true)->after('pdp_webhook_secret');
            
            // PDP Connection Status
            $table->timestamp('pdp_connected_at')->nullable()->after('pdp_notifications_email_enabled');
            $table->text('pdp_connection_error')->nullable()->after('pdp_connected_at');
            
            // Timestamp Settings
            $table->boolean('timestamp_enabled')->default(false)->after('pdp_connection_error');
            $table->enum('timestamp_provider', ['simple', 'universign', 'chambersign', 'certeurope'])->default('simple')->after('timestamp_enabled');
            $table->string('timestamp_tsa_url')->nullable()->after('timestamp_provider');
            $table->string('timestamp_api_key')->nullable()->after('timestamp_tsa_url');
            $table->string('timestamp_api_secret')->nullable()->after('timestamp_api_key');
            $table->boolean('timestamp_use_sandbox')->default(true)->after('timestamp_api_secret');
            $table->integer('timestamp_retry_max_attempts')->default(3)->after('timestamp_use_sandbox');
            $table->integer('timestamp_retry_delay_seconds')->default(60)->after('timestamp_retry_max_attempts');
            $table->json('timestamp_actions')->nullable()->after('timestamp_retry_delay_seconds');
            
            // Timestamp Connection Status
            $table->timestamp('timestamp_connected_at')->nullable()->after('timestamp_actions');
            $table->text('timestamp_connection_error')->nullable()->after('timestamp_connected_at');
            
            // Indexes
            $table->index('pdp_enabled');
            $table->index('pdp_mode');
            $table->index('timestamp_enabled');
            $table->index('timestamp_provider');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['pdp_enabled']);
            $table->dropIndex(['pdp_mode']);
            $table->dropIndex(['timestamp_enabled']);
            $table->dropIndex(['timestamp_provider']);
            
            $table->dropColumn([
                'pdp_enabled',
                'pdp_mode',
                'pdp_base_url',
                'pdp_oauth_url',
                'pdp_client_id',
                'pdp_client_secret',
                'pdp_scope',
                'pdp_timeout',
                'pdp_retry_attempts',
                'pdp_retry_delay',
                'pdp_simulation_auto_approve',
                'pdp_simulation_processing_delay',
                'pdp_simulation_error_rate',
                'pdp_webhook_enabled',
                'pdp_webhook_url',
                'pdp_webhook_secret',
                'pdp_notifications_email_enabled',
                'pdp_connected_at',
                'pdp_connection_error',
                'timestamp_enabled',
                'timestamp_provider',
                'timestamp_tsa_url',
                'timestamp_api_key',
                'timestamp_api_secret',
                'timestamp_use_sandbox',
                'timestamp_retry_max_attempts',
                'timestamp_retry_delay_seconds',
                'timestamp_actions',
                'timestamp_connected_at',
                'timestamp_connection_error'
            ]);
        });
    }
};