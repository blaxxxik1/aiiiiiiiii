import React, { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function DepositPage() {
  const { user, updateUser } = useAuth();
  const [amount, setAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoError, setPromoError] = useState('');
  const [paymentPending, setPaymentPending] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedAmount = customAmount ? Number(customAmount) : amount;

  const createPayment = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payments/create', { amount: selectedAmount });
      setPaymentPending(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!paymentPending) return;
    setLoading(true);
    try {
      const res = await api.post('/payments/confirm', { transactionId: paymentPending.transactionId });
      updateUser(res.data.user);
      setPaymentPending(null);
      alert('Баланс пополнен!');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const applyPromo = async () => {
    setPromoMsg('');
    setPromoError('');
    try {
      const res = await api.post('/payments/promo', { code: promoCode });
      updateUser(res.data.user);
      setPromoMsg(`Промокод активирован! +${res.data.bonus} ₽`);
      setPromoCode('');
    } catch (err) {
      setPromoError(err.response?.data?.error || 'Ошибка');
    }
  };

  return (
    <div className="deposit-page">
      <h1 className="page-title">Пополнение баланса</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Текущий баланс</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>
            {Number(user?.balance || 0).toFixed(0)} ₽
          </div>
        </div>

        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
          Выберите сумму
        </label>
        <div className="deposit-amounts">
          {AMOUNTS.map(a => (
            <button
              key={a}
              className={`deposit-amount-btn ${!customAmount && amount === a ? 'active' : ''}`}
              onClick={() => { setAmount(a); setCustomAmount(''); }}
            >
              {a} ₽
            </button>
          ))}
        </div>

        <div className="form-group">
          <label>Или введите свою сумму</label>
          <input
            type="number"
            className="form-input"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            placeholder="От 50 до 100 000 ₽"
            min={50}
            max={100000}
          />
        </div>
      </div>

      {!paymentPending ? (
        <div className="sbp-section">
          <div className="sbp-logo">СБП</div>
          <div className="sbp-info">
            Моментальное пополнение через Систему Быстрых Платежей.
            Поддерживаются все банки России.
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={createPayment}
            disabled={loading || selectedAmount < 50}
          >
            {loading ? 'Создание платежа...' : `Пополнить ${selectedAmount} ₽`}
          </button>
        </div>
      ) : (
        <div className="sbp-section">
          <div className="sbp-logo">СБП</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>
            К оплате: {paymentPending.amount} ₽
          </div>
          <div className="sbp-info">
            Откройте приложение вашего банка и отсканируйте QR-код
            или перейдите по ссылке СБП для оплаты.
          </div>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            wordBreak: 'break-all',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            ID транзакции: {paymentPending.transactionId}
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-success btn-lg" onClick={confirmPayment} disabled={loading}>
              {loading ? 'Проверка...' : 'Я оплатил'}
            </button>
            <button className="btn btn-secondary" onClick={() => setPaymentPending(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="promo-section card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Промокод</h3>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            className="form-input"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value)}
            placeholder="Введите промокод"
          />
          <button className="btn btn-primary" onClick={applyPromo} disabled={!promoCode}>
            Применить
          </button>
        </div>
        {promoMsg && <div style={{ color: 'var(--success)', marginTop: '0.75rem' }}>{promoMsg}</div>}
        {promoError && <div style={{ color: 'var(--danger)', marginTop: '0.75rem' }}>{promoError}</div>}
      </div>
    </div>
  );
}
