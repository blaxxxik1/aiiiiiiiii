const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard stats
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    const totalOpenings = db.prepare('SELECT COUNT(*) as cnt FROM case_openings').get().cnt;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed' AND method != 'promo'").get().total;
    const totalPayouts = db.prepare("SELECT COALESCE(SUM(sold_price), 0) as total FROM inventory WHERE status = 'sold'").get().total;
    const activeCases = db.prepare('SELECT COUNT(*) as cnt FROM cases WHERE is_active = 1').get().cnt;

    const recentOpenings = db.prepare(`
      SELECT co.id, co.created_at, u.username,
             c.name as case_name, ci.skin_name, ci.rarity, ci.price as skin_price
      FROM case_openings co
      JOIN users u ON co.user_id = u.id
      JOIN cases c ON co.case_id = c.id
      JOIN case_items ci ON co.item_id = ci.id
      ORDER BY co.created_at DESC LIMIT 20
    `).all();

    res.json({
      stats: { totalUsers, totalOpenings, totalRevenue, totalPayouts, activeCases },
      recentOpenings
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// User management
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const search = req.query.search || '';
    let users;
    if (search) {
      users = db.prepare(`
        SELECT id, username, email, balance, role, created_at
        FROM users WHERE username LIKE ? OR email LIKE ?
        ORDER BY created_at DESC LIMIT 100
      `).all(`%${search}%`, `%${search}%`);
    } else {
      users = db.prepare('SELECT id, username, email, balance, role, created_at FROM users ORDER BY created_at DESC LIMIT 100').all();
    }
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Add/deduct balance
router.post('/users/:id/balance', (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (amount === undefined || amount === 0) {
      return res.status(400).json({ error: 'Укажите сумму' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.balance + amount < 0) {
      return res.status(400).json({ error: 'Баланс не может быть отрицательным' });
    }

    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, req.params.id);

    // Log the transaction
    const method = amount > 0 ? 'admin_credit' : 'admin_debit';
    db.prepare('INSERT INTO payments (user_id, amount, method, status, transaction_id) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, Math.abs(amount), method, 'completed', `admin_${Date.now()}_${req.params.id}`);

    const updated = db.prepare('SELECT id, username, email, balance, role, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Change user role
router.post('/users/:id/role', (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Некорректная роль' });
    }

    const db = getDb();
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    const user = db.prepare('SELECT id, username, email, balance, role, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Case management
router.get('/cases', (req, res) => {
  try {
    const db = getDb();
    const cases = db.prepare('SELECT * FROM cases ORDER BY id DESC').all();
    res.json({ cases });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/cases', (req, res) => {
  try {
    const { name, price, image, category } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const db = getDb();
    const result = db.prepare('INSERT INTO cases (name, price, image, category) VALUES (?, ?, ?, ?)')
      .run(name, price, image || '', category || 'standard');
    const newCase = db.prepare('SELECT * FROM cases WHERE id = ?').get(result.lastInsertRowid);
    res.json({ case: newCase });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/cases/:id', (req, res) => {
  try {
    const { name, price, image, category, is_active } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }

    db.prepare('UPDATE cases SET name = ?, price = ?, image = ?, category = ?, is_active = ? WHERE id = ?')
      .run(
        name || existing.name,
        price || existing.price,
        image || existing.image,
        category || existing.category,
        is_active !== undefined ? is_active : existing.is_active,
        req.params.id
      );

    const updated = db.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.id);
    res.json({ case: updated });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Payment management
router.get('/payments', (req, res) => {
  try {
    const db = getDb();
    const payments = db.prepare(`
      SELECT p.*, u.username
      FROM payments p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC LIMIT 100
    `).all();
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Promo code management
router.get('/promos', (req, res) => {
  try {
    const db = getDb();
    const promos = db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all();
    res.json({ promos });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/promos', (req, res) => {
  try {
    const { code, bonus_percent, bonus_amount, max_uses } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Укажите промокод' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM promo_codes WHERE code = ?').get(code.toUpperCase());
    if (existing) {
      return res.status(400).json({ error: 'Промокод уже существует' });
    }

    db.prepare('INSERT INTO promo_codes (code, bonus_percent, bonus_amount, max_uses) VALUES (?, ?, ?, ?)')
      .run(code.toUpperCase(), bonus_percent || 0, bonus_amount || 0, max_uses || 1);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/promos/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM promo_codes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
