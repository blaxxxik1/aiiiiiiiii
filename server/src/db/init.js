const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', '..', 'data.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
    seedData();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance REAL DEFAULT 0,
      role TEXT DEFAULT 'user',
      avatar TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL,
      category TEXT DEFAULT 'standard',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS case_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      skin_name TEXT NOT NULL,
      skin_image TEXT NOT NULL,
      rarity TEXT NOT NULL,
      price REAL NOT NULL,
      chance REAL NOT NULL,
      weapon TEXT DEFAULT '',
      wear TEXT DEFAULT '',
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS case_openings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      case_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (case_id) REFERENCES cases(id),
      FOREIGN KEY (item_id) REFERENCES case_items(id)
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      status TEXT DEFAULT 'in_inventory',
      sold_price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (item_id) REFERENCES case_items(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'sbp',
      status TEXT DEFAULT 'pending',
      transaction_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      bonus_percent REAL DEFAULT 0,
      bonus_amount REAL DEFAULT 0,
      max_uses INTEGER DEFAULT 1,
      current_uses INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  if (userCount > 0) return;

  // Create admin user (password: admin123)
  const adminHash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (username, email, password, balance, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', 'admin@cs2cases.ru', adminHash, 10000, 'admin');

  // Create test user (password: test123)
  const userHash = bcrypt.hashSync('test123', 10);
  db.prepare(`
    INSERT INTO users (username, email, password, balance, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('testuser', 'test@cs2cases.ru', userHash, 500, 'user');

  // Seed cases with CS2 skins
  const cases = [
    {
      name: 'Кейс «Снайпер»',
      price: 199,
      image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3KadJjhK7Yy1m3bxKQnZ5up0kj4H65Ahtrp5NOjiQWw_0Y4YGjxINeLMlhp-AdWWA/360fx360f',
      category: 'weapon',
      items: [
        { skin_name: 'AWP | Азимов', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbmkOVJh3sLFcDoV09K_koWYkuXgY7mIk2kGsZUp2LyV99Wh3gfjrhFqZT-hcoKRIQA2YVHZ8gS-xenphMjpuZrAz3Q16SIh5HbfgVXn1AMAOKHD/360fx360f', rarity: 'covert', price: 5200, chance: 2, weapon: 'AWP', wear: 'Поношенное' },
        { skin_name: 'AWP | Драгон Лор', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbmnOVJh0ufNdShR792lkL-FlvL5Zr-fk2oHvZIj3-mVo96t0VXg-kdrYT-lJ4fDdFM3aF7R-1C-xLq6gJ64vprNmXRhuih04nfcyhGpwUYb0_RDCQ/360fx360f', rarity: 'covert', price: 45000, chance: 0.5, weapon: 'AWP', wear: 'Прямо с завода' },
        { skin_name: 'SSG 08 | Кровь в воде', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'classified', price: 1800, chance: 5, weapon: 'SSG 08', wear: 'Немного поношенное' },
        { skin_name: 'SCAR-20 | Кровавый спорт', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbOiNlRf2PHzfThQ_6eO0b-HnvD9DLbUhGpd18l4jeHVyoD8j1yg5RE9bSmtIobDdQ46Y1CD-Ae3w-_mg8W66Z6YmXVqvCMl5n2IyRe10RtMaMFxgd-eH-e3Iw/360fx360f', rarity: 'restricted', price: 350, chance: 15, weapon: 'SCAR-20', wear: 'После полевых' },
        { skin_name: 'G3SG1 | Хронос', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3KWaJG0Etq_woSYxfTtYb2Bz2oB6scg27uR992njAK1-UU4NzvxdYaQewc4NVuE_1frw-joxda0u5_M6yRh6XYntynD20vglBxfcNs6jA/360fx360f', rarity: 'mil_spec', price: 80, chance: 30, weapon: 'G3SG1', wear: 'Закалённое в боях' },
        { skin_name: 'AWP | Скоростной зверь', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbmnOVJh0ufNdShR792lkL-FlvLwYeOJlD1XvpUgjLiXrN733Qbs_kFpMmz7JY_GdVc4YVyBqgS2l73thcS_7sjLzCFguyNx4nrD30vg1xgOcKUbkjRG6A/360fx360f', rarity: 'classified', price: 2200, chance: 3, weapon: 'AWP', wear: 'Немного поношенное' },
        { skin_name: 'SSG 08 | Отряд призраков', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3KWaJG0Etq_woSYxfTtZOKAzz8FvMRwjLqR89ikiQPg_0JoYm3xd4aVJwQ3YFnT-VK_xei5jZK6vpTMyHM_u3N35XeMzByphAkdcaUO0_HMAA/360fx360f', rarity: 'restricted', price: 450, chance: 12, weapon: 'SSG 08', wear: 'Поношенное' },
        { skin_name: 'AWP | Гипер зверь', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbmnOVJh0ufNdShR792lkL-FlvL5Zr-fk2oHvZIj3-yWpdqm0FDlrUNsYTz3LdDGIFM3NVqF_FS_w-jmhJG5vJ6azXEy7nMn5HbegVXn1B8daqBxhPaCVxzKUKkdBgSt/360fx360f', rarity: 'covert', price: 3500, chance: 2.5, weapon: 'AWP', wear: 'Немного поношенное' },
        { skin_name: 'SG 553 | Интегра', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3KWaJG0Etq_woSYxfTtYb2Bz2oB6scg27uR992njAK1-UU4NzvxdYaQewdxdF6F_1W9xOjv0Ma0vc_NzXBivCEi4H3VyBSpwkYbTvB-jg/360fx360f', rarity: 'mil_spec', price: 60, chance: 30, weapon: 'SG 553', wear: 'После полевых' }
      ]
    },
    {
      name: 'Кейс «Штурмовик»',
      price: 149,
      image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3PTdTjlJ7dCJl4OPlfj7DrbQkmJB5dN9g27E5YrRjl2y_kRtamj1doaVdwQ2ZF3Tq1i7w-u5gZa5v5_MynIx6Cdw7GGLlRzjgx9SLMxx0KGaF-e3IlUJclL/360fx360f',
      category: 'weapon',
      items: [
        { skin_name: 'AK-47 | Вулкан', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szHdShR792lkL-F-PD2J6mBk2kGsJAh2ryS89Sn2AGw-hVpMW-lIoGcelRvZl_R-gO2yO_m1ZC0vpnBzHRrvCgh7GGJmEbnhBxKabM6m7bJLQ/360fx360f', rarity: 'covert', price: 4800, chance: 2, weapon: 'AK-47', wear: 'Немного поношенное' },
        { skin_name: 'AK-47 | Огненный змей', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szGcDFR792lk5eLkPL5DKDTjG1UscAp2erHp9ihjAa1_hBpamGhJoCVewM_NF3Y5FnolevugcW6vJ7PnHVh6CQr5HePyhWp0R1SPbVxxauaF-m3OA/360fx360f', rarity: 'covert', price: 25000, chance: 0.5, weapon: 'AK-47', wear: 'Прямо с завода' },
        { skin_name: 'M4A4 | Вой', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'covert', price: 6500, chance: 1.5, weapon: 'M4A4', wear: 'Прямо с завода' },
        { skin_name: 'M4A1-S | Гипер зверь', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szEdDkV09a_mpaPsPL5DKDTjG1UscAp2L6T846n3Qy1_hVqYT3zIIWSdQg8Zw3T_Fa_xr25hsK7u5zPzHVq7CUn-z-JmkG1n1x9IasZzqGaV-mzNKHJPQ/360fx360f', rarity: 'classified', price: 2800, chance: 4, weapon: 'M4A1-S', wear: 'Немного поношенное' },
        { skin_name: 'Galil AR | Холодное пламя', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3KWaJG0Etq_woSYxfTtYb2Bz2oB6scg27uR992njAK18kRtYW73d4CRcAA4Yw7ZqVS_wOjnhJa-tZTBzXNnuHIn53-IyhW10BocML8emPbMHw/360fx360f', rarity: 'restricted', price: 280, chance: 12, weapon: 'Galil AR', wear: 'Закалённое в боях' },
        { skin_name: 'FAMAS | Рулон', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3KWaJG0Etq_woSYxfTtYb2Bz2oB6scg27uR992njAK18kRtYW73d4CRcAA4Yw7ZqVS_wOjnhJa-tZTBzXNnuHIn53-IyhW10BocML8emPbMHw/360fx360f', rarity: 'mil_spec', price: 45, chance: 30, weapon: 'FAMAS', wear: 'После полевых' },
        { skin_name: 'AK-47 | Неоновая революция', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szHdShR792lkL-F-PD2J6mBk2kGsJAh2ryS89Sn2AGw-hVpMW-lIoGcelRvZl_R-gO2yO_m1ZC0vpnBzHRrvCgh7GGJmEbnhBxKabM6m7bJLQ/360fx360f', rarity: 'classified', price: 1500, chance: 5, weapon: 'AK-47', wear: 'Поношенное' },
        { skin_name: 'M4A4 | Кибербезопасность', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'restricted', price: 520, chance: 10, weapon: 'M4A4', wear: 'Немного поношенное' },
        { skin_name: 'AUG | Пламя', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3KWaJG0Etq_woSYxfTtYb2Bz2oB6scg27uR992njAK18kRtYW73d4CRcAA4Yw7ZqVS_wOjnhJa-tZTBzXNnuHIn53-IyhW10BocML8emPbMHw/360fx360f', rarity: 'mil_spec', price: 35, chance: 35, weapon: 'AUG', wear: 'После полевых' }
      ]
    },
    {
      name: 'Кейс «Нож»',
      price: 499,
      image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3PTdTjlJ7dCJl4OPlfj7DrbQkmJB5dN9g27E5YrRjl2y_kRtamj1doaVdwQ2ZF3Tq1i7w-u5gZa5v5_MynIx6Cdw7GGLlRzjgx9SLMxx0KGaF-e3IlUJclL/360fx360f',
      category: 'premium',
      items: [
        { skin_name: 'Керамбит | Убийство', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'gold', price: 35000, chance: 1, weapon: 'Керамбит', wear: 'Прямо с завода' },
        { skin_name: 'Штык-нож М9 | Градиент', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'gold', price: 28000, chance: 1.5, weapon: 'Штык-нож М9', wear: 'Немного поношенное' },
        { skin_name: 'Бабочка | Ночь', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'gold', price: 18000, chance: 2, weapon: 'Бабочка', wear: 'Поношенное' },
        { skin_name: 'Складной нож | Мраморный градиент', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'covert', price: 12000, chance: 3, weapon: 'Складной нож', wear: 'Прямо с завода' },
        { skin_name: 'Тычковые ножи | Кровавая паутина', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'covert', price: 8500, chance: 4, weapon: 'Тычковые ножи', wear: 'Немного поношенное' },
        { skin_name: 'Охотничий нож | Зуб тигра', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'classified', price: 5500, chance: 5, weapon: 'Охотничий нож', wear: 'Поношенное' },
        { skin_name: 'Фальшион | Поверхностная закалка', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'classified', price: 4200, chance: 6, weapon: 'Фальшион', wear: 'Закалённое в боях' },
        { skin_name: 'Навая | Волны', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'restricted', price: 2800, chance: 10, weapon: 'Навая', wear: 'После полевых' },
        { skin_name: 'Стилет | Убийство', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'covert', price: 7000, chance: 2.5, weapon: 'Стилет', wear: 'Прямо с завода' },
        { skin_name: 'Кишечный нож | Сеть', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'restricted', price: 3200, chance: 10, weapon: 'Кишечный нож', wear: 'Немного поношенное' }
      ]
    },
    {
      name: 'Кейс «Пистолеты»',
      price: 99,
      image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3PTdTjlJ7dCJl4OPlfj7DrbQkmJB5dN9g27E5YrRjl2y_kRtamj1doaVdwQ2ZF3Tq1i7w-u5gZa5v5_MynIx6Cdw7GGLlRzjgx9SLMxx0KGaF-e3IlUJclL/360fx360f',
      category: 'weapon',
      items: [
        { skin_name: 'Desert Eagle | Пламенный удар', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'covert', price: 3800, chance: 2, weapon: 'Desert Eagle', wear: 'Прямо с завода' },
        { skin_name: 'USP-S | Убийство подтверждено', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'covert', price: 4500, chance: 1.5, weapon: 'USP-S', wear: 'Прямо с завода' },
        { skin_name: 'Glock-18 | Затухание', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'classified', price: 1200, chance: 5, weapon: 'Glock-18', wear: 'Немного поношенное' },
        { skin_name: 'P250 | Сверхновая', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'restricted', price: 380, chance: 12, weapon: 'P250', wear: 'Закалённое в боях' },
        { skin_name: 'Five-SeveN | Обезьяний бизнес', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'classified', price: 950, chance: 6, weapon: 'Five-SeveN', wear: 'Поношенное' },
        { skin_name: 'Tec-9 | Ядерная угроза', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'restricted', price: 420, chance: 10, weapon: 'Tec-9', wear: 'После полевых' },
        { skin_name: 'CZ75-Auto | Виктория', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'mil_spec', price: 55, chance: 30, weapon: 'CZ75-Auto', wear: 'Закалённое в боях' },
        { skin_name: 'P2000 | Огненная стихия', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'classified', price: 1600, chance: 3.5, weapon: 'P2000', wear: 'Немного поношенное' }
      ]
    },
    {
      name: 'Кейс «Удача»',
      price: 299,
      image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4Mtepav6slFQh3PTdTjlJ7dCJl4OPlfj7DrbQkmJB5dN9g27E5YrRjl2y_kRtamj1doaVdwQ2ZF3Tq1i7w-u5gZa5v5_MynIx6Cdw7GGLlRzjgx9SLMxx0KGaF-e3IlUJclL/360fx360f',
      category: 'premium',
      items: [
        { skin_name: 'AWP | Драгон Лор', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbmnOVJh0ufNdShR792lkL-FlvL5Zr-fk2oHvZIj3-mVo96t0VXg-kdrYT-lJ4fDdFM3aF7R-1C-xLq6gJ64vprNmXRhuih04nfcyhGpwUYb0_RDCQ/360fx360f', rarity: 'gold', price: 45000, chance: 0.3, weapon: 'AWP', wear: 'Прямо с завода' },
        { skin_name: 'Керамбит | Градиент', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbO3JAhfx8jlBjsW7d-Jl9iOlvz4DLbQkmJB5dp9h27E5I_Rjl2z80U_Z2v2IJ7HIAZoYV7V_VK_x-i6hpK0u5vLynBhvyR3tyze0hOs0x9Se-Rx1KadH-e3Ig/360fx360f', rarity: 'gold', price: 55000, chance: 0.2, weapon: 'Керамбит', wear: 'Прямо с завода' },
        { skin_name: 'AK-47 | Огненный змей', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szGcDFR792lk5eLkPL5DKDTjG1UscAp2erHp9ihjAa1_hBpamGhJoCVewM_NF3Y5FnolevugcW6vJ7PnHVh6CQr5HePyhWp0R1SPbVxxauaF-m3OA/360fx360f', rarity: 'covert', price: 25000, chance: 1, weapon: 'AK-47', wear: 'Прямо с завода' },
        { skin_name: 'M4A4 | Вой', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'covert', price: 6500, chance: 2, weapon: 'M4A4', wear: 'Прямо с завода' },
        { skin_name: 'AWP | Азимов', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepbmkOVJh3sLFcDoV09K_koWYkuXgY7mIk2kGsZUp2LyV99Wh3gfjrhFqZT-hcoKRIQA2YVHZ8gS-xenphMjpuZrAz3Q16SIh5HbfgVXn1AMAOKHD/360fx360f', rarity: 'classified', price: 5200, chance: 4, weapon: 'AWP', wear: 'Поношенное' },
        { skin_name: 'Desert Eagle | Пламенный удар', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'classified', price: 3800, chance: 5, weapon: 'Desert Eagle', wear: 'Прямо с завода' },
        { skin_name: 'USP-S | Убийство подтверждено', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'classified', price: 4500, chance: 4, weapon: 'USP-S', wear: 'Прямо с завода' },
        { skin_name: 'Glock-18 | Затухание', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'restricted', price: 1200, chance: 8, weapon: 'Glock-18', wear: 'Немного поношенное' },
        { skin_name: 'AK-47 | Вулкан', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'classified', price: 4800, chance: 5.5, weapon: 'AK-47', wear: 'Немного поношенное' },
        { skin_name: 'P250 | Сверхновая', skin_image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXp-aE0_ZBzXDRbhIBdYD6mJul1GMZyKd-GFhIbDxlhM29-TjFGQcbkHoxRcS4BtByQvc_nXEd73Y_NQbmd4MtepYr3fT1J98szFITkV09a_mIbSn-L9DKTcm29V5cBOh-zHC5r8t0ax_EZlYTqgdYWQdgU7Yl3Z_Ve_xLy8h5e_uZ7InXRq6XZx7WGdwUIi0sXleg/360fx360f', rarity: 'mil_spec', price: 380, chance: 20, weapon: 'P250', wear: 'Закалённое в боях' }
      ]
    }
  ];

  const insertCase = db.prepare('INSERT INTO cases (name, price, image, category) VALUES (?, ?, ?, ?)');
  const insertItem = db.prepare('INSERT INTO case_items (case_id, skin_name, skin_image, rarity, price, chance, weapon, wear) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

  for (const c of cases) {
    const result = insertCase.run(c.name, c.price, c.image, c.category);
    const caseId = result.lastInsertRowid;
    for (const item of c.items) {
      insertItem.run(caseId, item.skin_name, item.skin_image, item.rarity, item.price, item.chance, item.weapon, item.wear);
    }
  }

  // Seed promo codes
  db.prepare('INSERT INTO promo_codes (code, bonus_percent, bonus_amount, max_uses) VALUES (?, ?, ?, ?)').run('WELCOME', 0, 100, 1000);
  db.prepare('INSERT INTO promo_codes (code, bonus_percent, bonus_amount, max_uses) VALUES (?, ?, ?, ?)').run('BONUS50', 50, 0, 500);
}

module.exports = { getDb };
