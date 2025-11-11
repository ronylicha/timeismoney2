<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\File;

class InstallProduction extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:install-production
                            {--skip-npm : Skip npm build step}
                            {--skip-admin : Skip super admin creation}
                            {--admin-name= : Super admin name}
                            {--admin-email= : Super admin email}
                            {--admin-password= : Super admin password}
                            {--force : Force the operation to run in production}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automated production installation with all required configurations';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->newLine();
        $this->info('╔══════════════════════════════════════════════════╗');
        $this->info('║         TIME IS MONEY - PRODUCTION SETUP         ║');
        $this->info('╚══════════════════════════════════════════════════╝');
        $this->newLine();

        // Check if we're in production and require --force flag
        if (app()->environment('production') && !$this->option('force')) {
            $this->error('⚠️  You are in production environment!');
            $this->error('Use --force flag to run this command in production.');
            return 1;
        }

        // Ask for confirmation
        if (!$this->confirm('This will set up a fresh production installation. Continue?')) {
            $this->info('Installation cancelled.');
            return 0;
        }

        $steps = [
            'generate_key' => 'Generating application key',
            'migrate' => 'Setting up database',
            'seed_roles' => 'Creating roles and permissions',
            'create_admin' => 'Creating super administrator',
            'vapid_keys' => 'Generating VAPID keys for push notifications',
            'vat_thresholds' => 'Initializing VAT thresholds',
            'facturx_schemas' => 'Downloading FacturX schemas',
            'npm_build' => 'Building frontend assets',
            'optimize' => 'Optimizing application for production'
        ];

        $totalSteps = count($steps);
        $currentStep = 0;

        foreach ($steps as $key => $description) {
            $currentStep++;
            $this->newLine();
            $this->info("[$currentStep/$totalSteps] $description...");

            try {
                switch ($key) {
                    case 'generate_key':
                        $this->generateApplicationKey();
                        break;

                    case 'migrate':
                        $this->runMigrations();
                        break;

                    case 'seed_roles':
                        $this->seedRolesAndPermissions();
                        break;

                    case 'create_admin':
                        if (!$this->option('skip-admin')) {
                            $this->createSuperAdmin();
                        } else {
                            $this->warn('  ⚠️  Skipped (--skip-admin flag)');
                        }
                        break;

                    case 'vapid_keys':
                        $this->generateVapidKeys();
                        break;

                    case 'vat_thresholds':
                        $this->initializeVatThresholds();
                        break;

                    case 'facturx_schemas':
                        $this->downloadFacturXSchemas();
                        break;

                    case 'npm_build':
                        if (!$this->option('skip-npm')) {
                            $this->buildAssets();
                        } else {
                            $this->warn('  ⚠️  Skipped (--skip-npm flag)');
                        }
                        break;

                    case 'optimize':
                        $this->optimizeForProduction();
                        break;
                }

                $this->info("  ✅ $description completed!");

            } catch (\Exception $e) {
                $this->error("  ❌ Failed: " . $e->getMessage());

                if ($this->confirm('Do you want to continue with the remaining steps?')) {
                    continue;
                } else {
                    return 1;
                }
            }
        }

        $this->newLine(2);
        $this->info('╔══════════════════════════════════════════════════╗');
        $this->info('║         INSTALLATION COMPLETED SUCCESSFULLY       ║');
        $this->info('╚══════════════════════════════════════════════════╝');
        $this->newLine();

        $this->table(
            ['Configuration', 'Status'],
            [
                ['Database', '✅ Migrated'],
                ['Roles & Permissions', '✅ Created'],
                ['Super Admin', $this->option('skip-admin') ? '⚠️ Skipped' : '✅ Created'],
                ['Push Notifications', '✅ Configured'],
                ['VAT System', '✅ Initialized'],
                ['FacturX', '✅ Ready'],
                ['Assets', $this->option('skip-npm') ? '⚠️ Skipped' : '✅ Built'],
                ['Cache', '✅ Optimized'],
            ]
        );

        $this->newLine();
        $this->info('🎉 Your Time Is Money application is ready for production!');
        $this->newLine();

        if (!$this->option('skip-admin')) {
            $this->info('📧 Super Admin Email: ' . ($this->option('admin-email') ?? 'As provided during setup'));
        }

        $this->info('🌐 Application URL: ' . config('app.url'));
        $this->newLine();

        $this->warn('⚠️  Next steps:');
        $this->warn('  1. Configure your web server (Nginx/Apache)');
        $this->warn('  2. Set up SSL certificate');
        $this->warn('  3. Configure cron jobs for scheduled tasks');
        $this->warn('  4. Set up queue workers if using queues');
        $this->warn('  5. Configure backup strategy');
        $this->newLine();

        return 0;
    }

    /**
     * Generate application key
     */
    private function generateApplicationKey(): void
    {
        $envFile = base_path('.env');
        if (!File::exists($envFile)) {
            throw new \Exception('.env file not found. Please run "cp .env.example .env" first.');
        }

        $envContent = File::get($envFile);

        // Check if key already exists and has a value
        if (preg_match('/APP_KEY=base64:(.+)/', $envContent, $matches) && trim($matches[1])) {
            $this->warn('  ⚠️  Application key already exists, skipping...');
            return;
        }

        // Generate key using Laravel's command (which updates .env automatically)
        Artisan::call('key:generate', [
            '--force' => true,
            '--quiet' => true
        ]);

        $this->info('  ✓ Application key generated and added to .env file');
    }

    /**
     * Run database migrations
     */
    private function runMigrations(): void
    {
        $this->info('  Running database migrations...');
        Artisan::call('migrate:fresh', [
            '--force' => true,
            '--no-interaction' => true
        ]);
        $this->info('  ✓ Database migrated successfully');
    }

    /**
     * Seed roles and permissions only
     */
    private function seedRolesAndPermissions(): void
    {
        $this->info('  Seeding roles and permissions...');
        Artisan::call('db:seed', [
            '--class' => 'Database\Seeders\RolePermissionSeeder',
            '--force' => true,
            '--no-interaction' => true
        ]);
        $this->info('  ✓ Roles and permissions created');
    }

    /**
     * Create super administrator
     */
    private function createSuperAdmin(): void
    {
        $this->info('  Creating super administrator...');

        $name = $this->option('admin-name');
        $email = $this->option('admin-email');
        $password = $this->option('admin-password');

        // If not provided via options, ask interactively
        if (!$name || !$email || !$password) {
            $this->info('  Please provide super admin details:');

            if (!$name) {
                $name = $this->ask('    Name');
            }
            if (!$email) {
                $email = $this->ask('    Email');
            }
            if (!$password) {
                $password = $this->secret('    Password (min 8 characters)');
            }
        }

        // Call the CreateSuperAdmin command with parameters
        Artisan::call('admin:create-super', [
            '--name' => $name,
            '--email' => $email,
            '--password' => $password,
        ]);

        $this->info('  ✓ Super administrator created');
    }

    /**
     * Generate VAPID keys for push notifications
     */
    private function generateVapidKeys(): void
    {
        $this->info('  Generating VAPID keys...');

        $envFile = base_path('.env');
        if (!File::exists($envFile)) {
            throw new \Exception('.env file not found. Please run "cp .env.example .env" first.');
        }

        $envContent = File::get($envFile);

        // Check if VAPID keys already exist and have values
        $hasPublicKey = preg_match('/^VAPID_PUBLIC_KEY=(.+)/m', $envContent, $publicMatches);
        $hasPrivateKey = preg_match('/^VAPID_PRIVATE_KEY=(.+)/m', $envContent, $privateMatches);
        $hasVitePublicKey = preg_match('/^VITE_VAPID_PUBLIC_KEY=(.+)/m', $envContent, $viteMatches);

        // If all keys exist with values, skip
        if ($hasPublicKey && $hasPrivateKey && trim($publicMatches[1]) && trim($privateMatches[1])) {
            // Also check if VITE key needs update
            if (!$hasVitePublicKey || trim($viteMatches[1]) !== trim($publicMatches[1])) {
                // Update VITE key to match
                if (str_contains($envContent, 'VITE_VAPID_PUBLIC_KEY')) {
                    $envContent = preg_replace('/^VITE_VAPID_PUBLIC_KEY=.*/m', 'VITE_VAPID_PUBLIC_KEY=' . trim($publicMatches[1]), $envContent);
                } else {
                    $envContent = preg_replace('/^VAPID_PUBLIC_KEY=.*/m', "VAPID_PUBLIC_KEY=" . trim($publicMatches[1]) . "\nVITE_VAPID_PUBLIC_KEY=" . trim($publicMatches[1]), $envContent);
                }
                File::put($envFile, $envContent);
                $this->info('  ✓ VITE_VAPID_PUBLIC_KEY synchronized with VAPID_PUBLIC_KEY');
            }
            $this->warn('  ⚠️  VAPID keys already exist with values, skipping...');
            return;
        }

        // Generate VAPID keys using the WebPush library
        if (!class_exists('\Minishlink\WebPush\VAPID')) {
            $this->warn('  ⚠️  WebPush library not installed, installing...');
            Process::run('composer require minishlink/web-push')->throw();
        }

        $keys = \Minishlink\WebPush\VAPID::createVapidKeys();

        // Update or add VAPID_PUBLIC_KEY
        if (str_contains($envContent, 'VAPID_PUBLIC_KEY=')) {
            $envContent = preg_replace('/^VAPID_PUBLIC_KEY=.*/m', 'VAPID_PUBLIC_KEY=' . $keys['publicKey'], $envContent);
        } else {
            // Find a good place to add the key (after APP_KEY or at the end)
            if (preg_match('/^APP_KEY=.*/m', $envContent)) {
                $envContent = preg_replace('/^(APP_KEY=.*)$/m', "$1\n\n# VAPID Keys for Web Push Notifications\nVAPID_PUBLIC_KEY=" . $keys['publicKey'], $envContent);
            } else {
                $envContent .= "\n# VAPID Keys for Web Push Notifications\nVAPID_PUBLIC_KEY=" . $keys['publicKey'] . "\n";
            }
        }

        // Update or add VAPID_PRIVATE_KEY
        if (str_contains($envContent, 'VAPID_PRIVATE_KEY=')) {
            $envContent = preg_replace('/^VAPID_PRIVATE_KEY=.*/m', 'VAPID_PRIVATE_KEY=' . $keys['privateKey'], $envContent);
        } else {
            $envContent = preg_replace('/^(VAPID_PUBLIC_KEY=.*)$/m', "$1\nVAPID_PRIVATE_KEY=" . $keys['privateKey'], $envContent);
        }

        // Update or add VITE_VAPID_PUBLIC_KEY (for frontend)
        if (str_contains($envContent, 'VITE_VAPID_PUBLIC_KEY=')) {
            $envContent = preg_replace('/^VITE_VAPID_PUBLIC_KEY=.*/m', 'VITE_VAPID_PUBLIC_KEY=' . $keys['publicKey'], $envContent);
        } else {
            $envContent = preg_replace('/^(VAPID_PRIVATE_KEY=.*)$/m', "$1\nVITE_VAPID_PUBLIC_KEY=" . $keys['publicKey'], $envContent);
        }

        // Add VAPID_SUBJECT if not present
        if (!str_contains($envContent, 'VAPID_SUBJECT=')) {
            $envContent = preg_replace('/^(VITE_VAPID_PUBLIC_KEY=.*)$/m', "$1\nVAPID_SUBJECT=mailto:admin@timeismoney.com", $envContent);
        }

        // Write updated content to .env file
        File::put($envFile, $envContent);

        // Clear config cache to reflect new values
        Artisan::call('config:clear', ['--quiet' => true]);

        $this->info('  ✓ VAPID keys generated and added to .env file');
        $this->info('    • VAPID_PUBLIC_KEY');
        $this->info('    • VAPID_PRIVATE_KEY');
        $this->info('    • VITE_VAPID_PUBLIC_KEY');
        $this->info('    • VAPID_SUBJECT');
    }

    /**
     * Initialize VAT thresholds
     */
    private function initializeVatThresholds(): void
    {
        $this->info('  Initializing VAT thresholds...');
        Artisan::call('vat:initialize-thresholds', ['--force' => true]);
        $this->info('  ✓ VAT thresholds initialized');
    }

    /**
     * Download FacturX schemas
     */
    private function downloadFacturXSchemas(): void
    {
        $this->info('  Downloading FacturX schemas...');

        // Check if schemas already exist
        $schemaPath = storage_path('app/facturx/schemas');
        if (File::exists($schemaPath) && count(File::files($schemaPath)) > 0) {
            $this->warn('  ⚠️  FacturX schemas already downloaded, skipping...');
            return;
        }

        Artisan::call('facturx:download-schemas', ['--force' => true]);
        $this->info('  ✓ FacturX schemas downloaded');
    }

    /**
     * Build frontend assets
     */
    private function buildAssets(): void
    {
        $this->info('  Building frontend assets (this may take a few minutes)...');

        // Check if node_modules exists
        if (!File::exists(base_path('node_modules'))) {
            $this->info('  Installing npm dependencies first...');
            $result = Process::run('npm install')->throw();
            if (!$result->successful()) {
                throw new \Exception('Failed to install npm dependencies');
            }
        }

        // Build assets
        $result = Process::timeout(300)->run('npm run build');
        if (!$result->successful()) {
            throw new \Exception('Failed to build assets: ' . $result->errorOutput());
        }

        $this->info('  ✓ Assets built successfully');
    }

    /**
     * Optimize application for production
     */
    private function optimizeForProduction(): void
    {
        $this->info('  Optimizing application for production...');

        $commands = [
            'config:cache' => 'Configuration',
            'route:cache' => 'Routes',
            'view:cache' => 'Views',
        ];

        // Check if Filament is installed
        if (class_exists('\Filament\FilamentServiceProvider')) {
            $commands['filament:cache-components'] = 'Filament components';
        }

        // Check if Blade Icons is installed
        if (class_exists('\BladeUI\Icons\IconsServiceProvider')) {
            $commands['icons:cache'] = 'Icons';
        }

        foreach ($commands as $command => $description) {
            try {
                Artisan::call($command, ['--force' => true]);
                $this->info("    ✓ $description cached");
            } catch (\Exception $e) {
                $this->warn("    ⚠️  Could not cache $description: " . $e->getMessage());
            }
        }

        $this->info('  ✓ Application optimized');
    }
}