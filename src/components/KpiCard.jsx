import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * KPI metric card used across Dashboard, Performance, and Attribution pages.
 *
 * @param {Object} props
 * @param {string} props.label         - Metric name (e.g. "Portfolio Return")
 * @param {string} props.value         - Formatted value (e.g. "+12.00%")
 * @param {string} [props.variant]     - "positive" | "negative" | "neutral" (default)
 * @param {import('lucide-react').LucideIcon} [props.icon] - Optional icon component
 */
export default function KpiCard({ label, value, variant = 'neutral', icon: Icon }) {
  const styles = {
    positive: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    negative: 'bg-rose-50 border-rose-200 text-rose-700',
    neutral: 'bg-white border-slate-200 text-slate-900',
  };

  const ArrowIcon = variant === 'positive' ? ArrowUpRight : variant === 'negative' ? ArrowDownRight : null;

  return (
    <div className={`rounded-2xl shadow-sm border p-5 ${styles[variant]}`}>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-sm font-medium ${variant === 'neutral' ? 'text-slate-500' : ''}`}>{label}</p>
        {ArrowIcon && <ArrowIcon className="w-5 h-5" />}
        {Icon && !ArrowIcon && <Icon className="w-5 h-5 text-slate-400" />}
      </div>
      <h3 className="text-3xl font-bold">{value}</h3>
    </div>
  );
}
