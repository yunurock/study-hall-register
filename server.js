require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();

// UPI proof screenshots are compressed client-side but can still be a few
// hundred KB as base64, so allow a generous JSON body size.
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5
});

const DEFAULT_SETTINGS = {
  hallName: 'Study Hall Register',
  ownerName: '',
  ownerPhone: '',
  address: 'Government Exam Preparation Centre',
  defaultFee: 800,
  cabinCount: 20
};

function toDateStr(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

// GET /api/state — assembles the full app state from the three tables.
app.get('/api/state', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [settingsRows] = await conn.query('SELECT * FROM settings WHERE id = 1');
    const [studentRows] = await conn.query('SELECT * FROM students ORDER BY roll_no');
    const [paymentRows] = await conn.query('SELECT * FROM payments ORDER BY date');

    const paymentsByStudent = {};
    paymentRows.forEach(p => {
      if (!paymentsByStudent[p.student_id]) paymentsByStudent[p.student_id] = [];
      paymentsByStudent[p.student_id].push({
        date: toDateStr(p.date),
        amount: p.amount,
        mode: p.mode,
        proof: p.proof || null
      });
    });

    const students = studentRows.map(s => ({
      id: s.id,
      rollNo: s.roll_no,
      name: s.name,
      phone: s.phone,
      joinDate: toDateStr(s.join_date),
      fee: s.fee,
      cabin: s.cabin,
      nextDue: toDateStr(s.next_due),
      payments: paymentsByStudent[s.id] || []
    }));

    let settings = DEFAULT_SETTINGS;
    let nextRoll = 1;
    if (settingsRows.length) {
      const sr = settingsRows[0];
      settings = {
        hallName: sr.hall_name || DEFAULT_SETTINGS.hallName,
        ownerName: sr.owner_name || '',
        ownerPhone: sr.owner_phone || '',
        address: sr.address || '',
        defaultFee: sr.default_fee ?? DEFAULT_SETTINGS.defaultFee,
        cabinCount: sr.cabin_count ?? DEFAULT_SETTINGS.cabinCount
      };
      nextRoll = sr.next_roll || 1;
    }

    res.json({ students, nextRoll, settings });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load state' });
  } finally {
    conn.release();
  }
});

// POST /api/state — replaces all data with what the client sends.
// The frontend always sends the complete state (same pattern it used with
// localStorage), so this does a clean transactional replace each time.
app.post('/api/state', async (req, res) => {
  const { students, nextRoll, settings } = req.body || {};
  if (!Array.isArray(students) || !settings) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('DELETE FROM payments');
    await conn.query('DELETE FROM students');
    await conn.query(
      `INSERT INTO settings (id, hall_name, owner_name, owner_phone, address, default_fee, cabin_count, next_roll)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         hall_name = VALUES(hall_name),
         owner_name = VALUES(owner_name),
         owner_phone = VALUES(owner_phone),
         address = VALUES(address),
         default_fee = VALUES(default_fee),
         cabin_count = VALUES(cabin_count),
         next_roll = VALUES(next_roll)`,
      [
        settings.hallName || DEFAULT_SETTINGS.hallName,
        settings.ownerName || '',
        settings.ownerPhone || '',
        settings.address || '',
        settings.defaultFee || DEFAULT_SETTINGS.defaultFee,
        settings.cabinCount || 0,
        nextRoll || 1
      ]
    );

    for (const s of students) {
      await conn.query(
        `INSERT INTO students (id, roll_no, name, phone, join_date, fee, cabin, next_due)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.rollNo, s.name, s.phone, s.joinDate, s.fee, s.cabin ?? null, s.nextDue]
      );
      for (const p of s.payments || []) {
        await conn.query(
          `INSERT INTO payments (student_id, date, amount, mode, proof) VALUES (?, ?, ?, ?, ?)`,
          [s.id, p.date, p.amount, p.mode, p.proof || null]
        );
      }
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'Failed to save state' });
  } finally {
    conn.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Study Hall Register running on port ${PORT}`));
