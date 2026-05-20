const axios = require('axios');
(async () => {
  try {
    // Attempt to login as super admin
    const res = await axios.post('https://master-app-h957.onrender.com/api/otp/send-otp', {
      mobile: '9999999999', // assume a test number or we can try to find one
      role: 'SuperAdmin'
    });
    console.log("Send OTP response:", res.data);
  } catch (e) {
    console.log("Error sending OTP:", e.response?.data || e.message);
  }
})();
