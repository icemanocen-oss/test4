const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'InterestConnect <noreply@interestconnect.com>',
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email sending failed:', error);
        return { success: false, error: error.message };
    }
};

const sendVerificationEmail = async (email, name, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to InterestConnect!</h1>
                </div>
                <div class="content">
                    <h2>Hi ${name}! 👋</h2>
                    <p>Thanks for signing up! Please verify your email address to get started.</p>
                    <p style="text-align: center;">
                        <a href="${verificationUrl}" class="button">Verify My Email</a>
                    </p>
                    <p>Or copy this link:</p>
                    <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                        ${verificationUrl}
                    </p>
                    <p>This link expires in 24 hours.</p>
                </div>
                <div class="footer">
                    <p>If you didn't create an account, please ignore this email.</p>
                    <p>&copy; 2024 InterestConnect. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail(email, 'Verify Your Email - InterestConnect', html);
};

const sendPasswordResetEmail = async (email, name, token) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
                .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Hi ${name},</h2>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <p style="text-align: center;">
                        <a href="${resetUrl}" class="button">Reset Password</a>
                    </p>
                    <p>Or copy this link:</p>
                    <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                        ${resetUrl}
                    </p>
                    <div class="warning">
                        <strong>⚠️ Important:</strong> This link expires in 1 hour. If you didn't request this, please ignore this email.
                    </div>
                </div>
                <div class="footer">
                    <p>If you didn't request a password reset, your account is still secure.</p>
                    <p>&copy; 2024 InterestConnect. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail(email, 'Reset Your Password - InterestConnect', html);
};

const sendWelcomeEmail = async (email, name) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
                .feature { display: flex; align-items: center; margin: 15px 0; }
                .feature-icon { background: #667eea; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
                .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome Aboard!</h1>
                </div>
                <div class="content">
                    <h2>Hey ${name}!</h2>
                    <p>Your email is verified and your account is ready. Here's what you can do:</p>
                    
                    <div class="feature">
                        <div class="feature-icon">👥</div>
                        <div><strong>Find Partners</strong> - Connect with people who share your interests</div>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">🏠</div>
                        <div><strong>Join Communities</strong> - Be part of groups that match your passions</div>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">📅</div>
                        <div><strong>Attend Events</strong> - Participate in meetups and activities</div>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">💬</div>
                        <div><strong>Chat</strong> - Message your connections in real-time</div>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
                    </p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 InterestConnect. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail(email, 'Welcome to InterestConnect! 🎉', html);
};

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail
};
