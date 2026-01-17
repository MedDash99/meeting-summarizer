import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts({
  onToggleSearch,
  onToggleUpload,
  onToggleSelectionMode,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onExportSelected,
  onToggleTheme,
  onEscape,
  isSelectionMode,
  hasSelection,
  isModalOpen,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Command/Ctrl shortcuts work everywhere
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'k':
            e.preventDefault();
            onToggleSearch?.();
            break;
          case 'u':
            e.preventDefault();
            onToggleUpload?.();
            break;
          case 's':
            e.preventDefault();
            onToggleSelectionMode?.();
            break;
          case 'd':
            e.preventDefault();
            onToggleTheme?.();
            break;
        }
        return;
      }

      // Single key shortcuts only when not in input
      if (isInput) return;

      // Escape always works
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
        return;
      }

      // Selection mode shortcuts (only when in selection mode and no modal open)
      if (isSelectionMode && !isModalOpen) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            onSelectAll?.();
            break;
          case 'd':
            if (hasSelection) {
              e.preventDefault();
              onDeleteSelected?.();
            }
            break;
          case 'e':
            if (hasSelection) {
              e.preventDefault();
              onExportSelected?.();
            }
            break;
        }
      }
    },
    [
      onToggleSearch,
      onToggleUpload,
      onToggleSelectionMode,
      onSelectAll,
      onDeselectAll,
      onDeleteSelected,
      onExportSelected,
      onToggleTheme,
      onEscape,
      isSelectionMode,
      hasSelection,
      isModalOpen,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Shortcut definitions for display
export const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Search transcripts' },
  { keys: ['⌘', 'U'], description: 'Upload audio' },
  { keys: ['⌘', 'S'], description: 'Toggle selection mode' },
  { keys: ['⌘', 'D'], description: 'Toggle dark mode' },
  { keys: ['Esc'], description: 'Close / Exit selection' },
  { keys: ['A'], description: 'Select all (in selection mode)', selectionOnly: true },
  { keys: ['D'], description: 'Delete selected', selectionOnly: true },
  { keys: ['E'], description: 'Export selected', selectionOnly: true },
];
