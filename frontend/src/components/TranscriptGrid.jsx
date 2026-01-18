import { useState, useEffect } from 'react';
import { Loader2, FileX } from 'lucide-react';
import TranscriptCard from './TranscriptCard';
import { cn } from '../lib/utils';
import { API_BASE } from '../config';

export default function TranscriptGrid({
  selectedIds,
  onSelectionChange,
  onViewTranscript,
  refreshTrigger,
  isSelectionMode,
  onTranscriptsLoaded,
}) {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 12;

  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/transcripts?limit=${limit}&offset=${offset}`);
      if (!response.ok) throw new Error('Failed to fetch transcripts');
      const data = await response.json();
      setTranscripts(data.transcripts);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranscripts();
  }, [offset, refreshTrigger]);

  // Notify parent of loaded transcripts for select all functionality
  useEffect(() => {
    onTranscriptsLoaded?.(transcripts.map((t) => t.id));
  }, [transcripts, onTranscriptsLoaded]);

  const handleSelect = (id) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (loading && transcripts.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchTranscripts}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium',
            'bg-zinc-900 dark:bg-zinc-100',
            'text-white dark:text-zinc-900',
            'hover:bg-zinc-800 dark:hover:bg-zinc-200',
            'transition-colors duration-150'
          )}
        >
          Retry
        </button>
      </div>
    );
  }

  if (transcripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className={cn(
            'inline-flex items-center justify-center size-16 rounded-2xl mb-4',
            'bg-zinc-100 dark:bg-zinc-800',
            'text-zinc-400 dark:text-zinc-500'
          )}
        >
          <FileX className="size-8" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2 text-balance">
          No transcripts yet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-pretty">
          Upload an audio file to get started
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {transcripts.map((transcript) => (
          <TranscriptCard
            key={transcript.id}
            transcript={transcript}
            isSelected={selectedIds.includes(transcript.id)}
            isSelectionMode={isSelectionMode}
            onSelect={handleSelect}
            onView={onViewTranscript}
          />
        ))}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'border border-zinc-200 dark:border-zinc-700',
              'text-zinc-700 dark:text-zinc-300',
              'hover:bg-zinc-50 dark:hover:bg-zinc-800',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150'
            )}
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
            {offset + 1} - {Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'border border-zinc-200 dark:border-zinc-700',
              'text-zinc-700 dark:text-zinc-300',
              'hover:bg-zinc-50 dark:hover:bg-zinc-800',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150'
            )}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
