<?php
// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

$user_id = get_current_user_id();
if (!$user_id) {
    wp_die('You must be logged in to view this page.');
}

$user_info = get_userdata($user_id);
$server_user_id = get_user_meta($user_id, 'fitbuds_server_user_id', true);
$api_base_url = get_option('fitbuds_api_url', '');
$api_key = get_option('fitbuds_api_key', '');

$reservations = [];
$error_message = '';

if ($server_user_id && $api_base_url && $api_key) {
    $api_url = trailingslashit($api_base_url) . 'panel/meetings/reservations?test_auth_id=' . urlencode($server_user_id);

    $response = wp_remote_get($api_url, [
        'headers' => [
            'x-api-key' => $api_key,
            'Content-Type' => 'application/json',
        ],
        'timeout' => 15,
    ]);

    if (is_wp_error($response)) {
        $error_message = 'Failed to fetch reservations: ' . $response->get_error_message();
    } else {
        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        $decoded_response = json_decode($response_body, true);

        if ($response_code === 200 && isset($decoded_response['success']) && $decoded_response['success'] === true) {
            $reservations = $decoded_response['data'];
        } else {
            $error_message = 'API error: ' . ($decoded_response['message'] ?? 'Invalid response');
        }
    }
}
?>

<div class="wrap max-w-5xl mx-auto p-8 bg-gray-50 rounded-xl shadow-lg">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Hello, <?php echo esc_html($user_info->display_name); ?></h1>
    <p class="text-gray-600 mb-8">Here are your appointment reservations:</p>

    <?php if ($error_message): ?>
        <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
            <p class="font-medium">Error: <?php echo esc_html($error_message); ?></p>
        </div>
    <?php elseif (empty($reservations)): ?>
        <div class="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded mb-6">
            <p class="font-medium">No reservations found.</p>
        </div>
    <?php else: ?>
        <div class="space-y-6">
            <?php foreach ($reservations as $reservation): ?>
                <div class="bg-white p-6 rounded shadow border border-gray-200">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-semibold text-gray-800">Meeting with <?php echo esc_html($reservation['user']['full_name'] ?? 'N/A'); ?></h2>
                            <p class="text-sm text-gray-500">Status: 
                                <span class="inline-block px-2 py-1 rounded text-sm font-medium 
                                    <?php echo $reservation['status'] === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'; ?>">
                                    <?php echo ucfirst($reservation['status']); ?>
                                </span>
                            </p>
                        </div>
                        <?php if (!empty($reservation['user']['avatar'])): ?>
                            <img src="<?php echo esc_url($reservation['user']['avatar']); ?>" alt="Avatar" class="w-12 h-12 rounded-full border border-gray-300">
                        <?php endif; ?>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                        <p><strong>Date:</strong> <?php echo date('d M Y', $reservation['date']); ?></p>
                        <p><strong>Day:</strong> <?php echo ucfirst($reservation['day']); ?></p>
                        <p><strong>Time:</strong> <?php echo esc_html($reservation['time']['start'] . ' - ' . $reservation['time']['end']); ?></p>
                        <p><strong>Students:</strong> <?php echo esc_html($reservation['student_count']); ?></p>
                        <p><strong>Paid:</strong> $<?php echo esc_html($reservation['user_paid_amount']); ?></p>
                        <p><strong>Amount:</strong> $<?php echo esc_html($reservation['amount']); ?></p>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <p class="mt-8 text-center text-gray-500 text-sm">FitBuds Appointments - Stay connected, stay scheduled.</p>
</div>
