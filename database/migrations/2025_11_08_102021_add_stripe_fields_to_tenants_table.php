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
            // Stripe Configuration per tenant
            $table->string('stripe_publishable_key')->nullable();
            $table->text('stripe_secret_key')->nullable(); // Encrypted in production
            $table->text('stripe_webhook_secret')->nullable(); // Encrypted in production
            $table->boolean('stripe_enabled')->default(false);
            $table->string('stripe_account_id')->nullable(); // For Stripe Connect
            $table->json('stripe_settings')->nullable(); // Additional settings
            $table->timestamp('stripe_connected_at')->nullable();

            // Indexes
            $table->index('stripe_enabled');
            $table->index('stripe_account_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['stripe_enabled']);
            $table->dropIndex(['stripe_account_id']);

            $table->dropColumn([
                'stripe_publishable_key',
                'stripe_secret_key',
                'stripe_webhook_secret',
                'stripe_enabled',
                'stripe_account_id',
                'stripe_settings',
                'stripe_connected_at',
            ]);
        });
    }
};
