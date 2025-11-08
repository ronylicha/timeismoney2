<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DemoDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create demo tenant
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'demo'],
            [
                'name' => 'Time Is Money Demo',
                'type' => 'company',
                'email' => 'contact@timeismoney.com',
                'phone' => '+33 1 23 45 67 89',
                'address_line1' => '123 Rue de la Paix',
                'city' => 'Paris',
                'country' => 'FR',
                'postal_code' => '75001',
                'company_name' => 'Time Is Money Demo',
                'is_active' => true,
            ]
        );

        $this->command->info('Demo tenant created: ' . $tenant->name);

        // Get or create admin role (using spatie/laravel-permission)
        $adminRole = Role::firstOrCreate(['name' => 'admin']);

        // Create admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'tenant_id' => $tenant->id,
                'is_active' => true,
                'timezone' => 'Europe/Paris',
                'locale' => 'fr',
                'date_format' => 'd/m/Y',
                'time_format' => 'H:i',
            ]
        );

        // Attach admin role
        $admin->assignRole($adminRole);

        $this->command->info('Admin user created: ' . $admin->email);
        $this->command->info('Password: password');

        // Create regular user role
        $userRole = Role::firstOrCreate(['name' => 'user']);

        // Create demo user
        $demoUser = User::firstOrCreate(
            ['email' => 'user@example.com'],
            [
                'name' => 'Demo User',
                'password' => Hash::make('password'),
                'tenant_id' => $tenant->id,
                'is_active' => true,
                'timezone' => 'Europe/Paris',
                'locale' => 'fr',
            ]
        );

        // Attach user role
        $demoUser->assignRole($userRole);

        $this->command->info('Demo user created: ' . $demoUser->email);
        $this->command->info('Password: password');
    }
}
