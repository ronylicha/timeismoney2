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
        Schema::table('invoices', function (Blueprint $table) {
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('invoices', 'viewed_at')) {
                $table->timestamp('viewed_at')->nullable()->after('sent_at');
            }
            if (!Schema::hasColumn('invoices', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('payment_date');
            }
            if (!Schema::hasColumn('invoices', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('cancelled_at');
            }
            if (!Schema::hasColumn('invoices', 'footer')) {
                $table->text('footer')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('invoices', 'project_id')) {
                $table->foreignId('project_id')->nullable()->after('client_id');
            }
            if (!Schema::hasColumn('invoices', 'discount_type')) {
                $table->enum('discount_type', ['percentage', 'fixed'])->nullable()->after('discount_amount');
            }
            if (!Schema::hasColumn('invoices', 'tax_rate')) {
                $table->decimal('tax_rate', 5, 2)->nullable()->after('tax_amount');
            }
            if (!Schema::hasColumn('invoices', 'chorus_status')) {
                $table->string('chorus_status')->nullable()->after('is_locked');
            }
            if (!Schema::hasColumn('invoices', 'chorus_number')) {
                $table->string('chorus_number')->nullable()->after('chorus_status');
            }
            if (!Schema::hasColumn('invoices', 'chorus_sent_at')) {
                $table->timestamp('chorus_sent_at')->nullable()->after('chorus_number');
            }
            if (!Schema::hasColumn('invoices', 'chorus_response')) {
                $table->json('chorus_response')->nullable()->after('chorus_sent_at');
            }
            if (!Schema::hasColumn('invoices', 'stripe_payment_link')) {
                $table->string('stripe_payment_link')->nullable();
            }
            if (!Schema::hasColumn('invoices', 'stripe_checkout_session_id')) {
                $table->string('stripe_checkout_session_id')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $columns = [
                'viewed_at',
                'cancelled_at', 
                'cancellation_reason',
                'footer',
                'project_id',
                'discount_type',
                'tax_rate',
                'chorus_status',
                'chorus_number',
                'chorus_sent_at',
                'chorus_response',
                'stripe_payment_link',
                'stripe_checkout_session_id',
            ];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('invoices', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
