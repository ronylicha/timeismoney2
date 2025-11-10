<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Client>
 */
class ClientFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'siret' => fake()->numerify('##############'),
            'vat_number' => 'FR' . fake()->numerify('###########'),
            'address' => fake()->streetAddress(),
            'postal_code' => fake()->postcode(),
            'city' => fake()->city(),
            'country' => 'FR',
            'phone' => fake()->phoneNumber(),
            'email' => fake()->unique()->safeEmail(),
            'is_active' => true,
            'created_by' => 1, // Will be overridden in test
        ];
    }
}
