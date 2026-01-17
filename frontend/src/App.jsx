import { useState } from 'react';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ResultsDisplay from './components/ResultsDisplay';

// States: idle → uploading → processing → complete/error
function App() {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Meeting Summarizer
        </h1>
        
        {state === 'idle' && (
          <FileUpload 
            onUploadStart={() => setState('uploading')}
            onProcessing={() => setState('processing')}
            onComplete={(data) => { 
              setResult(data); 
              setState('complete'); 
              setError(null);
            }}
            onError={(err) => { 
              setError(err); 
              setState('error'); 
            }}
          />
        )}
        
        {(state === 'uploading' || state === 'processing') && (
          <ProcessingStatus stage={state} />
        )}
        
        {state === 'complete' && (
          <ResultsDisplay 
            data={result} 
            onReset={() => { 
              setState('idle'); 
              setResult(null); 
              setError(null);
            }}
          />
        )}
        
        {state === 'error' && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => {
                setState('idle');
                setError(null);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
