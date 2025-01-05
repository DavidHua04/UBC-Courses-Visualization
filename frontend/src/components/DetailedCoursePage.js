import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { courses } from '../coursesData';
import '../styles/DetailedCoursePage.css';

const DetailedCoursePage = () => {
  const { courseCode } = useParams();
  const course = courses.find(c => `${c.department} ${c.course_code}` === courseCode);
  const [prerequisites, setPrerequisites] = useState([]);

  if (!course) {
    return <div>Course not found</div>;
  }

  const handleVisualize = () => {
    setPrerequisites(course.prerequisites ? [course.prerequisites] : []);
  };

  return (
    <div className="detailed-course-container">
      <h1>{course.course_name} ({course.department} {course.course_code})</h1>
      <p>{course.description}</p>
      <h2>Credits: {course.credits}</h2>
      <h3>Prerequisites</h3>
      <ul>
        {course.prerequisites ? <li>{course.prerequisites}</li> : <li>None</li>}
      </ul>
      <h3>Corequisites</h3>
      <ul>
        {course.corequisites ? <li>{course.corequisites}</li> : <li>None</li>}
      </ul>
      <button onClick={handleVisualize}>Visualize Prerequisites</button>
      {prerequisites.length > 0 && (
        <div className="prerequisites-container">
          <h2>Prerequisites</h2>
          <ul>
            {prerequisites.map((prerequisite, index) => (
              <li key={index}>{prerequisite}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DetailedCoursePage;