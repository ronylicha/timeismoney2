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
        Schema::table('payments', function (Blueprint $table) {
            // Stripe Payment Information
            $table->string('stripe_payment_intent_id')->nullable()->unique()->after('invoice_id');
            $table->string('stripe_charge_id')->nullable()->after('stripe_payment_intent_id');
            $table->string('stripe_customer_id')->nullable()->after('stripe_charge_id');
            $table->string('stripe_payment_method')->nullable()->after('stripe_customer_id');

            // Update payment_method enum to include stripe options
            $table->enum('payment_method', ['bank_transfer', 'check', 'cash', 'card', 'stripe_card', 'stripe_sepa', 'other'])->default('bank_transfer')->change();

            // Payment Status
            $table->enum('status', ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled'])->default('pending')->after('stripe_payment_method');
            $table->enum('payment_type', ['invoice', 'subscription', 'one_time'])->default('invoice')->after('status');

            // Additional Fields
            $table->string('currency', 3)->default('EUR')->after('amount');
            $table->json('metadata')->nullable()->after('notes');
            $table->string('failure_message')->nullable()->after('metadata');
            $table->string('receipt_url')->nullable()->after('failure_message');

            // Refund Information
            $table->decimal('refunded_amount', 12, 2)->default(0)->after('receipt_url');
            $table->timestamp('refunded_at')->nullable()->after('refunded_amount');

            // Payment Date
            $table->timestamp('paid_at')->nullable()->after('refunded_at');

            // Add user_id if not exists (for tracking who initiated payment)
            if (!Schema::hasColumn('payments', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('tenant_id')->constrained()->onDelete('cascade');
            }

            // Add indexes
            $table->index('stripe_payment_intent_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'stripe_payment_intent_id',
                'stripe_charge_id',
                'stripe_customer_id',
                'stripe_payment_method',
                'status',
                'payment_type',
                'currency',
                'metadata',
                'failure_message',
                'receipt_url',
                'refunded_amount',
                'refunded_at',
                'paid_at',
            ]);

            if (Schema::hasColumn('payments', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            }

            $table->dropIndex(['stripe_payment_intent_id']);
            $table->dropIndex(['status']);
        });
    }
};
