const nodemailer = require('nodemailer');

function createTransporter() {
  const rawUser = process.env.SMTP_USER || process.env.MAIL_FROM || '';
  const match = rawUser.match(/<([^>]+)>/);
  const mailUser = (match ? match[1] : rawUser).trim();

  const rawPass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD || '';
  const mailPass = rawPass.replace(/\s+/g, '').trim();

  if (mailUser && mailPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: mailUser,
        pass: mailPass
      }
    });
  }

  // Fallback: Gmail OAuth2 configuration
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: mailUser || 'resqai.alerts@gmail.com',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN
      }
    });
  }

  return null;
}

const transporter = createTransporter();

if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Gmail connection failed:');
      console.error(error);
    } else {
      console.log('✅ Gmail is connected and ready!');
    }
  });
} else {
  console.warn('⚠️ Gmail transporter not configured. Please set MAIL_FROM and MAIL_PASSWORD in .env');
}


/**
 * Send automatic emergency email alert to citizen when inside 100m disaster geofence
 */
async function send100mDisasterAlertEmail(alertDetails) {
  const {
    userEmail,
    userName = 'Valued Citizen',
    disasterTitle = 'Active Disaster Emergency',
    disasterType = 'FIRE',
    severity = 'HIGH',
    distanceMeters = 72,
    detectedAt = new Date().toLocaleTimeString(),
    locationAddress = 'Your Current Geofenced Location'
  } = alertDetails;

  if (!userEmail || !userEmail.includes('@')) {
    console.warn(`[EmailService] Invalid or missing user email (${userEmail}). Skipping email alert.`);
    return { success: false, reason: 'INVALID_EMAIL' };
  }

  const transporter = createTransporter();
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || 'ResQAI Emergency Alerts <alerts@resqai.org>';

  const subject = `🚨 URGENT: Disaster Detected Within 100 Meters of Your Location`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #111827; border: 2px solid #dc2626; border-radius: 16px; overflow: hidden; box-shadow: 0 0 30px rgba(220, 38, 38, 0.4); }
        .header { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
        .content { padding: 24px; line-height: 1.6; }
        .alert-box { background-color: #1f1315; border: 1px solid #ef4444; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .badge { display: inline-block; background-color: #dc2626; color: #ffffff; font-weight: bold; font-size: 12px; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }
        .detail-row { display: flex; justify-content: space-between; border-bottom: 1px solid #374151; padding: 8px 0; font-size: 14px; }
        .detail-label { color: #9ca3af; font-weight: 600; }
        .detail-val { color: #f3f4f6; font-weight: 700; }
        .highlight { color: #f87171; font-weight: 800; }
        .precautions { background-color: #1e293b; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 8px; font-size: 13px; }
        .btn { display: block; width: 80%; margin: 24px auto; padding: 14px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; font-weight: 800; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.5); }
        .footer { background-color: #0b0f19; text-align: center; padding: 16px; font-size: 11px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 URGENT EMERGENCY DISASTER ALERT</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>An active <span class="highlight">${disasterType}</span> disaster has been detected approximately <span class="highlight">${distanceMeters} meters</span> from your current physical device GPS location.</p>

          <div class="alert-box">
            <div style="margin-bottom: 12px;">
              <span class="badge">SEVERITY: ${severity}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Disaster Hazard:</span>
              <span class="detail-val">${disasterTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Distance to Hazard:</span>
              <span class="detail-val highlight">${distanceMeters} meters</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Location Address:</span>
              <span class="detail-val">${locationAddress}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Detection Timestamp:</span>
              <span class="detail-val">${detectedAt}</span>
            </div>
          </div>

          <div class="precautions">
            <strong style="color: #f59e0b; display: block; margin-bottom: 6px;">⚠️ IMMEDIATE SAFETY PROTOCOLS:</strong>
            <ul>
              <li>Evacuate the 100m danger zone immediately if advised by local authorities.</li>
              <li>Seek safe shelter away from toxic smoke, rising water, or structural hazards.</li>
              <li>Keep your mobile phone location sharing enabled for real-time responder tracking.</li>
            </ul>
          </div>

          <a href="http://localhost:3000" class="btn">📍 OPEN LIVE RESQAI MAP DASHBOARD</a>
        </div>
        <div class="footer">
          ResQAI Automated Disaster Geofence System • Do not reply directly to this automated alert.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL SIMULATION - SMTP NOT CONFIGURED IN ENV]`);
    console.log(`To: ${userEmail} (${userName})`);
    console.log(`Subject: ${subject}`);
    console.log(`Distance: ${distanceMeters}m | Disaster: ${disasterType} - ${disasterTitle}`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: mailFrom,
      to: userEmail,
      subject: subject,
      html: htmlContent
    });
    console.log(`✅ [EmailService] Emergency 100m alert email sent to ${userEmail} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [EmailService] Failed to send email to ${userEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send disaster-specific safety email from Operator Dashboard
 */
async function sendDisasterSafetyEmail(alertDetails) {
  const {
    recipientEmail,
    citizenName = 'Valued Citizen',
    disasterTitle = 'Active Emergency Hazard',
    disasterType = 'FLOOD',
    riskLevel = 'HIGH',
    distanceKm = '1.5',
    distanceMeters = 1500,
    locationAddress = 'Your Current Device Location',
    precautions = [],
    emergencyHelplines = [],
    sentAt = new Date().toLocaleString()
  } = alertDetails;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn(`[EmailService] Invalid recipient email (${recipientEmail}). Skipping safety email.`);
    return { success: false, reason: 'INVALID_RECIPIENT_EMAIL' };
  }

  const transporter = createTransporter();
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || 'ResQAI Safety Command <alerts@resqai.org>';

  const typeKey = (disasterType || 'DEFAULT').toUpperCase().replace(/\s+/g, '_');
  const subjectMap = {
    FLOOD: '🚨 Safety Alert — Flood Risk Near Your Location',
    EARTHQUAKE: '🚨 Safety Alert — Earthquake Advisory for Your Area',
    FIRE: '🚨 Safety Alert — Fire Hazard Near Your Location',
    CYCLONE: '🚨 Safety Alert — Cyclone Precautions for Your Area',
    LANDSLIDE: '🚨 Safety Alert — Landslide Risk Advisory',
    CHEMICAL_SPILL: '🚨 Safety Alert — Chemical Hazard Precautions',
    BUILDING_COLLAPSE: '🚨 Safety Alert — Building Collapse Hazard',
    DEFAULT: '🚨 Safety Alert — Emergency Risk Notice'
  };

  const subject = subjectMap[typeKey] || `🚨 Safety Alert — ${disasterType} Risk Notice`;

  const precautionItems = (Array.isArray(precautions) && precautions.length > 0)
    ? precautions.map(p => `<li>${p}</li>`).join('')
    : '<li>Follow instructions issued by local emergency management officials immediately.</li>';

  const helplineItems = (Array.isArray(emergencyHelplines) && emergencyHelplines.length > 0)
    ? emergencyHelplines.map(h => `<li><strong>${h.name}:</strong> ${h.number}</li>`).join('')
    : '<li><strong>National Emergency:</strong> 112 | <strong>Fire Brigade:</strong> 101 | <strong>Medical:</strong> 108</li>';

  const riskColorMap = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#3b82f6',
    UNCERTAIN: '#6b7280'
  };
  const badgeColor = riskColorMap[riskLevel] || '#f97316';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 620px; margin: 0 auto; background-color: #111827; border: 2px solid ${badgeColor}; border-radius: 16px; overflow: hidden; box-shadow: 0 0 30px ${badgeColor}44; }
        .header { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 24px; text-align: center; border-bottom: 2px solid ${badgeColor}; }
        .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
        .content { padding: 24px; line-height: 1.6; }
        .badge { display: inline-block; background-color: ${badgeColor}; color: #ffffff; font-weight: bold; font-size: 13px; padding: 5px 12px; border-radius: 6px; text-transform: uppercase; }
        .alert-box { background-color: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; border-bottom: 1px solid #374151; padding: 8px 0; font-size: 14px; }
        .detail-label { color: #9ca3af; font-weight: 600; }
        .detail-val { color: #f3f4f6; font-weight: 700; }
        .precautions-box { background-color: #1e293b; border-left: 4px solid ${badgeColor}; padding: 18px; margin: 20px 0; border-radius: 8px; font-size: 14px; }
        .precautions-box ul { margin: 10px 0 0 20px; padding: 0; color: #e2e8f0; }
        .precautions-box li { margin-bottom: 8px; }
        .helpline-box { background-color: #0f172a; border: 1px solid #334155; padding: 14px; border-radius: 8px; font-size: 13px; margin: 16px 0; }
        .btn { display: block; width: 75%; margin: 24px auto; padding: 14px; text-align: center; background: linear-gradient(135deg, ${badgeColor} 0%, #b91c1c 100%); color: #ffffff; font-weight: 800; text-decoration: none; border-radius: 10px; }
        .footer { background-color: #0b0f19; text-align: center; padding: 16px; font-size: 11px; color: #6b7280; border-top: 1px solid #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 RESQAI DISASTER SAFETY ADVISORY</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${citizenName}</strong>,</p>
          <p>Our emergency monitoring center has detected an active <strong>${disasterType}</strong> incident near your physical device location.</p>

          <div class="alert-box">
            <div style="margin-bottom: 12px; text-align: center;">
              <span class="badge">RISK LEVEL: ${riskLevel}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Disaster Event:</span>
              <span class="detail-val">${disasterTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Proximity Distance:</span>
              <span class="detail-val" style="color:${badgeColor}">${distanceKm} km (${distanceMeters}m)</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Location Address:</span>
              <span class="detail-val">${locationAddress}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Issued Timestamp:</span>
              <span class="detail-val">${sentAt}</span>
            </div>
          </div>

          <div class="precautions-box">
            <strong style="color: ${badgeColor}; font-size: 15px; display: block;">⚠️ DISASTER-SPECIFIC SAFETY PRECAUTIONS (${disasterType}):</strong>
            <ul>
              ${precautionItems}
            </ul>
          </div>

          <div class="helpline-box">
            <strong style="color: #60a5fa; display: block; margin-bottom: 6px;">📞 EMERGENCY HELPLINE CONTACTS:</strong>
            <ul style="margin: 0 0 0 18px; padding: 0;">
              ${helplineItems}
            </ul>
          </div>

          <a href="http://localhost:3000" class="btn">📍 OPEN LIVE MAP & RESCUE DASHBOARD</a>
        </div>
        <div class="footer">
          ResQAI Emergency Risk Monitoring Center • Official Automated Notification System
        </div>
      </div>
    </body>
    </html>
  `;

  const plainTextFallback = `
RESQAI EMERGENCY SAFETY ADVISORY - ${disasterType}
---------------------------------------------------
Dear ${citizenName},

An active ${disasterType} hazard (${disasterTitle}) has been detected near your current location (${locationAddress}).
Risk Level: ${riskLevel}
Distance: ${distanceKm} km (${distanceMeters} meters)
Issued At: ${sentAt}

SAFETY PRECAUTIONS:
${(Array.isArray(precautions) ? precautions : []).map(p => `- ${p}`).join('\n')}

EMERGENCY HELPLINES:
- National Emergency: 112
- Fire Brigade: 101
- Medical Response: 108

Please follow all instructions from local emergency services and law enforcement.
ResQAI Command Center
  `;

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`📧 [SAFETY EMAIL SIMULATION - SMTP NOT CONFIGURED]`);
    console.log(`To: ${recipientEmail} (${citizenName})`);
    console.log(`Subject: ${subject}`);
    console.log(`Disaster: ${disasterType} | Risk: ${riskLevel} | Distance: ${distanceKm}km`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: mailFrom,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      text: plainTextFallback
    });
    console.log(`✅ [EmailService] Safety email sent to ${recipientEmail} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [EmailService] Failed safety email send to ${recipientEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  transporter,
  send100mDisasterAlertEmail,
  sendDisasterSafetyEmail
};


