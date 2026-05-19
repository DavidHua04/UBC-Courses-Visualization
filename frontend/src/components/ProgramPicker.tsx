import { useEffect, useState } from 'react';
import type { Faculty, Program } from '../types';
import { getFaculties, getPrograms } from '../services/api';

interface Props {
  programId: string | null;
  onChange: (programId: string | null) => void;
}

export default function ProgramPicker({ programId, onChange }: Props) {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getFaculties()
      .then(setFaculties)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load faculties'));
  }, []);

  // Hydrate faculty from programId on mount/change
  useEffect(() => {
    if (!programId || faculties.length === 0) return;
    getPrograms()
      .then((all) => {
        const p = all.find((x) => x.id === programId);
        if (p) setSelectedFaculty(p.facultyId);
      })
      .catch(() => { /* ignore */ });
  }, [programId, faculties.length]);

  useEffect(() => {
    if (!selectedFaculty) {
      setPrograms([]);
      return;
    }
    getPrograms(selectedFaculty)
      .then(setPrograms)
      .catch(() => setPrograms([]));
  }, [selectedFaculty]);

  if (loadError) {
    return <span className="text-xs text-red-600">Failed: {loadError}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedFaculty}
        onChange={(e) => {
          setSelectedFaculty(e.target.value);
          onChange(null);
        }}
        className="h-7 px-2 text-xs rounded-lg border border-black/20 bg-white"
      >
        <option value="">Select faculty…</option>
        {faculties.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
      <select
        value={programId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={!selectedFaculty}
        className="h-7 px-2 text-xs rounded-lg border border-black/20 bg-white disabled:bg-gray-100"
      >
        <option value="">Select program…</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
