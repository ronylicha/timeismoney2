<?php

namespace Database\Factories;

use App\Models\PdpSubmission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PdpSubmission>
 */
class PdpSubmissionFactory extends Factory
{
    protected $model = PdpSubmission::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'submittable_type' => 'App\\Models\\Invoice',
            'submittable_id' => 1,
            'submission_id' => PdpSubmission::generateSubmissionId(),
            'status' => 'pending',
            'pdp_mode' => 'simulation',
            'retry_count' => 0,
        ];
    }
}