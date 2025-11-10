<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tenant>
 */
class TenantFactory extends Factory
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
            'slug' => fake()->unique()->slug(),
            'type' => 'company',
            'is_active' => true,
            'company_name' => fake()->company(),
            'legal_form' => 'SARL',
            'siret' => fake()->numerify('##############'),
            'vat_number' => 'FR' . fake()->numerify('###########'),
            'vat_subject' => false,
            'vat_regime' => 'normal',
            'main_activity' => 'general',
            'business_type' => 'services',
            'vat_threshold_services' => 36800,
            'vat_threshold_goods' => 91900,
            'auto_apply_vat_on_threshold' => true,
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'address_line1' => fake()->streetAddress(),
            'postal_code' => fake()->postcode(),
            'city' => fake()->city(),
            'country' => 'FR',
        ];
    }
}
