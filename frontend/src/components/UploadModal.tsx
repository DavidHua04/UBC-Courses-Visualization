import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSubmit: (rows: Array<{ courseId: string; title: string; credits: string; term: string }>) => void;
}

export default function UploadModal({ onClose, onSubmit }: Props) {
  const [rows, setRows] = useState([{ courseId: '', title: '', credits: '', term: '' }]);

  const updateRow = (i: number, field: string, value: string) => {
    setRows(r => r.map((x, j) => j === i ? { ...x, [field]: value } : x));
  };

  const handleSubmit = () => {
    const valid = rows.filter(r => r.courseId.trim());
    if (valid.length) onSubmit(valid);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-[520px] p-[22px] shadow-[0_24px_64px_rgba(0,0,0,0.2)] max-h-[86vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-[18px]">
          <span className="font-bold text-lg">Upload Transcript</span>
          <button onClick={onClose} className="border-none bg-none cursor-pointer text-[#6b7280] leading-none">
            <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        <label className="text-[13px] mb-1.5 block">Upload Transcript (PDF/CSV)</label>
        <div className="bg-black/[0.04] rounded-lg h-9 flex items-center justify-between px-2.5 text-[13px] text-[#9ca3af] mb-[18px] cursor-pointer">
          <span>Choose File</span>
          <div className="bg-white border border-black/10 rounded-md w-[30px] h-6 flex items-center justify-center text-[#6b7280]">
            <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <path d="M8 10V3M5 6l3-3 3 3M3 12.5v.5a1 1 0 001 1h8a1 1 0 001-1v-.5" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex-1 h-px bg-black/[0.08]" />
          <span className="text-[13px] text-[#9ca3af]">or enter manually</span>
          <div className="flex-1 h-px bg-black/[0.08]" />
        </div>

        <div className="grid grid-cols-[100px_1fr_48px_70px] gap-1.5 text-[11px] text-[#9ca3af] px-0.5 mb-1.5">
          <span>Code</span><span>Name</span><span>Cr</span><span>Term</span>
        </div>

        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[100px_1fr_48px_70px] gap-1.5 mb-1.5">
            {(['courseId', 'title', 'credits', 'term'] as const).map(f => (
              <input
                key={f}
                value={r[f]}
                onChange={e => updateRow(i, f, e.target.value)}
                placeholder={f === 'courseId' ? 'CPSC 210' : f === 'title' ? 'Course Name' : f === 'credits' ? '3' : '2024W1'}
                className="h-[34px] rounded-lg border border-black/15 px-2 text-[13px] outline-none"
              />
            ))}
          </div>
        ))}

        <button
          onClick={() => setRows(r => [...r, { courseId: '', title: '', credits: '', term: '' }])}
          className="w-full h-[34px] rounded-lg border border-black/10 bg-white cursor-pointer text-[13px] flex items-center justify-center gap-1.5 mt-1 mb-3 hover:bg-gray-50"
        >
          <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M8 2v12M2 8h12" />
          </svg>
          Add Another Course
        </button>

        <button
          onClick={handleSubmit}
          className="w-full h-9 rounded-lg border-none bg-[#101828] text-white cursor-pointer text-sm font-semibold hover:bg-[#1d2939]"
        >
          Submit Courses
        </button>
      </div>
    </div>
  );
}
