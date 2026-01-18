import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import FloatingNav from './components/FloatingNav';
import TranscriptGrid from './components/TranscriptGrid';
import UploadDrawer from './components/UploadDrawer';
import CommandPalette from './components/CommandPalette';
import SelectionActionBar from './components/SelectionActionBar';
import ResultsDisplay from './components/ResultsDisplay';
import ProcessingStatus from './components/ProcessingStatus';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { cn } from './lib/utils';
import { API_BASE } from './config';

function AppContent() {
  const { toggleTheme } = useTheme();
  const [view, setView] = useState('grid'); // grid, viewing, processing
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Drawer and palette state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [allTranscriptIds, setAllTranscriptIds] = useState([]);

  // Trigger to refresh grid after upload
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isModalOpen = uploadOpen || searchOpen || shortcutsHelpOpen || deleteDialogOpen;
  const hasSelection = selectedIds.length > 0;

  // Delete handler
  const handleDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_BASE}/api/transcripts/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedIds([]);
      setIsSelectionMode(false);
      setDeleteDialogOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Export handler
  const handleExport = async () => {
    if (selectedIds.length === 0) return;

    try {
      // Export each selected transcript
      for (const id of selectedIds) {
        const response = await fetch(`${API_BASE}/api/transcripts/${id}`);
        if (!response.ok) continue;
        const record = await response.json();

        if (record.summary_json) {
          const data = JSON.parse(record.summary_json);
          const exportResponse = await fetch(`${API_BASE}/api/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!exportResponse.ok) continue;

          const blob = await exportResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${record.display_name || 'meeting_summary'}.docx`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      alert('Failed to export: ' + err.message);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleSearch: () => setSearchOpen((prev) => !prev),
    onToggleUpload: () => setUploadOpen((prev) => !prev),
    onToggleSelectionMode: () => {
      setIsSelectionMode((prev) => !prev);
      if (isSelectionMode) {
        setSelectedIds([]);
      }
    },
    onSelectAll: () => {
      if (isSelectionMode) {
        setSelectedIds(allTranscriptIds);
      }
    },
    onDeselectAll: () => setSelectedIds([]),
    onDeleteSelected: () => {
      if (hasSelection) {
        setDeleteDialogOpen(true);
      }
    },
    onExportSelected: () => {
      if (hasSelection) {
        handleExport();
      }
    },
    onToggleTheme: toggleTheme,
    onEscape: () => {
      if (deleteDialogOpen) {
        setDeleteDialogOpen(false);
      } else if (searchOpen) {
        setSearchOpen(false);
      } else if (uploadOpen) {
        setUploadOpen(false);
      } else if (shortcutsHelpOpen) {
        setShortcutsHelpOpen(false);
      } else if (isSelectionMode) {
        setSelectedIds([]);
        setIsSelectionMode(false);
      }
    },
    isSelectionMode,
    hasSelection,
    isModalOpen,
  });

  // Listen for ? key to show shortcuts help
  useEffect(() => {
    const handleQuestionMark = (e) => {
      if (e.key === '?' && !isModalOpen) {
        e.preventDefault();
        setShortcutsHelpOpen(true);
      }
    };
    window.addEventListener('keydown', handleQuestionMark);
    return () => window.removeEventListener('keydown', handleQuestionMark);
  }, [isModalOpen]);

  const handleViewTranscript = async (id) => {
    try {
      setLoadingTranscript(true);
      setView('viewing');

      const response = await fetch(`${API_BASE}/api/transcripts/${id}`);
      if (!response.ok) throw new Error('Failed to load transcript');

      const record = await response.json();

      let data;
      if (record.summary_json) {
        data = JSON.parse(record.summary_json);
      } else {
        data = {
          title: record.display_name,
          transcript: record.transcript || '',
          summary: '',
          participants: [],
          key_points: [],
          decisions: [],
          action_items: [],
        };
      }
      // Include transcript ID for later operations (like generating summary)
      data._id = id;

      setResult(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const handleBackToGrid = () => {
    setView('grid');
    setResult(null);
    setError(null);
  };

  const handleUploadComplete = (data) => {
    setResult(data);
    setView('viewing');
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleUploadError = (err) => {
    setError(typeof err === 'string' ? err : err.message);
  };

  const handleSelectionChange = (ids) => {
    setSelectedIds(ids);
    if (ids.length > 0 && !isSelectionMode) {
      setIsSelectionMode(true);
    }
  };

  return (
    <div
      className={cn(
        'min-h-dvh',
        'bg-zinc-50 dark:bg-zinc-950',
        'transition-colors duration-150'
      )}
    >
      {/* Floating Navigation */}
      <FloatingNav
        onOpenUpload={() => setUploadOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Upload Drawer */}
      <UploadDrawer
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onComplete={handleUploadComplete}
        onError={handleUploadError}
      />

      {/* Command Palette */}
      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectTranscript={handleViewTranscript}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={shortcutsHelpOpen}
        onOpenChange={setShortcutsHelpOpen}
      />

      {/* Main Content */}
      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          {view === 'grid' && (
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-balance">
                    Meeting Transcripts
                  </h1>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 text-pretty">
                    Upload audio files to transcribe and summarize your meetings
                  </p>
                </div>
                <button
                  onClick={() => setShortcutsHelpOpen(true)}
                  className={cn(
                    'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg',
                    'text-xs text-zinc-500 dark:text-zinc-400',
                    'border border-zinc-200 dark:border-zinc-800',
                    'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                    'transition-colors duration-150'
                  )}
                >
                  <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">?</kbd>
                  Shortcuts
                </button>
              </div>

              {/* Selection mode indicator */}
              {isSelectionMode && (
                <div
                  className={cn(
                    'mt-4 flex items-center gap-3 px-4 py-2 rounded-lg',
                    'bg-zinc-100 dark:bg-zinc-800',
                    'text-sm text-zinc-600 dark:text-zinc-400'
                  )}
                >
                  <span>Selection mode active</span>
                  <span className="text-zinc-400 dark:text-zinc-500">|</span>
                  <span>
                    <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-xs">A</kbd> Select all
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-xs">Esc</kbd> Exit
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && view === 'grid' && (
            <div
              className={cn(
                'mb-6 p-4 rounded-xl',
                'bg-red-50 dark:bg-red-950/50',
                'border border-red-200 dark:border-red-900',
                'text-red-700 dark:text-red-400 text-sm'
              )}
            >
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Grid View */}
          {view === 'grid' && (
            <TranscriptGrid
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
              onViewTranscript={handleViewTranscript}
              refreshTrigger={refreshTrigger}
              isSelectionMode={isSelectionMode}
              onTranscriptsLoaded={setAllTranscriptIds}
            />
          )}

          {/* Viewing Transcript */}
          {view === 'viewing' &&
            (loadingTranscript ? (
              <ProcessingStatus stage="loading" />
            ) : (
              <ResultsDisplay
                data={result}
                onReset={handleBackToGrid}
                onBackToHistory={handleBackToGrid}
                isViewing={true}
                onDataUpdate={(newData) => setResult({ ...newData, _id: result?._id })}
              />
            ))}
        </div>
      </main>

      {/* Selection Action Bar */}
      <SelectionActionBar
        selectedIds={selectedIds}
        onClear={() => {
          setSelectedIds([]);
          setIsSelectionMode(false);
        }}
        onDelete={handleDelete}
        onExport={handleExport}
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogChange={setDeleteDialogOpen}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
