import React, { useState, useEffect } from 'react';
import './styles/App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import SignUp from './components/SignUp';
import SignIn from './components/SignIn';
import PersonalProfile from './components/PersonalProfile';
import CourseSearch from './components/CourseSearch';
import DetailedCoursePage from './components/DetailedCoursePage';
import NavBar from './components/NavBar';

const App = () => {
  const [darkTheme, setDarkTheme] = useState(false);

  const toggleTheme = () => {
    setDarkTheme(!darkTheme);
  };

  useEffect(() => {
    if (darkTheme) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [darkTheme]);

  return (
    <div className="container">
      <Router>
        <NavBar toggleTheme={toggleTheme} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/profile" element={<PersonalProfile />} />
          <Route path="/search" element={<CourseSearch />} />
          <Route path="/course/:courseCode" element={<DetailedCoursePage />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;