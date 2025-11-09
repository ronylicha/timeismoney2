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
            // Signature électronique
            $table->string('signature_path')->nullable()->after('accepted_at');
            $table->string('signatory_name')->nullable()->after('signature_path');
            $table->string('signature_ip')->nullable()->after('signatory_name');
            $table->text('signature_user_agent')->nullable()->after('signature_ip');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropColumn(['signature_path', 'signatory_name', 'signature_ip', 'signature_user_agent']);
        });
    }
};
