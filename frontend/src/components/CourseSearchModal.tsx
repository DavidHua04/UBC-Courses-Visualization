import { useState, useEffect, useCallback } from 'react';
import type { CourseRow } from '../types';
import { TERM_LABELS } from '../types';
import { getCourses } from '../services/api';

interface Props {
  planId: string;
  onAdd: (courseId: string, year: number, term: string) => Promise<void>;
  onClose: () => void;
}

export default function CourseSearchModal({ onAdd, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(1);
  const [selectedTerm, setSelectedTerm] = useState('W1');
  const [adding, setAdding] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const results = await getCourses(q || undefined);
      setCourses(results.slice(0, 20));
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(query);
  }, [query, search]);

  const handleAdd = async (course: CourseRow) => {
    setAdding(course.id);
    try {
      await onAdd(course.id, selectedYear, selectedTerm);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Course</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-4 border-b space-y-3">
          <input
            type="text"
            placeholder="Search courses (e.g. CPSC 110, algorithms...)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Year</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              >
                {[1, 2, 3, 4, 5].map(y => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Term</label>
              <select
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              >
                {Object.entries(TERM_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          )}
          {!loading && courses.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">No courses found</div>
          )}
          {!loading && courses.map(course => (
            <div
              key={course.id}
              className="p-4 border-b last:border-b-0 flex items-start justify-between hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{course.id}</span>
                  <span className="text-xs text-gray-400">{course.credits} credits</span>
                </div>
                <p className="text-sm text-gray-600 truncate">{course.title}</p>
                {course.termsOffered.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Offered: {course.termsOffered.join(', ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleAdd(course)}
                disabled={adding === course.id}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs px-3 py-1.5 rounded-lg"
              >
                {adding === course.id ? '...' : '+ Add'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
