import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ProcessingStatus({ stage }) {
  const getMessage = () => {
    if (stage === 'uploading') {
      return 'Uploading file...';
    }
    if (stage === 'loading') {
      return 'Loading transcript...';
    }
    return 'Transcribing audio...';
  };

  const getSubMessage = () => {
    if (stage === 'processing') {
      return 'This may take several minutes';
    }
    return null;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-24',
        'bg-white dark:bg-zinc-900',
        'rounded-xl border border-zinc-200 dark:border-zinc-800'
      )}
    >
      <Loader2 className="size-10 text-zinc-400 dark:text-zinc-500 animate-spin mb-4" />
      <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        {getMessage()}
      </p>
      {getSubMessage() && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          {getSubMessage()}
        </p>
      )}
    </div>
  );
}
