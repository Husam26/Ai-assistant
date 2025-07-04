import React from 'react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-icon" role="img" aria-label="robot-icon">🤖</span>
        <span className="assistant-name">Nova</span>
      </div>
      {/* You can add more links or buttons here in the future */}
    </nav>
  );
};

export default Navbar;
