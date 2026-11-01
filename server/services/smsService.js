require('dotenv').config();
const twilio = require('twilio');

/**
 * CrisisConnect Backend SMS Service using official Twilio SDK
 * Standard Authentication: TWILIO_ACCOUNT_SID (AC...) + TWILIO_AUTH_TOKEN
 */

// Phone Number Normalization for E.164 (India Standard +91)
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  
  let cleaned = rawPhone.replace(/[\s\-\(\)]/g, '');
  if (!cleaned) return null;

  // Indian 10-digit mobile number format (e.g. 9876543210 -> +919876543210)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // Indian number starting with 0
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.substring(1)}`;
  }

  // Already starts with +
  if (/^\+\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }

  // Starts with country code 91 without +
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (cleaned.length < 10) {
    return null;
  }

  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Safe Twilio Configuration Status for Server Startup & UI Diagnostics
 * Validates Account SID prefix (must start with AC)
 */
function getTwilioConfigStatus() {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const phone = (process.env.TWILIO_PHONE_NUMBER || '').trim();

  let accountSidStatus = 'MISSING';
  if (sid && !sid.includes('YOUR_')) {
    if (sid.startsWith('SK')) {
      accountSidStatus = 'INVALID (SK... is an API Key SID; Twilio Account SID must start with AC)';
    } else if (sid.startsWith('AC')) {
      accountSidStatus = 'CONFIGURED';
    } else {
      accountSidStatus = 'INVALID (Must start with AC)';
    }
  }

  const tokenConfigured = Boolean(token && token.length > 0 && !token.includes('YOUR_'));
  const phoneConfigured = Boolean(phone && phone.length > 0 && !phone.includes('YOUR_'));

  const isReady = (accountSidStatus === 'CONFIGURED') && tokenConfigured && phoneConfigured;

  return {
    accountSid: accountSidStatus,
    authToken: tokenConfigured ? 'CONFIGURED' : 'MISSING',
    phoneNumber: phoneConfigured ? 'CONFIGURED' : 'MISSING',
    isReady: isReady,
    maskedSid: accountSidStatus === 'CONFIGURED' ? `${sid.substring(0, 6)}...${sid.substring(sid.length - 4)}` : 'MISSING'
  };
}

/**
 * Safe Startup Logging (Never prints actual secrets)
 */
function printStartupTwilioStatus() {
  const config = getTwilioConfigStatus();
  console.log('\n========================================');
  console.log('Twilio configuration:');
  console.log(`Account SID: ${config.accountSid}`);
  console.log(`Auth Token:  ${config.authToken}`);
  console.log(`Sender Phone:${config.phoneNumber}`);
  console.log('========================================\n');
}

/**
 * Dispatch Emergency SMS via Twilio SDK
 */
async function sendEmergencySMS({ phoneNumber, message, incidentId, userId, distanceMeters, statusCallbackUrl }) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const debugMode = process.env.SMS_DEBUG === 'true';

  if (!normalizedPhone) {
    const errReason = 'INVALID PHONE NUMBER. Number must be valid 10-digit mobile (e.g. +919876543210).';
    if (debugMode) {
      console.log('\n----------------------------------');
      console.log('SMS DEBUG - INVALID PHONE NUMBER');
      console.log(`Incident: ${incidentId || 'N/A'}`);
      console.log(`User: ${userId || 'N/A'}`);
      console.log(`Phone: ${phoneNumber}`);
      console.log(`Error: ${errReason}`);
      console.log('----------------------------------\n');
    }
    return {
      success: false,
      error: errReason,
      status: 'FAILED',
      phoneNumber: phoneNumber
    };
  }

  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromPhone = (process.env.TWILIO_PHONE_NUMBER || '').trim();

  // Validate Twilio Account SID format
  if (accountSid && accountSid.startsWith('SK')) {
    const sidErr = 'INVALID ACCOUNT SID: Twilio Account SID must start with AC (e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx). SK... is an API Key SID and cannot be used as TWILIO_ACCOUNT_SID.';
    console.error(`\n❌ [TWILIO CONFIG ERROR] ${sidErr}\n`);
    return {
      success: false,
      error: sidErr,
      status: 'FAILED',
      phoneNumber: normalizedPhone,
      provider: 'TWILIO'
    };
  }

  // Check required environment variables
  const missingVars = [];
  if (!accountSid || accountSid.includes('YOUR_') || !accountSid.startsWith('AC')) missingVars.push('TWILIO_ACCOUNT_SID (Must start with AC)');
  if (!authToken || authToken.includes('YOUR_')) missingVars.push('TWILIO_AUTH_TOKEN');
  if (!fromPhone || fromPhone.includes('YOUR_')) missingVars.push('TWILIO_PHONE_NUMBER');

  if (missingVars.length > 0) {
    const missingErr = `SMS PROVIDER NOT CONFIGURED. Required environment variables in server/.env: ${missingVars.join(', ')}`;
    
    console.error(`\n❌ [SMS SERVICE ERROR]`);
    console.error(`User: ${userId || 'N/A'} | Phone: ${normalizedPhone} | Incident: ${incidentId || 'N/A'}`);
    console.error(`Error: ${missingErr}\n`);

    if (debugMode) {
      console.log('----------------------------------');
      console.log('SMS DEBUG');
      console.log(`Incident: ${incidentId || 'N/A'}`);
      console.log(`User: ${userId || 'N/A'}`);
      console.log(`Phone: ${normalizedPhone}`);
      console.log(`Distance: ${distanceMeters ? distanceMeters.toFixed(1) + ' meters' : 'N/A'}`);
      console.log(`Provider: TWILIO (NOT CONFIGURED)`);
      console.log(`Status: FAILED`);
      console.log(`Missing Vars: ${missingVars.join(', ')}`);
      console.log('----------------------------------\n');
    }

    return {
      success: false,
      error: missingErr,
      status: 'FAILED',
      missingVars: missingVars,
      phoneNumber: normalizedPhone,
      provider: 'TWILIO'
    };
  }

  // Dispatch via Official Twilio Client SDK
  try {
    const client = twilio(accountSid, authToken);
    
    const sendOptions = {
      body: message,
      from: fromPhone,
      to: normalizedPhone
    };

    if (statusCallbackUrl) {
      sendOptions.statusCallback = statusCallbackUrl;
    }

    const result = await client.messages.create(sendOptions);

    if (debugMode) {
      console.log('\n----------------------------------');
      console.log('SMS DEBUG');
      console.log(`Incident: ${incidentId || 'N/A'}`);
      console.log(`User: ${userId || 'N/A'}`);
      console.log(`Phone: ${normalizedPhone}`);
      console.log(`Distance: ${distanceMeters ? distanceMeters.toFixed(1) + ' meters' : 'N/A'}`);
      console.log(`Provider: TWILIO`);
      console.log(`Request: ACCEPTED BY TWILIO`);
      console.log(`Message SID: ${result.sid}`);
      console.log(`Twilio Status: ${result.status}`);
      console.log('----------------------------------\n');
    }

    return {
      success: true,
      messageId: result.sid,
      providerMessageId: result.sid,
      status: result.status || 'queued',
      phoneNumber: normalizedPhone,
      provider: 'TWILIO'
    };

  } catch (err) {
    const actualError = err.message || err.code || 'TWILIO_DISPATCH_ERROR';
    console.error(`\n❌ [TWILIO DISPATCH FAILED] User: ${userId} | Phone: ${normalizedPhone} | Error: ${actualError}\n`);

    if (debugMode) {
      console.log('----------------------------------');
      console.log('SMS DEBUG - DISPATCH FAILED');
      console.log(`Incident: ${incidentId || 'N/A'}`);
      console.log(`User: ${userId || 'N/A'}`);
      console.log(`Phone: ${normalizedPhone}`);
      console.log(`Error: ${actualError}`);
      console.log('----------------------------------\n');
    }

    return {
      success: false,
      error: actualError,
      status: 'FAILED',
      phoneNumber: normalizedPhone,
      provider: 'TWILIO'
    };
  }
}

/**
 * Dispatch Standalone Test SMS for Manual Operator Verification
 */
async function sendTestSMS(phoneNumber, statusCallbackUrl) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhone) {
    return {
      success: false,
      error: 'INVALID PHONE NUMBER. Please enter a valid 10-digit mobile number starting with +91 or digits (e.g. +919876543210).'
    };
  }

  const message = `CRISISCONNECT TEST ALERT:\nYour emergency SMS notification system is active. Timestamp: ${new Date().toLocaleTimeString()}`;
  return await sendEmergencySMS({
    phoneNumber: normalizedPhone,
    message: message,
    incidentId: 'TEST-SMS-MANUAL',
    userId: 'operator_manual_test',
    distanceMeters: 0,
    statusCallbackUrl: statusCallbackUrl
  });
}

module.exports = {
  normalizePhoneNumber,
  getTwilioConfigStatus,
  printStartupTwilioStatus,
  sendEmergencySMS,
  sendTestSMS
};
