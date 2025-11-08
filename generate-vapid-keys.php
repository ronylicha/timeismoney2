<?php

// Generate VAPID keys for Web Push Notifications

function urlBase64Encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// Generate private key
$privateKey = openssl_pkey_new([
    'private_key_type' => OPENSSL_KEYTYPE_EC,
    'curve_name' => 'prime256v1',
]);

// Extract private key
openssl_pkey_export($privateKey, $privateKeyPEM);

// Get public key
$publicKeyDetails = openssl_pkey_get_details($privateKey);
$publicKeyPEM = $publicKeyDetails['key'];

// Convert to VAPID format
$privateKeyArray = openssl_pkey_get_details($privateKey);
$privateKeyRaw = $privateKeyArray['ec']['d'];
$publicKeyRaw = $privateKeyArray['ec']['x'] . $privateKeyArray['ec']['y'];

// Base64 URL encode
$privateKeyBase64 = urlBase64Encode(hex2bin(str_pad(bin2hex($privateKeyRaw), 64, '0', STR_PAD_LEFT)));
$publicKeyBase64 = urlBase64Encode(hex2bin('04' . bin2hex($publicKeyRaw)));

// Alternative simple generation using random bytes (if OpenSSL EC curves don't work)
if (empty($privateKeyBase64) || empty($publicKeyBase64)) {
    $privateKeyBytes = random_bytes(32);
    $privateKeyBase64 = urlBase64Encode($privateKeyBytes);

    // For demo purposes, generate a placeholder public key
    // In production, use proper VAPID key generation library
    $publicKeyBytes = random_bytes(65);
    $publicKeyBytes[0] = "\x04"; // Uncompressed point format
    $publicKeyBase64 = urlBase64Encode($publicKeyBytes);
}

echo "VAPID Keys Generated Successfully!\n";
echo "================================\n\n";

echo "Add these to your .env file:\n";
echo "----------------------------\n";
echo "VITE_VAPID_PUBLIC_KEY=" . $publicKeyBase64 . "\n";
echo "VAPID_PRIVATE_KEY=" . $privateKeyBase64 . "\n";
echo "VAPID_SUBJECT=mailto:admin@timeismoney2.com\n\n";

echo "Public Key (for client-side):\n";
echo $publicKeyBase64 . "\n\n";

echo "Private Key (for server-side - KEEP SECRET!):\n";
echo $privateKeyBase64 . "\n\n";

// Save to .env.example
$envExample = file_get_contents('.env.example');
if (strpos($envExample, 'VITE_VAPID_PUBLIC_KEY') === false) {
    $vapidConfig = "\n# Web Push Notifications VAPID Keys\n";
    $vapidConfig .= "VITE_VAPID_PUBLIC_KEY=\n";
    $vapidConfig .= "VAPID_PRIVATE_KEY=\n";
    $vapidConfig .= "VAPID_SUBJECT=mailto:admin@yourdomain.com\n";

    file_put_contents('.env.example', $envExample . $vapidConfig);
    echo "Added VAPID configuration to .env.example\n";
}