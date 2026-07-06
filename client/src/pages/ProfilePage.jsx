import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    api.get('/payments/history').then(res => setPayments(res.data.payments)).catch(() => {});
    api.get('/inventory').then(res => setInventory(res.data.items)).catch(() => {});
  }, []);

  const totalSpent = inventory.length > 0 ? inventory.reduce((s, i) => s, 0) : 0;
  const totalWon = inventory.reduce((s, i) => s + i.price, 0);
  const totalSold = inventory.filter(i => i.status === 'sold').reduce((s, i) => s + i.sold_price, 0);

  return (
    <div className="profile-page">
      <h1 className="page-title">Профиль</h1>

      <div className="card" style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), #c23152)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 800, margin: '0 auto 1rem'
        }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{user?.username}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user?.email}</div>
        {user?.role === 'admin' && (
          <span style={{
            display: 'inline-block', marginTop: '0.5rem',
            background: 'rgba(233, 69, 96, 0.15)', color: 'var(--accent)',
            padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600
          }}>Администратор</span>
        )}
      </div>

      <div className="profile-stats">
        <div className="stat-card">
          <div className="value">{Number(user?.balance || 0).toFixed(0)} ₽</div>
          <div className="label">Баланс</div>
        </div>
        <div className="stat-card">
          <div className="value">{inventory.length}</div>
          <div className="label">Открыто кейсов</div>
        </div>
        <div className="stat-card">
          <div className="value">{totalWon.toLocaleString()} ₽</div>
          <div className="label">Выиграно скинов</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/deposit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
          Пополнить баланс
        </Link>
        <Link to="/inventory" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
          Инвентарь
        </Link>
      </div>

      {payments.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>История платежей</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Сумма</th>
                <th>Метод</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 20).map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.amount} ₽</td>
                  <td>{p.method === 'sbp' ? 'СБП' : p.method === 'promo' ? 'Промокод' : p.method === 'admin_credit' ? 'Админ +' : 'Админ -'}</td>
                  <td>
                    <span style={{
                      color: p.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                      fontWeight: 600
                    }}>
                      {p.status === 'completed' ? 'Выполнен' : 'Ожидание'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {new Date(p.created_at).toLocaleString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
