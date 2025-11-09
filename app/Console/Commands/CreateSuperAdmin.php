<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class CreateSuperAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:create-super
                            {--name= : The name of the super admin}
                            {--email= : The email of the super admin}
                            {--password= : The password of the super admin}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a super admin user with full system access';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Creating Super Admin User');
        $this->newLine();

        // Get or ask for user details
        $name = $this->option('name') ?? $this->ask('Enter the name of the super admin');
        $email = $this->option('email') ?? $this->ask('Enter the email of the super admin');
        $password = $this->option('password') ?? $this->secret('Enter the password (min 8 characters)');

        // Validate input
        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
        ], [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            $this->error('❌ Validation failed:');
            foreach ($validator->errors()->all() as $error) {
                $this->error('  • ' . $error);
            }
            return 1;
        }

        // Check if super-admin role exists, create if not
        $role = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
        $this->info('✓ Super admin role ready');

        // Create the super admin user WITHOUT tenant (super-admins have global access)
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'tenant_id' => null, // Super-admins don't belong to any tenant
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
        $this->info('✓ User created: ' . $user->email);

        // Assign super-admin role
        $user->assignRole('super-admin');
        $this->info('✓ Super admin role assigned');

        $this->newLine();
        $this->info('✅ Super Admin created successfully!');
        $this->newLine();
        $this->table(
            ['Field', 'Value'],
            [
                ['Name', $user->name],
                ['Email', $user->email],
                ['Tenant', 'None (Global Access)'],
                ['Role', 'super-admin'],
                ['Status', 'Active'],
            ]
        );

        $this->newLine();
        $this->warn('⚠️  Keep the credentials secure!');
        $this->warn('⚠️  The super admin has access to all system settings.');

        return 0;
    }
}
