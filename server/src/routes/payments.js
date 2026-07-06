const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Create payment (SBP mock)
router.post('/create', authMiddleware, (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 50) {
      return res.status(400).json({ error: 'Минимальная сумма пополнения — 50 ₽' });
    }
    if (amount > 100000) {
      return res.status(400).json({ error: 'Максимальная сумма пополнения — 100 000 ₽' });
    }

    const db = getDb();
    const transactionId = uuidv4();

    db.prepare('INSERT INTO payments (user_id, amount, method, status, transaction_id) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, amount, 'sbp', 'pending', transactionId);

    // In production, this would redirect to SBP payment gateway
    res.json({
      transactionId,
      amount,
      sbpUrl: `https://qr.nspk.ru/mock?sum=${amount}&purpose=CS2Cases&id=${transactionId}`,
      qrData: `ST00012|Name=CS2 Cases|PersonalAcc=40817810099910004312|BankName=Тинькофф|BIC=044525974|Sum=${amount * 100}|Purpose=Пополнение баланса ${transactionId}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Confirm payment (mock - in production this would be a webhook from payment provider)
router.post('/confirm', authMiddleware, (req, res) => {
  try {
    const { transactionId } = req.body;
    const db = getDb();

    const payment = db.prepare('SELECT * FROM payments WHERE transaction_id = ? AND user_id = ?')
      .get(transactionId, req.user.id);

    if (!payment) {
      return res.status(404).json({ error: 'Платёж не найден' });
    }
    if (payment.status === 'completed') {
      return res.status(400).json({ error: 'Платёж уже подтверждён' });
    }

    db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('completed', payment.id);
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(payment.amount, req.user.id);

    const user = db.prepare('SELECT id, username, email, balance, role, avatar FROM users WHERE id = ?').get(req.user.id);

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Get payment history
router.get('/history', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const payments = db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Apply promo code
router.post('/promo', authMiddleware, (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Введите промокод' });
    }

    const db = getDb();
    const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1').get(code.toUpperCase());

    if (!promo) {
      return res.status(400).json({ error: 'Промокод не найден' });
    }
    if (promo.current_uses >= promo.max_uses) {
      return res.status(400).json({ error: 'Промокод исчерпан' });
    }

    // Check if user already used this promo
    const existingPayment = db.prepare(
      "SELECT id FROM payments WHERE user_id = ? AND method = 'promo' AND transaction_id LIKE ?"
    ).get(req.user.id, `promo_${promo.id}_%`);

    if (existingPayment) {
      return res.status(400).json({ error: 'Вы уже использовали этот промокод' });
    }

    let bonus = promo.bonus_amount;
    if (promo.bonus_percent > 0) {
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
      bonus = Math.round(user.balance * promo.bonus_percent / 100);
      if (bonus < 1) bonus = 1;
    }

    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(bonus, req.user.id);
    db.prepare('UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?').run(promo.id);
    db.prepare('INSERT INTO payments (user_id, amount, method, status, transaction_id) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, bonus, 'promo', 'completed', `promo_${promo.id}_${req.user.id}`);

    const user = db.prepare('SELECT id, username, email, balance, role, avatar FROM users WHERE id = ?').get(req.user.id);

    res.json({ success: true, bonus, user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
