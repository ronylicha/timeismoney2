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
        Schema::create('quote_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['time_entry', 'product', 'service', 'custom'])->default('custom');
            $table->foreignId('reference_id')->nullable(); // ID de time_entry si applicable
            $table->string('description');
            $table->text('long_description')->nullable();
            $table->decimal('quantity', 10, 2);
            $table->string('unit')->default('hour'); // hour, day, piece, etc.
            $table->decimal('unit_price', 10, 2);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(20.0); // TVA française
            $table->decimal('subtotal', 12, 2);
            $table->decimal('tax_amount', 12, 2);
            $table->decimal('total', 12, 2);
            $table->integer('position')->default(0);
            $table->timestamps();

            $table->index('quote_id');
            $table->index('position');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quote_items');
    }
};
