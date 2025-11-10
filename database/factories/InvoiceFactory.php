<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Invoice>
 */
class InvoiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'invoice_number' => 'INV-' . date('Y') . '-' . str_pad((string)fake()->unique()->numberBetween(1, 999), 3, '0', STR_PAD_LEFT),
            'date' => fake()->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
            'due_date' => fake()->dateTimeBetween('+1 week', '+1 month')->format('Y-m-d'),
            'status' => 'draft',
            'subtotal' => fake()->randomFloat(2, 100, 5000),
            'tax_amount' => fake()->randomFloat(2, 20, 1000),
            'total' => fake()->randomFloat(2, 120, 6000),
            'currency' => 'EUR',
            'sequence_number' => fake()->unique()->numberBetween(1, 9999),
            'created_by' => 1, // Will be overridden in test
        ];
    }
}
