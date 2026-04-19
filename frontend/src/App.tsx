import { useState, useEffect, useCallback } from 'react';
import type { PlanSummary, PlanWithEntries, CourseRow, AcademicGoal, EntryRow } from './types';
import { getPlans, createPlan, deletePlan, getPlan, getCourses, seedCourses, deleteEntry } from './services/api';
import Sidebar from './components/Sidebar';
import PlanBoard from './components/PlanBoard';
import UploadModal from './components/UploadModal';

export default function App() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanWithEntries | null>(null);
  const [courseMap, setCourseMap] = useState<Map<string, CourseRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [goals, setGoals] = useState<AcademicGoal[]>([
    { id: '1', name: 'Computer Science Major', satisfied: false },
    { id: '2', name: 'Graduate in 4 Years', satisfied: false },
  ]);

  const loadPlans = useCallback(async () => {
    const data = await getPlans();
    setPlans(data);
    return data;
  }, []);

  const loadCourses = useCallback(async () => {
    const courses = await getCourses();
    const map = new Map<string, CourseRow>();
    courses.forEach(c => map.set(c.id, c));
    setCourseMap(map);
    return courses;
  }, []);

  const loadPlan = useCallback(async (id: string) => {
    const data = await getPlan(id);
    setPlan(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const [plansData] = await Promise.all([loadPlans(), loadCourses()]);
        if (plansData.length > 0) {
          setSelectedPlanId(plansData[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadPlans, loadCourses]);

  useEffect(() => {
    if (!selectedPlanId) {
      setPlan(null);
      return;
    }
    loadPlan(selectedPlanId).catch(err => {
      console.error('Failed to load plan:', err);
    });
  }, [selectedPlanId, loadPlan]);

  const handleSelectPlan = (id: string) => setSelectedPlanId(id);

  const handleCreatePlan = async () => {
    const name = prompt('Plan name:');
    if (!name?.trim()) return;
    try {
      const newPlan = await createPlan(name.trim());
      await loadPlans();
      setSelectedPlanId(newPlan.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create plan');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    try {
      await deletePlan(id);
      const updated = await loadPlans();
      if (selectedPlanId === id) {
        setSelectedPlanId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  const handlePlanUpdated = useCallback(async () => {
    if (!selectedPlanId) return;
    await Promise.all([loadPlan(selectedPlanId), loadPlans()]);
  }, [selectedPlanId, loadPlan, loadPlans]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedCourses();
      await new Promise(r => setTimeout(r, 2000));
      await loadCourses();
      alert('Courses seeded successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  const handleAddGoal = () => {
    const name = prompt('Goal name:');
    if (!name?.trim()) return;
    setGoals(g => [...g, { id: Date.now().toString(), name: name.trim(), satisfied: false }]);
  };

  const handleToggleGoal = (id: string) => {
    setGoals(g => g.map(goal => goal.id === id ? { ...goal, satisfied: !goal.satisfied } : goal));
  };

  const handleDeleteCompleted = async (entryId: string) => {
    if (!plan) return;
    try {
      await deleteEntry(plan.id, entryId);
      handlePlanUpdated();
    } catch (err) {
      console.error('Failed to delete completed entry:', err);
    }
  };

  const handleUploadSubmit = (_rows: Array<{ courseId: string; title: string; credits: string; term: string }>) => {
    // For now, close the modal. Full upload would create entries via the API.
    setShowUpload(false);
    alert('Upload functionality will be connected to the backend API.');
  };

  // Flatten completed entries for sidebar
  const completedEntries: EntryRow[] = plan
    ? Object.values(plan.entries)
        .flatMap(byTerm => Object.values(byTerm).flat())
        .filter(e => e.status === 'completed')
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-red-600 font-medium">Could not connect to server</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <p className="text-gray-400 text-xs">Make sure the backend is running on port 3000</p>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          {seeding ? 'Seeding...' : 'Seed course data'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f4f3f3] overflow-hidden">
      <Sidebar
        plans={plans}
        selectedPlanId={selectedPlanId}
        completedEntries={completedEntries}
        courseMap={courseMap}
        goals={goals}
        onSelectPlan={handleSelectPlan}
        onCreatePlan={handleCreatePlan}
        onDeletePlan={handleDeletePlan}
        onAddGoal={handleAddGoal}
        onToggleGoal={handleToggleGoal}
        onUpload={() => setShowUpload(true)}
        onDeleteCompleted={handleDeleteCompleted}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {courseMap.size === 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-amber-700">No courses in database — seed first</span>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="text-xs text-amber-700 border border-amber-300 rounded px-2 py-1 hover:bg-amber-100"
            >
              {seeding ? 'Seeding...' : 'Seed courses'}
            </button>
          </div>
        )}

        {!plan ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <p className="text-base">No plan selected</p>
            <button
              onClick={handleCreatePlan}
              className="bg-[#101828] hover:bg-[#1d2939] text-white px-5 py-2 rounded-lg text-sm"
            >
              Create your first plan
            </button>
          </div>
        ) : (
          <PlanBoard
            plan={plan}
            plans={plans}
            courseMap={courseMap}
            goals={goals}
            completedEntries={completedEntries}
            onPlanUpdated={handlePlanUpdated}
          />
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </div>
  );
}
