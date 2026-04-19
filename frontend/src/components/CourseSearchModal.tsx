import { useState, useEffect, useCallback } from 'react';
import type { CourseRow } from '../types';
import { getCourses } from '../services/api';

interface Props {
  onAdd: (courseId: string, year: number, term: string) => Promise<void>;
  onClose: () => void;
  year: number;
  term: string;
}

const LEVELS = ['All', '100', '200', '300', '400', '500+'];

function ubcGradesUrl(courseId: string): string {
  const parts = courseId.trim().split(/[\s-]+/);
  if (parts.length < 2) return 'https://ubcgrades.com/statistics-by-course';
  return `https://ubcgrades.com/statistics-by-course#UBCV-${parts[0]}-${parts[1]}`;
}

export default function CourseSearchModal({ onAdd, onClose, year, term }: Props) {
  const [query, setQuery] = useState('');
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [departments, setDepartments] = useState<string[]>(['All']);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const results = await getCourses(q || undefined);
      setCourses(results);
      // Build department list from results
      const depts = new Set(results.map(c => c.dept));
      setDepartments(['All', ...[...depts].sort()]);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(query);
  }, [query, search]);

  const filteredCourses = courses.filter(c => {
    if (deptFilter !== 'All' && c.dept !== deptFilter) return false;
    if (levelFilter !== 'All') {
      const code = parseInt(c.code);
      if (levelFilter === '500+') {
        if (code < 500) return false;
      } else {
        const lvl = parseInt(levelFilter);
        if (code < lvl || code >= lvl + 100) return false;
      }
    }
    return true;
  });

  const handleAdd = async (course: CourseRow) => {
    setAdding(course.id);
    try {
      await onAdd(course.id, year, term);
    } finally {
      setAdding(null);
    }
  };

  const FilterButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="text-left px-2 py-[5px] rounded-[7px] border-none cursor-pointer text-[13px] transition-all duration-100"
      style={{
        background: active ? '#101828' : 'transparent',
        color: active ? '#fff' : '#4a5565',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#efefef'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/[0.38] flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-[14px] w-[680px] h-[560px] flex overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.2)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Left filter panel */}
        <div className="w-[160px] shrink-0 border-r border-black/[0.08] px-3 py-4 flex flex-col gap-5 overflow-y-auto bg-[#fafafa]">
          <div>
            <div className="text-[11px] font-bold text-[#9ca3af] tracking-wider mb-2 uppercase">Subject</div>
            <div className="flex flex-col gap-1">
              {departments.map(d => (
                <FilterButton key={d} label={d} active={deptFilter === d} onClick={() => setDeptFilter(d)} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#9ca3af] tracking-wider mb-2 uppercase">Level</div>
            <div className="flex flex-col gap-1">
              {LEVELS.map(lv => (
                <FilterButton
                  key={lv}
                  label={lv === 'All' ? 'All' : lv === '500+' ? '500+' : `${lv}s`}
                  active={levelFilter === lv}
                  onClick={() => setLevelFilter(lv)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-4 pb-2.5 border-b border-black/[0.07]">
            <div className="flex justify-between items-center mb-2.5">
              <span className="font-bold text-[16px] text-[#101828]">Add Course</span>
              <button onClick={onClose} className="border-none bg-none cursor-pointer text-[#6b7280] leading-none">
                <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                  <path d="M2 2l12 12M14 2L2 14" />
                </svg>
              </button>
            </div>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by code or name…"
              className="w-full h-9 rounded-lg border border-black/15 px-3 text-sm outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-2.5 py-1.5">
            {loading && (
              <p className="text-center py-8 text-[#9ca3af] text-sm">Loading...</p>
            )}
            {!loading && filteredCourses.length === 0 && (
              <p className="text-center py-8 text-[#9ca3af] text-sm">No courses found</p>
            )}
            {!loading && filteredCourses.map(course => (
              <div
                key={course.id}
                className="flex justify-between items-start rounded-lg px-2 py-2.5 cursor-pointer hover:bg-[#f5f5f5]"
              >
                <div className="flex-1 min-w-0" onClick={() => handleAdd(course)}>
                  <div className="text-[13px] font-semibold text-[#101828]">
                    {course.id}
                    <span className="font-normal text-[#9ca3af] text-[11px] ml-1.5">{course.credits}cr</span>
                  </div>
                  <div className="text-xs text-[#6b7280] mt-0.5">{course.title}</div>
                </div>
                <div className="flex gap-1.5 items-center ml-2 shrink-0">
                  <a
                    href={ubcGradesUrl(course.id)}
                    target="_blank"
                    rel="noreferrer"
                    title="View on UBCGrades"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-[10px] text-indigo-500 no-underline px-[7px] py-[3px] rounded-full border border-indigo-200 whitespace-nowrap hover:bg-indigo-50"
                  >
                    <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <path d="M7 9a3 3 0 004 0l2-2a3 3 0 00-4-4l-1 1M9 7a3 3 0 00-4 0l-2 2a3 3 0 004 4l1-1" />
                    </svg>
                    UBCGrades
                  </a>
                  <button
                    onClick={() => handleAdd(course)}
                    disabled={adding === course.id}
                    className="bg-[#101828] text-white border-none rounded-md px-2.5 py-1 text-xs cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {adding === course.id ? '...' : '+ Add'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2 border-t border-black/[0.07] text-xs text-[#9ca3af]">
            {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>
    </div>
  );
}
