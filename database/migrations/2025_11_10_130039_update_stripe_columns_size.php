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
            $table->text('stripe_publishable_key')->nullable()->change();
            $table->text('stripe_account_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Clear any encrypted data that might be too long
        DB::table('tenants')->update([
            'stripe_publishable_key' => null,
            'stripe_account_id' => null,
        ]);
        
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('stripe_publishable_key', 255)->nullable()->change();
            $table->string('stripe_account_id', 255)->nullable()->change();
        });
    }
};
