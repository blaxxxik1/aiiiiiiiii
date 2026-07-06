const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const cases = db.prepare('SELECT * FROM cases WHERE is_active = 1 ORDER BY price ASC').all();
    res.json({ cases });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const caseData = db.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.id);
    if (!caseData) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }
    const items = db.prepare('SELECT * FROM case_items WHERE case_id = ? ORDER BY chance ASC').all(req.params.id);
    res.json({ case: caseData, items });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:id/open', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const caseData = db.prepare('SELECT * FROM cases WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!caseData) {
      return res.status(404).json({ error: 'Кейс не найден' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (user.balance < caseData.price) {
      return res.status(400).json({ error: 'Недостаточно средств' });
    }

    const items = db.prepare('SELECT * FROM case_items WHERE case_id = ?').all(req.params.id);
    if (items.length === 0) {
      return res.status(400).json({ error: 'В кейсе нет предметов' });
    }

    // Weighted random selection
    const totalChance = items.reduce((sum, item) => sum + item.chance, 0);
    let random = Math.random() * totalChance;
    let wonItem = items[items.length - 1];

    for (const item of items) {
      random -= item.chance;
      if (random <= 0) {
        wonItem = item;
        break;
      }
    }

    // Deduct balance
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(caseData.price, req.user.id);

    // Record opening
    db.prepare('INSERT INTO case_openings (user_id, case_id, item_id) VALUES (?, ?, ?)').run(req.user.id, caseData.id, wonItem.id);

    // Add to inventory
    db.prepare('INSERT INTO inventory (user_id, item_id) VALUES (?, ?)').run(req.user.id, wonItem.id);

    const updatedUser = db.prepare('SELECT id, username, email, balance, role, avatar FROM users WHERE id = ?').get(req.user.id);

    // Generate roulette items for animation (40 items with the won item at position 35)
    const rouletteItems = [];
    for (let i = 0; i < 40; i++) {
      if (i === 35) {
        rouletteItems.push(wonItem);
      } else {
        const randomIdx = Math.floor(Math.random() * items.length);
        rouletteItems.push(items[randomIdx]);
      }
    }

    res.json({
      wonItem,
      rouletteItems,
      user: updatedUser
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
