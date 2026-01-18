import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, FileText, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { API_BASE } from '../config';

export default function CommandPalette({ open, onOpenChange, onSelectTranscript }) {
  const [query, setQuery] = useState('');
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Fetch transcripts when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      fetchTranscripts();
    }
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/transcripts?limit=50&offset=0`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setTranscripts(data.transcripts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTranscripts = transcripts.filter((t) =>
    t.display_name.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredTranscripts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTranscripts[selectedIndex]) {
        handleSelect(filteredTranscripts[selectedIndex]);
      }
    }
  };

  const handleSelect = (transcript) => {
    onSelectTranscript(transcript.id);
    onOpenChange(false);
  };

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50',
            'bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <Dialog.Content
          onKeyDown={handleKeyDown}
          className={cn(
            'fixed left-1/2 top-[20%] z-50 -translate-x-1/2',
            'w-full max-w-lg',
            'bg-white dark:bg-zinc-900',
            'border border-zinc-200 dark:border-zinc-800',
            'rounded-xl shadow-2xl',
            'overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
            'duration-200'
          )}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-zinc-200 dark:border-zinc-800">
            <Search className="size-5 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search transcripts..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className={cn(
                'flex-1 py-4 text-sm',
                'bg-transparent',
                'text-zinc-900 dark:text-zinc-100',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                'focus:outline-none'
              )}
            />
            <kbd className="px-2 py-1 text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 text-zinc-400 animate-spin" />
              </div>
            ) : filteredTranscripts.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {query ? 'No transcripts found' : 'No transcripts yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTranscripts.map((transcript, index) => (
                  <button
                    key={transcript.id}
                    onClick={() => handleSelect(transcript)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                      'transition-colors duration-100',
                      index === selectedIndex
                        ? 'bg-zinc-100 dark:bg-zinc-800'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    )}
                  >
                    <FileText className="size-4 text-zinc-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {transcript.display_name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(transcript.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {transcript.status === 'completed' && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        Ready
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">↵</kbd>
              to select
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
