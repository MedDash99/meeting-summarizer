import { useState } from 'react';
import { ArrowLeft, Download, Users, Lightbulb, CheckCircle, ListTodo, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { API_BASE } from '../config';

export default function ResultsDisplay({ data, onReset, onBackToHistory, isViewing = false, onDataUpdate }) {
  const [activeTab, setActiveTab] = useState(() => (data?.summary ? 'summary' : 'transcript'));
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const handleGenerateSummary = async () => {
    if (!data?._id) {
      alert('Cannot generate summary: transcript ID not available');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const response = await fetch(`${API_BASE}/api/transcripts/${data._id}/summarize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const result = await response.json();
      if (result.status === 'success' && result.data) {
        onDataUpdate?.(result.data);
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (err) {
      alert('Failed to generate summary: ' + err.message);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meeting_summary.docx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export document: ' + err.message);
    }
  };

  if (!data) {
    return null;
  }

  const tabs = data.summary ? ['summary', 'transcript'] : ['transcript'];
  const hasParticipants = data.participants?.length > 0;
  const hasKeyPoints = data.key_points?.length > 0;
  const hasDecisions = data.decisions?.length > 0;
  const hasActionItems = data.action_items?.length > 0;

  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900',
        'rounded-xl border border-zinc-200 dark:border-zinc-800',
        'overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToHistory || onReset}
            className={cn(
              'p-2 -ml-2 rounded-lg',
              'text-zinc-500 dark:text-zinc-400',
              'hover:bg-zinc-100 dark:hover:bg-zinc-800',
              'transition-colors duration-150'
            )}
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 text-balance">
            {data.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Generate Summary button - only show if no summary exists */}
          {!data.summary && data._id && (
            <button
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'text-sm font-medium',
                'bg-violet-600 dark:bg-violet-500',
                'text-white',
                'hover:bg-violet-700 dark:hover:bg-violet-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors duration-150'
              )}
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Summary
                </>
              )}
            </button>
          )}
          <button
            onClick={handleExport}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'text-sm font-medium',
              'bg-zinc-900 dark:bg-zinc-100',
              'text-white dark:text-zinc-900',
              'hover:bg-zinc-800 dark:hover:bg-zinc-200',
              'transition-colors duration-150'
            )}
          >
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-6 py-3 text-sm font-medium',
              'transition-colors duration-150',
              activeTab === tab
                ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 -mb-px'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {activeTab === 'summary' && (
          <>
            {/* Executive Summary */}
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <div className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap text-pretty leading-relaxed">
                {data.summary}
              </div>
            </div>

            {/* Participants */}
            {hasParticipants && (
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="size-4 text-zinc-500" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Participants
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.participants.map((p, i) => (
                    <span
                      key={i}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                        'bg-zinc-100 dark:bg-zinc-800',
                        'text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      {p.name || 'Unknown Speaker'}
                      {p.role && (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          ({p.role})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Points */}
            {hasKeyPoints && (
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="size-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Key Points
                  </h3>
                </div>
                <ul className="space-y-2">
                  {data.key_points.map((point, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <span className="text-zinc-400 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Decisions */}
            {hasDecisions && (
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="size-4 text-green-500" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Decisions Made
                  </h3>
                </div>
                <div className="space-y-3">
                  {data.decisions.map((d, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-3 rounded-lg',
                        'bg-green-50 dark:bg-green-950/30',
                        'border border-green-200 dark:border-green-900'
                      )}
                    >
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {d.description}
                      </p>
                      {d.context && (
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 italic">
                          {d.context}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {hasActionItems && (
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <ListTodo className="size-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Action Items
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="text-left py-2 px-3 font-medium text-zinc-600 dark:text-zinc-400">
                          Task
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-zinc-600 dark:text-zinc-400">
                          Assignee
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-zinc-600 dark:text-zinc-400">
                          Deadline
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.action_items.map((item, i) => (
                        <tr
                          key={i}
                          className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                        >
                          <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">
                            {item.task}
                          </td>
                          <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400">
                            {item.assignee || 'TBD'}
                          </td>
                          <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400">
                            {item.deadline || 'TBD'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'transcript' && (
          <>
            {/* Prompt to generate summary if none exists */}
            {!data.summary && data._id && (
              <div
                className={cn(
                  'mb-4 p-4 rounded-lg',
                  'bg-violet-50 dark:bg-violet-950/30',
                  'border border-violet-200 dark:border-violet-900'
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
                      No summary generated yet
                    </p>
                    <p className="text-xs text-violet-700 dark:text-violet-300 mt-0.5">
                      Use AI to extract key points, decisions, and action items from this transcript.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0',
                      'text-sm font-medium',
                      'bg-violet-600 dark:bg-violet-500',
                      'text-white',
                      'hover:bg-violet-700 dark:hover:bg-violet-600',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors duration-150'
                    )}
                  >
                    {isGeneratingSummary ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            <div
              className={cn(
                'max-h-[500px] overflow-y-auto p-4 rounded-lg',
                'bg-zinc-50 dark:bg-zinc-800/50'
              )}
            >
              <pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 font-mono">
                {data.transcript}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
