<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('client_contacts', function (Blueprint $table) {
            // Add new columns (tenant_id already exists, so skip it)
            $table->string('name')->after('client_id')->nullable();
            $table->boolean('is_billing_contact')->after('is_primary')->default(false);
        });

        // Migrate data: Combine first_name + last_name into name, copy receives_invoices
        DB::statement('
            UPDATE client_contacts
            SET
                name = TRIM(CONCAT(COALESCE(first_name, ""), " ", COALESCE(last_name, ""))),
                is_billing_contact = receives_invoices
        ');

        Schema::table('client_contacts', function (Blueprint $table) {
            // Make name required now that it has data
            $table->string('name')->nullable(false)->change();

            // Drop old columns
            $table->dropColumn(['first_name', 'last_name', 'receives_invoices']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_contacts', function (Blueprint $table) {
            // Add back old columns
            $table->string('first_name')->after('client_id')->nullable();
            $table->string('last_name')->after('first_name')->nullable();
            $table->boolean('receives_invoices')->after('is_primary')->default(false);
        });

        // Migrate data back
        DB::statement('
            UPDATE client_contacts
            SET
                first_name = SUBSTRING_INDEX(name, " ", 1),
                last_name = IF(name LIKE "% %", SUBSTRING(name, LOCATE(" ", name) + 1), ""),
                receives_invoices = is_billing_contact
        ');

        Schema::table('client_contacts', function (Blueprint $table) {
            // Drop new columns (keep tenant_id as it was added by a previous migration)
            $table->dropColumn(['name', 'is_billing_contact']);
        });
    }
};
