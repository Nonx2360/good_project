import express from 'express';
import cors from 'cors';
import multer from 'multer';
import cron from 'node-cron';
import axios from 'axios';
import { db, setupDb } from './db';

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

setupDb();

// --- Discord Notification Logic ---
async function notifyDiscord(message: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await axios.post(webhookUrl, { content: message });
  } catch (error) {
    console.error('Failed to send discord notification:', error);
  }
}

// Scheduled Job: Runs every day at 08:00 AM
cron.schedule('0 8 * * *', () => {
  console.log('Running daily expiration check...');
  const today = new Date();
  const intervals = [
    { label: '1 month', days: 30 },
    { label: '3 weeks', days: 21 },
    { label: '2 weeks', days: 14 },
    { label: '1 week', days: 7 },
    { label: '4 days', days: 4 },
    { label: '3 days', days: 3 },
    { label: '2 days', days: 2 },
    { label: '1 day', days: 1 },
  ];

  db.all('SELECT * FROM parts', [], (err, rows) => {
    if (err) {
      console.error('Error fetching parts for cron:', err);
      return;
    }

    const messages: string[] = [];

    rows.forEach((part: any) => {
      const expiry = new Date(part.expiry_date);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const interval = intervals.find(i => i.days === diffDays);
      if (interval) {
        messages.push(`⚠️ **Alert:** Part "${part.part_name}" (SN: ${part.serial_number}) will expire in exactly **${interval.label}** (${part.expiry_date}). Quantity left: ${part.quantity}`);
      } else if (diffDays === 0) {
        messages.push(`🚨 **URGENT:** Part "${part.part_name}" expires **TODAY**!`);
      } else if (diffDays < 0 && diffDays > -7) {
        // Remind for up to a week after expiry
        messages.push(`❌ **EXPIRED:** Part "${part.part_name}" expired ${Math.abs(diffDays)} days ago!`);
      }
    });

    if (messages.length > 0) {
      notifyDiscord(messages.join('\n\n'));
    }
  });
});

// --- API Endpoints ---

// Get all parts
app.get('/api/parts', (req, res) => {
  db.all('SELECT * FROM parts ORDER BY expiry_date ASC', [], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

// Add a part
app.post('/api/parts', (req, res) => {
  const { part_name, serial_number, quantity, expiry_date } = req.body;
  db.run(
    'INSERT INTO parts (part_name, serial_number, quantity, expiry_date) VALUES (?, ?, ?, ?)',
    [part_name, serial_number, quantity, expiry_date],
    function (err) {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ id: this.lastID });
    }
  );
});

// Update a part
app.put('/api/parts/:id', (req, res) => {
  const { part_name, serial_number, quantity, expiry_date } = req.body;
  const { id } = req.params;
  db.run(
    'UPDATE parts SET part_name = ?, serial_number = ?, quantity = ?, expiry_date = ? WHERE id = ?',
    [part_name, serial_number, quantity, expiry_date, id],
    function (err) {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ changes: this.changes });
    }
  );
});

// Delete a part
app.delete('/api/parts/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM parts WHERE id = ?', [id], function (err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ changes: this.changes });
  });
});

// Setup Settings (Client ID & Secret)
app.post('/api/settings', (req, res) => {
  const { client_id, client_secret } = req.body;
  
  db.serialize(() => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    if (client_id !== undefined) stmt.run('discord_client_id', client_id);
    if (client_secret !== undefined) stmt.run('discord_client_secret', client_secret);
    
    stmt.finalize((err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ success: true });
    });
  });
});

app.get('/api/settings', (req, res) => {
  db.all('SELECT key, value FROM settings', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const settings: any = {};
    rows.forEach((r: any) => settings[r.key] = r.value);
    
    if (settings.discord_webhook) process.env.DISCORD_WEBHOOK_URL = settings.discord_webhook;
    
    res.json({
      client_id: settings.discord_client_id || '',
      client_secret: settings.discord_client_secret ? '********' : '',
      webhook_active: !!settings.discord_webhook
    });
  });
});

// OAuth Initialization
app.get('/api/discord/auth', (req, res) => {
  db.get('SELECT value FROM settings WHERE key = ?', ['discord_client_id'], (err, row: any) => {
    if (!row || !row.value) return res.status(400).send('Client ID not configured');
    const clientId = row.value;
    const redirectUri = encodeURIComponent('http://localhost:3001/api/discord/callback');
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=webhook.incoming`;
    res.redirect(url);
  });
});

// OAuth Callback
app.get('/api/discord/callback', (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.redirect('http://localhost:5173/settings?error=nocode');

  db.all('SELECT key, value FROM settings WHERE key IN ("discord_client_id", "discord_client_secret")', [], async (err, rows) => {
    if (err || rows.length < 2) return res.redirect('http://localhost:5173/settings?error=nocredentials');
    
    const settings: any = {};
    rows.forEach((r: any) => settings[r.key] = r.value);

    try {
      const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
        client_id: settings.discord_client_id,
        client_secret: settings.discord_client_secret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'http://localhost:3001/api/discord/callback'
      }).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const webhookUrl = tokenResponse.data.webhook.url;
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['discord_webhook', webhookUrl]);
      process.env.DISCORD_WEBHOOK_URL = webhookUrl;

      res.redirect('http://localhost:5173/settings?success=true');
    } catch (error: any) {
      console.error('OAuth Error:', error.response?.data || error.message);
      res.redirect('http://localhost:5173/settings?error=oauth_failed');
    }
  });
});

app.post('/api/discord/test', async (req, res) => {
  if (!process.env.DISCORD_WEBHOOK_URL) {
    return res.status(400).json({ error: 'Discord Webhook is not configured' });
  }
  
  try {
    await notifyDiscord('✅ **Test Notification:** Your Discord integration is working perfectly!');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Load webhook on startup
  db.get('SELECT value FROM settings WHERE key = ?', ['discord_webhook'], (err, row: any) => {
    if (row?.value) {
      process.env.DISCORD_WEBHOOK_URL = row.value;
    }
  });
});
