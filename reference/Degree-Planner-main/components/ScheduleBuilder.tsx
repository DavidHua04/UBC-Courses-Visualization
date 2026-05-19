'use client';

import { useState } from 'react';
import { ScheduledSemester, Course, Degree } from '@/types';
import { Plus, Trash2, X } from 'lucide-react';

interface ScheduleBuilderProps {
  semesters: ScheduledSemester[];
  onSemestersChange: (semesters: ScheduledSemester[]) => void;
  degree: Degree;
  activeSemesterId: string | null;
  onActiveSemesterChange: (semesterId: string | null) => void;
}

export default function ScheduleBuilder({
  semesters,
  onSemestersChange,
  degree,
  activeSemesterId,
  onActiveSemesterChange,
}: ScheduleBuilderProps) {
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [newSemesterYear, setNewSemesterYear] = useState(new Date().getFullYear());
  const [newSemesterType, setNewSemesterType] = useState<'fall' | 'winter' | 'summer'>('winter');
  const [newSemesterSession, setNewSemesterSession] = useState(1);

  const addSemester = () => {
    const termPrefix = newSemesterType === 'fall' ? 'F' : newSemesterType === 'winter' ? 'W' : 'S';
    const termLabel = `${termPrefix}${newSemesterSession} ${newSemesterYear}`;

    const newSemester: ScheduledSemester = {
      id: `sem-${Date.now()}`,
      term: termLabel,
      year: newSemesterYear,
      termType: newSemesterType,
      courses: [],
    };

    onSemestersChange([newSemester, ...semesters]);
    setShowAddSemester(false);
    onActiveSemesterChange(newSemester.id);
  };

  const removeSemester = (semesterId: string) => {
    onSemestersChange(semesters.filter(s => s.id !== semesterId));
    if (activeSemesterId === semesterId) {
      onActiveSemesterChange(null);
    }
  };


  const removeCourseFromSemester = (semesterId: string, courseCode: string) => {
    const updatedSemesters = semesters.map(sem => {
      if (sem.id === semesterId) {
        return {
          ...sem,
          courses: sem.courses.filter(c => c.code !== courseCode),
        };
      }
      return sem;
    });
    onSemestersChange(updatedSemesters);
  };

  const sortedSemesters = [...semesters].sort((a, b) => {
    // Sort by year descending (latest first), then by term type
    if (a.year !== b.year) return b.year - a.year;
    const order = { fall: 0, winter: 1, summer: 2 };
    return order[a.termType] - order[b.termType];
  });

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Schedule Builder</h2>
        <button
          onClick={() => setShowAddSemester(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ubc-blue text-white rounded-lg hover:bg-ubc-blue-dark transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add Semester
        </button>
      </div>

      {showAddSemester && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-ubc-blue border-opacity-30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">New Semester</h3>
            <button
              onClick={() => setShowAddSemester(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Term Type
              </label>
              <select
                value={newSemesterType}
                onChange={(e) => setNewSemesterType(e.target.value as 'fall' | 'winter' | 'summer')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ubc-blue focus:border-ubc-blue text-black bg-white"
              >
                <option value="winter">Winter (W)</option>
                <option value="summer">Summer (S)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session
              </label>
              <select
                value={newSemesterSession}
                onChange={(e) => setNewSemesterSession(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ubc-blue focus:border-ubc-blue text-black bg-white"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <input
                type="number"
                value={newSemesterYear}
                onChange={(e) => setNewSemesterYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ubc-blue focus:border-ubc-blue text-black"
                min="2020"
                max="2030"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addSemester}
                className="w-full px-4 py-2 bg-ubc-blue text-white rounded-lg hover:bg-ubc-blue-dark transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedSemesters.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No semesters added yet.</p>
            <p className="text-sm mt-2">Click "Add Semester" to get started.</p>
          </div>
        ) : (
          sortedSemesters.map((semester) => (
            <div
              key={semester.id}
              className="border-2 border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 
                    className={`text-lg font-semibold cursor-pointer ${
                      activeSemesterId === semester.id 
                        ? 'text-ubc-blue underline' 
                        : 'text-gray-900'
                    }`}
                    onClick={() => onActiveSemesterChange(semester.id)}
                  >
                    {semester.term}
                  </h3>
                  <span className="text-sm text-gray-600">
                    {semester.courses.length} course{semester.courses.length !== 1 ? 's' : ''} •{' '}
                    {semester.courses.reduce((sum, c) => sum + c.credits, 0)} credits
                  </span>
                  {activeSemesterId === semester.id && (
                    <span className="text-xs bg-ubc-blue bg-opacity-10 text-ubc-blue px-2 py-1 rounded border border-ubc-blue border-opacity-20">
                      Active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeSemester(semester.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove semester"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Courses in Semester */}
              <div className="space-y-2">
                {semester.courses.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No courses added</p>
                ) : (
                  semester.courses.map((course) => (
                    <div
                      key={course.code}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{course.code}</div>
                        <div className="text-sm text-gray-600">{course.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {course.credits} credits
                        </div>
                      </div>
                      <button
                        onClick={() => removeCourseFromSemester(semester.id, course.code)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Remove course"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

