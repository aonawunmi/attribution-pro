/**
 * Shared Recharts tooltip component.
 * Extracted outside of page components to prevent re-creation on every render.
 */
export default function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-[#1e293b] p-3 border border-slate-600 shadow-lg rounded-lg">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm flex items-center justify-between gap-4">
          <span style={{ color: entry.color || entry.payload?.fill }} className="font-medium">
            {entry.name}:
          </span>
          <span className="font-mono text-slate-200">
            {entry.value > 0 ? '+' : ''}
            {entry.value}%
          </span>
        </p>
      ))}
    </div>
  );
}
