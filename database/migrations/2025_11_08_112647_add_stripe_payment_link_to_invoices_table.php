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
            $table->text('stripe_payment_link')->nullable()->after('total');
            $table->string('stripe_checkout_session_id')->nullable()->after('stripe_payment_link');

            $table->index('stripe_checkout_session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['stripe_checkout_session_id']);
            $table->dropColumn(['stripe_payment_link', 'stripe_checkout_session_id']);
        });
    }
};
