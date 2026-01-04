
import React, { useState, useEffect } from 'react';
import { ProcessedFile, Metadata } from '../types';

interface MetadataModalProps {
  file: ProcessedFile;
  onSave: (id: string, metadata: Metadata) => void;
  onClose: () => void;
}

const MetadataModal: React.FC<MetadataModalProps> = ({ file, onSave, onClose }) => {
  const [draft, setDraft] = useState<Metadata>(file.metadata || { title: '', description: '', keywords: [] });
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    if (file.metadata) setDraft(file.metadata);
  }, [file.metadata]);

  const handleSave = () => {
    onSave(file.id, draft);
    onClose();
  };

  const removeKeyword = (idx: number) => {
    setDraft({ ...draft, keywords: draft.keywords.filter((_, i) => i !== idx) });
  };

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !draft.keywords.includes(kw)) {
      setDraft({ ...draft, keywords: [...draft.keywords, kw] });
      setNewKeyword('');
    }
  };

  if (!file.metadata) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50">
          <h3 className="text-lg font-semibold text-white">Edit Metadata: {file.file.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden border border-gray-700 bg-gray-900 aspect-video flex items-center justify-center">
              {file.file.type.startsWith('video') ? <video src={file.previewUrl} controls className="max-w-full max-h-full" /> : <img src={file.previewUrl} className="max-w-full max-h-full object-contain" />}
            </div>
            <div className="p-4 bg-gray-900/30 rounded-lg text-xs text-gray-500 font-mono space-y-1">
                <p>Mime: {file.file.type}</p>
                <p>Status: <span className="text-green-400">{file.status}</span></p>
                <p>File Size: {(file.file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-brand-blue uppercase mb-1 block">Title</label>
              <textarea 
                value={draft.title} 
                onChange={e => setDraft({ ...draft, title: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-sm text-gray-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue h-24"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Description</label>
              <textarea 
                value={draft.description} 
                onChange={e => setDraft({ ...draft, description: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-sm text-gray-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue h-32"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-green-400 uppercase mb-1 block">Keywords ({draft.keywords.length})</label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={newKeyword} 
                  onChange={e => setNewKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addKeyword()}
                  placeholder="Add tag..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200"
                />
                <button onClick={addKeyword} className="bg-green-600 px-4 py-2 rounded text-xs font-bold">Add</button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-900/50 rounded border border-gray-700">
                {draft.keywords.map((kw, i) => (
                  <span key={i} className="flex items-center gap-1 bg-gray-700 text-gray-200 px-2 py-1 rounded-full text-xs border border-gray-600 group">
                    {kw}
                    <button onClick={() => removeKeyword(i)} className="text-gray-500 hover:text-red-400 ml-1">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 text-sm text-gray-400 hover:text-white transition-colors">Discard</button>
            <button onClick={handleSave} className="bg-brand-blue hover:opacity-90 text-white px-8 py-2 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95">Apply & Save to File</button>
        </div>
      </div>
    </div>
  );
};

export default MetadataModal;
