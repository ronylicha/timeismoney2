<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('plan_name');
            $table->enum('plan_type', ['free', 'starter', 'professional', 'enterprise', 'custom'])->default('free');
            $table->enum('billing_cycle', ['monthly', 'yearly'])->default('monthly');
            $table->decimal('price', 10, 2);
            $table->string('currency', 3)->default('EUR');
            $table->integer('user_limit')->nullable();
            $table->integer('project_limit')->nullable();
            $table->integer('client_limit')->nullable();
            $table->boolean('has_api_access')->default(false);
            $table->boolean('has_advanced_reports')->default(false);
            $table->boolean('has_white_label')->default(false);
            $table->boolean('has_custom_domain')->default(false);
            $table->integer('storage_limit_gb')->default(5);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->date('next_billing_date')->nullable();
            $table->enum('status', ['trial', 'active', 'past_due', 'cancelled', 'suspended'])->default('trial');
            $table->string('stripe_subscription_id')->nullable();
            $table->string('stripe_customer_id')->nullable();
            $table->integer('trial_days')->default(14);
            $table->date('trial_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index('next_billing_date');
            $table->index('stripe_subscription_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};