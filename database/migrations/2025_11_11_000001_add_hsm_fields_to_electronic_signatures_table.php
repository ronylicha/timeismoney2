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
        Schema::table('electronic_signatures', function (Blueprint $table) {
            // HSM-related fields
            $table->string('hsm_mode')->nullable()->after('signature_level'); // simulator, hardware, cloud
            $table->string('hsm_key_id')->nullable()->after('hsm_mode'); // HSM key identifier
            $table->text('signature')->nullable()->after('hsm_key_id'); // The actual signature
            $table->string('signature_hash')->nullable()->after('signature'); // Hash of signed data
            $table->string('signature_algorithm')->default('RS256')->after('signature_hash'); // Signature algorithm
            $table->text('public_key')->nullable()->after('signature_algorithm'); // Public key used
            $table->text('certificate')->nullable()->after('public_key'); // X509 certificate if available

            // Indexes for new fields
            $table->index('hsm_mode');
            $table->index('hsm_key_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('electronic_signatures', function (Blueprint $table) {
            // Drop indexes
            $table->dropIndex(['hsm_mode']);
            $table->dropIndex(['hsm_key_id']);

            // Drop columns
            $table->dropColumn([
                'hsm_mode',
                'hsm_key_id',
                'signature',
                'signature_hash',
                'signature_algorithm',
                'public_key',
                'certificate'
            ]);
        });
    }
};