export default function ProcessingStatus({ stage }) {
  const getMessage = () => {
    if (stage === 'uploading') {
      return 'Uploading file...';
    }
    return 'Transcribing audio (this may take several minutes)...';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
      <p className="text-lg text-gray-700">{getMessage()}</p>
      {stage === 'processing' && (
        <p className="text-sm text-gray-500 mt-2">
          Transcribing with Whisper large-v3...
        </p>
      )}
    </div>
  );
}
