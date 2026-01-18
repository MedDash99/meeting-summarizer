import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { API_BASE } from '../config';
const POLL_INTERVAL_MS = 2000;

const MODELS = [
  { value: 'base', label: 'Fast (base)' },
  { value: 'small', label: 'Balanced (small)' },
  { value: 'large-v3', label: 'Accurate (large-v3)' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function FileUpload({ onUploadStart, onProcessing, onComplete, onError }) {
  const [model, setModel] = useState('large-v3');
  const [withSummary, setWithSummary] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    onUploadStart();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('summarize', withSummary ? 'true' : 'false');
    formData.append('model', model);
    
    try {
      const startResponse = await axios.post(`${API_BASE}/api/transcriptions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (startResponse.data.status !== 'accepted' || !startResponse.data.job_id) {
        throw new Error(startResponse.data.error || 'Failed to start transcription');
      }

      onProcessing();
      const jobId = startResponse.data.job_id;

      while (true) {
        const statusResponse = await axios.get(`${API_BASE}/api/transcriptions/${jobId}`);
        const { status, data, error } = statusResponse.data;

        if (status === 'processing') {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        if (status === 'success') {
          onComplete(data);
          return;
        }

        onError(error || 'Processing failed');
        return;
      }
    } catch (err) {
      onError(err.response?.data?.detail || err.message || 'Processing failed');
    }
  }, [onUploadStart, onProcessing, onComplete, onError, model, withSummary]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'audio/*': ['.mp3', '.wav', '.m4a', '.webm'] 
    },
    maxFiles: 1
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Model:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={withSummary}
            onChange={(e) => setWithSummary(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-600">With Summary</span>
        </label>
      </div>
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        <p className="text-lg text-gray-600">
          {isDragActive 
            ? 'Drop your audio file here...' 
            : 'Drag & drop an audio file, or click to select'}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Supports MP3, WAV, M4A, WebM (max 25MB)
        </p>
      </div>
    </div>
  );
}
