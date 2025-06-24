<?php
// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Add admin menu
function fitbuds_appointments_admin_menu() {
    add_options_page(
        'FitBuds Appointments Settings',
        'FitBuds Appointments',
        'manage_options',
        'fitbuds-appointments',
        'fitbuds_appointments_settings_page'
    );
}
add_action('admin_menu', 'fitbuds_appointments_admin_menu');

// Render settings page
function fitbuds_appointments_settings_page() {
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized access');
    }

    // Save settings
    if (isset($_POST['fitbuds_appointments_save'])) {
        check_admin_referer('fitbuds_appointments_settings');

        update_option('fitbuds_appointments_enabled', isset($_POST['fitbuds_appointments_enabled']) ? '1' : '0');
        update_option('fitbuds_api_url', sanitize_text_field($_POST['fitbuds_api_url']));
        update_option('fitbuds_api_key', sanitize_text_field($_POST['fitbuds_api_key']));
        update_option('fitbuds_razorpay_key_id', sanitize_text_field($_POST['fitbuds_razorpay_key_id']));
        update_option('fitbuds_razorpay_secret', sanitize_text_field($_POST['fitbuds_razorpay_secret']));
        update_option('fitbuds_paypal_client_id', sanitize_text_field($_POST['fitbuds_paypal_client_id']));
        update_option('fitbuds_paypal_secret', sanitize_text_field($_POST['fitbuds_paypal_secret']));
        update_option('fitbuds_primary_color', sanitize_hex_color($_POST['fitbuds_primary_color']));

        echo '<div class="notice notice-success is-dismissible"><p>Settings saved successfully.</p></div>';
    }

    ?>
    <div class="wrap">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-3xl mx-auto mt-10">
            <h1 class="text-3xl font-bold text-gray-800 mb-6">FitBuds Appointments Settings</h1>
            <form method="post" action="">
                <?php wp_nonce_field('fitbuds_appointments_settings'); ?>
                <div class="mb-8">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4">General Settings</h2>
                    <div class="flex items-center mb-4">
                        <input type="checkbox" id="fitbuds_appointments_enabled" name="fitbuds_appointments_enabled" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500" <?php checked(get_option('fitbuds_appointments_enabled', '1'), '1'); ?>>
                        <label for="fitbuds_appointments_enabled" class="ml-2 text-gray-700 font-medium">Enable Appointment Booking</label>
                    </div>
                    <div class="mb-4">
                        <label for="fitbuds_api_url" class="block text-gray-700 font-medium mb-2">API Endpoint</label>
                        <input type="text" id="fitbuds_api_url" name="fitbuds_api_url" value="<?php echo esc_attr(get_option('fitbuds_api_url')); ?>" class="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        <p class="text-sm text-gray-500 mt-1">Enter the API endpoint for the FitBuds.</p>
                    </div>
                    <div class="mb-4">
                        <label for="fitbuds_api_key" class="block text-gray-700 font-medium mb-2">API Key</label>
                        <input type="text" id="fitbuds_api_key" name="fitbuds_api_key" value="<?php echo esc_attr(get_option('fitbuds_api_key')); ?>" class="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        <p class="text-sm text-gray-500 mt-1">Enter the API key for the FitBuds API.</p>
                    </div>
                    <div class="mb-4">
                        <label for="fitbuds_primary_color" class="block text-gray-700 font-medium mb-2">Primary Color</label>
                        <input type="color" id="fitbuds_primary_color" name="fitbuds_primary_color" value="<?php echo esc_attr(get_option('fitbuds_primary_color', '#2563eb')); ?>" class="h-10 w-20 border rounded focus:outline-none">
                        <p className="text-sm text-gray-500 mt-1">Choose the primary color for the booking interface.</p>
                    </div>
                </div>
                <div class="mb-8">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4">Razorpay Settings</h2>
                    <div class="mb-4">
                        <label for="fitbuds_razorpay_key_id" class="block text-gray-700 font-medium mb-2">Razorpay Key ID</label>
                        <input type="text" id="fitbuds_razorpay_key_id" name="fitbuds_razorpay_key_id" value="<?php echo esc_attr(get_option('fitbuds_razorpay_key_id')); ?>" class="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <p class="text-sm text-gray-500 mt-1">Enter your Razorpay Key ID.</p>
                    </div>
                    <div class="mb-4">
                        <label for="fitbuds_razorpay_secret" class="block text-gray-700 font-medium mb-2">Razorpay Secret</label>
                        <input type="password" id="fitbuds_razorpay_secret" name="fitbuds_razorpay_secret" value="<?php echo esc_attr(get_option('fitbuds_razorpay_secret')); ?>" class="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <p class="text-sm text-gray-500 mt-1">Enter your Razorpay Secret.</p>
                    </div>
                </div>
                <div class="mb-8">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4">PayPal Settings</h2>
                    <div class="mb-4">
                        <label for="fitbuds_paypal_client_id" class="block text-gray-700 font-medium mb-2">PayPal Client ID</label>
                        <input type="text" id="fitbuds_paypal_client_id" name="fitbuds_paypal_client_id" value="<?php echo esc_attr(get_option('fitbuds_paypal_client_id')); ?>" class="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <p class="text-sm text-gray-500 mt-1">Enter your PayPal Client ID.</p>
                    </div>
                    <div class="mb-4">
                        <label for="fitbuds_paypal_secret" class="block text-gray-700 font-medium mb-2">PayPal Secret</label>
                        <input type="password" id="fitbuds_paypal_secret" name="fitbuds_paypal_secret" value="<?php echo esc_attr(get_option('fitbuds_paypal_secret')); ?>" class="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <p class="text-sm text-gray-500 mt-1">Enter your PayPal Secret.</p>
                    </div>
                </div>
                <button type="submit" name="fitbuds_appointments_save" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300">Save Settings</button>
            </form>
        </div>
    </div>
    <?php
}

// Sanitize hex color
// function sanitize_hex_color($color) {
//     $color = ltrim($color, '#');
//     if (preg_match('/^[0-9A-Fa-f]{6}$/', $color)) {
//         return '#' . $color;
//     }
//     return '#2563eb'; // Default color
// }
?>