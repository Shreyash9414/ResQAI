const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const User = require('../models/User');

class EmailNotificationService {
  constructor() {
    this.config = {
      autoEmailEnabled: process.env.AUTO_EMAIL_ALERTS_ENABLED !== 'false',
      riskThreshold: process.env.PREDICTION_RISK_THRESHOLD || 'HIGH', // Trigger for HIGH & CRITICAL by default
      batchSize: parseInt(process.env.EMAIL_BATCH_SIZE) || 5,
      batchDelayMs: parseInt(process.env.EMAIL_BATCH_DELAY_MS) || 200,
      maxRetries: parseInt(process.env.EMAIL_RETRY_LIMIT) || 3,
      requireOperatorApproval: false
    };

    this.smtpStatus = {
      ready: false,
      host: null,
      port: null,
      user: null,
      mailFrom: null,
      error: null,
      verifiedAt: null
    };

    this.lastTestEmailAt = null;
    this.lastTestEmailResult = null;
    this.lastCampaignExecutionAt = null;

    this.transporter = this.initTransporter();
    this.verifyTransporter();
  }

  /**
   * Initialize Nodemailer transporter with environment variables
   */
  initTransporter() {
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = parseInt(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = (process.env.SMTP_USER || process.env.MAIL_FROM || '').trim();
    const rawPass = (process.env.SMTP_PASS || process.env.MAIL_PASSWORD || '').trim();
    // App passwords in Google may contain spaces; remove them for reliable auth
    const pass = rawPass.replace(/\s+/g, '');

    const sender = process.env.MAIL_FROM || user;
    const mailFrom = sender.includes('<') ? sender : `"ResQAI Emergency Network" <${sender}>`;

    const maskedUser = user ? (user.substring(0, 2) + '***@' + (user.split('@')[1] || 'domain')) : 'NOT_CONFIGURED';

    this.smtpStatus.host = host;
    this.smtpStatus.port = port;
    this.smtpStatus.user = maskedUser;
    this.smtpStatus.mailFrom = mailFrom;

    if (user && pass) {
      if (host.includes('gmail.com')) {
        console.log(`[EmailNotificationService] 📧 Initializing Gmail SMTP transporter for ${maskedUser}...`);
        return nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
          pool: true,
          maxConnections: 5,
          maxMessages: 100
        });
      }

      console.log(`[EmailNotificationService] 📧 Initializing Standard SMTP transporter for ${host}:${port} (${maskedUser})...`);
      return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        pool: true,
        maxConnections: 5,
        maxMessages: 100
      });
    }

    console.warn('[EmailNotificationService] ⚠️ SMTP credentials not fully configured in .env. Emails will run in simulated test mode.');
    this.smtpStatus.error = 'SMTP credentials not configured in environment';
    return null;
  }

  /**
   * Verify SMTP connection at startup & update health metrics
   */
  verifyTransporter() {
    if (!this.transporter) {
      this.smtpStatus.ready = false;
      this.smtpStatus.error = 'No transporter instance available';
      return;
    }

    this.transporter.verify((err) => {
      this.smtpStatus.verifiedAt = new Date();
      if (err) {
        this.smtpStatus.ready = false;
        this.smtpStatus.error = err.message;
        console.warn('⚠️ [EmailNotificationService] SMTP connection verification failed:', err.message);
      } else {
        this.smtpStatus.ready = true;
        this.smtpStatus.error = null;
        console.log('✅ [EmailNotificationService] SMTP Transporter connected & ready for disaster alert delivery.');
      }
    });
  }

  /**
   * Diagnostic summary for Admin Dashboard
   */
  async getDiagnostics() {
    let eligibleCount = 0;
    try {
      const users = await this.getEligibleRecipients();
      eligibleCount = users.length;
    } catch (_) {}

    return {
      smtpReady: this.smtpStatus.ready,
      smtpHost: this.smtpStatus.host,
      smtpPort: this.smtpStatus.port,
      smtpUser: this.smtpStatus.user,
      mailFrom: this.smtpStatus.mailFrom,
      lastVerifiedAt: this.smtpStatus.verifiedAt,
      lastError: this.smtpStatus.error,
      lastTestEmailAt: this.lastTestEmailAt,
      lastTestEmailResult: this.lastTestEmailResult,
      lastCampaignExecutionAt: this.lastCampaignExecutionAt,
      eligibleRecipientsCount: eligibleCount,
      config: this.getConfig()
    };
  }

  /**
   * Update runtime alert policy / kill switch
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[EmailNotificationService] Configuration updated:', this.config);
    return this.config;
  }

  getConfig() {
    return { ...this.config };
  }

  /**
   * Check if a prediction risk level qualifies for automatic email alerts
   */
  isThresholdMet(riskLevel) {
    const level = (riskLevel || '').toUpperCase();
    const threshold = (this.config.riskThreshold || 'HIGH').toUpperCase();

    if (threshold === 'CRITICAL') {
      return level === 'CRITICAL';
    }
    if (threshold === 'HIGH') {
      return level === 'CRITICAL' || level === 'HIGH';
    }
    if (threshold === 'MODERATE') {
      return level === 'CRITICAL' || level === 'HIGH' || level === 'MODERATE';
    }
    if (threshold === 'LOW') {
      return true; // All risk levels qualify
    }
    return false;
  }

  /**
   * Fetch eligible registered users from MongoDB (includes both logged-in and logged-out citizens)
   */
  async getEligibleRecipients() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = [];

    try {
      if (User) {
        // Retrieve all registered user accounts from MongoDB
        const users = await User.find({
          email: { $exists: true, $ne: '' }
        }).lean();

        for (const u of users) {
          const email = (u.email || '').trim().toLowerCase();
          const status = (u.status || 'Active').toLowerCase();

          // Exclude disabled accounts or users who explicitly disabled emergency alerts
          if (status === 'disabled' || status === 'deactivated') continue;
          if (u.emergencyAlertsEnabled === false) continue;

          if (emailRegex.test(email)) {
            // Deduplicate by normalized lowercase email
            if (!recipients.some(r => r.email === email)) {
              recipients.push({
                userId: u._id ? u._id.toString() : u.id,
                name: u.name || 'Valued Citizen',
                email
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[EmailNotificationService] Error querying MongoDB Users:', err.message);
    }

    console.log(`[EmailNotificationService] 👥 Found ${recipients.length} eligible registered recipient(s) in MongoDB.`);
    return recipients;
  }

  /**
   * Generate mobile-friendly, accessible HTML disaster warning email
   */
  generateEmailHtml(prediction, recipientName, frontendUrl) {
    const riskColors = {
      Critical: '#dc2626',
      High: '#ea580c',
      Moderate: '#eab308',
      Low: '#2563eb'
    };

    const riskColor = riskColors[prediction.predictedRiskLevel] || '#ea580c';
    const isCritical = prediction.predictedRiskLevel === 'Critical';
    const natureLabel = prediction.predictionNature === 'OFFICIAL_METEOROLOGICAL_ALERT'
      ? 'Official Meteorological Warning'
      : 'ResQAI Automated AI Risk Prediction';

    const precautionsList = (prediction.safetyPrecautions || [])
      .map(p => `<li style="margin-bottom: 8px; color: #f1f5f9;">${p}</li>`)
      .join('');

    const sourcesText = (prediction.supportingDataSources || []).join(', ') || 'Global Meteorological Model & Hydrology Radar';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ResQAI Disaster Warning: ${prediction.disasterType}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 620px; background-color: #111827; border: 2px solid ${riskColor}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 35px rgba(0,0,0,0.6);" cellspacing="0" cellpadding="0">
                
                <!-- HEADER BRANDING -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px; text-align: center; border-bottom: 2px solid ${riskColor};">
                    <table role="presentation" width="100%">
                      <tr>
                        <td align="center">
                          <div style="display: inline-block; padding: 6px 14px; background-color: ${riskColor}; color: #ffffff; font-weight: 800; font-size: 13px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                            ${isCritical ? '🚨 CRITICAL EMERGENCY PREDICTION' : '⚠️ HIGH RISK DISASTER ALERT'}
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; line-height: 1.3;">
                            ResQAI Warning: ${prediction.predictedRiskLevel} ${prediction.disasterType} Risk
                          </h1>
                          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">
                            ${natureLabel}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CONTENT BODY -->
                <tr>
                  <td style="padding: 24px 28px; line-height: 1.6;">
                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #e2e8f0;">
                      Hello <strong>${recipientName}</strong>,
                    </p>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #cbd5e1;">
                      Our automated risk evaluation system has detected qualifying meteorological and disaster indicators for your general geographic area. Please review the forecast timeline and recommended safety protocols below:
                    </p>

                    <!-- KEY DETAILS CARD -->
                    <table role="presentation" width="100%" style="background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; margin-bottom: 24px;" cellspacing="0" cellpadding="14">
                      <tr>
                        <td>
                          <table role="presentation" width="100%">
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8; width: 40%;"><strong>Hazard Type:</strong></td>
                              <td style="padding: 6px 0; font-size: 14px; color: #ffffff; font-weight: 700;">${prediction.disasterType}</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;"><strong>Affected Region:</strong></td>
                              <td style="padding: 6px 0; font-size: 14px; color: #f8fafc; font-weight: 700;">${prediction.affectedArea.name}</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;"><strong>Predicted Risk:</strong></td>
                              <td style="padding: 6px 0; font-size: 14px; color: ${riskColor}; font-weight: 800;">
                                ${prediction.predictedRiskLevel.toUpperCase()} (${Math.round((prediction.confidenceScore <= 1 ? prediction.confidenceScore * 100 : prediction.confidenceScore) || 85)}% Confidence)
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;"><strong>Forecast Window:</strong></td>
                              <td style="padding: 6px 0; font-size: 13px; color: #cbd5e1;">
                                ${prediction.forecastWindow ? `${new Date(prediction.forecastWindow.startTime).toLocaleString()} — ${new Date(prediction.forecastWindow.endTime).toLocaleString()}` : 'Next 24-48 Hours'}
                              </td>
                            </tr>
                            ${prediction.weatherMetrics?.rainfallForecastMm > 0 ? `
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;"><strong>Precipitation Forecast:</strong></td>
                              <td style="padding: 6px 0; font-size: 13px; color: #38bdf8; font-weight: 700;">
                                ${prediction.weatherMetrics.rainfallForecastMm} mm
                              </td>
                            </tr>` : ''}
                            ${prediction.weatherMetrics?.peakWindSpeedKmh > 0 ? `
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;"><strong>Peak Wind Speed:</strong></td>
                              <td style="padding: 6px 0; font-size: 13px; color: #fbbf24; font-weight: 700;">
                                ${prediction.weatherMetrics.peakWindSpeedKmh} km/h
                              </td>
                            </tr>` : ''}
                            <tr>
                              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;"><strong>Data Sources:</strong></td>
                              <td style="padding: 6px 0; font-size: 12px; color: #94a3b8;">${sourcesText}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- SAFETY PRECAUTIONS -->
                    ${precautionsList ? `
                    <div style="background-color: #0f172a; border-left: 4px solid ${riskColor}; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                      <h3 style="margin: 0 0 10px 0; color: #ffffff; font-size: 15px; font-weight: 700;">
                        ⚠️ Recommended Emergency Precautions:
                      </h3>
                      <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                        ${precautionsList}
                      </ul>
                    </div>` : ''}

                    <!-- CTA BUTTON -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 20px 0;">
                      <tr>
                        <td align="center">
                          <a href="${frontendUrl || 'http://localhost:3000'}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${riskColor} 0%, #991b1b 100%); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                            📍 Open Live Evacuation & Hazard Map
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- EMERGENCY HELPLINES -->
                    <table role="presentation" width="100%" style="background-color: #1e293b; border-radius: 8px; padding: 12px 16px; margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
                      <tr>
                        <td>
                          <strong>National Emergency Helpline:</strong> 112 &nbsp;|&nbsp; 
                          <strong>Disaster Relief (NDRF):</strong> 1078 &nbsp;|&nbsp; 
                          <strong>Medical Emergency:</strong> 108
                        </td>
                      </tr>
                    </table>

                    <!-- DISCLAIMER -->
                    <p style="margin: 24px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid #1f2937; padding-top: 16px;">
                      <strong>Advisory Notice:</strong> This warning provides advance situational awareness based on automated meteorological models and official weather proxies. Always follow instructions from on-ground emergency responders and local authorities.
                    </p>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="background-color: #0b0f19; text-align: center; padding: 20px; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b;">
                    ResQAI Emergency Operations & Disaster Management Platform<br>
                    You received this alert because you are a registered citizen on ResQAI.
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Generate clean plain-text fallback email
   */
  generateEmailText(prediction, recipientName, frontendUrl) {
    const precautions = (prediction.safetyPrecautions || []).map(p => `- ${p}`).join('\n');
    return `
RESQAI DISASTER WARNING: ${prediction.predictedRiskLevel.toUpperCase()} ${prediction.disasterType.toUpperCase()} RISK
========================================================================
Hello ${recipientName},

An automated disaster risk prediction has reached qualifying safety thresholds for your general region.

HAZARD DETAILS:
- Disaster Type: ${prediction.disasterType}
- Predicted Risk: ${prediction.predictedRiskLevel} (${Math.round((prediction.confidenceScore <= 1 ? prediction.confidenceScore * 100 : prediction.confidenceScore) || 85)}% Confidence)
- Affected Region: ${prediction.affectedArea.name}
- Forecast Window: ${prediction.forecastWindow ? `${new Date(prediction.forecastWindow.startTime).toLocaleString()} to ${new Date(prediction.forecastWindow.endTime).toLocaleString()}` : 'Next 24-48 Hours'}
${prediction.weatherMetrics?.rainfallForecastMm > 0 ? `- Rainfall Forecast: ${prediction.weatherMetrics.rainfallForecastMm} mm\n` : ''}${prediction.weatherMetrics?.peakWindSpeedKmh > 0 ? `- Peak Wind: ${prediction.weatherMetrics.peakWindSpeedKmh} km/h\n` : ''}
RECOMMENDED SAFETY PRECAUTIONS:
${precautions || '- Stay alert to changing weather conditions and follow official emergency instructions.'}

EMERGENCY HELPLINES:
- National Emergency Response: 112
- Disaster Helpline (NDRF): 1078
- Ambulance / Medical: 108

Access live emergency map, evacuation routes & shelters:
${frontendUrl || 'http://localhost:3000'}

Notice: This warning is an automated predictive model based on meteorological inputs. Follow all instructions given by emergency responders and local civil defense authorities.
ResQAI Emergency Command
    `.trim();
  }

  /**
   * Send a test email alert to a designated admin address
   */
  async sendTestEmail(targetEmail, samplePrediction = null) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!targetEmail || !emailRegex.test(targetEmail.trim())) {
      throw new Error(`Invalid recipient email address format: "${targetEmail}"`);
    }

    const recipient = targetEmail.trim();

    const testPrediction = samplePrediction || {
      predictionId: `test_${Date.now()}`,
      disasterType: 'Flood',
      title: 'TEST DISASTER ALERT: High Inundation Risk Forecast',
      affectedArea: { name: 'Yamuna Riverbed & Delhi Lowland Basin', center: { lat: 28.6304, lng: 77.2177 }, radiusKm: 15 },
      predictedRiskLevel: 'High',
      confidenceScore: 0.92,
      predictionNature: 'RULE_BASED_AI_PREDICTION',
      forecastWindow: {
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 3600000),
        durationHours: 24
      },
      weatherMetrics: { rainfallForecastMm: 85, peakWindSpeedKmh: 45, peakTemperatureC: 28, floodRiskIndex: 82 },
      supportingDataSources: ['Open-Meteo Severe Weather Engine', 'Hydrological Basin Inundation Matrix'],
      safetyPrecautions: [
        'Move documents and emergency essentials to upper levels.',
        'Avoid driving or walking through low-lying waterlogged underpasses.',
        'Keep emergency battery packs, medicines, and drinking water ready.'
      ]
    };

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const htmlContent = this.generateEmailHtml(testPrediction, 'ResQAI Administrator', frontendUrl);
    const textContent = this.generateEmailText(testPrediction, 'ResQAI Administrator', frontendUrl);
    const subject = `[TEST] ResQAI Disaster Warning: High Flood Risk (${new Date().toLocaleTimeString()})`;
    const mailFrom = this.smtpStatus.mailFrom || 'ResQAI Emergency Network <alerts@resqai.org>';

    if (!this.transporter) {
      console.log(`[EmailNotificationService] 📧 SIMULATED TEST EMAIL to ${recipient}`);
      const simResult = {
        success: true,
        simulated: true,
        message: `Simulated test email generated for ${recipient} (SMTP transporter not configured in .env).`,
        recipient
      };
      this.lastTestEmailAt = new Date();
      this.lastTestEmailResult = simResult;
      return simResult;
    }

    try {
      const info = await this.transporter.sendMail({
        from: mailFrom,
        to: recipient,
        subject,
        html: htmlContent,
        text: textContent
      });

      const result = {
        success: true,
        simulated: false,
        messageId: info.messageId,
        accepted: info.accepted,
        response: info.response,
        recipient
      };

      this.lastTestEmailAt = new Date();
      this.lastTestEmailResult = result;
      this.smtpStatus.ready = true;
      this.smtpStatus.error = null;

      console.log(`[EmailNotificationService] ✅ Test email dispatched successfully to ${recipient} (MessageId: ${info.messageId})`);
      return result;
    } catch (err) {
      this.lastTestEmailAt = new Date();
      this.lastTestEmailResult = { success: false, error: err.message, recipient };
      this.smtpStatus.error = err.message;
      console.error(`[EmailNotificationService] ❌ Failed to dispatch test email to ${recipient}:`, err.message);
      throw err;
    }
  }

  /**
   * Dispatches disaster warning emails to ALL eligible registered users in batches
   * Non-blocking background worker with retry logic
   */
  async dispatchDisasterWarningCampaign(prediction, io = null, options = {}) {
    const force = options.forceNotify || options.force || false;

    if (!this.config.autoEmailEnabled && !force) {
      console.log(`[EmailNotificationService] Auto-email is currently PAUSED via kill switch. Skipping campaign for ${prediction.predictionId}`);
      if (prediction.emailNotification) {
        prediction.emailNotification.deliveryStatus = 'PAUSED';
        prediction.emailNotification.failureReason = 'Automatic email alerts paused by administrator kill switch.';
        await prediction.save?.();
      }
      return { success: false, reason: 'PAUSED' };
    }

    if (!this.isThresholdMet(prediction.predictedRiskLevel) && !force) {
      console.log(`[EmailNotificationService] Prediction ${prediction.predictionId} risk level ${prediction.predictedRiskLevel} does not meet threshold ${this.config.riskThreshold}. No emails sent.`);
      return { success: false, reason: 'BELOW_THRESHOLD' };
    }

    const eligibleUsers = await this.getEligibleRecipients();
    const totalRecipients = eligibleUsers.length;

    this.lastCampaignExecutionAt = new Date();

    if (totalRecipients === 0) {
      console.warn(`[EmailNotificationService] ⚠️ No eligible registered users found in MongoDB User collection.`);
      if (prediction.emailNotification) {
        prediction.emailNotification.deliveryStatus = 'FAILED';
        prediction.emailNotification.failureReason = 'No eligible registered users found in database.';
        await prediction.save?.();
      }
      return { success: false, reason: 'NO_RECIPIENTS' };
    }

    console.log(`[EmailNotificationService] 🚀 Launching disaster email campaign for prediction ${prediction.predictionId}: ${totalRecipients} registered recipients.`);

    const campaignId = `cmp_${Date.now()}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const mailFrom = this.smtpStatus.mailFrom || 'ResQAI Emergency Network <alerts@resqai.org>';
    const subject = `🚨 ResQAI Disaster Warning: ${prediction.predictedRiskLevel} ${prediction.disasterType} Risk in ${prediction.affectedArea.name}`;

    // Update prediction state to SENDING
    prediction.emailNotification = {
      triggered: true,
      triggeredAt: new Date(),
      thresholdMet: true,
      recipientCount: totalRecipients,
      queuedCount: totalRecipients,
      acceptedCount: 0,
      failedCount: 0,
      deliveryStatus: 'SENDING',
      campaignId,
      recipients: eligibleUsers.map(u => ({
        email: u.email,
        name: u.name,
        status: 'QUEUED',
        sentAt: null,
        attempts: 0
      }))
    };

    if (prediction.save) await prediction.save();

    // Broadcast starting event
    if (io) {
      io.emit('prediction:emailProgress', {
        predictionId: prediction.predictionId,
        campaignId,
        status: 'SENDING',
        total: totalRecipients,
        sent: 0,
        accepted: 0,
        failed: 0,
        progress: 0
      });
    }

    // Process delivery queue in background asynchronously
    (async () => {
      let acceptedTotal = 0;
      let failedTotal = 0;
      const { batchSize, batchDelayMs, maxRetries } = this.config;

      for (let i = 0; i < eligibleUsers.length; i += batchSize) {
        const batch = eligibleUsers.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (user) => {
            const html = this.generateEmailHtml(prediction, user.name, frontendUrl);
            const text = this.generateEmailText(prediction, user.name, frontendUrl);
            let attempts = 0;
            let sent = false;
            let lastError = null;
            let providerInfo = null;

            while (attempts <= maxRetries && !sent) {
              attempts++;
              try {
                if (this.transporter) {
                  providerInfo = await this.transporter.sendMail({
                    from: mailFrom,
                    to: user.email,
                    subject,
                    html,
                    text
                  });
                  sent = true;
                  acceptedTotal++;
                } else {
                  // Simulated sending
                  sent = true;
                  acceptedTotal++;
                }
              } catch (err) {
                lastError = err.message;
                if (attempts <= maxRetries) {
                  // Exponential backoff delay
                  await new Promise(r => setTimeout(r, 250 * Math.pow(2, attempts)));
                }
              }
            }

            // Update individual recipient record
            const recEntry = prediction.emailNotification.recipients.find(r => r.email === user.email);
            if (recEntry) {
              recEntry.status = sent ? 'ACCEPTED_BY_PROVIDER' : 'FAILED';
              recEntry.sentAt = new Date();
              recEntry.attempts = attempts;
              if (providerInfo) {
                recEntry.messageId = providerInfo.messageId;
                recEntry.providerResponse = providerInfo.response;
              }
              if (!sent) {
                recEntry.error = lastError;
              }
            }

            if (!sent) {
              failedTotal++;
            }
          })
        );

        // Batch pacing delay
        if (i + batchSize < eligibleUsers.length) {
          await new Promise(r => setTimeout(r, batchDelayMs));
        }

        // Live progress emit
        if (io) {
          const sentCount = acceptedTotal + failedTotal;
          const progressPercent = Math.round((sentCount / totalRecipients) * 100);
          io.emit('prediction:emailProgress', {
            predictionId: prediction.predictionId,
            campaignId,
            status: 'SENDING',
            total: totalRecipients,
            sent: acceptedTotal,
            accepted: acceptedTotal,
            failed: failedTotal,
            progress: progressPercent
          });
        }
      }

      // Finalize prediction status
      prediction.emailNotification.queuedCount = 0;
      prediction.emailNotification.acceptedCount = acceptedTotal;
      prediction.emailNotification.failedCount = failedTotal;
      prediction.emailNotification.deliveryStatus = failedTotal === 0 ? 'ACCEPTED_BY_PROVIDER' : (acceptedTotal > 0 ? 'PARTIAL_FAILURE' : 'FAILED');

      if (!prediction.auditLogs) prediction.auditLogs = [];
      prediction.auditLogs.push({
        action: 'EMAIL_CAMPAIGN_COMPLETED',
        operatorOrSystem: 'Automated Notification Worker',
        timestamp: new Date(),
        details: `Dispatched disaster warning to ${totalRecipients} registered users. Accepted by provider: ${acceptedTotal}, Failed: ${failedTotal}.`
      });

      if (prediction.save) await prediction.save();

      console.log(`[EmailNotificationService] ✅ Campaign completed for ${prediction.predictionId}: ${acceptedTotal} accepted by provider, ${failedTotal} failed.`);

      if (io) {
        io.emit('prediction:emailCompleted', {
          predictionId: prediction.predictionId,
          campaignId,
          status: prediction.emailNotification.deliveryStatus,
          acceptedCount: acceptedTotal,
          failedCount: failedTotal,
          total: totalRecipients
        });
      }
    })().catch(err => {
      console.error(`[EmailNotificationService] Error in background email worker:`, err);
    });

    return {
      success: true,
      campaignId,
      recipientCount: totalRecipients,
      status: 'QUEUED'
    };
  }

  /**
   * Retry failed recipients from a prior campaign
   */
  async retryFailedRecipients(prediction, io = null) {
    if (!prediction.emailNotification?.recipients) {
      throw new Error('No recipient records found on prediction.');
    }

    const failedRecipients = prediction.emailNotification.recipients.filter(r => r.status === 'FAILED');
    if (failedRecipients.length === 0) {
      return { success: true, retriedCount: 0, message: 'No failed recipients to retry.' };
    }

    console.log(`[EmailNotificationService] 🔄 Retrying ${failedRecipients.length} failed recipient(s) for prediction ${prediction.predictionId}...`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const mailFrom = this.smtpStatus.mailFrom || 'ResQAI Emergency Network <alerts@resqai.org>';
    const subject = `🚨 ResQAI Disaster Warning (Retry): ${prediction.predictedRiskLevel} ${prediction.disasterType} Risk in ${prediction.affectedArea.name}`;

    let recovered = 0;
    for (const rec of failedRecipients) {
      try {
        const html = this.generateEmailHtml(prediction, rec.name, frontendUrl);
        const text = this.generateEmailText(prediction, rec.name, frontendUrl);

        if (this.transporter) {
          const info = await this.transporter.sendMail({
            from: mailFrom,
            to: rec.email,
            subject,
            html,
            text
          });
          rec.status = 'ACCEPTED_BY_PROVIDER';
          rec.messageId = info.messageId;
          rec.providerResponse = info.response;
          rec.sentAt = new Date();
          rec.error = null;
          rec.attempts = (rec.attempts || 1) + 1;
        } else {
          rec.status = 'ACCEPTED_BY_PROVIDER';
          rec.sentAt = new Date();
          rec.attempts = (rec.attempts || 1) + 1;
        }
        recovered++;
      } catch (err) {
        rec.error = err.message;
        rec.attempts = (rec.attempts || 1) + 1;
      }
    }

    prediction.emailNotification.acceptedCount += recovered;
    prediction.emailNotification.failedCount = Math.max(0, prediction.emailNotification.failedCount - recovered);
    prediction.emailNotification.deliveryStatus = prediction.emailNotification.failedCount === 0 ? 'ACCEPTED_BY_PROVIDER' : 'PARTIAL_FAILURE';

    if (prediction.save) await prediction.save();

    if (io) {
      io.emit('prediction:updated', prediction);
    }

    return {
      success: true,
      retriedCount: failedRecipients.length,
      recoveredCount: recovered,
      remainingFailed: prediction.emailNotification.failedCount
    };
  }

  /**
   * Send dedicated family notification email for Missing Person status transitions
   * (e.g. Possible Match identified, Verified by human authority, Reunited)
   */
  async sendMissingPersonStatusEmail({
    caseItem,
    recipientEmail,
    recipientName = 'Family Member',
    previousStatus = 'Reported',
    newStatus = 'Possible Match',
    matchDetails = null,
    notes = ''
  }) {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      console.warn(`[EmailNotificationService] ⚠️ Invalid or missing recipient email for case ${caseItem?.caseId}`);
      return { success: false, reason: 'INVALID_EMAIL' };
    }

    // Deduplication check: prevent duplicate emails for same caseId + newStatus within 10 minutes
    if (!this.missingNotifCache) {
      this.missingNotifCache = new Map();
    }
    const dedupeKey = `${caseItem.caseId}_${newStatus}_${recipientEmail.toLowerCase()}`;
    const lastSent = this.missingNotifCache.get(dedupeKey);
    if (lastSent && (Date.now() - lastSent < 10 * 60 * 1000)) {
      console.log(`[EmailNotificationService] ℹ️ Duplicate reunification email suppressed for ${dedupeKey}`);
      return { success: true, deduplicated: true, status: 'DEDUPLICATED' };
    }

    const sender = this.smtpStatus.mailFrom || 'ResQAI Emergency Network <alerts@resqai.org>';
    const isVerified = newStatus === 'Verified' || newStatus === 'Reunited';
    const statusColor = isVerified ? '#10b981' : newStatus === 'Possible Match' ? '#3b82f6' : '#f59e0b';
    const subject = `[ResQAI Family Reunification] Case Update: ${caseItem.fullName} — Status: ${newStatus.toUpperCase()}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #e2e8f0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #111827; border: 2px solid ${statusColor}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px; text-align: center; border-bottom: 2px solid ${statusColor}; }
          .badge { display: inline-block; padding: 6px 14px; background-color: ${statusColor}; color: #ffffff; font-weight: 800; font-size: 13px; border-radius: 8px; text-transform: uppercase; margin-bottom: 12px; }
          .content { padding: 24px 28px; line-height: 1.6; }
          .info-table { width: 100%; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; margin: 16px 0; border-collapse: collapse; }
          .info-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #334155; }
          .label { color: #94a3b8; width: 40%; font-weight: 600; }
          .value { color: #ffffff; font-weight: 700; }
          .callout { background-color: #172554; border-left: 4px solid #3b82f6; padding: 14px; border-radius: 8px; margin: 16px 0; font-size: 13px; color: #bfdbfe; }
          .footer { padding: 18px 24px; background-color: #0b0f19; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">${newStatus}</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 22px;">ResQAI Family Reunification Portal</h1>
            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Official Case Record ID: ${caseItem.caseId}</p>
          </div>
          <div class="content">
            <p>Dear <strong>${recipientName}</strong>,</p>
            <p>An official status transition has been recorded by emergency disaster operations for missing person report <strong>${caseItem.fullName}</strong>.</p>
            
            <table class="info-table">
              <tr>
                <td class="label">Person Name:</td>
                <td class="value">${caseItem.fullName}</td>
              </tr>
              <tr>
                <td class="label">Current Case Status:</td>
                <td class="value" style="color: ${statusColor};">${newStatus}</td>
              </tr>
              <tr>
                <td class="label">Age / Gender:</td>
                <td class="value">${caseItem.age} years (${caseItem.gender})</td>
              </tr>
              <tr>
                <td class="label">Last Seen Location:</td>
                <td class="value">${caseItem.lastSeenLocation}</td>
              </tr>
              ${caseItem.shelterOrHospitalName ? `
              <tr>
                <td class="label">Facility Location:</td>
                <td class="value">${caseItem.shelterOrHospitalName}</td>
              </tr>` : ''}
            </table>

            ${newStatus === 'Possible Match' ? `
            <div class="callout">
              <strong>🔍 Match Investigation Underway:</strong> A potential candidate matching these attributes has been registered at an evacuation intake center. Our authorized emergency response staff are currently conducting human identity verification. Please await confirmation before traveling.
            </div>` : ''}

            ${newStatus === 'Verified' ? `
            <div class="callout" style="background-color: #064e3b; border-color: #10b981; color: #a7f3d0;">
              <strong>✅ Identity Verified:</strong> Response authorities and relief shelter officers have confirmed identity. Please contact the shelter desk or helpline to coordinate reunification.
            </div>` : ''}

            ${newStatus === 'Reunited' ? `
            <div class="callout" style="background-color: #064e3b; border-color: #10b981; color: #a7f3d0;">
              <strong>🎉 Case Successfully Closed:</strong> Reunification handover completed. Thank you for utilizing the ResQAI CrisisConnect Emergency Network.
            </div>` : ''}

            ${notes ? `<p style="font-size: 12px; color: #94a3b8;"><strong>Officer Notes:</strong> ${notes}</p>` : ''}
          </div>
          <div class="footer">
            ResQAI Emergency Management Platform • Secure Family Tracing & Reunification<br>
            Emergency Helpline: 112 / +91 1800 11 1122
          </div>
        </div>
      </body>
      </html>
    `;

    if (!this.transporter) {
      console.log(`[EmailNotificationService] 📧 [Simulated] Family reunification status email sent to ${recipientEmail} for case ${caseItem.caseId}`);
      this.missingNotifCache.set(dedupeKey, Date.now());
      return { success: true, simulated: true, recipient: recipientEmail };
    }

    try {
      const info = await this.transporter.sendMail({
        from: sender,
        to: recipientEmail,
        subject,
        html,
        text: `ResQAI Family Reunification Update for Case ${caseItem.caseId} (${caseItem.fullName}): New Status is ${newStatus}.`
      });
      this.missingNotifCache.set(dedupeKey, Date.now());
      console.log(`[EmailNotificationService] ✅ Family notification email accepted by SMTP provider (MessageId: ${info.messageId}) for ${recipientEmail}`);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        recipient: recipientEmail
      };
    } catch (err) {
      console.error(`[EmailNotificationService] ❌ Failed to send family reunification email to ${recipientEmail}:`, err.message);
      return { success: false, error: err.message, recipient: recipientEmail };
    }
  }
}

module.exports = new EmailNotificationService();
