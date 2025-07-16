// backend/sendDailyCheckIn.js
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

// Don't call admin.initializeApp() here, it's already initialized in server.js

const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "uos.ai.therapist@gmail.com",
    pass: "qvbu vhbn dkdm zupf", // Gmail app password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendDailyEmail = async (email, name = "User") => {
  const checkInLink = `http://localhost:3000/checkin?email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: '"AI Therapist" <uos.ai.therapist@gmail.com>',
    to: email,
    subject: "🧠 Daily Mental Health Check-In",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
          }
          .button {
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            display: inline-block;
            margin: 20px 0;
          }
          .footer {
            font-size: 12px;
            color: #999;
            margin-top: 30px;
          }
          a.link {
            color: #4CAF50;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Hello ${name},</h2>
          <p>It's time for your daily mental health check-in!</p>
          <p>Please take a moment to reflect and respond to today's questionnaire:</p>
          <a href="${checkInLink}" class="button">Complete Check-In</a>
          <p>If the button above doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${checkInLink}" class="link">${checkInLink}</a></p>
          <p>Wishing you a calm and healthy day,</p>
          <p>— Your AI Therapist 🌿</p>
          <div class="footer">
            <p>&copy; 2023 AI Therapist. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Daily check-in email sent to ${email}`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Failed to send daily check-in to ${email}:`, err);
    return { success: false, error: err };
  }
};

const runDailyEmailJob = async () => {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      console.log("No users to send emails to.");
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.verified) {
        sendDailyEmail(data.email, data.name || "User");
      }
    });
  } catch (error) {
    console.error("🔥 Error running daily email job:", error);
  }
};

// Schedule daily at 9:43 AM (adjust cron as needed)
cron.schedule('01 10 * * *', () => {
  console.log("⏰ Running daily check-in email job...");
  runDailyEmailJob();
});

module.exports = { runDailyEmailJob, sendDailyEmail };
