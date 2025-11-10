<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $user = \App\Models\User::first();
    $tenant = $user->tenant;
    
    echo "Testing OpenAPI.com timestamp...\n";
    echo "Provider: " . $tenant->timestamp_provider . "\n";
    echo "API Key configured: " . (empty($tenant->timestamp_api_key) ? "NO" : "YES") . "\n";
    
    $timestampService = new \App\Services\QualifiedTimestampService($tenant);
    
    $invoice = \App\Models\Invoice::where('tenant_id', $tenant->id)->first();
    
    $timestamp = $timestampService->timestamp($invoice, 'invoice_validated');
    
    echo "Status: " . $timestamp->status . "\n";
    
    if ($timestamp->status === 'success') {
        echo "✅ SUCCESS! OpenAPI.com timestamp working!\n";
        echo "Timestamp ID: " . $timestamp->id . "\n";
        echo "Provider: " . $timestamp->tsa_provider . "\n";
        echo "Token length: " . strlen($timestamp->timestamp_token) . " characters\n";
        echo "Timestamp datetime: " . $timestamp->timestamp_datetime . "\n";
        
        if ($timestamp->timestamp_response) {
            $response = json_decode($timestamp->timestamp_response, true);
            echo "Certificate included: " . (isset($response['certificate']) ? "YES" : "NO") . "\n";
            echo "Test mode: " . ($response['test_mode'] ? "YES" : "NO") . "\n";
        }
    } else {
        echo "❌ Failed: " . $timestamp->error_message . "\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}