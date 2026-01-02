import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          📊 Report Agent
        </Link>
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-link">
            Dashboard
          </Link>
          <Link to="/upload" className="navbar-link">
            Upload Report
          </Link>
          <Link to="/history" className="navbar-link">
            History
          </Link>
          <Link to="/formats" className="navbar-link">
            Formats
          </Link>
          <Link to="/authorities" className="navbar-link">
            Authorities
          </Link>
          <Link to="/school-lists" className="navbar-link">
            School Lists
          </Link>
          <div className="navbar-user">
            <span className="navbar-username">{user?.username}</span>
            <button onClick={handleLogout} className="navbar-logout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

