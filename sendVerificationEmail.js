// backend/sendVerificationEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "uos.ai.therapist@gmail.com",
    pass: "qvbu vhbn dkdm zupf", // your Gmail app password
  },
  tls: {
    rejectUnauthorized: false, // handles "self-signed certificate" issue
  },
});

const sendVerificationEmail = async (email) => {
  const verificationLink = `http://localhost:3000/verify/${encodeURIComponent(email)}`;

  const mailOptions = {
    from: '"AI Therapist App" <uos.ai.therapist@gmail.com>',
    to: email,
    subject: "Verify your Email",
    html: `
      <!DOCTYPE html>
<html>
<head>
    <style type="text/css">
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .email-container {
            background-color: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 30px;
        }
        .header {
            text-align: center;
            margin-bottom: 25px;
        }
        .logo {
            max-width: 150px;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .verify-button {
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #999999;
            margin-top: 30px;
        }
        .link {
            word-break: break-all;
            color: #0066cc;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <!-- Replace with your logo -->
            <img src="https://via.placeholder.com/150x50?text=Your+Logo" alt="Company Logo" class="logo">
            <h2>Verify Your Email Address</h2>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
            
            <div class="button-container">
                <a href="${verificationLink}" class="verify-button">Verify Email Address</a>
            </div>
            
            <p>If the button above doesn't work, copy and paste the following link into your web browser:</p>
            <p><a href="${verificationLink}" class="link">${verificationLink}</a></p>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
        </div>
        
        <div class="footer">
            <p>&copy; 2023 Your Company Name. All rights reserved.</p>
            <p>123 Business Street, City, Country</p>
        </div>
    </div>
</body>
</html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return { success: false, error };
  }
};

module.exports = sendVerificationEmail;
