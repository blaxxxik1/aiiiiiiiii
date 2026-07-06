import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const RARITY_COLORS = {
  gold: '#ffd700', covert: '#eb4b4b', classified: '#d32ce6',
  restricted: '#8847ff', mil_spec: '#4b69ff', industrial: '#5e98d9', consumer: '#b0c3d9',
};

export default function InventoryPage() {
  const { updateUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInventory = () => {
    api.get('/inventory')
      .then(res => setItems(res.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadInventory(); }, []);

  const sellItem = async (id) => {
    try {
      const res = await api.post(`/inventory/${id}/sell`);
      updateUser(res.data.user);
      loadInventory();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка продажи');
    }
  };

  if (loading) return <div className="loading-screen">Загрузка...</div>;

  const activeItems = items.filter(i => i.status === 'in_inventory');
  const soldItems = items.filter(i => i.status === 'sold');

  return (
    <div>
      <h1 className="page-title">Инвентарь</h1>

      {activeItems.length === 0 && soldItems.length === 0 && (
        <div className="empty-state">
          <h3>Инвентарь пуст</h3>
          <p>Откройте кейс, чтобы получить скины!</p>
        </div>
      )}

      {activeItems.length > 0 && (
        <>
          <h2 className="section-title">В инвентаре ({activeItems.length})</h2>
          <div className="inventory-grid">
            {activeItems.map(item => (
              <div key={item.id} className={`inventory-card rarity-${item.rarity}`}
                style={{ borderBottom: `3px solid ${RARITY_COLORS[item.rarity] || '#fff'}` }}>
                <img src={item.skin_image} alt={item.skin_name} />
                <div className="name">{item.skin_name}</div>
                <div className="weapon-wear">{item.weapon} | {item.wear}</div>
                <div className="price">{item.price} ₽</div>
                <button className="btn btn-success btn-sm" onClick={() => sellItem(item.id)}>
                  Продать за {Math.round(item.price * 0.9)} ₽
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {soldItems.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: '2rem' }}>Проданные ({soldItems.length})</h2>
          <div className="inventory-grid">
            {soldItems.map(item => (
              <div key={item.id} className="inventory-card sold">
                <span className="sold-badge">Продано</span>
                <img src={item.skin_image} alt={item.skin_name} />
                <div className="name">{item.skin_name}</div>
                <div className="weapon-wear">{item.weapon} | {item.wear}</div>
                <div className="price">{item.sold_price} ₽</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
