<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class GenerateVapidKeys extends Command
{
    protected $signature = 'vapid:generate';
    protected $description = 'Generate VAPID keys for web push notifications';

    public function handle()
    {
        $this->info('Generating VAPID keys...');

        // Generate VAPID keys
        $keys = VAPID::createVapidKeys();

        $this->info('VAPID keys generated successfully!');
        $this->newLine();

        $this->line('Add these keys to your .env file:');
        $this->newLine();

        $this->line('VAPID_PUBLIC_KEY=' . $keys['publicKey']);
        $this->line('VAPID_PRIVATE_KEY=' . $keys['privateKey']);

        $this->newLine();
        $this->info('The public key will be used in your JavaScript code.');
        $this->info('The private key should be kept secret on your server.');

        // Ask if user wants to automatically add to .env
        if ($this->confirm('Do you want to add these keys to your .env file?')) {
            $envFile = base_path('.env');
            $envContent = file_get_contents($envFile);

            // Check if keys already exist
            if (strpos($envContent, 'VAPID_PUBLIC_KEY') !== false) {
                $this->warn('VAPID keys already exist in .env file.');
                if ($this->confirm('Do you want to replace them?')) {
                    // Replace existing keys
                    $envContent = preg_replace('/VAPID_PUBLIC_KEY=.*/', 'VAPID_PUBLIC_KEY=' . $keys['publicKey'], $envContent);
                    $envContent = preg_replace('/VAPID_PRIVATE_KEY=.*/', 'VAPID_PRIVATE_KEY=' . $keys['privateKey'], $envContent);
                } else {
                    return;
                }
            } else {
                // Add new keys
                $envContent .= "\n# VAPID Keys for Web Push Notifications\n";
                $envContent .= "VAPID_PUBLIC_KEY=" . $keys['publicKey'] . "\n";
                $envContent .= "VAPID_PRIVATE_KEY=" . $keys['privateKey'] . "\n";
            }

            file_put_contents($envFile, $envContent);
            $this->info('Keys added to .env file successfully!');

            // Clear config cache
            $this->call('config:clear');
        }
    }
}