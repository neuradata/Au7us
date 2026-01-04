
import React from 'react';
import { ProcessedFile, FileStatus } from '../types';

interface FileListProps {
  files: ProcessedFile[];
  onRemove: (id: string) => void;
  onView: (file: ProcessedFile) => void;
  onRegenerate: (id: string) => void;
}

const FileList: React.FC<FileListProps> = ({ files, onRemove, onView, onRegenerate }) => {
  const downloadFile = (fileItem: ProcessedFile) => {
    if (fileItem.status !== FileStatus.COMPLETED) return;

    const blobToDownload = fileItem.processedBlob || fileItem.file;
    const url = URL.createObjectURL(blobToDownload);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileItem.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (files.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4">
      {files.map((item) => (
        <div 
          key={item.id} 
          className={`relative bg-gray-800 rounded-lg p-4 flex gap-4 border transition-colors ${
            item.status === FileStatus.COMPLETED ? 'border-green-500/50 bg-green-900/10' : 
            item.status === FileStatus.ERROR ? 'border-red-500/50 bg-red-900/10' :
            item.status === FileStatus.PROCESSING ? 'border-brand-blue/50' : 'border-gray-700'
          }`}
        >
          <div className="w-24 h-24 flex-shrink-0 bg-gray-900 rounded overflow-hidden relative group">
            {item.file.type.startsWith('video') ? (
               <video src={item.previewUrl} className="w-full h-full object-cover opacity-70" muted />
            ) : (
               <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover" />
            )}
            
            {item.status === FileStatus.COMPLETED && (
                <div 
                    onClick={() => onView(item)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-10"
                >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {item.status === FileStatus.PROCESSING && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-all">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-brand-blue animate-spin blur-sm opacity-80"></div>
                        <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-brand-blue to-yellow-500 shadow-inner flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            <div className="absolute top-2 left-2 w-3 h-2 bg-white/60 rounded-full blur-[1px] transform -rotate-45"></div>
                        </div>
                    </div>
                </div>
              )}
              {item.status === FileStatus.COMPLETED && (
                <div className="bg-green-500 rounded-full p-1 shadow-lg group-hover:opacity-0 transition-opacity">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
              )}
              {item.status === FileStatus.ERROR && (
                <div className="bg-red-500 rounded-full p-1 shadow-lg">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-gray-200 truncate pr-2">{item.file.name}</h4>
              <button 
                onClick={() => onRemove(item.id)}
                className="text-gray-500 hover:text-red-400 transition-colors"
                disabled={item.status === FileStatus.PROCESSING}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>

            {item.status === FileStatus.COMPLETED && item.metadata ? (
              <div className="space-y-1 text-sm">
                <p className="text-gray-300 line-clamp-1"><span className="text-brand-blue font-medium">Title:</span> {item.metadata.title}</p>
                <p className="text-gray-400 text-xs">{item.metadata.keywords.length} keywords generated.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    <button 
                      onClick={() => onView(item)}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-colors border border-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                      View
                    </button>
                    <button 
                      onClick={() => downloadFile(item)}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download
                    </button>
                    <button 
                      onClick={() => onRegenerate(item.id)}
                      className="bg-brand-blue/80 hover:bg-brand-blue text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                      title="Regenerate individual metadata"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      Regenerate
                    </button>
                </div>
              </div>
            ) : item.status === FileStatus.ERROR ? (
               <div className="flex flex-col gap-2">
                 <p className="text-red-400 text-sm mt-1">{item.error || 'Failed to process'}</p>
                 <button 
                   onClick={() => onRegenerate(item.id)}
                   className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded w-fit flex items-center gap-1 transition-colors"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                   Retry
                 </button>
               </div>
            ) : (
               <div className="text-gray-500 text-sm mt-1 italic">Waiting for processing...</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileList;
