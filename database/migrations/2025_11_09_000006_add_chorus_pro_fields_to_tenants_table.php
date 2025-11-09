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
            // Chorus Pro Configuration per tenant
            $table->boolean('chorus_pro_enabled')->default(false);
            $table->boolean('chorus_pro_production_mode')->default(false);
            $table->boolean('chorus_pro_auto_submit')->default(false);
            $table->string('chorus_pro_technical_id')->nullable(); // Identifiant technique
            $table->string('chorus_pro_service_code')->nullable(); // Code service
            $table->text('chorus_pro_certificate')->nullable(); // Encrypted certificate
            $table->text('chorus_pro_certificate_password')->nullable(); // Encrypted password
            $table->timestamp('chorus_pro_certificate_expiry')->nullable();
            $table->json('chorus_pro_settings')->nullable(); // Additional settings
            $table->timestamp('chorus_pro_activated_at')->nullable();

            // Indexes
            $table->index('chorus_pro_enabled');
            $table->index('chorus_pro_production_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['chorus_pro_enabled']);
            $table->dropIndex(['chorus_pro_production_mode']);

            $table->dropColumn([
                'chorus_pro_enabled',
                'chorus_pro_production_mode',
                'chorus_pro_auto_submit',
                'chorus_pro_technical_id',
                'chorus_pro_service_code',
                'chorus_pro_certificate',
                'chorus_pro_certificate_password',
                'chorus_pro_certificate_expiry',
                'chorus_pro_settings',
                'chorus_pro_activated_at',
            ]);
        });
    }
};
