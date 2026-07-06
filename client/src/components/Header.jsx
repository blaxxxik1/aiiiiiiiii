import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <header className="header">
      <Link to="/" className="header-logo">
        <span>CS2 CASES</span>
      </Link>

      <nav className="header-nav">
        <Link to="/" className={isActive('/')}>Кейсы</Link>
        {user && <Link to="/inventory" className={isActive('/inventory')}>Инвентарь</Link>}
        {user && <Link to="/deposit" className={isActive('/deposit')}>Пополнить</Link>}
        {user && <Link to="/profile" className={isActive('/profile')}>Профиль</Link>}
        {user?.role === 'admin' && <Link to="/admin" className={isActive('/admin')}>Админ</Link>}
      </nav>

      <div className="header-actions">
        {user ? (
          <>
            <Link to="/deposit" className="balance-badge">
              {Number(user.balance).toFixed(0)} ₽
            </Link>
            <Link to="/profile" className="btn btn-secondary btn-sm">{user.username}</Link>
            <button onClick={logout} className="btn btn-secondary btn-sm">Выйти</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary btn-sm">Войти</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Регистрация</Link>
          </>
        )}
      </div>
    </header>
  );
}
