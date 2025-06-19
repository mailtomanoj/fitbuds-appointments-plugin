import axios from 'axios';

/**
 * Fetch consultation categories
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @returns {Promise<Array>}
 */
export const fetchCategories = async (apiBaseUrl, apiKey) => {
  try {
    const response = await axios.get(`${apiBaseUrl}/providers/consultationHome?search`, {
      headers: { 'x-api-key': apiKey }
    });
    if (response.data.success) {
      return response.data.data.filter(category => category.list.length > 0);
    }
    throw new Error('Failed to fetch categories.');
  } catch (error) {
    console.error('fetchCategories:', error);
    throw error;
  }
};

/**
 * Fetch timeslots for a doctor
 * @param {number} doctorId
 * @param {number} authId
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @returns {Promise<Array>}
 */
export const fetchTimeslots = async (doctorId, authId, apiBaseUrl, apiKey) => {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);
    const formatDate = (date) => date.toISOString().split('T')[0];
    const response = await axios.get(
      `${apiBaseUrl}/users/${doctorId}/meetingCalendar?test_auth_id=${authId || 1}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`,
      { headers: { 'x-api-key': apiKey } }
    );
    if (response.data.success) {
      return response.data.data.timeslots;
    }
    throw new Error('Failed to fetch timeslots.');
  } catch (error) {
    console.error('fetchTimeslots:', error);
    throw error;
  }
};

/**
 * Register a new user
 * @param {Object} userData
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @param {string} ajaxUrl
 * @param {boolean} isLoggedIn
 * @returns {Promise<Object|null>}
 */

// export const registerUser = async (userData, apiBaseUrl, apiKey, ajaxUrl, isLoggedIn) => {
//   console.log('Registering user:', userData);
//   console.log(isLoggedIn ? 'User is logged in' : 'User is not logged in');
//   try {
//     const response = await axios.post(fitbudsAppointmentSettings.ajaxUrl, new URLSearchParams({
//       action: 'fitbuds_store_user_id',
//       user_id: userData.user_id,
//       token: userData.token,
//     }));

//     console.log('AJAX success:', response.data);
//   } catch (error) {
//     console.error('AJAX error:', error.response?.data || error);
//   }
// };

export const checkUserExistsinApi = async (payload, apiBaseUrl, apiKey) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/user/is_registered`, payload, {
      headers: { 'x-api-key': apiKey }
    });

    if (response.data.status === 'retrieved') {
      return true;
    } else if (response.data.status === 'not_found') {
      return false;
    }

  } catch (error) {
    console.error('Failed to find :', error);
    throw error;
  }
};

export const registerUser = async (userData, apiBaseUrl, apiKey, ajaxUrl, isLoggedIn) => {
  try {
    const formData = new FormData();
    formData.append('country_code', userData.country_code);
    formData.append('mobile', userData.mobile);
    formData.append('full_name', userData.full_name);
    if (userData.referral_code) formData.append('referral_code', userData.referral_code);

    const response = await axios.post(`${apiBaseUrl}/oneStepRegistration`, formData, {
      headers: { 'x-api-key': apiKey }
    });
    if (response.data.success) {
      if (isLoggedIn) {
        try {
          const response = await axios.post(fitbudsAppointmentSettings.ajaxUrl, new URLSearchParams({
            action: 'fitbuds_store_user_id',
            user_id: userData.user_id,
            token: userData.token,
          }));

          console.log('Register AJAX success:', response.data);
        } catch (error) {
          console.error('Register AJAX error:', error.response?.data || error);
        }
      }
      return response.data.data;
    }
    throw new Error('Failed to register user.');
  } catch (error) {
    console.error('registerUser:', error);
    throw error;
  }
};

/**
 * Login existing user
 * @param {Object} credentials
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @param {string} ajaxUrl
 * @param {boolean} isLoggedIn
 * @returns {Promise<Object|null>}
 */
export const loginUser = async (credentials, apiBaseUrl, apiKey, isLoggedIn, userData) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/login`, credentials, {
      headers: { 'x-api-key': apiKey }
    });

    if (response.data.success) {

      userData.user_id = response.data.data.user_id;
      userData.token = response.data.data.token;
      console.log('Usss ser Data:', userData);
      try {
        const response1 = await axios.post(fitbudsAppointmentSettings.ajaxUrl, new URLSearchParams({
          action: 'fitbuds_store_user_id',
          user_id: userData.user_id,
          token: userData.token,
          full_name: userData.full_name,
          mobile: userData.mobile,
          email: userData.email,
          password: userData.password
        }));

        console.log('Login AJAX success:', response1.data);
      } catch (error) {
        console.error('Login AJAX error:', error.response1?.data || error);
      }

      return response.data.data;
    }
    return null; // Silent fail to allow registration attempt
  } catch (error) {
    console.error('loginUser:', error);
    return null;
  }
};

/**
 * Reserve a meeting
 * @param {Object} payload
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @param {string} token
 * @returns {Promise<void>}
 */
