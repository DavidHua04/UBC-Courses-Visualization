'use client';

import { useState } from 'react';
import { ScheduledSemester, Degree, DegreeProgress } from '@/types';
import { X, Lightbulb } from 'lucide-react';

interface AIRecommendationsProps {
  semesters: ScheduledSemester[];
  degree: Degree | null;
  progress: DegreeProgress | null;
  onAddSummerSemester?: () => void;
}

interface Recommendation {
  type: 'warning' | 'suggestion' | 'info' | 'action';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function AIRecommendations({
  semesters,
  degree,
  progress,
  onAddSummerSemester,
}: AIRecommendationsProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!degree || semesters.length === 0) {
    return null;
  }

  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    // Analyze each semester
    const fallWinterSemesters = semesters.filter(
      s => s.termType === 'fall' || s.termType === 'winter'
    );
    const summerSemesters = semesters.filter(s => s.termType === 'summer');
    const fallWinterCount = fallWinterSemesters.length;
    
    // Calculate total scheduled credits
    const totalScheduledCredits = semesters.reduce(
      (sum, sem) => sum + sem.courses.reduce((s, c) => s + c.credits, 0),
      0
    );
    const remainingCredits = degree.totalCredits - totalScheduledCredits;

    // Check for semesters with less than 4 courses
    const lightSemesters = fallWinterSemesters.filter(s => s.courses.length > 0 && s.courses.length < 4);
    if (lightSemesters.length > 0) {
      lightSemesters.forEach(semester => {
        recommendations.push({
          type: 'suggestion',
          title: `Light Course Load in ${semester.term}`,
          message: `You have only ${semester.courses.length} course(s) scheduled for ${semester.term}. Consider adding more courses to stay on track for a 4-year graduation. Most students take 4-5 courses per semester.`,
        });
      });
    }

    // Check if on track for 4-year graduation
    if (fallWinterCount > 0) {
      const yearsScheduled = Math.ceil(fallWinterCount / 2);
      const creditsPerYear = yearsScheduled > 0 ? totalScheduledCredits / yearsScheduled : 0;
      const creditsNeededPerYear = 30; // 120 credits / 4 years = 30 credits per year
      
      if (yearsScheduled <= 4) {
        if (creditsPerYear < creditsNeededPerYear && remainingCredits > 0) {
          const creditsShort = (creditsNeededPerYear * yearsScheduled) - totalScheduledCredits;
          recommendations.push({
            type: 'warning',
            title: '4-Year Graduation Timeline',
            message: `To graduate in 4 years, you need to average 30 credits per year. Currently, you're averaging ${Math.round(creditsPerYear)} credits per year. You need ${Math.ceil(creditsShort)} more credits to stay on track. Consider adding more courses or summer sessions.`,
            action: summerSemesters.length === 0 && remainingCredits > 12 ? {
              label: 'Add Summer Semester',
              onClick: () => {
                if (onAddSummerSemester) {
                  onAddSummerSemester();
                }
              },
            } : undefined,
          });
        } else if (creditsPerYear >= creditsNeededPerYear && remainingCredits > 0) {
          recommendations.push({
            type: 'info',
            title: 'On Track for 4-Year Graduation',
            message: `Great! You're averaging ${Math.round(creditsPerYear)} credits per year, which puts you on track to graduate in 4 years. You have ${remainingCredits} credits remaining.`,
          });
        } else if (remainingCredits === 0) {
          recommendations.push({
            type: 'info',
            title: 'Degree Requirements Complete',
            message: `Congratulations! You've scheduled all ${degree.totalCredits} credits needed for your degree. You're on track to graduate in ${yearsScheduled} year(s).`,
          });
        }
      } else {
        // More than 4 years scheduled
        recommendations.push({
          type: 'warning',
          title: 'Extended Graduation Timeline',
          message: `You've scheduled ${fallWinterCount} fall/winter semesters (${yearsScheduled} years). To graduate in 4 years, you should aim for 8 fall/winter semesters. Consider adding more courses per semester or summer sessions.`,
        });
      }
    }

    // Check for empty semesters
    const emptySemesters = semesters.filter(s => s.courses.length === 0);
    if (emptySemesters.length > 0 && semesters.length > 1) {
      recommendations.push({
        type: 'suggestion',
        title: 'Empty Semesters',
        message: `You have ${emptySemesters.length} semester(s) without courses: ${emptySemesters.map(s => s.term).join(', ')}. Consider removing them or planning courses for those terms to optimize your schedule.`,
      });
    }

    // General helpful message if no specific recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'info',
        title: 'Schedule Looking Good!',
        message: 'Your schedule appears well-balanced for a 4-year graduation plan. Continue adding courses to complete your degree requirements. Remember to check prerequisites and course availability.',
      });
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  if (!isOpen || recommendations.length === 0) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-ubc-blue text-white p-3 rounded-full shadow-lg hover:bg-ubc-blue-dark transition-colors z-50"
        title="Show Recommendations"
      >
        <Lightbulb className="w-6 h-6" />
      </button>
    );
  }

  const getTypeStyles = (type: Recommendation['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'suggestion':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'info':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'action':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl border-2 border-ubc-blue z-50 max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-ubc-blue text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            <h3 className="font-bold text-lg">Smart Recommendations</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-ubc-gold-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${getTypeStyles(rec.type)}`}
            >
              <h4 className="font-semibold mb-2">{rec.title}</h4>
              <p className="text-sm mb-3">{rec.message}</p>
              {rec.action && (
                <button
                  onClick={rec.action.onClick}
                  className="text-sm font-medium underline hover:no-underline"
                >
                  {rec.action.label} →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

