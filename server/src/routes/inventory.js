const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare(`
      SELECT i.id, i.status, i.sold_price, i.created_at,
             ci.skin_name, ci.skin_image, ci.rarity, ci.price, ci.weapon, ci.wear
      FROM inventory i
      JOIN case_items ci ON i.item_id = ci.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `).all(req.user.id);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Sell item from inventory
router.post('/:id/sell', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const item = db.prepare(`
      SELECT i.*, ci.price as skin_price
      FROM inventory i
      JOIN case_items ci ON i.item_id = ci.id
      WHERE i.id = ? AND i.user_id = ? AND i.status = 'in_inventory'
    `).get(req.params.id, req.user.id);

    if (!item) {
      return res.status(404).json({ error: 'Предмет не найден' });
    }

    const sellPrice = Math.round(item.skin_price * 0.9);

    db.prepare("UPDATE inventory SET status = 'sold', sold_price = ? WHERE id = ?").run(sellPrice, item.id);
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(sellPrice, req.user.id);

    const user = db.prepare('SELECT id, username, email, balance, role, avatar FROM users WHERE id = ?').get(req.user.id);

    res.json({ success: true, soldPrice: sellPrice, user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
