import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const RARITY_COLORS = {
  gold: '#ffd700',
  covert: '#eb4b4b',
  classified: '#d32ce6',
  restricted: '#8847ff',
  mil_spec: '#4b69ff',
  industrial: '#5e98d9',
  consumer: '#b0c3d9',
};

export default function CasePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rouletteItems, setRouletteItems] = useState([]);
  const [wonItem, setWonItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const stripRef = useRef(null);

  useEffect(() => {
    api.get(`/cases/${id}`)
      .then(res => {
        setCaseData(res.data.case);
        setItems(res.data.items);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const openCase = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (spinning) return;

    try {
      setSpinning(true);
      setShowModal(false);
      setWonItem(null);

      const res = await api.post(`/cases/${id}/open`);
      const { wonItem: won, rouletteItems: rItems, user: updatedUser } = res.data;

      setRouletteItems(rItems);
      updateUser(updatedUser);

      // Start animation
      requestAnimationFrame(() => {
        if (stripRef.current) {
          stripRef.current.style.transition = 'none';
          stripRef.current.style.transform = 'translateX(0)';

          requestAnimationFrame(() => {
            if (stripRef.current) {
              // Target: item at index 35, center it
              const itemWidth = 160;
              const containerWidth = stripRef.current.parentElement.clientWidth;
              const targetOffset = 35 * itemWidth + itemWidth / 2 - containerWidth / 2;
              // Add small random offset for realism
              const randomOffset = (Math.random() - 0.5) * (itemWidth * 0.6);

              stripRef.current.style.transition = 'transform 6s cubic-bezier(0.15, 0.85, 0.35, 1)';
              stripRef.current.style.transform = `translateX(-${targetOffset + randomOffset}px)`;
            }
          });
        }
      });

      setWonItem(won);

      // Show modal after animation
      setTimeout(() => {
        setShowModal(true);
        setSpinning(false);
      }, 6500);
    } catch (err) {
      setSpinning(false);
      alert(err.response?.data?.error || 'Ошибка открытия кейса');
    }
  }, [user, spinning, id, navigate, updateUser]);

  const sellItem = async () => {
    // The item is already in inventory, sell from the latest inventory entry
    try {
      const invRes = await api.get('/inventory');
      const latestItem = invRes.data.items.find(
        i => i.skin_name === wonItem.skin_name && i.status === 'in_inventory'
      );
      if (latestItem) {
        const sellRes = await api.post(`/inventory/${latestItem.id}/sell`);
        updateUser(sellRes.data.user);
      }
    } catch {
      // ignore
    }
    setShowModal(false);
  };

  if (loading) return <div className="loading-screen">Загрузка...</div>;
  if (!caseData) return null;

  return (
    <div className="case-page">
      <div className="case-header">
        <h1>{caseData.name}</h1>
        <div className="price">{caseData.price} ₽</div>
      </div>

      <div className="roulette-container">
        <div className="roulette-pointer" />
        <div
          className={`roulette-strip ${spinning ? 'spinning' : ''}`}
          ref={stripRef}
        >
          {rouletteItems.length > 0 ? rouletteItems.map((item, i) => (
            <div key={i} className={`roulette-item rarity-${item.rarity}`}>
              <img src={item.skin_image} alt={item.skin_name} />
              <div className="roulette-item-name">{item.skin_name}</div>
              <div
                className="roulette-item-rarity"
                style={{ background: RARITY_COLORS[item.rarity] || '#fff' }}
              />
            </div>
          )) : items.map((item, i) => (
            <div key={i} className={`roulette-item rarity-${item.rarity}`}>
              <img src={item.skin_image} alt={item.skin_name} />
              <div className="roulette-item-name">{item.skin_name}</div>
              <div
                className="roulette-item-rarity"
                style={{ background: RARITY_COLORS[item.rarity] || '#fff' }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="open-btn-container">
        <button
          className="open-btn"
          onClick={openCase}
          disabled={spinning || (user && user.balance < caseData.price)}
        >
          {!user
            ? 'Войдите для открытия'
            : spinning
              ? 'Крутим...'
              : user.balance < caseData.price
                ? 'Недостаточно средств'
                : `Открыть за ${caseData.price} ₽`
          }
        </button>
      </div>

      {showModal && wonItem && (
        <div className="won-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="won-modal" onClick={e => e.stopPropagation()}>
            <h2>Поздравляем!</h2>
            <img src={wonItem.skin_image} alt={wonItem.skin_name} />
            <div className="item-name" style={{ color: RARITY_COLORS[wonItem.rarity] }}>{wonItem.skin_name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              {wonItem.weapon} | {wonItem.wear}
            </div>
            <div className="item-price">{wonItem.price} ₽</div>
            <div className="won-modal-actions">
              <button className="btn btn-success" onClick={sellItem}>
                Продать за {Math.round(wonItem.price * 0.9)} ₽
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                В инвентарь
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="case-items-section">
        <h2>Содержимое кейса</h2>
        <div className="case-items-grid">
          {items.map(item => (
            <div key={item.id} className={`case-item-card rarity-${item.rarity}`}>
              <img src={item.skin_image} alt={item.skin_name} />
              <div className="name">{item.skin_name}</div>
              <div className="price">{item.price} ₽</div>
              <div className="chance">{item.chance}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
