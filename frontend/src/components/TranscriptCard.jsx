import * as Checkbox from '@radix-ui/react-checkbox';
import { Check, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

export default function TranscriptCard({
  transcript,
  isSelected,
  isSelectionMode,
  onSelect,
  onView,
}) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCardClick = (e) => {
    if (isSelectionMode) {
      onSelect(transcript.id);
    } else {
      onView(transcript.id);
    }
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect(transcript.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group relative p-5 rounded-xl cursor-pointer',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200 dark:border-zinc-800',
        'hover:-translate-y-1 hover:shadow-xl',
        'transition-all duration-200',
        isSelected && 'ring-2 ring-zinc-900 dark:ring-zinc-100'
      )}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'absolute top-4 right-4',
          'opacity-0 group-hover:opacity-100',
          isSelectionMode && 'opacity-100'
        )}
      >
        <Checkbox.Root
          checked={isSelected}
          onCheckedChange={() => onSelect(transcript.id)}
          onClick={handleCheckboxClick}
          className={cn(
            'size-5 rounded border-2',
            'border-zinc-300 dark:border-zinc-600',
            'data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900',
            'dark:data-[state=checked]:bg-zinc-100 dark:data-[state=checked]:border-zinc-100',
            'transition-colors duration-150'
          )}
        >
          <Checkbox.Indicator className="flex items-center justify-center">
            <Check className="size-3 text-white dark:text-zinc-900" />
          </Checkbox.Indicator>
        </Checkbox.Root>
      </div>

      {/* Icon */}
      <div className="mb-4">
        <div
          className={cn(
            'inline-flex items-center justify-center size-10 rounded-lg',
            'bg-zinc-100 dark:bg-zinc-800',
            'text-zinc-600 dark:text-zinc-400'
          )}
        >
          <FileText className="size-5" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1 pr-8 line-clamp-1 text-pretty">
        {transcript.display_name}
      </h3>

      {/* Date */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
        {formatDate(transcript.created_at)}
      </p>

      {/* Model badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            'inline-flex px-2 py-1 rounded-md text-xs font-medium',
            'bg-zinc-100 dark:bg-zinc-800',
            'text-zinc-600 dark:text-zinc-400'
          )}
        >
          {transcript.model}
        </span>
        {transcript.status === 'completed' && (
          <span
            className={cn(
              'inline-flex px-2 py-1 rounded-md text-xs font-medium',
              'bg-emerald-50 dark:bg-emerald-950',
              'text-emerald-700 dark:text-emerald-400'
            )}
          >
            Completed
          </span>
        )}
        {transcript.status === 'processing' && (
          <span
            className={cn(
              'inline-flex px-2 py-1 rounded-md text-xs font-medium',
              'bg-amber-50 dark:bg-amber-950',
              'text-amber-700 dark:text-amber-400'
            )}
          >
            Processing
          </span>
        )}
      </div>

      {/* Summary snippet */}
      {transcript.summary_snippet && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 text-pretty">
          {transcript.summary_snippet}
        </p>
      )}
    </div>
  );
}
