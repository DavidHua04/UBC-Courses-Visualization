'use client';

import React, { useState } from 'react';
import ScheduleBuilder from '@/components/ScheduleBuilder';
import CourseSearcher from '@/components/CourseSearcher';
import ProgressPopup from '@/components/ProgressPopup';
import AIRecommendations from '@/components/AIRecommendations';
import { Degree, ScheduledSemester, Course } from '@/types';
import { calculateProgress } from '@/utils/progress';
import { getCombinedDegree } from '@/utils/requirements';
import { faculties } from '@/data/faculties';
import { BarChart3 } from 'lucide-react';

export default function Home() {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Degree | null>(null);
  const [semesters, setSemesters] = useState<ScheduledSemester[]>([]);
  const [showProgressPopup, setShowProgressPopup] = useState(false);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [transferCredits, setTransferCredits] = useState<Set<string>>(new Set());

  // Recalculate selectedFaculty whenever selectedFacultyId changes
  const selectedFaculty = selectedFacultyId 
    ? faculties.find(f => f.id === selectedFacultyId)
    : null;

  // Sort programs by type: Majors -> Honours -> Combined Majors -> Combined Honours -> Others
  const getProgramSortOrder = (name: string): number => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('combined major')) {
      return 3;
    } else if (lowerName.includes('combined honours')) {
      return 4;
    } else if (lowerName.includes('honours')) {
      return 2;
    } else if (lowerName.includes('major') || (!lowerName.includes('minor') && !lowerName.includes('combined'))) {
      return 1;
    } else {
      return 5; // Minors and others
    }
  };

  // Filter and sort programs - recalculated whenever selectedFacultyId changes
  const filteredPrograms = React.useMemo(() => {
    if (!selectedFaculty || !selectedFacultyId) return [];
    
    const programs = selectedFaculty.programs;
    
    // First pass: filter out course requirements and generic programs
    const filtered = programs.filter(program => {
      const name = program.name.toLowerCase();
      
      // Exclude course requirements (course codes, credit requirements, etc.)
      if (
        // Course codes like "CPSC 110", "MATH 200"
        /^[A-Z]{2,6}\s+\d{3}/.test(program.name) ||
        // "One of X, Y, or Z" patterns (course options)
        name.startsWith('one of') ||
        // Credit requirements like "9 Credits of...", "6 Credits of..."
        /^\d+\s+credits?\s+of/i.test(program.name) ||
        // "X Credits" at the start
        /^\d+\s+credits?$/i.test(program.name.trim())
      ) {
        return false;
      }
      
      // Exclude generic programs without specific subjects
      if (
        program.name === 'Major' ||
        program.name === 'Honours' ||
        program.name === 'Combined Major Specializations' ||
        program.name === 'Combined Honours Specializations' ||
        program.name === 'Majors Areas of Concentration Required Courses' ||
        program.name === 'Honours Areas of Concentration Required Courses'
      ) {
        return false;
      }
      
      return true;
    });
    
    // Second pass: prefer specific versions over generic ones
    // For Science: prefer "Major (code): Computer Science" over "Computer Science"
    // For Arts: prefer "Major in Economics" or numbered versions over just "Economics"
    const deduplicated = filtered.filter((program, index, self) => {
      const name = program.name.toLowerCase();
      
      // Check for generic program names that might have specific versions
      const genericNames = ['computer science', 'economics'];
      if (genericNames.includes(name)) {
        // Check if there's a more specific version that directly matches the subject
        // e.g., "Major in Economics" or "Major (code): Computer Science"
        const hasSpecificVersion = self.some(p => {
          if (p.id === program.id) return false;
          const pName = p.name.toLowerCase();
          // Must be a direct match: "Major in Economics" or "Major (code): Computer Science"
          // Not just any program containing the word
          return (pName === `major in ${name}` || 
                  pName === `honours in ${name}` ||
                  pName.startsWith(`major (`) && pName.includes(name) ||
                  pName.startsWith(`honours (`) && pName.includes(name));
        });
        // If there's a specific version, exclude the generic one
        if (hasSpecificVersion) {
          return false;
        }
      }
      return true;
    });
    
    // Sort the filtered programs
    return [...deduplicated].sort((a, b) => {
      const orderA = getProgramSortOrder(a.name);
      const orderB = getProgramSortOrder(b.name);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same type, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [selectedFaculty, selectedFacultyId]);

  const handleFacultyChange = (facultyId: string) => {
    // Reset all state when changing faculty
    setSelectedFacultyId(facultyId);
    setSelectedProgram(null);
    setSemesters([]);
    setActiveSemesterId(null);
    setTransferCredits(new Set());
    setShowProgressPopup(false);
  };

  const handleProgramChange = (programId: string) => {
    if (!selectedFacultyId || !selectedFaculty) return;
    
    // Always find program from the current faculty's programs (not from filtered list to avoid stale data)
    const program = selectedFaculty.programs.find(p => p.id === programId);
    setSelectedProgram(program || null);
    setSemesters([]);
    setActiveSemesterId(null);
  };

  const handleAddCourse = (semesterId: string, course: Course) => {
    const updatedSemesters = semesters.map(sem => {
      if (sem.id === semesterId) {
        // Check if course already exists
        if (sem.courses.some(c => c.code === course.code)) {
          return sem;
        }
        return {
          ...sem,
          courses: [...sem.courses, course],
        };
      }
      return sem;
    });
    setSemesters(updatedSemesters);
  };

  const handleTransferCreditToggle = (requirementId: string, hasTransferCredit: boolean) => {
    setTransferCredits(prev => {
      const newSet = new Set(prev);
      if (hasTransferCredit) {
        newSet.add(requirementId);
      } else {
        newSet.delete(requirementId);
      }
      return newSet;
    });
  };

  const handleAddSummerSemester = () => {
    const currentYear = new Date().getFullYear();
    const newSemester: ScheduledSemester = {
      id: `sem-${Date.now()}`,
      term: `S1 ${currentYear}`,
      year: currentYear,
      termType: 'summer',
      courses: [],
    };
    setSemesters([newSemester, ...semesters]);
    setActiveSemesterId(newSemester.id);
  };

  // Combine faculty and program requirements
  const combinedProgram = selectedProgram && selectedFaculty
    ? getCombinedDegree(selectedFaculty, selectedProgram)
    : null;

  const progress = combinedProgram
    ? calculateProgress(combinedProgram, semesters, transferCredits)
    : null;

  return (
    <main className="min-h-screen bg-white">
      {/* Header - Full Width */}
      <div className="bg-ubc-blue text-white shadow-lg w-full">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold mb-2">UBC Degree Planner</h1>
          <p className="text-ubc-gold-light">
            Build your course schedule and track your degree progress
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Degree Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Your Degree</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Faculty Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faculty
              </label>
              <select
                value={selectedFacultyId || ''}
                onChange={(e) => handleFacultyChange(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-ubc-blue focus:border-ubc-blue text-black bg-white"
              >
                <option value="">Select Faculty</option>
                {faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Program Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Program
              </label>
              <select
                key={selectedFacultyId || 'no-faculty'}
                value={selectedProgram?.id || ''}
                onChange={(e) => handleProgramChange(e.target.value)}
                disabled={!selectedFacultyId}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-ubc-blue focus:border-ubc-blue text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Program</option>
                {filteredPrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProgram && (
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Selected:</span> {selectedProgram.description} - {selectedProgram.name}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        {combinedProgram && <div className="border-t border-gray-500 my-8"></div>}

        {/* Main Content */}
        {combinedProgram && (
          <>
            {/* Action Bar */}
            <div className="mb-6 flex justify-end">
              {progress && (
                <button
                  onClick={() => setShowProgressPopup(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-ubc-blue text-white rounded-lg hover:bg-ubc-blue-dark transition-colors font-semibold shadow-md"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>View Progress</span>
                </button>
              )}
            </div>

            {/* Two-column layout */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Schedule Builder */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <ScheduleBuilder
                  semesters={semesters}
                  onSemestersChange={setSemesters}
                  degree={combinedProgram}
                  activeSemesterId={activeSemesterId}
                  onActiveSemesterChange={setActiveSemesterId}
                />
              </div>

              {/* Right: Course Searcher */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <CourseSearcher
                  degree={combinedProgram}
                  activeSemesterId={activeSemesterId}
                  onAddCourse={handleAddCourse}
                />
              </div>
            </div>

            {/* Progress Popup */}
            {progress && (
              <ProgressPopup
                progress={progress}
                isOpen={showProgressPopup}
                onClose={() => setShowProgressPopup(false)}
                onTransferCreditToggle={handleTransferCreditToggle}
                transferCredits={transferCredits}
                semesters={semesters}
              />
            )}

            {/* AI Recommendations */}
            <AIRecommendations
              semesters={semesters}
              degree={combinedProgram}
              progress={progress}
              onAddSummerSemester={handleAddSummerSemester}
            />
          </>
        )}

        {!combinedProgram && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              Please select a faculty and program above to start building your schedule
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
