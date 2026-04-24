<?php

// examples/php-client.php
//
// Example client for a PHP app talking to the local Node payment bridge.
// Usage:
//   php examples/php-client.php RECIPIENT_SOLANA_ADDRESS 5

$recipientAddress = $argv[1] ?? null;
$amount = $argv[2] ?? "5";

if (!$recipientAddress) {
    fwrite(STDERR, "Usage: php examples/php-client.php RECIPIENT_SOLANA_ADDRESS AMOUNT\n");
    exit(1);
}

$payload = json_encode([
    "recipientAddress" => $recipientAddress,
    "amount" => $amount,
]);

$ch = curl_init("http://127.0.0.1:3030/pay");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    fwrite(STDERR, "Request failed: " . curl_error($ch) . "\n");
    curl_close($ch);
    exit(1);
}

curl_close($ch);

echo "HTTP $statusCode\n";
echo $response . "\n";
