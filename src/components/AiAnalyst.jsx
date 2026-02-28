import { useState } from 'react';
import { Sparkles, FileText, Lightbulb, Loader2 } from 'lucide-react';

/**
 * Gemini AI Analyst panel — reusable across Performance and Attribution pages.
 *
 * @param {Object} props
 * @param {() => Promise<string>} props.onGenerateSummary       - Async fn to generate summary
 * @param {() => Promise<string>} props.onGenerateRecommendations - Async fn to generate recs
 * @param {boolean} [props.disabled]    - Disable buttons
 * @param {string} [props.fallbackInsight] - Basic insight shown when no AI output yet
 */
export default function AiAnalyst({ onGenerateSummary, onGenerateRecommendations, disabled = false, fallbackInsight }) {
  const [summary, setSummary] = useState('');
  const [recs, setRecs] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState('');

  const handleSummary = async () => {
    setLoadingSummary(true);
    setError('');
    try {
      const text = await onGenerateSummary();
      setSummary(text);
    } catch (err) {
      setError(err.message || 'Failed to generate summary.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleRecs = async () => {
    setLoadingRecs(true);
    setError('');
    try {
      const text = await onGenerateRecommendations();
      setRecs(text);
    } catch (err) {
      setError(err.message || 'Failed to generate recommendations.');
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#162032] to-[#1a2740] rounded-2xl shadow-sm p-6 text-white border border-slate-700">
      <div className="flex items-start gap-4">
        <div className="bg-[#d4a843]/20 p-2.5 rounded-xl shrink-0">
          <Sparkles className="w-6 h-6 text-[#d4a843]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-1">AI Analyst</h3>
          <p className="text-slate-300 text-sm mb-4">
            Generate professional reports and strategic advice from your data.
          </p>

          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={handleSummary}
              disabled={disabled || loadingSummary}
              className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#e0b84e] disabled:bg-slate-700 disabled:text-slate-500 text-[#0a1628] px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              {loadingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Generate Executive Summary
            </button>
            <button
              onClick={handleRecs}
              disabled={disabled || loadingRecs}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              {loadingRecs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
              Get Strategic Recommendations
            </button>
          </div>

          {error && (
            <div className="bg-rose-900/40 text-rose-300 border border-rose-700/50 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary && (
              <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                <h4 className="font-semibold text-[#d4a843] mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Executive Summary
                </h4>
                <div className="text-slate-200 text-sm leading-relaxed space-y-2">
                  {summary
                    .split('\n')
                    .filter((p) => p.trim())
                    .map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                </div>
              </div>
            )}
            {recs && (
              <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                <h4 className="font-semibold text-emerald-300 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> Strategic Recommendations
                </h4>
                <div className="text-slate-200 text-sm leading-relaxed space-y-2">
                  {recs
                    .split('\n')
                    .filter((p) => p.trim())
                    .map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                </div>
              </div>
            )}
          </div>

          {!summary && !recs && fallbackInsight && (
            <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-xl">
              <p className="text-slate-400 text-sm">
                <em>{fallbackInsight}</em>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
