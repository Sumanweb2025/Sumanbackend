const axios = require('axios');

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER;
  }

  /**
   * Send OTP via Twilio
   */
  async sendViaTwilio(phoneNumber, otp) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Twilio credentials not configured in .env file');
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const message = `Your OTP for account verification is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;

      const response = await axios.post(url,
        new URLSearchParams({
          To: phoneNumber,
          From: fromNumber,
          Body: message
        }),
        {
          auth: {
            username: accountSid,
            password: authToken
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log(`OTP sent successfully via Twilio to ${phoneNumber}`);
      return { success: true, provider: 'twilio', messageId: response.data.sid };
    } catch (error) {
      console.error('Twilio SMS failed:', error.response?.data || error.message);
      throw new Error(`Twilio SMS failed: ${error.message}`);
    }
  }


  /**
   * Main method to send OTP
   * Automatically selects the configured provider
   */
  async sendOTP(phoneNumber, otp, retries = 3) {
    // Validate inputs
    if (!phoneNumber || !otp) {
      throw new Error('Phone number and OTP are required');
    }

    // Format phone number (ensure it starts with +)
    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    // Try sending with retries
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        //console.log(`Sending OTP via ${this.provider.toUpperCase()} (Attempt ${attempt}/${retries})`);

        let result;

        switch (this.provider.toLowerCase()) {
          case 'twilio':
            result = await this.sendViaTwilio(formattedNumber, otp);
            break;

          default:
            throw new Error(`Unknown SMS provider: ${this.provider}`);
        }

        return result;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);

        if (attempt === retries) {
          // All retries exhausted
          throw error;
        }

        // Exponential backoff before retry
        const waitTime = 1000 * attempt;
        //console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}

module.exports = SMSService;
