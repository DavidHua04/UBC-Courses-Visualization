import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoMdArrowDropdown } from 'react-icons/io';
import { courses } from '../coursesData';
import '../styles/CourseSearch.css';

const CourseSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [courseDepts, setCourseDepts] = useState([]);
  const [courseLevels, setCourseLevels] = useState([]);
  const [selectedDeptFilters, setSelectedDeptFilters] = useState([]);
  const [selectedLevelFilters, setSelectedLevelFilters] = useState([]);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const term = params.get('search') || '';
    const depts = params.get('depts') ? params.get('depts').split(',') : [];
    const levels = params.get('levels') ? params.get('levels').split(',') : [];

    setSearchTerm(term);
    setSelectedDeptFilters(depts);
    setSelectedLevelFilters(levels);

    if (term) {
      const filteredCourses = courses.filter(course => 
        `${course.department} ${course.course_code}`.toLowerCase().includes(term.toLowerCase()) || 
        course.course_name.toLowerCase().includes(term.toLowerCase())
      );
      setResults(filteredCourses);
    }
  }, [location.search]);

  useEffect(() => {
    const uniqueDepts = Array.from(new Set(results.map(course => course.department)));
    const uniqueLevels = Array.from(new Set(results.map(course => course.course_code.toString()[0]))).sort();

    setCourseDepts(uniqueDepts);
    setCourseLevels(uniqueLevels);
  }, [results]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedDeptFilters.length > 0) params.set('depts', selectedDeptFilters.join(','));
    if (selectedLevelFilters.length > 0) params.set('levels', selectedLevelFilters.join(','));

    navigate(`?${params.toString()}`);

    const filteredCourses = courses.filter(course => 
      `${course.department} ${course.course_code}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
      course.course_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setResults(filteredCourses);
  };

  const handleDeptFilterChange = (dept) => {
    setSelectedDeptFilters((prevFilters) =>
      prevFilters.includes(dept)
        ? prevFilters.filter(filter => filter !== dept)
        : [...prevFilters, dept]
    );
  };

  const handleLevelFilterChange = (level) => {
    setSelectedLevelFilters((prevFilters) =>
      prevFilters.includes(level)
        ? prevFilters.filter(filter => filter !== level)
        : [...prevFilters, level]
    );
  };

  const handleCourseClick = (courseCode) => {
    navigate(`/course/${courseCode}`);
  };

  const filteredResults = results.filter(course => {
    const dept = course.department;
    const level = course.course_code.toString()[0];
    return (selectedDeptFilters.length === 0 || selectedDeptFilters.includes(dept)) &&
           (selectedLevelFilters.length === 0 || selectedLevelFilters.includes(level));
  });

  return (
    <div className="course-search-container">
      <h1>Course Search</h1>
      <div className="search-bar">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for courses"
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      
      {results.length > 0 && (
        <div className="filter-container">
          <p>Filter By:</p>
          <div className="dropdown">
            <div className="dropdown-box">
              <button onClick={() => setShowDeptDropdown(!showDeptDropdown)}>
                <span>Department</span>
                <IoMdArrowDropdown className='dropdown-icon' />
              </button>
            </div>
            {showDeptDropdown && (
              <div className="dropdown-content">
                {courseDepts.map((dept) => (
                  <label key={dept}>
                    <input
                      type="checkbox"
                      value={dept}
                      onChange={() => handleDeptFilterChange(dept)}
                      checked={selectedDeptFilters.includes(dept)}
                    />
                    {dept}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="dropdown">
            <div className="dropdown-box">
              <button onClick={() => setShowLevelDropdown(!showLevelDropdown)}>
                <span>Course Level</span>
                <IoMdArrowDropdown className='dropdown-icon' />
              </button>
            </div>
            {showLevelDropdown && (
              <div className="dropdown-content">
                {courseLevels.map((level) => (
                  <label key={level}>
                    <input
                      type="checkbox"
                      value={level}
                      onChange={() => handleLevelFilterChange(level)}
                      checked={selectedLevelFilters.includes(level)}
                    />
                    {level}00
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="course-results">
        {filteredResults.map(course => (
          <div className="course-item" key={`${course.department} ${course.course_code}`} onClick={() => handleCourseClick(`${course.department} ${course.course_code}`)}>
            <h2>{course.course_name} ({course.department} {course.course_code})</h2>
            <p>{course.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseSearch;