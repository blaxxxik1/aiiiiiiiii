import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function HomePage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/cases')
      .then(res => setCases(res.data.cases))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen">Загрузка кейсов...</div>;

  return (
    <div>
      <div className="hero">
        <h1>Открывай кейсы CS2</h1>
        <p>Испытай удачу и получи лучшие скины Counter-Strike 2. Пополняй баланс через СБП и открывай кейсы!</p>
      </div>

      <h2 className="section-title">Доступные кейсы</h2>
      <div className="cases-grid">
        {cases.map(c => (
          <Link to={`/case/${c.id}`} key={c.id} className="case-card">
            {c.category !== 'standard' && (
              <span className={`case-card-category ${c.category}`}>
                {c.category === 'premium' ? 'Премиум' : 'Оружие'}
              </span>
            )}
            <img src={c.image} alt={c.name} className="case-card-image" />
            <div className="case-card-info">
              <div className="case-card-name">{c.name}</div>
              <div className="case-card-price">{c.price} ₽</div>
            </div>
          </Link>
        ))}
      </div>

      {cases.length === 0 && (
        <div className="empty-state">
          <h3>Кейсы скоро появятся</h3>
          <p>Администратор ещё не добавил кейсы</p>
        </div>
      )}
    </div>
  );
}