export const reserveMeeting = async (payload, apiBaseUrl, apiKey, token) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/meetings/reserve`, payload, {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.data.success) {
      throw new Error('Failed to reserve meeting.');
    }
  } catch (error) {
    console.error('reserveMeeting:', error);
    throw error;
  }
};

/**
 * Fetch cart details
 * @param {number} authId
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
export const fetchCart = async (authId, apiBaseUrl, apiKey) => {
  try {
    const response = await axios.get(`${apiBaseUrl}/panel/cart/list?test_auth_id=${authId || 1}`, {
      headers: { 'x-api-key': apiKey }
    });
    if (response.data.success) {
      return response.data.data.cart;
    }
    throw new Error('Failed to fetch cart.');
  } catch (error) {
    console.error('fetchCart:', error);
    throw error;
  }
};

/**
 * Validate coupon code
 * @param {string} coupon
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
export const validateCoupon = async (coupon, apiBaseUrl, apiKey, token) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/panel/cart/coupon/validate`, { coupon }, {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('validateCoupon:', error);
    throw error;
  }
};

/**
 * Remove item from cart
 * @param {number} itemId
 * @param {number} authId
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @returns {Promise<void>}
 */
export const removeCartItem = async (itemId, authId, apiBaseUrl, apiKey) => {
  try {
    const response = await axios.delete(`${apiBaseUrl}/panel/cart/${itemId}`, {
      headers: { 'x-api-key': apiKey },
      data: { test_auth_id: authId }
    });
    if (!response.data.success) {
      throw new Error('Failed to remove cart item.');
    }
  } catch (error) {
    console.error('removeCartItem:', error);
    throw error;
  }
};

/**
 * Checkout cart
 * @param {Object} payload
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
export const checkoutCart = async (payload, apiBaseUrl, apiKey) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/panel/cart/checkout`, payload, {
      headers: { 'x-api-key': apiKey }
    });
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to checkout.');
  } catch (error) {
    console.error('checkoutCart:', error);
    throw error;
  }
};

/**
 * Request payment
 * @param {Object} payload
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @param {string} token
 * @returns {Promise<void>}
 */
export const requestPayment = async (payload, apiBaseUrl, apiKey, token) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/panel/payments/request`, payload, {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.data.success) {
      throw new Error('Failed to initiate payment.');
    }
  } catch (error) {
    console.error('requestPayment:', error);
    throw error;
  }
};

/**
 * Initiate Razorpay payment
 * @param {number} gatewayId
 * @param {string} gatewayName
 * @param {Object} options
 * @param {Function} verifyPayment
 * @param {Function} setError
 */
export const initiateRazorpayPayment = (gatewayId, gatewayName, options, verifyPayment, setError) => {
  if (!window.Razorpay) {
    setError('Razorpay SDK not loaded.');
    return;
  }
  const rzpOptions = {
    ...options,
    handler: async (response) => {
      await verifyPayment(gatewayId, gatewayName, {
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: ''
      });
    }
  };
  const rzp = new window.Razorpay(rzpOptions);
  rzp.on('payment.failed', () => {
    setError('Payment failed. Please try again.');
    verifyPayment(gatewayId, gatewayName, { razorpay_payment_id: '', razorpay_order_id: '' });
  });
  rzp.open();
};

/**
 * Initiate PayPal payment
 * @param {number} gatewayId
 * @param {number} amount
 * @param {string} description
 * @param {Function} verifyPayment
 * @param {Function} setError
 */
export const initiatePayPalPayment = (gatewayId, amount, description, verifyPayment, setError) => {
  window.paypal.Buttons({
    createOrder: (data, actions) => {
      return actions.order.create({
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2)
          },
          description
        }]
      });
    },
    onApprove: async (data, actions) => {
      const order = await actions.order.capture();
      await verifyPayment(gatewayId, 'Paypal', { paypal_payment_id: order.id });
    },
    onError: (err) => {
      setError('PayPal payment failed. Please try again.');
      verifyPayment(gatewayId, 'Paypal', { paypal_payment_id: '' });
    }
  }).render('#paypal-button-container');
};

/**
 * Verify payment
 * @param {number} gatewayId
 * @param {string} gatewayName
 * @param {Object} paymentDetails
 * @param {number} authId
 * @param {number} orderId
 * @param {string} apiBaseUrl
 * @param {string} apiKey
 * @returns {Promise<boolean>}
 */
export const verifyPayment = async (gatewayId, gatewayName, paymentDetails, authId, orderId, apiBaseUrl, apiKey) => {
  try {
    const payload = {
      test_auth_id: authId,
      gateway_id: gatewayId,
      order_id: orderId,
      ...(gatewayName === 'Razorpay' ? {
        razorpay_payment_id: paymentDetails.razorpay_payment_id,
        razorpay_order_id: paymentDetails.razorpay_order_id
      } : { paypal_payment_id: paymentDetails.paypal_payment_id })
    };
    const response = await axios.post(`${apiBaseUrl}/panel/payments/verify/${gatewayName}`, payload, {
      headers: { 'x-api-key': apiKey }
    });
    return response.data.success;
  } catch (error) {
    console.error('verifyPayment:', error);
    throw error;
  }
};