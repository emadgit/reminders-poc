// scripts/reminder.js
// Run with: node scripts/reminder.js
// Requires: axios, dotenv

const axios = require("axios");

const {
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
} = process.env;

if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
  console.error("❌ Missing Auth0 environment variables.");
  process.exit(1);
}

const AUTH0_BASE_URL = `https://${AUTH0_DOMAIN}`;
const AUTH0_AUDIENCE = `${AUTH0_BASE_URL}/api/v2/`;

async function getAuthToken() {
  const res = await axios.post(`${AUTH0_BASE_URL}/oauth/token`, {
    client_id: AUTH0_CLIENT_ID,
    client_secret: AUTH0_CLIENT_SECRET,
    audience: AUTH0_AUDIENCE,
    grant_type: "client_credentials",
  });
  return res.data.access_token;
}

async function getUnverifiedUsers(token) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const query = `email_verified:false AND created_at:[* TO "${oneDayAgo}"]`;

  const res = await axios.get(`${AUTH0_AUDIENCE}users`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: query,
      search_engine: "v3",
      per_page: 100,
    },
  });

  return res.data;
}

async function resendVerificationEmail(userId, token) {
  await axios.post(
    `${AUTH0_AUDIENCE}jobs/verification-email`,
    { user_id: userId },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

async function main() {
  console.log(`📬 Starting Auth0 email reminder job at ${new Date().toISOString()}`);
  try {
    const token = await getAuthToken();
    const users = await getUnverifiedUsers(token);

    if (users.length === 0) {
      console.log("✅ No unverified users found.");
      return;
    }

    for (const user of users) {
      console.log(`🔁 Resending verification email to: ${user.email}`);
      await resendVerificationEmail(user.user_id, token);
    }

    console.log(`✅ Successfully sent reminders to ${users.length} user(s).`);
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message || err);
  }
}

main();
