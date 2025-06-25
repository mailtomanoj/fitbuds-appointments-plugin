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

// Initialize user data
$user_data = null;
$error_message = '';

if ($server_user_id && $api_base_url && $api_key) {
    // Prepare API request with x-api-key header
    $api_url = trailingslashit($api_base_url) . 'panel/profile-setting?test_auth_id=' . urlencode($server_user_id);

    $response = wp_remote_get($api_url, [
        'headers' => [
            'x-api-key' => $api_key,
            'Content-Type' => 'application/json',
        ],
        'timeout' => 15,
    ]);

    if (is_wp_error($response)) {
        $error_message = 'Failed to fetch user data: ' . $response->get_error_message();
    } else {
        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        $decoded_response = json_decode($response_body, true);

        if ($response_code === 200 && isset($decoded_response['success']) && $decoded_response['success'] === true) {
            $user_data = $decoded_response['data']['user'];
        } else {
            $error_message = 'API error: ' . ($decoded_response['message'] ?? 'Invalid response');
        }
    }
}
?>

<div class="wrap max-w-5xl mx-auto p-8 bg-gray-50 rounded-xl shadow-lg">
    <!-- Header -->
    <div class="flex items-center mb-8">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
        </div>
        <div>
            <h1 class="text-3xl font-bold text-gray-800">Welcome, <?php echo esc_html($user_info->display_name); ?></h1>
            <p class="text-gray-500">Your personalized health and fitness dashboard</p>
        </div>
    </div>

    <!-- Error or Warning -->
    <?php if ($error_message): ?>
        <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-8">
            <p class="font-medium">Error: <?php echo esc_html($error_message); ?></p>
        </div>
    <?php elseif (!$user_data): ?>
        <div class="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded mb-8">
            <p class="font-medium">No profile data available. Please ensure your account is linked.</p>
        </div>
    <?php else: ?>
        <!-- Profile Section -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg class="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Profile Information
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <p class="mb-2"><span class="font-medium text-gray-700">Full Name:</span> <?php echo esc_html($user_data['full_name']); ?></p>
                    <p class="mb-2"><span class="font-medium text-gray-700">Email:</span> <?php echo esc_html($user_data['email']); ?></p>
                    <p class="mb-2"><span class="font-medium text-gray-700">Mobile:</span> <?php echo esc_html($user_data['mobile']); ?></p>
                    <p class="mb-2"><span class="font-medium text-gray-700">Status:</span> <span class="inline-block px-2 py-1 text-sm rounded-full <?php echo $user_data['status'] === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'; ?>"><?php echo esc_html(ucfirst($user_data['status'])); ?></span></p>
                </div>
                <div>
                    <p class="mb-2"><span class="font-medium text-gray-700">Joined:</span> <?php echo esc_html($user_data['created_at']); ?></p>
                    <?php if ($user_data['avatar']): ?>
                        <div class="mt-4">
                            <span class="font-medium text-gray-700">Profile Picture:</span>
                            <img src="<?php echo esc_url($user_data['avatar']); ?>" alt="Profile Picture" class="w-20 h-20 rounded-full object-cover mt-2 border-2 border-blue-200">
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <?php if (count($user_data['meta']) > 0 || !empty($user_data['referral'])) { ?>
            <!-- Combined Section with Main Grid -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Biometrics Section -->
                    <?php if (count($user_data['meta']) > 0) { ?>
                        <div>
                            <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                                <svg class="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                                </svg>
                                Biometrics
                            </h2>
                            <!-- Inner grid for biometrics fields -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <?php
                                $meta_fields = [
                                    'dob' => 'Date of Birth',
                                    'gender' => 'Gender',
                                    'height' => 'Height',
                                    'h_unit' => 'Height Unit',
                                    'weight' => 'Weight',
                                    'w_unit' => 'Weight Unit',
                                    'bmi' => 'BMI',
                                ];
                                foreach ($user_data['meta'] as $meta) {
                                    if (isset($meta_fields[$meta['name']])) {
                                        echo '<p class="mb-2"><span class="font-medium text-gray-700">' . esc_html($meta_fields[$meta['name']]) . ':</span> ' . esc_html($meta['value']) . '</p>';
                                    }
                                }
                                ?>
                            </div>
                        </div>
                    <?php } ?>

                    <!-- Referral Section -->
                    <?php if (!empty($user_data['referral'])) { ?>
                        <div>
                            <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                                <svg class="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Referral Program
                            </h2>
                            <p class="mb-2"><span class="font-medium text-gray-700">Referral Code:</span> <?php echo esc_html($user_data['referral']['code']); ?></p>
                            <p class="mb-2"><span class="font-medium text-gray-700">Referral Link:</span> <a href="<?php echo esc_url($user_data['referral']['link']); ?>" class="text-blue-600 hover:underline" target="_blank"><?php echo esc_html($user_data['referral']['link']); ?></a></p>
                            <p class="mb-2"><span class="font-medium text-gray-700">Leaderboard Rank:</span> <?php echo esc_html($user_data['leaderboard_rank']); ?></p>
                        </div>
                    <?php } ?>
                </div>
            </div>
        <?php } ?>


<?php if (!empty($user_data['piggybank']) || !empty($user_data['today_fitness_challenge']) || !empty($user_data['today_healthyplate']) || !empty($user_data['today_quiz_contest'])) { ?>
    <!-- Combined Piggybank and Daily Challenges Section -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- Piggybank Section -->
            <?php if (!empty($user_data['piggybank'])) { ?>
                <div>
                    <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                        <svg class="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Piggybank
                    </h2>
                    <p class="mb-2"><span class="font-medium text-gray-700">Coins Available:</span> <?php echo esc_html($user_data['piggybank']['left_coins']); ?></p>
                    <p class="mb-2"><span class="font-medium text-gray-700">Coins Earned:</span> <?php echo esc_html($user_data['piggybank']['earned_coins']); ?></p>
                    <p class="mb-2"><span class="font-medium text-gray-700">Coins Spent:</span> <?php echo esc_html($user_data['piggybank']['spent_coins']); ?></p>
                </div>
            <?php } ?>

            <!-- Daily Challenges Section -->
            <div>
                <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Daily Challenges
                </h2>
                <div class="space-y-2">
                    <?php
                    $challenges = [
                        'today_fitness_challenge' => 'Fitness Challenge',
                        'today_healthyplate' => 'Healthy Plate',
                        'today_quiz_contest' => 'Quiz Contest',
                    ];

                    foreach ($challenges as $key => $label):
                        $challenge = $user_data[$key] ?? null;
                    ?>
                        <div class="flex items-center justify-between bg-gray-50 rounded-lg">
                            <div>
                                <p class="font-medium text-gray-700"><?php echo esc_html($label); ?></p>
                                <p class="text-sm text-gray-500">
                                    <?php
                                    if (isset($challenge['is_completed'])) {
                                        echo $challenge['is_completed'] ? 'Completed' : 'Not Completed';
                                    } else {
                                        echo 'Data not available';
                                    }
                                    ?>
                                </p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm text-gray-600">
                                    Coins Earned: <?php echo isset($challenge['coin_earned']) ? esc_html($challenge['coin_earned']) : '—'; ?>
                                </p>
                                <p class="text-sm text-gray-600">
                                    Coins Left: <?php echo isset($challenge['left_coins']) ? esc_html($challenge['left_coins']) : '—'; ?>
                                </p>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

        </div>
    </div>
<?php } ?>


    <?php endif; ?>

    <!-- Footer Note -->
    <p class="mt-8 text-center text-gray-500 text-sm">FitBuds Appointments Dashboard - Your health, your schedule.</p>
</div>