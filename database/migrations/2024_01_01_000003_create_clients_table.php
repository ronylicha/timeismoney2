<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('company_name')->nullable();
            $table->enum('legal_form', ['SARL', 'SAS', 'SA', 'EI', 'EIRL', 'EURL', 'SNC', 'SCI', 'Association', 'Other'])->nullable();
            $table->string('siret')->nullable();
            $table->string('vat_number')->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->default('FR');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('billing_email')->nullable();
            $table->integer('payment_terms')->default(30); // Jours
            $table->enum('payment_method', ['bank_transfer', 'check', 'cash', 'card', 'other'])->default('bank_transfer');
            $table->decimal('discount_rate', 5, 2)->default(0);
            $table->boolean('vat_exempt')->default(false);
            $table->enum('status', ['prospect', 'active', 'inactive'])->default('active');
            $table->text('notes')->nullable();
            $table->json('custom_fields')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index('company_name');
            $table->index('siret');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};