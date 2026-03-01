import type { ValidationResult, EntryRow } from '../types';

interface Props {
  validation: ValidationResult | null;
  validating: boolean;
  entries: EntryRow[];
  onValidate: () => void;
}

export default function SummaryPanel({ validation, validating, entries, onValidate }: Props) {
  const completed = entries.filter(e => e.status === 'completed');
  const planned = entries.filter(e => e.status === 'planned' || e.status === 'in_progress');

  return (
    <div className="w-72 shrink-0 bg-white border-l flex flex-col overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-900">Summary</h2>
      </div>

      {/* Credit counts */}
      <div className="p-4 border-b space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Course Count</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Completed</span>
            <span className="font-medium text-green-600">{completed.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Planned / In Progress</span>
            <span className="font-medium text-blue-600">{planned.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total courses</span>
            <span className="font-medium text-gray-900">{entries.length}</span>
          </div>
        </div>
      </div>

      {/* Validation */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Validation</h3>
          <button
            onClick={onValidate}
            disabled={validating}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            {validating ? 'Checking...' : 'Re-check'}
          </button>
        </div>

        {!validation && !validating && (
          <p className="text-sm text-gray-400">Add courses and click Re-check to validate prerequisites.</p>
        )}

        {validating && (
          <p className="text-sm text-gray-400">Validating plan...</p>
        )}

        {validation && (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-sm font-medium ${
              validation.valid ? 'text-green-700' : 'text-red-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${validation.valid ? 'bg-green-500' : 'bg-red-500'}`} />
              {validation.valid ? 'All prerequisites met' : `${validation.errors.length} issue(s) found`}
            </div>

            {validation.errors.length > 0 && (
              <div className="space-y-2">
                {validation.errors.map((err, i) => (
                  <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-red-700">{err.courseId}</p>
                    <p className="text-xs text-red-600 mt-0.5">{err.message}</p>
                  </div>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-yellow-700">Warnings</p>
                {validation.warnings.map((w, i) => (
                  <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-yellow-700">{w.courseId}</p>
                    <p className="text-xs text-yellow-600 mt-0.5">{w.message}</p>
                  </div>
                ))}
              </div>
            )}

            {validation.valid && validation.warnings.length === 0 && (
              <p className="text-xs text-green-600">No prerequisite issues detected.</p>
            )}

            <p className="text-xs text-gray-400">
              Checked {new Date(validation.computedAt).toLocaleTimeString()}
              {validation.cached && ' (cached)'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
