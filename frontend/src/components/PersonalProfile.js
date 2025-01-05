import React, { useState } from 'react';
import { courses } from '../coursesData';
import '../styles/PersonalProfile.css';

const PersonalProfile = () => {
  const [major, setMajor] = useState('');
  const [savedMajor, setSavedMajor] = useState('');
  const [courseHistory, setCourseHistory] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [newHistoryCourse, setNewHistoryCourse] = useState('');
  const [newHistoryGrade, setNewHistoryGrade] = useState('');
  const [newWishlistCourse, setNewWishlistCourse] = useState('');
  const [addingToHistory, setAddingToHistory] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [wishlistError, setWishlistError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSavedMajor(major);
  };

  const addCourseToHistory = () => {
    const course = courses.find(c => `${c.department} ${c.course_code}` === newHistoryCourse);
    if (!course) {
      setHistoryError('Invalid course code');
      return;
    }
    if (newHistoryGrade === '') {
      setHistoryError('Grade cannot be empty');
      return;
    }
    if (newHistoryGrade < 0 || newHistoryGrade > 100) {
      setHistoryError('Grade must be between 0 and 100');
      return;
    }
    if (courseHistory.some(course => course.code === newHistoryCourse)) {
      setHistoryError('Course already added to history');
      return;
    }
    setCourseHistory([...courseHistory, { code: newHistoryCourse, grade: newHistoryGrade }]);
    setNewHistoryCourse('');
    setNewHistoryGrade('');
    setAddingToHistory(false);
    setHistoryError('');
  };

  const addCourseToWishlist = () => {
    const course = courses.find(c => `${c.department} ${c.course_code}` === newWishlistCourse);
    if (!course) {
      setWishlistError('Invalid course code');
      return;
    }
    if (wishlist.includes(newWishlistCourse)) {
      setWishlistError('Course already added to wishlist');
      return;
    }
    setWishlist([...wishlist, newWishlistCourse]);
    setNewWishlistCourse('');
    setAddingToWishlist(false);
    setWishlistError('');
  };

  const removeCourseFromHistory = (courseCode) => {
    setCourseHistory(courseHistory.filter(course => course.code !== courseCode));
  };

  const removeFromWishlist = (courseCode) => {
    setWishlist(wishlist.filter(course => course !== courseCode));
  };

  return (
    <div className="profile-container">
      <div className="header">
        <h1 className="profile-title">Personal Profile</h1>
        <div className="major-section">
          <form onSubmit={handleSubmit}>
            <label>
              Major:
              <input 
                type="text" 
                value={major} 
                onChange={(e) => setMajor(e.target.value)} 
              />
            </label>
            <button type="submit">Save Major</button>
            <div className="current-status">
              <p><strong>Major:</strong> {savedMajor || 'Not set'}</p>
            </div>
          </form>
        </div>
      </div>
      <div className="course-section">
        <div className="course-history">
          <h2>Course History</h2>
          <ul>
            {courseHistory.map((course, index) => (
              <li key={index}>
                {course.code} - Grade: {course.grade}
                <button onClick={() => removeCourseFromHistory(course.code)}>Remove</button>
              </li>
            ))}
          </ul>
          {addingToHistory ? (
            <div className="add-course-form">
              <input
                type="text"
                value={newHistoryCourse}
                onChange={(e) => setNewHistoryCourse(e.target.value)}
                placeholder="Enter course code"
              />
              <input
                type="number"
                value={newHistoryGrade}
                onChange={(e) => setNewHistoryGrade(e.target.value)}
                placeholder="Enter grade"
                min="0"
                max="100"
              />
              {historyError && <p className="error-message">{historyError}</p>}
              <div className="add-course-buttons">
                <button onClick={addCourseToHistory}>Add</button>
                <button onClick={() => setAddingToHistory(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="add-course-button" onClick={() => setAddingToHistory(true)}>Add Course</button>
          )}
        </div>
        <div className="wishlist">
          <h2>Wishlist</h2>
          <ul>
            {wishlist.map((course, index) => (
              <li key={index}>
                {course}
                <button onClick={() => removeFromWishlist(course)}>Remove</button>
              </li>
            ))}
          </ul>
          {addingToWishlist ? (
            <div className="add-course-form">
              <input
                type="text"
                value={newWishlistCourse}
                onChange={(e) => setNewWishlistCourse(e.target.value)}
                placeholder="Enter course code"
              />
              {wishlistError && <p className="error-message">{wishlistError}</p>}
              <div className="add-course-buttons">
                <button onClick={addCourseToWishlist}>Add</button>
                <button onClick={() => setAddingToWishlist(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="add-course-button" onClick={() => setAddingToWishlist(true)}>Add Course</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalProfile;