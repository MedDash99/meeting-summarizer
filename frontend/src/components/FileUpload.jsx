import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const API_BASE_URL = 'http://141.148.51.40:8000';
const POLL_INTERVAL_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function FileUpload({ onUploadStart, onProcessing, onComplete, onError }) {
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    onUploadStart();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('summarize', 'false');
    
    try {
      const startResponse = await axios.post(`${API_BASE_URL}/api/transcriptions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (startResponse.data.status !== 'accepted' || !startResponse.data.job_id) {
        throw new Error(startResponse.data.error || 'Failed to start transcription');
      }

      onProcessing();
      const jobId = startResponse.data.job_id;

      while (true) {
        const statusResponse = await axios.get(`${API_BASE_URL}/api/transcriptions/${jobId}`);
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
  }, [onUploadStart, onProcessing, onComplete, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'audio/*': ['.mp3', '.wav', '.m4a', '.webm'] 
    },
    maxFiles: 1
  });

  return (
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
  );
}
