import * as Dialog from '@radix-ui/react-dialog';
import { X, Keyboard } from 'lucide-react';
import { cn } from '../lib/utils';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';

export default function KeyboardShortcutsHelp({ open, onOpenChange }) {
  const generalShortcuts = SHORTCUTS.filter((s) => !s.selectionOnly);
  const selectionShortcuts = SHORTCUTS.filter((s) => s.selectionOnly);

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
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md',
            'bg-white dark:bg-zinc-900',
            'border border-zinc-200 dark:border-zinc-800',
            'rounded-xl shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'duration-200'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <Keyboard className="size-5 text-zinc-500" />
              <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Keyboard Shortcuts
              </Dialog.Title>
            </div>
            <Dialog.Close
              className={cn(
                'p-2 rounded-lg',
                'text-zinc-500 dark:text-zinc-400',
                'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                'transition-colors duration-150'
              )}
              aria-label="Close"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* General shortcuts */}
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                General
              </h3>
              <div className="space-y-2">
                {generalShortcuts.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className={cn(
                            'px-2 py-1 text-xs font-medium',
                            'bg-zinc-100 dark:bg-zinc-800',
                            'text-zinc-600 dark:text-zinc-400',
                            'border border-zinc-200 dark:border-zinc-700',
                            'rounded'
                          )}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selection mode shortcuts */}
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                Selection Mode
              </h3>
              <div className="space-y-2">
                {selectionShortcuts.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className={cn(
                            'px-2 py-1 text-xs font-medium',
                            'bg-zinc-100 dark:bg-zinc-800',
                            'text-zinc-600 dark:text-zinc-400',
                            'border border-zinc-200 dark:border-zinc-700',
                            'rounded'
                          )}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Press <kbd className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">?</kbd> anytime to show this help
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
