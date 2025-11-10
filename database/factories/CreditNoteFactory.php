<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CreditNote>
 */
class CreditNoteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => 1,
            'client_id' => 1,
            'credit_note_number' => 'CN-' . date('Y') . '-' . str_pad((string) $this->faker->unique()->numberBetween(1, 999), 3, '0', STR_PAD_LEFT),
            'credit_note_date' => $this->faker->date(),
            'reason' => $this->faker->sentence(),
            'description' => $this->faker->paragraph(),
            'status' => 'draft',
            'subtotal' => $this->faker->randomFloat(2, 100, 1000),
            'tax' => $this->faker->randomFloat(2, 10, 200),
            'discount' => 0,
            'total' => $this->faker->randomFloat(2, 100, 1200),
            'currency' => 'EUR',
        ];
    }
}
