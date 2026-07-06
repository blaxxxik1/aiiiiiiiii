import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(res => setData(res.data)).catch(() => {});
  }, []);

  if (!data) return <div>Загрузка...</div>;

  return (
    <div>
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="label">Пользователей</div>
          <div className="value">{data.stats.totalUsers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="label">Открытий кейсов</div>
          <div className="value">{data.stats.totalOpenings}</div>
        </div>
        <div className="admin-stat-card">
          <div className="label">Доход</div>
          <div className="value" style={{ color: 'var(--success)' }}>{Number(data.stats.totalRevenue).toLocaleString()} ₽</div>
        </div>
        <div className="admin-stat-card">
          <div className="label">Выплаты</div>
          <div className="value" style={{ color: 'var(--danger)' }}>{Number(data.stats.totalPayouts).toLocaleString()} ₽</div>
        </div>
        <div className="admin-stat-card">
          <div className="label">Активных кейсов</div>
          <div className="value">{data.stats.activeCases}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Последние открытия</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Игрок</th>
              <th>Кейс</th>
              <th>Скин</th>
              <th>Редкость</th>
              <th>Цена</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {data.recentOpenings.map(o => (
              <tr key={o.id}>
                <td>{o.username}</td>
                <td>{o.case_name}</td>
                <td>{o.skin_name}</td>
                <td><span style={{ color: getRarityColor(o.rarity) }}>{o.rarity}</span></td>
                <td style={{ fontWeight: 600 }}>{o.skin_price} ₽</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {new Date(o.created_at).toLocaleString('ru-RU')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');

  const loadUsers = useCallback(() => {
    api.get(`/admin/users?search=${search}`).then(res => setUsers(res.data.users)).catch(() => {});
  }, [search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const changeBalance = async (userId, amount) => {
    try {
      await api.post(`/admin/users/${userId}/balance`, { amount: Number(amount) });
      setBalanceAmount('');
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const changeRole = async (userId, role) => {
    try {
      await api.post(`/admin/users/${userId}/role`, { role });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  return (
    <div>
      <div className="admin-search">
        <input
          type="text"
          className="form-input"
          placeholder="Поиск по имени или email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Имя</th>
            <th>Email</th>
            <th>Баланс</th>
            <th>Роль</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td style={{ fontWeight: 600 }}>{u.username}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
              <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{Number(u.balance).toFixed(0)} ₽</td>
              <td>
                <span style={{
                  padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem',
                  background: u.role === 'admin' ? 'rgba(233, 69, 96, 0.15)' : 'rgba(75, 105, 255, 0.15)',
                  color: u.role === 'admin' ? 'var(--accent)' : 'var(--mil-spec)'
                }}>{u.role}</span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-success btn-sm" onClick={() => setSelectedUser(u)}>
                    Баланс
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => changeRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                  >
                    {u.role === 'admin' ? 'Снять админа' : 'Сделать админом'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>Изменить баланс: {selectedUser.username}</h3>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Текущий баланс: <strong style={{ color: 'var(--accent)' }}>{Number(selectedUser.balance).toFixed(0)} ₽</strong>
            </div>
            <div className="form-group">
              <label>Сумма (положительная — начислить, отрицательная — списать)</label>
              <input
                type="number"
                className="form-input"
                value={balanceAmount}
                onChange={e => setBalanceAmount(e.target.value)}
                placeholder="Например: 1000 или -500"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-success"
                onClick={() => changeBalance(selectedUser.id, balanceAmount)}
                disabled={!balanceAmount || Number(balanceAmount) === 0}
              >
                Применить
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Cases() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    api.get('/admin/cases').then(res => setCases(res.data.cases)).catch(() => {});
  }, []);

  const toggleCase = async (id, isActive) => {
    try {
      await api.put(`/admin/cases/${id}`, { is_active: isActive ? 0 : 1 });
      setCases(cases.map(c => c.id === id ? { ...c, is_active: isActive ? 0 : 1 } : c));
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Цена</th>
            <th>Категория</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td style={{ fontWeight: 600 }}>{c.name}</td>
              <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{c.price} ₽</td>
              <td>{c.category}</td>
              <td>
                <span style={{
                  color: c.is_active ? 'var(--success)' : 'var(--danger)',
                  fontWeight: 600
                }}>
                  {c.is_active ? 'Активен' : 'Отключён'}
                </span>
              </td>
              <td>
                <button
                  className={`btn btn-sm ${c.is_active ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => toggleCase(c.id, c.is_active)}
                >
                  {c.is_active ? 'Отключить' : 'Включить'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Payments() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    api.get('/admin/payments').then(res => setPayments(res.data.payments)).catch(() => {});
  }, []);

  return (
    <div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Пользователь</th>
            <th>Сумма</th>
            <th>Метод</th>
            <th>Статус</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td style={{ fontWeight: 600 }}>{p.username}</td>
              <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{p.amount} ₽</td>
              <td>{p.method === 'sbp' ? 'СБП' : p.method === 'promo' ? 'Промокод' : p.method === 'admin_credit' ? 'Админ +' : p.method === 'admin_debit' ? 'Админ -' : p.method}</td>
              <td>
                <span style={{ color: p.status === 'completed' ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                  {p.status === 'completed' ? 'Выполнен' : 'Ожидание'}
                </span>
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {new Date(p.created_at).toLocaleString('ru-RU')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Promos() {
  const [promos, setPromos] = useState([]);
  const [newCode, setNewCode] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusPercent, setBonusPercent] = useState('');
  const [maxUses, setMaxUses] = useState('100');

  const loadPromos = () => {
    api.get('/admin/promos').then(res => setPromos(res.data.promos)).catch(() => {});
  };

  useEffect(() => { loadPromos(); }, []);

  const createPromo = async () => {
    try {
      await api.post('/admin/promos', {
        code: newCode,
        bonus_amount: Number(bonusAmount) || 0,
        bonus_percent: Number(bonusPercent) || 0,
        max_uses: Number(maxUses) || 100,
      });
      setNewCode('');
      setBonusAmount('');
      setBonusPercent('');
      loadPromos();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const deletePromo = async (id) => {
    if (!confirm('Удалить промокод?')) return;
    try {
      await api.delete(`/admin/promos/${id}`);
      loadPromos();
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Создать промокод</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Код</label>
            <input className="form-input" value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="PROMO123" />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Бонус (₽)</label>
            <input className="form-input" type="number" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} placeholder="100" />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Бонус (%)</label>
            <input className="form-input" type="number" value={bonusPercent} onChange={e => setBonusPercent(e.target.value)} placeholder="50" />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Макс. исп.</label>
            <input className="form-input" type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="100" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={createPromo} disabled={!newCode}>Создать</button>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Код</th>
            <th>Бонус ₽</th>
            <th>Бонус %</th>
            <th>Использований</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {promos.map(p => (
            <tr key={p.id}>
              <td style={{ fontWeight: 700, letterSpacing: '1px' }}>{p.code}</td>
              <td>{p.bonus_amount} ₽</td>
              <td>{p.bonus_percent}%</td>
              <td>{p.current_uses} / {p.max_uses}</td>
              <td>
                <span style={{ color: p.is_active ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  {p.is_active ? 'Активен' : 'Отключён'}
                </span>
              </td>
              <td>
                <button className="btn btn-danger btn-sm" onClick={() => deletePromo(p.id)}>
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getRarityColor(rarity) {
  const colors = {
    gold: '#ffd700', covert: '#eb4b4b', classified: '#d32ce6',
    restricted: '#8847ff', mil_spec: '#4b69ff', industrial: '#5e98d9', consumer: '#b0c3d9'
  };
  return colors[rarity] || '#fff';
}

export default function AdminPage() {
  const [tab, setTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Дашборд' },
    { id: 'users', label: 'Пользователи' },
    { id: 'cases', label: 'Кейсы' },
    { id: 'payments', label: 'Платежи' },
    { id: 'promos', label: 'Промокоды' },
  ];

  return (
    <div className="admin-page">
      <h1 className="page-title">Админ-панель</h1>

      <div className="admin-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`admin-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard />}
      {tab === 'users' && <Users />}
      {tab === 'cases' && <Cases />}
      {tab === 'payments' && <Payments />}
      {tab === 'promos' && <Promos />}
    </div>
  );
}
