import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  const navigate = useNavigate();

  const handleBoxClick = (path) => {
    navigate(path);
  };

  return (
    <div className="home-container">
      <h1>Welcome to (insert website name)</h1>
      <p className="home-description">
      (insert website name) is your go-to platform for exploring courses offered at the University of British Columbia. 
        Our website allows you to search for courses, visualize prerequisites, and manage your course history and wishlist.
      </p>

      <div className="home-grid">
        <div className="home-box" onClick={() => handleBoxClick('/signin')}>
          <h2>Sign In</h2>
          <p>Access your account to manage your course history and wishlist.</p>
        </div>
        <div className="home-box" onClick={() => handleBoxClick('/signup')}>
          <h2>Sign Up</h2>
          <p>Create a new account to start exploring and managing courses.</p>
        </div>
        <div className="home-box" onClick={() => handleBoxClick('/search')}>
          <h2>Course Search</h2>
          <p>Find detailed information about any course offered at UBC.</p>
        </div>
        <div className="home-box" onClick={() => handleBoxClick('/profile')}>
          <h2>Personal Profile</h2>
          <p>Manage your course history and wishlist to keep track of your academic progress.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;