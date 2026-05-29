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

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

const databasePath = process.env.DATABASE_PATH || join(__dirname, 'database.sqlite');
const archiveDatabasePath = process.env.ARCHIVE_DATABASE_PATH || join(__dirname, 'archive.sqlite');

const db = new sqlite3.Database(databasePath, (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log(`Connected to SQLite database at ${databasePath}`);
});

const archiveDb = new sqlite3.Database(archiveDatabasePath, (err) => {
  if (err) console.error('Archive database connection error:', err);
  else console.log(`Connected to SQLite archive database at ${archiveDatabasePath}`);
});

// Initialize Archive DB schema
archiveDb.serialize(() => {
  archiveDb.run(`
    CREATE TABLE IF NOT EXISTS archived_expenses (
      id TEXT PRIMARY KEY,
      userId TEXT,
      description TEXT,
      amount REAL,
      currency TEXT,
      category TEXT,
      date TEXT,
      paymentMode TEXT,
      archivedAt TEXT,
      monthLabel TEXT
    )
  `);
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
      paymentMode TEXT DEFAULT 'Cash',
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `, () => {
    db.run("ALTER TABLE expenses ADD COLUMN paymentMode TEXT DEFAULT 'Cash'", () => {});
  });

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
      createdAt TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `, () => {
    db.run("ALTER TABLE debts ADD COLUMN createdAt TEXT", () => {});
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      userId TEXT,
      source TEXT,
      amount REAL,
      currency TEXT,
      date TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      userId TEXT,
      category TEXT,
      limitAmount REAL,
      PRIMARY KEY (userId, category),
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);
});

// Middleware to authenticate Firebase Token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'No token provided' });

  // Allow mock- prefixed tokens to bypass verification (useful for guest previews)
  if (token.startsWith('mock-')) {
    const mockId = token.replace('mock-', '');
    req.user = { id: mockId, email: `${mockId}@example.com` };
    return next();
  }

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
  const { id, description, amount, currency, category, date, paymentMode } = req.body;
  db.run(
    'INSERT INTO expenses (id, userId, description, amount, currency, category, date, paymentMode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, description, amount, currency, category, date, paymentMode || 'Cash'],
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
  const createdAt = new Date().toISOString();
  db.run(
    'INSERT INTO debts (id, userId, friendName, amount, currency, date, type, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, friendName, amount, currency, date, type, status || 'pending', createdAt],
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

// Income Endpoints
app.get('/income', (req, res) => {
  db.all('SELECT * FROM income WHERE userId = ? ORDER BY date DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/income', (req, res) => {
  const { id, source, amount, currency, date } = req.body;
  db.run(
    'INSERT INTO income (id, userId, source, amount, currency, date) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user.id, source, amount, currency, date],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/income/:id', (req, res) => {
  db.run('DELETE FROM income WHERE id = ? AND userId = ?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Exchange Rates endpoint
app.get('/exchange-rates', (req, res) => {
  res.json({
    base: '₹',
    rates: {
      '₹': 1,
      '$': 83.3,
      '€': 90.5,
      '£': 105.2,
      '¥': 0.54
    }
  });
});

// Budgets Endpoints
app.get('/budgets', (req, res) => {
  db.all('SELECT * FROM budgets WHERE userId = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/budgets', (req, res) => {
  const { category, limitAmount } = req.body;
  db.run(
    'INSERT OR REPLACE INTO budgets (userId, category, limitAmount) VALUES (?, ?, ?)',
    [req.user.id, category, limitAmount],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, category, limitAmount });
    }
  );
});

// --- Archive Endpoints ---

// Run the monthly expense archiving process
app.post('/api/archive/run', (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const startOfCurrentMonth = `${currentYear}-${currentMonth}-01`;

  // Select all expenses before current month for this user
  db.all(
    'SELECT * FROM expenses WHERE userId = ? AND date < ?',
    [userId, startOfCurrentMonth],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (rows.length === 0) {
        return res.json({ success: true, archivedCount: 0 });
      }

      const archivedAt = new Date().toISOString();
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      archiveDb.serialize(() => {
        archiveDb.run('BEGIN TRANSACTION', (beginErr) => {
          if (beginErr) {
            return res.status(500).json({ error: beginErr.message });
          }

          let insertError = null;
          const stmt = archiveDb.prepare(`
            INSERT INTO archived_expenses (
              id, userId, description, amount, currency, category, date, paymentMode, archivedAt, monthLabel
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const row of rows) {
            const [year, monthStr] = row.date.split('-');
            const monthIndex = parseInt(monthStr, 10) - 1;
            const monthLabel = `${monthNames[monthIndex]} ${year}`;

            stmt.run([
              row.id,
              row.userId,
              row.description,
              row.amount,
              row.currency,
              row.category,
              row.date,
              row.paymentMode || 'Cash',
              archivedAt,
              monthLabel
            ], (runErr) => {
              if (runErr) {
                insertError = runErr;
              }
            });
          }

          stmt.finalize((finalizeErr) => {
            if (insertError || finalizeErr) {
              const errorObj = insertError || finalizeErr;
              archiveDb.run('ROLLBACK', () => {
                res.status(500).json({ error: errorObj.message });
              });
              return;
            }

            archiveDb.run('COMMIT', (commitErr) => {
              if (commitErr) {
                archiveDb.run('ROLLBACK', () => {
                  res.status(500).json({ error: commitErr.message });
                });
                return;
              }

              // After successfully writing to archiveDb, delete from main db
              db.run(
                'DELETE FROM expenses WHERE userId = ? AND date < ?',
                [userId, startOfCurrentMonth],
                (deleteErr) => {
                  if (deleteErr) {
                    return res.status(500).json({ error: `Archive saved but deletion from main database failed: ${deleteErr.message}` });
                  }
                  res.json({ success: true, archivedCount: rows.length });
                }
              );
            });
          });
        });
      });
    }
  );
});

// Get all archived expenses grouped by monthLabel
app.get('/api/archive', (req, res) => {
  archiveDb.all(
    'SELECT * FROM archived_expenses WHERE userId = ? ORDER BY date DESC',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const grouped = {};
      rows.forEach(row => {
        if (!grouped[row.monthLabel]) {
          grouped[row.monthLabel] = [];
        }
        grouped[row.monthLabel].push(row);
      });
      res.json(grouped);
    }
  );
});

// Get archived expenses for a specific monthLabel
app.get('/api/archive/:monthLabel', (req, res) => {
  archiveDb.all(
    'SELECT * FROM archived_expenses WHERE userId = ? AND monthLabel = ? ORDER BY date DESC',
    [req.user.id, req.params.monthLabel],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
