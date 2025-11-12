<?php

namespace Database\Factories;

use App\Models\Invoice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\InvoiceItem>
 */
class InvoiceItemFactory extends Factory
{
    public function definition(): array
    {
        $quantity = $this->faker->randomFloat(2, 1, 10);
        $unitPrice = $this->faker->randomFloat(2, 50, 500);
        $taxRate = $this->faker->randomElement([0, 5.5, 10, 20]);
        $subtotal = round($quantity * $unitPrice, 2);
        $taxAmount = round($subtotal * ($taxRate / 100), 2);

        return [
            'invoice_id' => Invoice::factory(),
            'type' => 'service',
            'description' => $this->faker->sentence(6),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'tax_rate' => $taxRate,
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'discount_amount' => 0,
            'total' => $subtotal + $taxAmount,
            'time_entry_ids' => [],
            'position' => 1,
        ];
    }
}

