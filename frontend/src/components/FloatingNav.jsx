import { Search, Upload, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '../lib/utils';

export default function FloatingNav({ onOpenUpload, onOpenSearch }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-2 rounded-full',
          'bg-white/80 dark:bg-zinc-900/80',
          'backdrop-blur-xl',
          'border border-zinc-200 dark:border-zinc-800',
          'shadow-lg shadow-zinc-900/5 dark:shadow-zinc-950/50'
        )}
      >
        <button
          onClick={onOpenSearch}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full',
            'text-zinc-600 dark:text-zinc-400',
            'hover:bg-zinc-100 dark:hover:bg-zinc-800',
            'transition-colors duration-150'
          )}
        >
          <Search className="size-4" />
          <span className="text-sm font-medium">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />

        <button
          onClick={onOpenUpload}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full',
            'bg-zinc-900 dark:bg-zinc-100',
            'text-white dark:text-zinc-900',
            'hover:bg-zinc-800 dark:hover:bg-zinc-200',
            'transition-colors duration-150'
          )}
        >
          <Upload className="size-4" />
          <span className="text-sm font-medium">Upload</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-zinc-400 dark:text-zinc-600 bg-zinc-800 dark:bg-zinc-200 rounded">
            <span className="text-xs">⌘</span>U
          </kbd>
        </button>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />

        <button
          onClick={toggleTheme}
          className={cn(
            'p-2 rounded-full',
            'text-zinc-600 dark:text-zinc-400',
            'hover:bg-zinc-100 dark:hover:bg-zinc-800',
            'transition-colors duration-150'
          )}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
      </div>
    </nav>
  );
}
