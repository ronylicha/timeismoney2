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
        Schema::table('client_contacts', function (Blueprint $table) {
            // Add tenant_id column after id
            $table->foreignId('tenant_id')->after('id')->constrained()->onDelete('cascade');

            // Add index for better performance
            $table->index(['tenant_id', 'client_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_contacts', function (Blueprint $table) {
            // Drop the index first
            $table->dropIndex(['tenant_id', 'client_id']);

            // Drop foreign key and column
            $table->dropForeign(['tenant_id']);
            $table->dropColumn('tenant_id');
        });
    }
};
