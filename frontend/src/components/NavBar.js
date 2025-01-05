import React from 'react';
import { Link } from 'react-router-dom';

const NavBar = ({ toggleTheme }) => {
  return (
    <nav className="navbar">
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/search">Search Courses</Link></li>
        <li><Link to="/profile">Personal Profile</Link></li>
        <li><Link to="/signup">Sign Up</Link></li>
        <li><Link to="/signin">Sign In</Link></li>
        <li><button onClick={toggleTheme} className="toggle-theme-button">Toggle Theme</button></li>
      </ul>
    </nav>
  );
};

export default NavBar;