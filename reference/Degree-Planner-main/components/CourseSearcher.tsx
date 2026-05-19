'use client';

import { useState, useEffect } from 'react';
import { Course } from '@/types';
import { Search, BookOpen, Plus, ChevronDown } from 'lucide-react';
import { courses } from '@/data/courses';

interface CourseSearcherProps {
  degree?: any;
  activeSemesterId: string | null;
  onAddCourse: (semesterId: string, course: Course) => void;
}

export default function CourseSearcher({ degree, activeSemesterId, onAddCourse }: CourseSearcherProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(10);

  // Extract course level from course code (e.g., "CPSC 110" -> 100, "MATH 200" -> 200)
  const getCourseLevel = (code: string): number => {
    const match = code.match(/\s+(\d+)/);
    if (match) {
      const courseNumber = parseInt(match[1], 10);
      // Round down to nearest 100 (110 -> 100, 200 -> 200, 500 -> 500)
      return Math.floor(courseNumber / 100) * 100;
    }
    // If no number found, put it at the end (level 9999)
    return 9999;
  };
  
  // Filter courses based on search and exclude level 0 courses
  const allFilteredCourses = courses.filter(course => {
    // Exclude courses that start with level 0 (000, 001, 002, etc.)
    const courseLevel = getCourseLevel(course.code);
    if (courseLevel === 0) {
      return false;
    }
    
    // Filter by search query
    return course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
           course.name.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  // Sort courses by level (100, 200, 300, etc.), then alphabetically by code
  const sortedCourses = [...allFilteredCourses].sort((a, b) => {
    const levelA = getCourseLevel(a.code);
    const levelB = getCourseLevel(b.code);
    
    // First sort by level
    if (levelA !== levelB) {
      return levelA - levelB;
    }
    
    // If same level, sort alphabetically by course code
    return a.code.localeCompare(b.code);
  });
  
  // Limit to displayCount results for display
  const filteredCourses = sortedCourses.slice(0, displayCount);

  // Reset display count when search query changes
  useEffect(() => {
    setDisplayCount(10);
  }, [searchQuery]);

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 10);
  };

  const hasMore = sortedCourses.length > displayCount;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Search</h2>
        {activeSemesterId ? (
          <p className="text-sm text-ubc-blue mb-4 font-medium">✓ Semester active - Click + to add courses</p>
        ) : (
          <p className="text-sm text-gray-500 mb-4">Click a semester on the left to start adding courses</p>
        )}
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by course code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ubc-blue focus:border-ubc-blue text-black placeholder-gray-500"
          />
        </div>
      </div>

      {/* Course List */}
      <div className="flex-1 overflow-y-auto">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No courses found</p>
            <p className="text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-ubc-blue hover:bg-ubc-blue hover:bg-opacity-5 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-ubc-blue" />
                      <span className="font-semibold text-black text-lg">{course.code}</span>
                      <span className="text-sm text-gray-600">({course.credits} credit{course.credits !== 1 ? 's' : ''})</span>
                    </div>
                    <div className="text-sm text-black mb-2">{course.name}</div>
                    
                    {course.prerequisites && course.prerequisites.courses.length > 0 && (
                      <div className="text-xs text-gray-700 mb-1">
                        <span className="font-medium">Prerequisites:</span> {course.prerequisites.type === 'all' ? 'All of' : 'One of'} {course.prerequisites.courses.join(', ')}
                      </div>
                    )}
                    
                    {course.corequisites && course.corequisites.courses.length > 0 && (
                      <div className="text-xs text-gray-700 mb-1">
                        <span className="font-medium">Corequisites:</span> {course.corequisites.type === 'all' ? 'All of' : 'One of'} {course.corequisites.courses.join(', ')}
                      </div>
                    )}
                    
                    {course.description && (
                      <div className="text-xs text-gray-600 mt-1 italic">
                        {course.description}
                      </div>
                    )}
                  </div>
                  
                  {activeSemesterId ? (
                    <button
                      onClick={() => onAddCourse(activeSemesterId, course)}
                      className="ml-3 p-2 bg-ubc-blue text-white rounded-lg hover:bg-ubc-blue-dark transition-colors shadow-md"
                      title="Add to active semester"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="ml-3 text-xs text-gray-500 text-center">
                      Click a semester<br />to activate
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 space-y-2">
        <div className="text-xs text-gray-500 text-center">
          Showing {filteredCourses.length} of {sortedCourses.length} course{sortedCourses.length !== 1 ? 's' : ''}
        </div>
        {hasMore && (
          <button
            onClick={handleLoadMore}
            className="w-full py-2 px-4 bg-ubc-blue text-white rounded-lg hover:bg-ubc-blue-dark transition-colors shadow-md flex items-center justify-center gap-2 font-medium"
          >
            <ChevronDown className="w-4 h-4" />
            Show More
          </button>
        )}
      </div>
    </div>
  );
}

