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
        Schema::table('clients', function (Blueprint $table) {
            // Add code column after tenant_id
            $table->string('code', 20)->nullable()->after('tenant_id');

            // Add index for better performance
            $table->index(['tenant_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // Drop index first
            $table->dropIndex(['tenant_id', 'code']);

            // Drop code column
            $table->dropColumn('code');
        });
    }
};
