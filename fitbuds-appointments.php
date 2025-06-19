<?php
/*
Plugin Name: FitBuds Appointments
Description: An advanced WordPress plugin for booking appointments with API-based category and doctor selection, including Razorpay and PayPal payments.
Version: 1.2.2
Author: Manoj Kumar
License: GPL2
*/

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define constants
define('FITBUDS_APPOINTMENTS_DIR', plugin_dir_path(__FILE__));
define('FITBUDS_APPOINTMENTS_URL', plugin_dir_url(__FILE__));

// Include admin settings
require_once FITBUDS_APPOINTMENTS_DIR . 'includes/admin-settings.php';

// Enqueue scripts and styles
function fitbuds_appointments_enqueue_scripts()
{
    if (get_option('fitbuds_appointments_enabled', '1') !== '1') {
        return;
    }

    wp_enqueue_script('react', 'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js', [], '18.2.0', true);
    wp_enqueue_script('react-dom', 'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js', ['react'], '18.2.0', true);
    wp_enqueue_script('axios', 'https://cdn.jsdelivr.net/npm/axios@1.7.2/dist/axios.min.js', [], '1.7.2', true);
    wp_enqueue_style('tailwindcss', 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css', [], '2.2.19');
    wp_enqueue_script('razorpay-sdk', 'https://checkout.razorpay.com/v1/checkout.js', [], null, true);
    $paypal_client_id = get_option('fitbuds_paypal_client_id', '');
    if ($paypal_client_id) {
        wp_enqueue_script('paypal-sdk', "https://www.paypal.com/sdk/js?client-id={$paypal_client_id}&currency=USD", [], null, true);
    }
    wp_enqueue_script(
        'fitbuds-appointments-js',
        FITBUDS_APPOINTMENTS_URL . 'dist/app.js',
        ['react', 'react-dom', 'axios', 'razorpay-sdk'],
        filemtime(FITBUDS_APPOINTMENTS_DIR . 'dist/app.js'),
        true
    );
    wp_enqueue_style(
        'fitbuds-appointments-css',
        FITBUDS_APPOINTMENTS_URL . 'dist/styles.css',
        ['tailwindcss'],
        filemtime(FITBUDS_APPOINTMENTS_DIR . 'dist/styles.css')
    );

    // Localize script with API settings and user data
    $current_user = wp_get_current_user();
    $server_user_id = is_user_logged_in() ? get_user_meta($current_user->ID, 'fitbuds_server_user_id', true) : '';
    $server_token = is_user_logged_in() ? get_user_meta($current_user->ID, 'fitbuds_server_token', true) : '';
    wp_localize_script('fitbuds-appointments-js', 'fitbudsAppointmentSettings', [
        'apiBaseUrl' => get_option('fitbuds_api_url', ''),
        'apiKey' => get_option('fitbuds_api_key', ''),
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'isLoggedIn' => is_user_logged_in(),
        'serverUserId' => $server_user_id,
        'serverToken' => $server_token,
        'razorpayKeyId' => get_option('fitbuds_razorpay_key_id', ''),
        'primaryColor' => get_option('fitbuds_primary_color', '#2563eb'),
        'userData' => is_user_logged_in() ? [
            'full_name' => $current_user->display_name,
            'mobile' => get_user_meta($current_user->ID, 'mobile', true) ?: '',
            'country_code' => get_user_meta($current_user->ID, 'country_code', true) ?: '+91',
            'email' => $current_user->user_email,
        ] : null,
    ]);
}
add_action('wp_enqueue_scripts', 'fitbuds_appointments_enqueue_scripts');

// Admin scripts and styles
function fitbuds_appointments_admin_enqueue_scripts($hook)
{
    if ($hook !== 'settings_page_fitbuds-appointments') {
        return;
    }
    wp_enqueue_style('tailwindcss', 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css', [], '2.2.19');
    wp_enqueue_style('fitbuds-admin-css', FITBUDS_APPOINTMENTS_URL . 'assets/admin-styles.css', ['tailwindcss'], '1.2.2');
    wp_enqueue_script('fitbuds-admin-js', FITBUDS_APPOINTMENTS_URL . 'assets/admin-scripts.js', [], '1.2.2', true);
}
add_action('admin_enqueue_scripts', 'fitbuds_appointments_admin_enqueue_scripts');

// Register shortcode
function fitbuds_appointments_shortcode()
{
    if (get_option('fitbuds_appointments_enabled', '1') !== '1') {
        return '<p class="text-red-500 text-center">Appointments are currently disabled.</p>';
    }
    return '<div id="fitbuds-appointments-root" class="p-4"></div>';
}
add_shortcode('fitbuds_appointments', 'fitbuds_appointments_shortcode');

// Activation hook
function fitbuds_appointments_activate()
{
    add_option('fitbuds_appointments_enabled', '1');
    add_option('fitbuds_api_key', '');
    add_option('fitbuds_api_url', '');
    add_option('fitbuds_razorpay_key_id', '');
    add_option('fitbuds_razorpay_secret', '');
    add_option('fitbuds_paypal_client_id', '');
    add_option('fitbuds_paypal_secret', '');
    add_option('fitbuds_primary_color', '#2563eb');
}
register_activation_hook(__FILE__, 'fitbuds_appointments_activate');

// Deactivation hook
function fitbuds_appointments_deactivate()
{
    // Clean up if needed
}
register_deactivation_hook(__FILE__, 'fitbuds_appointments_deactivate');

// cutoms
add_action('wp_ajax_fitbuds_store_user_id', 'fitbuds_store_user_id_callback');
add_action('wp_ajax_nopriv_fitbuds_store_user_id', 'fitbuds_store_user_id_callback');

function fitbuds_store_user_id_callback()
{
    // Ensure required data is provided
    if (!isset($_POST['user_id']) || !isset($_POST['token']) || !isset($_POST['email']) || !isset($_POST['full_name']) || !isset($_POST['password'])) {
        wp_send_json_error(['message' => 'Invalid data']);
        return;
    }

    // Sanitize the incoming data
    $server_user_id = sanitize_text_field($_POST['user_id']);  // fitbuds server user ID
    $server_token = sanitize_text_field($_POST['token']);      // Token
    $email = sanitize_email($_POST['email']);                  // User email
    $full_name = sanitize_text_field($_POST['full_name']);     // Full Name
    $password = sanitize_text_field($_POST['password']);       // Password
    $mobile = isset($_POST['mobile']) ? sanitize_text_field($_POST['mobile']) : '';  // Optional mobile

    $user = wp_get_current_user();  // Get the current logged-in user

    if ($user->ID) {
        // **Case 1: User is logged in**
        // Check if the custom user ID exists in user meta
        $fitbuds_user_id = get_user_meta($user->ID, 'fitbuds_server_user_id', true);

        if ($fitbuds_user_id) {
            // If the custom user ID exists, update the token
            update_user_meta($user->ID, 'fitbuds_server_token', $server_token);
            wp_send_json_success(['message' => 'Token updated successfully', 'user_id' => $user->ID]);
        } else {
            // **Step 2: Check if the logged-in user has a matching fitbuds_server_user_id**
            $current_user_id = $user->ID;
            $existing_user_meta = get_user_meta($current_user_id, 'fitbuds_server_user_id', true);
            if ($existing_user_meta === $server_user_id) {
                // If user ID matches, update the token
                update_user_meta($current_user_id, 'fitbuds_server_token', $server_token);
                wp_send_json_success(['message' => 'Token updated for logged-in user']);
            } else {
                // **Step 3: Find another user by email or phone number**
                $user_query = new WP_User_Query([
                    'search' => '*' . esc_attr($email) . '*',
                    'search_columns' => ['user_login', 'user_email'],
                    'number' => 1
                ]);

                if (!empty($user_query->results)) {
                    $other_user = $user_query->results[0];
                    // Log out the current user
                    wp_logout();
                    // Log in the found user
                    wp_set_current_user($other_user->ID);
                    wp_set_auth_cookie($other_user->ID);
                    update_user_meta($other_user->ID, 'fitbuds_server_token', $server_token);
                    wp_send_json_success(['message' => 'User found by email or mobile, logged in and token updated', 'user_id' => $other_user->ID]);
                } else {
                    wp_send_json_error(['message' => 'No matching user found']);
                }
            }
        }
    } else {
        // **Case 2: User is not logged in**
        // First, check if the custom user ID exists
        $user_query = new WP_User_Query([
            'meta_key'   => 'fitbuds_server_user_id',
            'meta_value' => $server_user_id,
            'number'     => 1
        ]);

        if (!empty($user_query->results)) {
            // If user found by custom user ID, log the user in and update the token
            $existing_user = $user_query->results[0];
            wp_set_current_user($existing_user->ID);
            wp_set_auth_cookie($existing_user->ID);
            update_user_meta($existing_user->ID, 'fitbuds_server_token', $server_token);
            wp_send_json_success(['message' => 'User logged in and token updated by custom user ID', 'user_id' => $existing_user->ID]);
        } else {
            // **Step 2: If not found by custom user ID, search by email or phone (username)**
            $user_query = new WP_User_Query([
                'search' => '*' . esc_attr($email) . '*',
                'search_columns' => ['user_email', 'user_login'],
                'number' => 1
            ]);

            if (!empty($user_query->results)) {
                $user_found = $user_query->results[0];
                wp_set_current_user($user_found->ID);
                wp_set_auth_cookie($user_found->ID);
                wp_send_json_success(['message' => 'User found by email/phone, logged in', 'user_id' => $user_found->ID]);
            } else {
                // **Step 3: No user found, register the user**
                // Create a username using the mobile number and register the new user
                $username = $mobile;
                $new_user_id = wp_create_user($username, $password, $email);

                if (is_wp_error($new_user_id)) {
                    wp_send_json_error(['message' => 'User registration failed', 'error' => $new_user_id->get_error_message()]);
                    return;
                }

                // Set the user's full name, email, and mobile number
                wp_update_user([
                    'ID' => $new_user_id,
                    'display_name' => $full_name,
                    'user_login' => $email
                ]);

                // Update additional fields like mobile and custom fitbuds ID
                update_user_meta($new_user_id, 'mobile', $mobile);
                update_user_meta($new_user_id, 'fitbuds_server_user_id', $server_user_id);
                update_user_meta($new_user_id, 'fitbuds_server_token', $server_token);

                // Log in the newly created user
                wp_set_current_user($new_user_id);
                wp_set_auth_cookie($new_user_id);
                wp_send_json_success(['message' => 'User registered and logged in', 'user_id' => $new_user_id]);
            }
        }
    }
}
