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
            // Legal company information
            $table->string('rcs_number')->nullable()->after('siret');
            $table->string('rcs_city')->nullable()->after('rcs_number');
            $table->decimal('capital', 15, 2)->nullable()->after('rcs_city');
            $table->string('ape_code')->nullable()->after('capital');

            // Bank information
            $table->string('iban')->nullable()->after('phone');
            $table->string('bic')->nullable()->after('iban');
            $table->string('bank_name')->nullable()->after('bic');

            // VAT information
            $table->boolean('vat_subject')->default(true)->after('vat_number');
            $table->text('vat_exemption_reason')->nullable()->after('vat_subject');

            // Legal billing texts
            $table->text('late_payment_penalty_text')->nullable()->after('vat_exemption_reason');
            $table->text('recovery_indemnity_text')->nullable()->after('late_payment_penalty_text');
            $table->text('footer_legal_text')->nullable()->after('recovery_indemnity_text');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'rcs_number',
                'rcs_city',
                'capital',
                'ape_code',
                'iban',
                'bic',
                'bank_name',
                'vat_subject',
                'vat_exemption_reason',
                'late_payment_penalty_text',
                'recovery_indemnity_text',
                'footer_legal_text',
            ]);
        });
    }
};
