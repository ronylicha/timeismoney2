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
        Schema::table('quotes', function (Blueprint $table) {
            // Signature token for public signing
            if (!Schema::hasColumn('quotes', 'signature_token')) {
                $table->string('signature_token', 64)->nullable()->unique()->after('signature_user_agent');
            }
            
            // Public signature data (base64 image)
            if (!Schema::hasColumn('quotes', 'signature_data')) {
                $table->longText('signature_data')->nullable()->after('signature_token');
            }
            
            // Public signer information
            if (!Schema::hasColumn('quotes', 'signer_name')) {
                $table->string('signer_name')->nullable()->after('signature_data');
            }
            if (!Schema::hasColumn('quotes', 'signer_email')) {
                $table->string('signer_email')->nullable()->after('signer_name');
            }
            if (!Schema::hasColumn('quotes', 'signer_position')) {
                $table->string('signer_position')->nullable()->after('signer_email');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $columns = [
                'signature_token',
                'signature_data',
                'signer_name',
                'signer_email',
                'signer_position'
            ];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('quotes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
