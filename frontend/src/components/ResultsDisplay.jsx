import { useState } from 'react';

export default function ResultsDisplay({ data, onReset }) {
  const [activeTab, setActiveTab] = useState(() => (data?.summary ? 'summary' : 'transcript'));
  
  const handleExport = async () => {
    try {
      const response = await fetch('http://141.148.51.40:8000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meeting_summary.docx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export document: ' + err.message);
    }
  };

  if (!data) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{data.title}</h2>
        <div className="space-x-2">
          <button 
            onClick={handleExport} 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download Word
          </button>
          <button 
            onClick={onReset} 
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            New Upload
          </button>
        </div>
      </div>
      
      {/* Tab navigation */}
      <div className="border-b mb-4 flex space-x-4">
        {(data.summary ? ['summary', 'decisions', 'actions', 'transcript'] : ['transcript']).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Tab content */}
      {activeTab === 'summary' && (
        <div>
          {data.participants && data.participants.length > 0 && (
            <>
              <h3 className="font-semibold mb-2">Participants</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {data.participants.map((p, i) => (
                  <span 
                    key={i} 
                    className="bg-gray-100 px-3 py-1 rounded-full text-sm"
                  >
                    {p.name} {p.role && `(${p.role})`}
                  </span>
                ))}
              </div>
            </>
          )}
          {data.date && (
            <p className="text-sm text-gray-500 mb-4">Date: {data.date}</p>
          )}
          {data.duration && (
            <p className="text-sm text-gray-500 mb-4">Duration: {data.duration}</p>
          )}
          <h3 className="font-semibold mb-2">Summary</h3>
          {data.summary ? (
            <p className="text-gray-700 whitespace-pre-wrap mb-4">{data.summary}</p>
          ) : (
            <p className="text-gray-500 mb-4">Summary disabled. Showing transcript only.</p>
          )}
          {data.key_points && data.key_points.length > 0 && (
            <>
              <h3 className="font-semibold mb-2">Key Points</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {data.key_points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      
      {activeTab === 'decisions' && (
        <div>
          {data.decisions && data.decisions.length > 0 ? (
            <ul className="space-y-3">
              {data.decisions.map((d, i) => (
                <li key={i} className="border-l-4 border-green-500 pl-4">
                  <p className="font-medium">{d.description}</p>
                  {d.context && (
                    <p className="text-sm text-gray-500 mt-1">{d.context}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No decisions recorded.</p>
          )}
        </div>
      )}
      
      {activeTab === 'actions' && (
        <div>
          {data.action_items && data.action_items.length > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-4">Task</th>
                  <th className="text-left py-2 px-4">Assignee</th>
                  <th className="text-left py-2 px-4">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {data.action_items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-2 px-4">{item.task}</td>
                    <td className="py-2 px-4">{item.assignee || '—'}</td>
                    <td className="py-2 px-4">{item.deadline || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No action items recorded.</p>
          )}
        </div>
      )}
      
      {activeTab === 'transcript' && (
        <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-gray-700">
            {data.transcript}
          </pre>
        </div>
      )}
    </div>
  );
}
