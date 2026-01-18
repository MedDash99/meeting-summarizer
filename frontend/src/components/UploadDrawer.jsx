import { useCallback, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Loader2, FileAudio } from 'lucide-react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { API_BASE } from '../config';
const POLL_INTERVAL_MS = 2000;

const MODELS = [
  { value: 'base', label: 'Fast (base)' },
  { value: 'small', label: 'Balanced (small)' },
  { value: 'large-v3', label: 'Accurate (large-v3)' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function UploadDrawer({ open, onOpenChange, onComplete, onError }) {
  const [model, setModel] = useState('large-v3');
  const [withSummary, setWithSummary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const resetState = () => {
    setUploading(false);
    setProcessing(false);
    setSelectedFile(null);
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('summarize', withSummary ? 'true' : 'false');
    formData.append('model', model);

    try {
      const startResponse = await axios.post(`${API_BASE}/api/transcriptions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (startResponse.data.status !== 'accepted' || !startResponse.data.job_id) {
        throw new Error(startResponse.data.error || 'Failed to start transcription');
      }

      setUploading(false);
      setProcessing(true);
      const jobId = startResponse.data.job_id;

      while (true) {
        const statusResponse = await axios.get(`${API_BASE}/api/transcriptions/${jobId}`);
        const { status, data, error } = statusResponse.data;

        if (status === 'processing') {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        if (status === 'success') {
          resetState();
          onComplete(data);
          onOpenChange(false);
          return;
        }

        resetState();
        onError(error || 'Processing failed');
        return;
      }
    } catch (err) {
      resetState();
      onError(err.response?.data?.detail || err.message || 'Processing failed');
    }
  }, [model, withSummary, onComplete, onError, onOpenChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.webm'],
    },
    maxFiles: 1,
    disabled: uploading || processing,
  });

  const isProcessing = uploading || processing;

  return (
    <Dialog.Root open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
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
            'fixed right-0 top-0 z-50 h-dvh w-full max-w-md',
            'bg-white dark:bg-zinc-900',
            'border-l border-zinc-200 dark:border-zinc-800',
            'shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            'duration-300'
          )}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Upload Audio
              </Dialog.Title>
              <Dialog.Close
                disabled={isProcessing}
                className={cn(
                  'p-2 rounded-lg',
                  'text-zinc-500 dark:text-zinc-400',
                  'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-150'
                )}
                aria-label="Close"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Options */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Transcription Model
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={isProcessing}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-white dark:bg-zinc-800',
                      'border border-zinc-200 dark:border-zinc-700',
                      'text-zinc-900 dark:text-zinc-100',
                      'focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors duration-150'
                    )}
                  >
                    {MODELS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withSummary}
                    onChange={(e) => setWithSummary(e.target.checked)}
                    disabled={isProcessing}
                    className={cn(
                      'size-4 rounded',
                      'border-zinc-300 dark:border-zinc-600',
                      'text-zinc-900 dark:text-zinc-100',
                      'focus:ring-zinc-900 dark:focus:ring-zinc-100',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Generate AI Summary
                  </span>
                </label>
              </div>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={cn(
                  'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer',
                  'transition-all duration-200',
                  isDragActive && 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800',
                  !isDragActive && 'border-zinc-300 dark:border-zinc-700',
                  !isDragActive && !isProcessing && 'hover:border-zinc-400 dark:hover:border-zinc-600',
                  isProcessing && 'cursor-not-allowed opacity-75'
                )}
              >
                <input {...getInputProps()} />

                {isProcessing ? (
                  <div className="space-y-3">
                    <Loader2 className="size-10 mx-auto text-zinc-400 animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {uploading ? 'Uploading...' : 'Transcribing...'}
                      </p>
                      {selectedFile && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {selectedFile.name}
                        </p>
                      )}
                      {processing && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                          This may take several minutes
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      className={cn(
                        'inline-flex items-center justify-center size-12 rounded-xl mx-auto',
                        'bg-zinc-100 dark:bg-zinc-800',
                        'text-zinc-500 dark:text-zinc-400',
                        isDragActive && 'animate-pulse'
                      )}
                    >
                      {isDragActive ? (
                        <Upload className="size-6" />
                      ) : (
                        <FileAudio className="size-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {isDragActive ? 'Drop your file here' : 'Drag & drop an audio file'}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        or click to browse
                      </p>
                    </div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      MP3, WAV, M4A, WebM (max 25MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
