<?php
/**
 * DOKU Checkout Notification Handler for WooCommerce
 * 
 * Install: Copy this file to wp-content/plugins/doku-notification/doku-notification.php
 * Then activate the plugin in WordPress admin.
 * 
 * DOKU sends payment notifications to: POST /wp-json/doku/notification
 * This handler verifies the HMAC signature and updates WooCommerce order status.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/*
Plugin Name: DOKU Notification Handler
Description: Handles DOKU Checkout payment notifications and updates WooCommerce order status
Version: 1.0.0
*/

// ============================================================
// CONFIGURATION — Update with your DOKU Production credentials
// ============================================================
define('DOKU_NOTIFY_CLIENT_ID', 'BRN-0232-1782458525416');
define('DOKU_NOTIFY_PUBLIC_KEY', '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjUjXRdrOxI6Uhn7lVHlZ
weazQZYzSsmvvtHrSBJVwdVdKaYWG8TFdZetp1rg+KnoDv1rpjy/X0miNoPVwIRG
M7kL90GSf4hvAohGMBWCIohSniZ9H8PTpRS5jerdwMsGcn4Z/X0pApgLWxc+rS86
zCau31eeESDSrMg9TvhVhyIW0XcWd8UPBQa0W5yektgY8LnIFotFM3vuLrzemip6
enaTCB7dMW1FIv+m5RrNP8/TGNcyyHTU25MPlDvDNNF00224vARiwux8XdxhKY5d
ZPMGt3WBykR020U2GEEXJ1Pz1WRckW2rsYvXz4L3hFwJ1qJ8TwaaH+vfStPRC2Mn
4wIDAQAB
-----END PUBLIC KEY-----');

/**
 * Verify DOKU notification signature using RSA public key.
 * DOKU signs: "Client-Id:{cid}\nRequest-Id:{rid}\nRequest-Timestamp:{ts}\nRequest-Target:{target}\nDigest:{digest}"
 * The digest is SHA256 of the request body, base64 encoded.
 */
function doku_verify_signature($clientId, $requestId, $timestamp, $requestTarget, $body, $signature) {
    $digest = base64_encode(hash('sha256', $body, true));
    $rawSignature = "Client-Id:{$clientId}\nRequest-Id:{$requestId}\nRequest-Timestamp:{$timestamp}\nRequest-Target:{$requestTarget}\nDigest:{$digest}";

    $publicKey = DOKU_NOTIFY_PUBLIC_KEY;
    $decodedSignature = base64_decode(str_replace('HMACSHA256=', '', $signature));

    $result = openssl_verify($rawSignature, $decodedSignature, $publicKey, OPENSSL_ALGO_SHA256);
    return $result === 1;
}

/**
 * Extract WooCommerce order ID from DOKU invoice number.
 * Format: INV-{order_id}-{timestamp} or INV-{order_id}
 */
function doku_find_order_by_invoice($invoiceNumber) {
    // Extract order ID from "INV-203-1784537351918"
    if (preg_match('/^INV-(\d+)/', $invoiceNumber, $matches)) {
        $orderId = intval($matches[1]);
        $order = wc_get_order($orderId);
        if ($order) {
            return $orderId;
        }
    }

    // Fallback: search by meta
    $orders = wc_get_orders([
        'limit' => 1,
        'meta_key' => '_doku_invoice_number',
        'meta_value' => $invoiceNumber,
    ]);
    if (!empty($orders)) {
        return $orders[0]->get_id();
    }

    return null;
}

/**
 * Register REST API endpoint: POST /wp-json/doku/notification
 */
add_action('rest_api_init', function () {
    register_rest_route('doku', '/notification', [
        'methods' => 'POST',
        'callback' => 'doku_handle_notification',
        'permission_callback' => '__return_true', // Public endpoint
    ]);
});

function doku_handle_notification(WP_REST_Request $request) {
    $headers = $request->get_headers();
    $body = $request->get_body();

    $clientId = isset($headers['client_id']) ? $headers['client_id'][0] : (isset($headers['client-id']) ? $headers['client-id'][0] : '');
    $requestId = isset($headers['request_id']) ? $headers['request_id'][0] : (isset($headers['request-id']) ? $headers['request-id'][0] : '');
    $timestamp = isset($headers['request_timestamp']) ? $headers['request_timestamp'][0] : (isset($headers['request-timestamp']) ? $headers['request-timestamp'][0] : '');
    $signature = isset($headers['signature']) ? $headers['signature'][0] : '';

    // Verify Client-Id matches
    if ($clientId !== DOKU_NOTIFY_CLIENT_ID) {
        return new WP_REST_Response(['error' => 'Invalid Client-Id'], 401);
    }

    // Verify signature
    $requestTarget = '/wp-json/doku/notification';
    if (!doku_verify_signature($clientId, $requestId, $timestamp, $requestTarget, $body, $signature)) {
        return new WP_REST_Response(['error' => 'Invalid signature'], 401);
    }

    $data = json_decode($body, true);
    if (!$data) {
        return new WP_REST_Response(['error' => 'Invalid JSON'], 400);
    }

    $invoiceNumber = isset($data['order']['invoice_number']) ? $data['order']['invoice_number'] : '';
    $transactionStatus = isset($data['transaction']['status']) ? $data['transaction']['status'] : '';
    $transactionId = isset($data['transaction']['id']) ? $data['transaction']['id'] : '';

    if (!$invoiceNumber || !$transactionStatus) {
        return new WP_REST_Response(['error' => 'Missing invoice_number or transaction status'], 400);
    }

    $orderId = doku_find_order_by_invoice($invoiceNumber);
    if (!$orderId) {
        return new WP_REST_Response(['error' => 'Order not found for invoice: ' . $invoiceNumber], 404);
    }

    $order = wc_get_order($orderId);

    // Map DOKU status to WooCommerce status
    switch (strtoupper($transactionStatus)) {
        case 'SUCCESS':
        case 'PAID':
            if ($order->get_status() === 'pending') {
                $order->update_status('processing', 'Pembayaran DOKU berhasil. Transaction ID: ' . $transactionId);
                $order->set_transaction_id($transactionId);
                $order->payment_complete();
            }
            break;

        case 'FAILED':
        case 'FAILURE':
            if ($order->get_status() === 'pending') {
                $order->update_status('failed', 'Pembayaran DOKU gagal. Transaction ID: ' . $transactionId);
            }
            break;

        case 'EXPIRED':
            if ($order->get_status() === 'pending') {
                $order->update_status('cancelled', 'Pembayaran DOKU kedaluwarsa.');
            }
            break;
    }

    // Save DOKU transaction ID to order meta
    if ($transactionId) {
        update_post_meta($orderId, '_doku_transaction_id', $transactionId);
    }

    // Mark invoice as notified
    update_post_meta($orderId, '_doku_notification_received', gmdate('Y-m-d H:i:s'));

    return new WP_REST_Response([
        'success' => true,
        'order_id' => $orderId,
        'status' => $order->get_status(),
    ], 200);
}
