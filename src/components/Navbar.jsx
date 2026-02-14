import React, { useState } from 'react';
import './Navbar.css';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <a href="/">Easy Design</a>
        </div>
        <div className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          <a href="/" className="navbar-link">Home</a>
          <a href="/dashboard" className="navbar-link">Dashboard</a>
          <a href="/projects" className="navbar-link">Projects</a>
          <a href="/settings" className="navbar-link">Settings</a>
          <button className="navbar-logout">Logout</button>
        </div>
        <div className="navbar-toggle" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
