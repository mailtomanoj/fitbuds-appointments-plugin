import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  fetchCategories,
  fetchTimeslots,
  checkUserExistsinApi,
  registerUser,
  loginUser,
  reserveMeeting,
  fetchCart,
  validateCoupon,
  removeCartItem,
  checkoutCart,
  requestPayment,
  initiateRazorpayPayment,
  initiatePayPalPayment,
  verifyPayment
} from './api';

/**
 * Main application component for FitBuds Appointments
 * @returns {JSX.Element}
 */
const App = () => {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeslots, setTimeslots] = useState([]);
  const [selectedTimeslot, setSelectedTimeslot] = useState(null);
  const [cart, setCart] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [coupon, setCoupon] = useState('');
  const [couponStatus, setCouponStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState({
    country_code: '+91',
    mobile: '',
    full_name: '',
    email: '',
    referral_code: '',
    password: 'xfit123' // Default password for API login
  });
  const [serverUserId, setServerUserId] = useState(null);
  const [serverToken, setServerToken] = useState(null);
  const [isPaypalLoaded, setIsPaypalLoaded] = useState(false);

  const { apiBaseUrl, apiKey, ajaxUrl, isLoggedIn, userData: wpUserData, serverUserId: initialServerUserId, serverToken: initialServerToken, razorpayKeyId, primaryColor } = window.fitbudsAppointmentSettings;

  // Initialize user data and PayPal SDK status
  useEffect(() => {
    if (isLoggedIn && wpUserData) {
      setUserData(prev => ({
        ...prev,
        country_code: wpUserData.country_code || '+91',
        mobile: wpUserData.mobile || '',
        full_name: wpUserData.full_name || '',
        email: wpUserData.email || ''
      }));
    }
    if (initialServerUserId) {
      setServerUserId(initialServerUserId);
    }
    if (initialServerToken) {
      setServerToken(initialServerToken);
    }
    // Check if PayPal SDK is loaded
    const paypalInterval = setInterval(() => {
      if (window.paypal) {
        setIsPaypalLoaded(true);
        clearInterval(paypalInterval);
      }
    }, 500);
    return () => clearInterval(paypalInterval);
  }, [isLoggedIn, wpUserData, initialServerUserId, initialServerToken]);

  // Authenticate user (register or login)
  const authenticateUser = useCallback(async () => {
    if (!userData.mobile || !userData.full_name) {
      setError('Please provide mobile number and full name.');
      return null;
    }
    setLoading(true);
    setError(null);
  
    try {
      let authData = null;
      if (serverUserId) {
        // Attempt login
        authData = await loginUser({
          username: `${userData.country_code}${userData.mobile}`.replace('+', ''),
          password: userData.password
        }, apiBaseUrl, apiKey, isLoggedIn, userData);
      }

      if (!authData) {
        // Register new user
        const cludData = new FormData();
        cludData.append('country_code', userData.country_code);
        cludData.append('mobile', userData.mobile);
        cludData.append('password', userData.password);

        const isExist = await checkUserExistsinApi(cludData, apiBaseUrl, apiKey);
        if (isExist === false) {
          authData = await registerUser(userData, apiBaseUrl, apiKey, ajaxUrl, isLoggedIn);
        }

        authData = await loginUser({
          username: `${userData.country_code}${userData.mobile}`.replace('+', ''),
          password: userData.password
        }, apiBaseUrl, apiKey, isLoggedIn, userData);
        console.log('Auth Data Step 3:', authData);

        setServerUserId(authData.user_id);
        setServerToken(authData.token);
        return authData.user_id;
      }
      throw new Error('Authentication failed.');
    } catch (err) {
      setError(err.message || 'Failed to authenticate. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [serverUserId, userData, apiBaseUrl, apiKey, ajaxUrl, isLoggedIn]);

  // Load categories on mount
  useEffect(() => {
    if (!apiKey) {
      setError('API key is not configured. Please contact the administrator.');
      return;
    }
    const loadCategories = async () => {
      setLoading(true);
      try {
        const data = await fetchCategories(apiBaseUrl, apiKey);
        setCategories(data);
      } catch (err) {
        setError('Error loading categories.');
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, [apiBaseUrl, apiKey]);

  // Handlers
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setDoctors(category.list);
    setStep(2);
    setError(null);
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setStep(3);
    setError(null);
    fetchTimeslots(doctor.id, serverUserId, apiBaseUrl, apiKey)
      .then(setTimeslots)
      .catch(() => setError('Error fetching timeslots.'));
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTimeslot(null);
    setStep(4);
    setError(null);
  };

  const handleTimeslotSelect = (slot) => {
    setSelectedTimeslot(slot);
    setStep(isLoggedIn || serverUserId ? 5 : 4.5);
    setError(null);
  };

  const handleUserDataChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const authId = await authenticateUser();
    if (authId) {
      setStep(5);
    }
  };

  const handleReserveMeeting = async () => {
    if (!serverToken) {
      setError('User not authenticated. Please register or log in.');
      return;
    }
    setLoading(true);
    try {
      await reserveMeeting({
        time_id: selectedTimeslot.id,
        date: selectedDate.toISOString().split('T')[0],
        meeting_type: 'in_person'
      }, apiBaseUrl, apiKey, serverToken);
      setStep(6);
      fetchCart(serverUserId, apiBaseUrl, apiKey)
        .then(setCart)
        .catch(() => setError('Error fetching cart.'));
    } catch (err) {
      setError('Error reserving meeting.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateCoupon = async () => {
    setLoading(true);
    setCouponStatus(null);
    try {
      const response = await validateCoupon(coupon, apiBaseUrl, apiKey, serverToken);
      setCouponStatus(response);
      if (!response.success) {
        setError(response.message);
      }
    } catch (err) {
      setError('Error validating coupon.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCartItem = async (itemId) => {
    setLoading(true);
    try {
      await removeCartItem(itemId, serverUserId, apiBaseUrl, apiKey);
      fetchCart(serverUserId, apiBaseUrl, apiKey)
        .then(setCart)
        .catch(() => setError('Error refreshing cart.'));
    } catch (err) {
      setError('Error removing cart item.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const data = await checkoutCart({ test_auth_id: serverUserId, coupon: couponStatus?.success ? coupon : '' }, apiBaseUrl, apiKey);
      setCheckoutData(data);
      setStep(7);
    } catch (err) {
      setError('Error during checkout.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentRequest = async (gatewayId, gatewayName) => {
    setLoading(true);
    try {
      await requestPayment({
        test_auth_id: serverUserId,
        gateway_id: gatewayId,
        order_id: checkoutData.order.id
      }, apiBaseUrl, apiKey, serverToken);
      if (gatewayName === 'Razorpay') {
        initiateRazorpayPayment(gatewayId, gatewayName, {
          key: razorpayKeyId,
          amount: checkoutData.amounts.total * 100,
          currency: 'INR',
          name: 'FitBuds Appointments',
          description: `Appointment with ${selectedDoctor.full_name}`,
          image: selectedDoctor.avatar,
          prefill: {
            name: userData.full_name,
            email: userData.email,
            contact: userData.mobile
          },
          theme: { color: primaryColor }
        }, (gatewayId, gatewayName, paymentDetails) =>
          verifyPayment(gatewayId, gatewayName, paymentDetails, serverUserId, checkoutData.order.id, apiBaseUrl, apiKey)
            .then(success => success && setStep(8)),
          setError);
      } else if (gatewayName === 'Paypal' && isPaypalLoaded) {
        initiatePayPalPayment(gatewayId, checkoutData.amounts.total, selectedDoctor.full_name,
          (gatewayId, gatewayName, paymentDetails) =>
            verifyPayment(gatewayId, gatewayName, paymentDetails, serverUserId, checkoutData.order.id, apiBaseUrl, apiKey)
              .then(success => success && setStep(8)),
          setError);
      } else {
        setError('PayPal SDK not loaded.');
      }
    } catch (err) {
      setError('Error initiating payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const steps = {
      2: () => { setSelectedCategory(null); setDoctors([]); setStep(1); },
      3: () => { setSelectedDoctor(null); setTimeslots([]); setStep(2); },
      4: () => { setSelectedDate(null); setStep(3); },
      4.5: () => { setStep(4); },
      5: () => { setSelectedTimeslot(null); setStep(4); },
      6: () => { setCart(null); setStep(5); },
      7: () => { setCheckoutData(null); setSelectedGateway(null); setStep(6); }
    };
    steps[step]?.();
    setError(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-10xl bg-white rounded-2xl shadow-2xl transition-all duration-300">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg animate-fade-in">
          {error}
          <button onClick={() => setError(null)} className="float-right text-red-700 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Step 1: Category Selection */}
      {step === 1 && !loading && !error && (
        <div className="animate-fade-in">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Choose a Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map(category => (
              <div
                key={category.category_name}
                className="bg-gray-50 shadow-lg rounded-xl p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 hover:bg-blue-50"
                onClick={() => handleCategorySelect(category)}
                style={{ borderLeft: `4px solid ${primaryColor}` }}
              >
                <h4 className="text-xl font-semibold text-gray-800">{category.category_name}</h4>
                <p className="text-gray-500 mt-2">{category.list.length} {category.list.length === 1 ? 'Specialist' : 'Specialists'} Available</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Doctor Selection */}
      {step === 2 && (
        <div className="animate-fade-in relative">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-8 text-center">
            Select a Specialist
          </h2>

          <button
            onClick={handleBack}
            className="mb-6 text-blue-600 hover:text-blue-800 font-semibold flex items-center transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Categories
          </button>

          {/* Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map(doctor => (
              <div
                key={doctor.id}
                className="flex flex-col sm:flex-row bg-white border border-gray-200 shadow-sm rounded-xl p-4 hover:shadow-md transition transform hover:-translate-y-1 hover:border-blue-200"
                style={{ borderLeft: `4px solid ${primaryColor}` }}
                onClick={() => handleDoctorSelect(doctor)}
              >
                <img
                  src={doctor.avatar}
                  alt={doctor.full_name}
                  className="w-24 h-24 rounded-full object-cover shadow-sm mx-auto sm:mx-0 sm:mr-4 mb-4 sm:mb-0"
                />
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-800">{doctor.full_name}</h4>
                  <p className="text-gray-500">{doctor.occupations.join(', ')}</p>
                  <p className="text-gray-700 font-medium mt-1">
                    Starting From: ₹{doctor.meeting_base_amount}
                  </p>

                  {doctor.about && (
                    <p
                      className="text-sm text-gray-600 mt-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDoctor(doctor);
                      }}
                    >
                      {doctor.about.length > 80 ? (
                        <>
                          {doctor.about.slice(0, 80)}
                          <span className="readmore" > Read more</span>
                        </>
                      ) : (
                        doctor.about
                      )}
                    </p>

                  )}

                  <div className="mt-3">
                    <span
                      className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${doctor.meeting_status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {doctor.meeting_status.charAt(0).toUpperCase() + doctor.meeting_status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable Modal */}
          {selectedDoctor && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center px-4 sm:px-0"
              onClick={() => setSelectedDoctor(null)}
            >
              <div
                className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-3 text-gray-800">{selectedDoctor.full_name}</h3>
                <div className="text-gray-700 text-sm whitespace-pre-line">
                  {selectedDoctor.about}
                </div>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="mt-5 w-full text-center py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Step 3: Date Selection */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Select a Date</h2>
          <button onClick={handleBack} className="mb-6 text-blue-600 hover:text-blue-800 font-semibold flex items-center transition-colors duration-200">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Specialists
          </button>
          <div className="flex justify-center">
            <Calendar
              onChange={handleDateSelect}
              value={selectedDate}
              minDate={new Date()}
              maxDate={new Date(new Date().setDate(new Date().getDate() + 30))}
              tileDisabled={({ date }) => {
                const dateStr = date.toISOString().split('T')[0];
                const daySlots = timeslots.find(slot => slot.date === dateStr);
                return !daySlots || daySlots.available_slots_count === 0;
              }}
              className="border-none rounded-xl shadow-2xl p-8 bg-gray-50 w-full max-w-3xl"
            />
          </div>
        </div>
      )}

      {/* Step 4: Time Slot Selection */}
      {step === 4 && (
        <div className="animate-fade-in">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Select a Time Slot</h2>
          <button onClick={handleBack} className="mb-6 text-blue-600 hover:text-blue-800 font-semibold flex items-center transition-colors duration-200">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Calendar
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {timeslots
              .find(slot => slot.date === selectedDate?.toISOString().split('T')[0])
              ?.slots.filter(slot => !slot.is_reserved)
              .map(slot => (
                <div
                  key={slot.id}
                  className="bg-gray-50 shadow-lg rounded-xl p-4 cursor-pointer hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 hover:bg-blue-50"
                  onClick={() => handleTimeslotSelect(slot)}
                  style={{ borderLeft: `4px solid ${primaryColor}` }}
                >
                  <p className="text-gray-800 mb-2 font-semibold">{slot.time}</p>
                  <p className="text-gray-600 mb-2">₹{slot.price}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Step 4.5: User Registration */}
      {step === 4.5 && (
        <div className="animate-fade-in">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Register to Book</h2>
          <button onClick={handleBack} className="mb-6 text-blue-600 hover:text-blue-800 font-semibold flex items-center transition-colors duration-200">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Time Slots
          </button>
          <div className="bg-gray-50 shadow-2xl rounded-xl p-8 max-w-md mx-auto">
            <form onSubmit={handleRegisterSubmit}>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={userData.full_name}
                  onChange={handleUserDataChange}
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Country Code</label>
                <input
                  type="text"
                  name="country_code"
                  value={userData.country_code}
                  onChange={handleUserDataChange}
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Mobile</label>
                <input
                  type="text"
                  name="mobile"
                  value={userData.mobile}
                  onChange={handleUserDataChange}
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={userData.email}
                  onChange={handleUserDataChange}
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Referral Code (Optional)</label>
                <input
                  type="text"
                  name="referral_code"
                  value={userData.referral_code}
                  onChange={handleUserDataChange}
                  className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                className="w-full text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-300"
                style={{ backgroundColor: primaryColor }}
              >
                Register and Continue
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 5: Confirmation */}
      {step === 5 && (
        <div className="animate-fade-in">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Confirm Your Appointment</h2>
          <button onClick={handleBack} className="mb-6 text-blue-600 hover:text-blue-800 font-semibold flex items-center transition-colors duration-200">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Time Slots
          </button>
          <div className="bg-gray-50 shadow-2xl rounded-xl p-8 max-w-lg mx-auto">
            <div className="flex items-center mb-6">
              <img src={selectedDoctor.avatar} alt={selectedDoctor.full_name} className="w-16 h-16 rounded-full mr-4 object-cover shadow-md" />
              <div>
                <p className="text-lg font-semibold text-gray-800">{selectedDoctor.full_name}</p>
                <p className="text-gray-500">{selectedCategory.category_name}</p>
              </div>
            </div>
            <p className="text-gray-700 mb-2"><strong>Date:</strong> {selectedDate?.toDateString()}</p>
            <p className="text-gray-700 mb-2 text-sm"><strong>Time:</strong> {selectedTimeslot.time}</p>
            <p className="text-gray-700 mb-6"><strong>Price:</strong> ₹{selectedTimeslot.price}</p>
            <button
              onClick={handleReserveMeeting}
              className="w-full text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-300"
              style={{ backgroundColor: primaryColor }}
            >
              Confirm Appointment
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Cart View */}
      {step === 6 && (
        <div className="animate-fade-in">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Your Cart</h2>
          <button onClick={handleBack} className="mb-6 text-blue-600 hover:text-blue-800 font-semibold flex items-center transition-colors duration-200">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Confirmation
          </button>
          <div className="bg-gray-50 shadow-2xl rounded-xl p-8 max-w-2xl mx-auto">
            {cart && cart.items && cart.items.length > 0 ? (
              <>
                {cart.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between mb-6 border-b pb-4">
                    <div className="flex items-center">
                      <img src={item.image} alt={item.title} className="w-16 h-16 rounded-full mr-4 object-cover shadow-md" />
                      <div>
                        {/* <p className="text-lg font-semibold text-gray-800">{item.title}</p> */}
                        <p className="text-lg font-semibold text-gray-800">{item.teacher_name}</p>
                        <p className="text-gray-500"><b>Date: {item.day}</b></p>
                        <p className="text-gray-500 font-semibold "><small>Time: {item.time.start} - {item.time.end}</small></p>
                        <p className="text-gray-500"><b>₹{item.price}</b></p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCartItem(item.id)}
                      className="text-red-600 hover:text-red-800 transition-colors duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="mt-6">
                  <p className="text-gray-700"><strong>Subtotal:</strong> ₹{cart.amounts.sub_total.toFixed(2)}</p>
                  <p className="text-gray-700"><strong>Tax:</strong> ₹{cart.amounts.tax_price.toFixed(2)}</p>
                  <p className="text-gray-700"><strong>Commission:</strong> ₹{cart.amounts.commission_price.toFixed(2)}</p>
                  <p className="text-gray-700 font-semibold"><strong>Total:</strong> ₹{cart.amounts.total.toFixed(2)}</p>
                </div>
                <div className="mt-4 flex items-center">
                  <input
                    type="text"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    placeholder="Enter coupon code"
                  />
                  <button
                    onClick={handleValidateCoupon}
                    className="ml-2 text-white px-4 py-3 rounded-lg hover:opacity-90 transition-all duration-300"
                    style={{ backgroundColor: primaryColor }}
                    disabled={!coupon}
                  >
                    Apply
                  </button>
                </div>
                {couponStatus && (
                  <p className={`mt-2 text-sm ${couponStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                    {couponStatus.message}
                  </p>
                )}
                <button
                  onClick={handleCheckout}
                  className="w-full text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-300 mt-6"
                  style={{ backgroundColor: primaryColor }}
                  disabled={coupon && !couponStatus?.success}
                >
                  Proceed to Checkout
                </button>
              </>
            ) : (
              <p className="text-gray-500 text-center">Your cart is empty.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 7: Payment Gateway Selection */}
      {step === 7 && (
        <div className="animate-fade-in">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Select Payment Method</h2>
          <button onClick={handleBack} className="mb-6 text-blue-600 hover:text-blue-800 font-semibold flex items-center transition-colors duration-200">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Cart
          </button>
          <div className="bg-gray-50 shadow-2xl rounded-xl p-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <p className="text-gray-700"><strong>Subtotal:</strong> ₹{checkoutData.amounts.sub_total.toFixed(2)}</p>
              <p className="text-gray-700"><strong>Tax:</strong> ₹{checkoutData.amounts.tax_price.toFixed(2)}</p>
              <p className="text-gray-700"><strong>Commission:</strong> ₹{checkoutData.amounts.commission_price.toFixed(2)}</p>
              <p className="text-gray-700 font-semibold"><strong>Total:</strong> ₹{checkoutData.amounts.total.toFixed(2)}</p>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Choose a Payment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {checkoutData.paymentChannels
                .filter(channel => ['Razorpay', 'Paypal'].includes(channel.class_name))
                .map(channel => (
                  <div
                    key={channel.id}
                    className={`border rounded-xl p-4 cursor-pointer flex items-center transition-all duration-300 ${selectedGateway === channel.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-blue-50'}`}
                    onClick={() => setSelectedGateway(channel.id)}
                    style={{ borderLeft: `4px solid ${selectedGateway === channel.id ? primaryColor : 'transparent'}` }}
                  >
                    <img src={channel.image} alt={channel.title} className="w-16 h-8 mr-4 object-contain" />
                    <span className="text-gray-800 font-medium">{channel.title}</span>
                  </div>
                ))}
            </div>
            {selectedGateway && (
              <>
                {checkoutData.paymentChannels.find(channel => channel.id === selectedGateway).class_name === 'Paypal' && isPaypalLoaded && (
                  <div id="paypal-button-container" className="mt-6"></div>
                )}
                <button
                  onClick={() => {
                    const gateway = checkoutData.paymentChannels.find(channel => channel.id === selectedGateway);
                    handlePaymentRequest(gateway.id, gateway.class_name);
                  }}
                  className="w-full text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-300 mt-6"
                  style={{ backgroundColor: primaryColor }}
                  disabled={!selectedGateway}
                >
                  Pay Now
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 8: Payment Confirmation */}
      {step === 8 && (
        <div className="animate-fade-in">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Payment Successful</h2>
          <div className="bg-gray-50 shadow-2xl rounded-xl p-8 max-w-2xl mx-auto text-center">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-gray-800 text-lg mb-4">Your appointment has been successfully booked and paid for!</p>
            <p className="text-gray-500">You’ll receive a confirmation email soon.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-300"
              style={{ backgroundColor: primaryColor }}
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;