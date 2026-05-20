import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin for token verification
let isFirebaseConfigured = false;
try {
  const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseConfigured = true;
    console.log('Firebase Admin initialized securely.');
  } else {
    console.warn('⚠️ serviceAccountKey.json not found! Running in mock auth mode for development.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(join(__dirname, 'database.sqlite'), (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

// Initialize DB schema
db.serialize(() => {
  // We still keep the users table to link Firebase UID to internal data if needed
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT
    )
  `, () => {
    // Add columns dynamically in case the DB was initialized with an older schema
    db.run("ALTER TABLE users ADD COLUMN email TEXT", () => {});
    db.run("ALTER TABLE users ADD COLUMN name TEXT", () => {});
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      userId TEXT,
      description TEXT,
      amount REAL,
      currency TEXT,
      category TEXT,
      date TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      userId TEXT,
      brand TEXT,
      amount REAL,
      currency TEXT,
      billingDay INTEGER,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT,
      totalAmount REAL,
      emiAmount REAL,
      currency TEXT,
      endDate TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      userId TEXT,
      friendName TEXT,
      amount REAL,
      currency TEXT,
      date TEXT,
      type TEXT,
      status TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);
});

// Middleware to authenticate Firebase Token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'No token provided' });

  if (isFirebaseConfigured) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = { id: decodedToken.uid, email: decodedToken.email };
      next();
    } catch (error) {
      console.error('Firebase token verification failed:', error);
      res.status(403).json({ error: 'Invalid token' });
    }
  } else {
    // Mock verification for local dev when serviceAccountKey is missing
    // We expect the frontend to send a mocked format or just trust the token string as the UID for now
    if (token.startsWith('mock-')) {
      req.user = { id: token.replace('mock-', ''), email: 'mockuser@example.com' };
      next();
    } else {
      // If a real firebase token was sent but backend isn't configured, we just decode it unsafely for DEV ONLY
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        req.user = { id: payload.user_id, email: payload.email };
        next();
      } catch(e) {
        req.user = { id: 'dev-user-123', email: 'dev@example.com' };
        next();
      }
    }
  }
};

// Ensure user exists in our DB
const syncUser = (req, res, next) => {
  const { id, email } = req.user;
  db.run('INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)', [id, email], (err) => {
    if (err) console.error('Error syncing user:', err);
    next();
  });
};

app.use(authenticateToken);
app.use(syncUser);

// --- Routes ---

// Expenses
app.get('/expenses', (req, res) => {
  db.all('SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/expenses', (req, res) => {
  const { id, description, amount, currency, category, date } = req.body;
  db.run(
    'INSERT INTO expenses (id, userId, description, amount, currency, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, description, amount, currency, category, date],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/expenses/:id', (req, res) => {
  db.run('DELETE FROM expenses WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Subscriptions
app.get('/subscriptions', (req, res) => {
  db.all('SELECT * FROM subscriptions WHERE userId = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/subscriptions', (req, res) => {
  const { id, brand, amount, currency, billingDay } = req.body;
  db.run(
    'INSERT INTO subscriptions (id, userId, brand, amount, currency, billingDay) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user.id, brand, amount, currency, billingDay],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.put('/subscriptions/:id', (req, res) => {
  const { brand, amount, currency, billingDay } = req.body;
  db.run(
    'UPDATE subscriptions SET brand = ?, amount = ?, currency = ?, billingDay = ? WHERE id = ? AND userId = ?',
    [brand, amount, currency, billingDay, req.params.id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/subscriptions/:id', (req, res) => {
  db.run('DELETE FROM subscriptions WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Loans
app.get('/loans', (req, res) => {
  db.all('SELECT * FROM loans WHERE userId = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/loans', (req, res) => {
  const { id, name, totalAmount, emiAmount, currency, endDate } = req.body;
  db.run(
    'INSERT INTO loans (id, userId, name, totalAmount, emiAmount, currency, endDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, name, totalAmount, emiAmount, currency, endDate],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/loans/:id', (req, res) => {
  db.run('DELETE FROM loans WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Debts
app.get('/debts', (req, res) => {
  db.all('SELECT * FROM debts WHERE userId = ? ORDER BY date DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/debts', (req, res) => {
  const { id, friendName, amount, currency, date, type, status } = req.body;
  db.run(
    'INSERT INTO debts (id, userId, friendName, amount, currency, date, type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, friendName, amount, currency, date, type, status || 'pending'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.put('/debts/:id', (req, res) => {
  const { friendName, amount, currency, date, type, status } = req.body;
  db.run(
    'UPDATE debts SET friendName = ?, amount = ?, currency = ?, date = ?, type = ?, status = ? WHERE id = ? AND userId = ?',
    [friendName, amount, currency, date, type, status, req.params.id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/debts/:id', (req, res) => {
  db.run('DELETE FROM debts WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
