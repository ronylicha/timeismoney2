<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use App\Services\EncryptionService;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Encrypt existing plain text Stripe keys
        $tenants = DB::table('tenants')
            ->whereNotNull('stripe_secret_key')
            ->where('stripe_secret_key', 'NOT LIKE', 'eyJ%') // Not already encrypted
            ->get();

        foreach ($tenants as $tenant) {
            $updateData = [];
            
            if (!empty($tenant->stripe_publishable_key) && !str_starts_with($tenant->stripe_publishable_key, 'eyJ')) {
                $updateData['stripe_publishable_key'] = EncryptionService::encrypt($tenant->stripe_publishable_key);
            }
            
            if (!empty($tenant->stripe_secret_key) && !str_starts_with($tenant->stripe_secret_key, 'eyJ')) {
                $updateData['stripe_secret_key'] = EncryptionService::encrypt($tenant->stripe_secret_key);
            }
            
            if (!empty($tenant->stripe_webhook_secret) && !str_starts_with($tenant->stripe_webhook_secret, 'eyJ')) {
                $updateData['stripe_webhook_secret'] = EncryptionService::encrypt($tenant->stripe_webhook_secret);
            }
            
            if (!empty($updateData)) {
                DB::table('tenants')
                    ->where('id', $tenant->id)
                    ->update($updateData);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Decrypt keys back to plain text (for rollback)
        $tenants = DB::table('tenants')
            ->whereNotNull('stripe_secret_key')
            ->where('stripe_secret_key', 'LIKE', 'eyJ%') // Encrypted
            ->get();

        foreach ($tenants as $tenant) {
            $updateData = [];
            
            if (!empty($tenant->stripe_publishable_key) && str_starts_with($tenant->stripe_publishable_key, 'eyJ')) {
                $updateData['stripe_publishable_key'] = EncryptionService::decrypt($tenant->stripe_publishable_key);
            }
            
            if (!empty($tenant->stripe_secret_key) && str_starts_with($tenant->stripe_secret_key, 'eyJ')) {
                $updateData['stripe_secret_key'] = EncryptionService::decrypt($tenant->stripe_secret_key);
            }
            
            if (!empty($tenant->stripe_webhook_secret) && str_starts_with($tenant->stripe_webhook_secret, 'eyJ')) {
                $updateData['stripe_webhook_secret'] = EncryptionService::decrypt($tenant->stripe_webhook_secret);
            }
            
            if (!empty($updateData)) {
                DB::table('tenants')
                    ->where('id', $tenant->id)
                    ->update($updateData);
            }
        }
    }
};