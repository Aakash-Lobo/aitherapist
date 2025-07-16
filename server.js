const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const sendVerificationEmail = require('./sendVerificationEmail');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

// server.js or index.js

GROQ_API_KEY=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


const app = express();

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// ✅ Firebase Admin Init
const serviceAccount = require('./ai-therapist.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();
const sendDailyCheckIn = require('./sendDailyCheckIn');
// ✅ Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'uos.ai.therapist@gmail.com',
    pass: 'qvbu vhbn dkdm zupf',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ✅ Root health check route
app.get('/', (req, res) => {
  res.send('✅ AI Therapist Backend is Running');
});

// ✅ Verify User Email
app.post('/verify/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('email', '==', email).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    if (userData.verified) {
      return res.status(400).json({ success: false, message: 'User already verified' });
    }

    await userDoc.ref.update({ verified: true });
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ✅ Send Verification Email
app.post('/send-verification-email', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await sendVerificationEmail(email);
    res.json(result);
  } catch (err) {
    console.error('Error sending verification email:', err);
    res.status(500).json({ success: false, message: 'Failed to send verification email', error: err.message });
  }
});

// ✅ Send Welcome Email
app.post('/send-welcome-email', async (req, res) => {
  const { email, name } = req.body;

  const mailOptions = {
    from: '"AI Therapist" <uos.ai.therapist@gmail.com>',
    to: email,
    subject: 'Welcome to AI Therapist!',
    text: `Hi ${name}, welcome aboard!`,
    html: `<h1>Welcome ${name}</h1><p>We're glad to have you here.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Welcome email sent' });
  } catch (err) {
    console.error('Error sending welcome email:', err);
    res.status(500).json({ success: false, message: 'Failed to send welcome email', error: err.message });
  }
});

// ✅ GROQ API Integration Route for Chat
const GROQ_API_KEY = process.env.GROQ_API_KEY;
// function detectEmotions(text) {
//   const emotionKeywords = {
//     sadness: ['sad', 'depressed', 'unhappy', 'cry', 'hopeless', 'lonely'],
//     joy: ['happy', 'joy', 'excited', 'smile', 'grateful', 'relieved'],
//     anger: ['angry', 'mad', 'furious', 'annoyed', 'rage'],
//     fear: ['afraid', 'scared', 'anxious', 'nervous', 'fear'],
//     disgust: ['disgusted', 'gross', 'nauseous', 'repulsed'],
//   };

//   const scores = {};

//   for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
//     const matches = keywords.reduce((acc, keyword) => {
//       const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
//       return acc + (text.match(regex)?.length || 0);
//     }, 0);
//     scores[emotion] = matches;
//   }

//   // Normalize and sort
//   const total = Object.values(scores).reduce((sum, val) => sum + val, 0) || 1;

//   const results = Object.entries(scores)
//     .map(([emotion, score]) => ({
//       emotion,
//       score: (score / total) * 100,
//     }))
//     .filter(e => e.score > 0)
//     .sort((a, b) => b.score - a.score);

//   return results;
// }

app.post('/chat/send', async (req, res) => {
  const { fullMessages } = req.body;

  if (!fullMessages || !Array.isArray(fullMessages) || fullMessages.length === 0) {
    return res.status(400).json({ error: 'Missing or empty fullMessages array' });
  }

  try {
    // 🔹 Use fullMessages ONLY for AI reply
    const messagesForReply = [
      {
        role: 'system',
        content:
          'You are a kind and supportive AI therapist. Keep responses brief, clear, and emotionally sensitive.',
      },
      ...fullMessages.filter(msg => msg.role && msg.content),
    ];

    // 🔸 Get last user message only for emotion detection
    const lastUserMessage = fullMessages
      .slice()
      .reverse()
      .find((msg) => msg.role === 'user')?.content || '';

    // ✉️ Get AI reply
    const chatRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        messages: messagesForReply,
        temperature: 0.3,
        max_tokens: 300, // Optional: cap reply length
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = chatRes.data.choices?.[0]?.message?.content || 'Sorry, I didn’t understand that.';

    // 🎭 Emotion detection from 1 user message only (super lightweight)
    const emotionPrompt = `
Analyze the following message and return up to 3 dominant emotions with intensity (0-100). 
Respond ONLY with JSON in this format:
[
  {"emotion": "emotion_name", "score": number}
]

Message: "${lastUserMessage}"
`.trim();

    const emotionRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are an emotion analysis assistant.',
          },
          {
            role: 'user',
            content: emotionPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 150, // tiny limit just for emotion JSON
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let emotions = [];
    try {
      emotions = JSON.parse(emotionRes.data.choices?.[0]?.message?.content || '[]');
    } catch (err) {
      console.warn('Failed to parse emotion response:', err.message);
      emotions = [];
    }

    res.json({ aiReply: reply, 
      emotions
     });
  } 
  catch (error) {
    console.error('GROQ API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'AI response failed.' });
  }
});
  


// app.post('/chat/send', async (req, res) => {
//   const { fullMessages } = req.body;

//   if (!fullMessages || !Array.isArray(fullMessages) || fullMessages.length === 0) {
//     return res.status(400).json({ error: 'Missing or empty fullMessages array' });
//   }

//   try {
//     // Prepend system prompt for consistent AI therapist behavior
//     const messages = [
//       {
//         role: 'system',
//         content: 'You are a kind and supportive AI therapist. Keep responses brief, clear, and emotionally sensitive.',
//       },
//       ...fullMessages,
//     ];

//     const response = await axios.post(
//       'https://api.groq.com/openai/v1/chat/completions',
//       {
//         model: 'llama3-70b-8192',
//         messages,
//         temperature: 0.7,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${GROQ_API_KEY}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     const reply = response.data.choices?.[0]?.message?.content || 'Sorry, I didn’t understand that.';
//     res.json({ aiReply: reply });
//   } catch (error) {
//     console.error('GROQ API error:', error.response?.data || error.message);
//     res.status(500).json({ error: 'AI response failed.' });
//   }
// });

app.post('/api/checkin', async (req, res) => {
  const checkinData = req.body;
  // TODO: Save checkinData to Firestore or handle it as needed
  try {
    const docRef = await db.collection('checkins').add(checkinData);
    res.status(201).json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Error saving check-in:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});



// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
