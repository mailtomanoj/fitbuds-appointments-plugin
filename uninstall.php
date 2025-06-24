<?php
// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Uninstall plugin and clean up settings
delete_option('fitbuds_appointments_enabled');
delete_option('fitbuds_api_key');
delete_option('fitbuds_api_url');
delete_option('fitbuds_razorpay_key_id');
delete_option('fitbuds_razorpay_secret');
delete_option('fitbuds_paypal_client_id');
delete_option('fitbuds_paypal_secret');
delete_option('fitbuds_primary_color');