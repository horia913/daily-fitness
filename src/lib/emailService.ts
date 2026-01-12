// Email Service for DailyFitness
// Uses OneSignal REST API to send transactional emails
// Requires NEXT_PUBLIC_ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY environment variables

interface EmailData {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private isConfigured = false

  constructor() {
    // Check if OneSignal is configured (using it for email sending)
    this.isConfigured = !!(
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID && 
      process.env.ONESIGNAL_REST_API_KEY
    )
  }

  /**
   * Send an email using OneSignal
   */
  async send(emailData: EmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Email service not configured. Email would be sent:', emailData)
      return false
    }

    try {
      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
      const apiKey = process.env.ONESIGNAL_REST_API_KEY

      if (!appId || !apiKey) {
        console.error('OneSignal credentials not configured')
        return false
      }

      const payload: any = {
        app_id: appId,
        email_to: [emailData.to],
        email_subject: emailData.subject,
        email_body: emailData.html
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        console.log('✅ Email sent successfully via OneSignal:', emailData.to)
        return true
      } else {
        console.error('❌ Failed to send email via OneSignal:', result)
        return false
      }
    } catch (error) {
      console.error('❌ Error sending email:', error)
      return false
    }
  }

  /**
   * Send invite email with PWA instructions
   */
  async sendInviteEmail(
    clientEmail: string, 
    clientName: string, 
    inviteCode: string, 
    expiryDays: number,
    inviteLink?: string
  ): Promise<boolean> {
    const emailData: EmailData = {
      to: clientEmail,
      subject: `Welcome to DailyFitness - Your Personal Training App`,
      html: this.generateInviteEmailHTML(clientName, inviteCode, expiryDays, inviteLink),
      text: this.generateInviteEmailText(clientName, inviteCode, expiryDays, inviteLink)
    }

    return await this.send(emailData)
  }

  /**
   * Generate HTML email content
   */
  private generateInviteEmailHTML(clientName: string, inviteCode: string, expiryDays: number, inviteLink?: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">🏋️‍♂️ DailyFitness</h1>
          <p style="color: #64748b; margin: 5px 0;">Your Personal Fitness Companion</p>
        </div>
        
        <h2 style="color: #1e293b;">Welcome${clientName ? ` ${clientName}` : ''}! 👋</h2>
        
        <p style="color: #475569; line-height: 1.6;">
          Your personal trainer has invited you to join DailyFitness, your personal fitness companion app!
        </p>
        
        ${inviteLink ? `
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
          <h3 style="color: #1e293b; margin-top: 0; text-align: center;">Your Personal Invite Link</h3>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${inviteLink}" style="background: #2563eb; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              🚀 Join DailyFitness Now
            </a>
          </div>
          <p style="text-align: center; color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
            This link expires in ${expiryDays} days
          </p>
        </div>
        ` : `
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
          <h3 style="color: #1e293b; margin-top: 0; text-align: center;">Your Invite Code</h3>
          <div style="background: #1e293b; color: white; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 24px; text-align: center; letter-spacing: 3px; font-weight: bold;">
            ${inviteCode}
          </div>
          <p style="text-align: center; color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
            Expires in ${expiryDays} days
          </p>
        </div>
        `}
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
          <h4 style="color: #92400e; margin-top: 0;">📱 Install as PWA (Progressive Web App)</h4>
          <p style="color: #92400e; margin-bottom: 10px; font-weight: 500;">Get the full app experience on your phone:</p>
          <ul style="color: #92400e; margin: 0; padding-left: 20px;">
            <li><strong>iPhone:</strong> Tap the Share button → "Add to Home Screen"</li>
            <li><strong>Android:</strong> Tap the menu → "Add to Home Screen" or "Install App"</li>
            <li><strong>Desktop:</strong> Look for the install icon in your browser address bar</li>
          </ul>
        </div>
        
        <h3 style="color: #1e293b;">How to get started:</h3>
        <ol style="color: #475569; line-height: 1.8;">
          ${inviteLink ? `
          <li><strong>Click the link above:</strong> Use the "Join DailyFitness Now" button to get started</li>
          <li><strong>Set your password:</strong> Your email is already filled in, just create a secure password</li>
          ` : `
          <li><strong>Open the app:</strong> Visit <a href="https://dailyfitness.app" style="color: #2563eb; text-decoration: none;">dailyfitness.app</a></li>
          <li><strong>Sign up:</strong> Create your account using the invite code above</li>
          `}
          <li><strong>Install as app:</strong> Save to your phone for the full app experience!</li>
          <li><strong>Start your fitness journey:</strong> Access workouts, nutrition plans, and progress tracking</li>
        </ol>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
          <h4 style="color: #065f46; margin-top: 0;">✨ What you'll get:</h4>
          <ul style="color: #065f46; margin: 0; padding-left: 20px;">
            <li>Personalized workout plans</li>
            <li>Nutrition tracking and meal plans</li>
            <li>Progress monitoring and analytics</li>
            <li>Direct communication with your trainer</li>
            <li>Goal setting and achievement tracking</li>
          </ul>
        </div>
        
        <p style="color: #475569; line-height: 1.6;">
          If you have any questions, don't hesitate to reach out to your trainer!
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; margin: 0;">
            Best regards,<br>
            <strong>The DailyFitness Team</strong>
          </p>
        </div>
      </div>
    `
  }

  /**
   * Generate plain text email content
   */
  private generateInviteEmailText(clientName: string, inviteCode: string, expiryDays: number, inviteLink?: string): string {
    return `
DailyFitness - Your Personal Fitness Companion

Welcome${clientName ? ` ${clientName}` : ''}!

Your personal trainer has invited you to join DailyFitness, your personal fitness companion app!

${inviteLink ? `
Your Personal Invite Link: ${inviteLink}
Expires in: ${expiryDays} days

How to get started:
1. Click the link above to get started
2. Set your password (your email is already filled in)
3. Install as app: Save to your phone for the full app experience!
4. Start your fitness journey: Access workouts, nutrition plans, and progress tracking
` : `
Your Invite Code: ${inviteCode}
Expires in: ${expiryDays} days

How to get started:
1. Open the app: Visit dailyfitness.app
2. Sign up: Create your account using the invite code above
3. Install as app: Save to your phone for the full app experience!
4. Start your fitness journey: Access workouts, nutrition plans, and progress tracking
`}

Install as PWA (Progressive Web App):
- iPhone: Tap the Share button → "Add to Home Screen"
- Android: Tap the menu → "Add to Home Screen" or "Install App"
- Desktop: Look for the install icon in your browser address bar

What you'll get:
- Personalized workout plans
- Nutrition tracking and meal plans
- Progress monitoring and analytics
- Direct communication with your trainer
- Goal setting and achievement tracking

If you have any questions, don't hesitate to reach out to your trainer!

Best regards,
The DailyFitness Team
    `.trim()
  }
}

export const emailService = new EmailService()
