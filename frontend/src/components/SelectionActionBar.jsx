import { useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { X, Trash2, Download, Combine } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SelectionActionBar({
  selectedIds,
  onClear,
  onDelete,
  onExport,
  deleteDialogOpen,
  onDeleteDialogChange,
}) {
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const count = selectedIds.length;

  // Use external control if provided, otherwise internal
  const isOpen = deleteDialogOpen !== undefined ? deleteDialogOpen : internalDialogOpen;
  const setIsOpen = onDeleteDialogChange || setInternalDialogOpen;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-xl',
          'bg-zinc-900 dark:bg-zinc-100',
          'shadow-2xl'
        )}
      >
        <span className="text-sm font-medium text-white dark:text-zinc-900 mr-2">
          {count} selected
        </span>

        <div className="w-px h-5 bg-zinc-700 dark:bg-zinc-300" />

        <button
          onClick={onExport}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg',
            'text-sm font-medium',
            'text-zinc-300 dark:text-zinc-600',
            'hover:bg-zinc-800 dark:hover:bg-zinc-200',
            'transition-colors duration-150'
          )}
        >
          <Download className="size-4" />
          <span>Export</span>
          <kbd className="hidden sm:inline ml-1 px-1 py-0.5 text-xs bg-zinc-700 dark:bg-zinc-300 rounded">
            E
          </kbd>
        </button>

        <button
          disabled
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg',
            'text-sm font-medium',
            'text-zinc-500 dark:text-zinc-400',
            'cursor-not-allowed opacity-50'
          )}
          title="Coming soon"
        >
          <Combine className="size-4" />
          Merge
        </button>

        <AlertDialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialog.Trigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'text-sm font-medium',
                'text-red-400 dark:text-red-500',
                'hover:bg-red-500/10',
                'transition-colors duration-150'
              )}
            >
              <Trash2 className="size-4" />
              <span>Delete</span>
              <kbd className="hidden sm:inline ml-1 px-1 py-0.5 text-xs bg-zinc-700 dark:bg-zinc-300 text-zinc-300 dark:text-zinc-600 rounded">
                D
              </kbd>
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay
              className={cn(
                'fixed inset-0 z-50',
                'bg-black/50 backdrop-blur-sm',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
              )}
            />
            <AlertDialog.Content
              className={cn(
                'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
                'w-full max-w-md p-6',
                'bg-white dark:bg-zinc-900',
                'border border-zinc-200 dark:border-zinc-800',
                'rounded-xl shadow-2xl',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                'duration-200'
              )}
            >
              <AlertDialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Delete {count} transcript{count > 1 ? 's' : ''}?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                This action cannot be undone. The selected transcript{count > 1 ? 's' : ''} will be
                permanently deleted.
              </AlertDialog.Description>
              <div className="flex justify-end gap-3 mt-6">
                <AlertDialog.Cancel asChild>
                  <button
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium',
                      'border border-zinc-200 dark:border-zinc-700',
                      'text-zinc-700 dark:text-zinc-300',
                      'hover:bg-zinc-50 dark:hover:bg-zinc-800',
                      'transition-colors duration-150'
                    )}
                  >
                    Cancel
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    onClick={onDelete}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium',
                      'bg-red-500 text-white',
                      'hover:bg-red-600',
                      'transition-colors duration-150'
                    )}
                  >
                    Delete
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        <div className="w-px h-5 bg-zinc-700 dark:bg-zinc-300" />

        <button
          onClick={onClear}
          className={cn(
            'p-1.5 rounded-lg',
            'text-zinc-400 dark:text-zinc-500',
            'hover:bg-zinc-800 dark:hover:bg-zinc-200',
            'transition-colors duration-150'
          )}
          aria-label="Clear selection"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
