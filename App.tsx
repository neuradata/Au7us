
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Splash from './components/Splash';
import FileList from './components/FileList';
import SettingsPanel from './components/SettingsPanel';
import MetadataModal from './components/MetadataModal';
import AboutModal from './components/AboutModal';
import { ProcessedFile, FileStatus, AppConfig, Metadata } from './types';
import { DEFAULT_CONFIG, ACCEPTED_IMAGE_TYPES, ACCEPTED_VIDEO_TYPES, MAX_FILES } from './constants';
import { generateMetadata } from './services/geminiService';
import { embedMetadata } from './utils/fileHelpers';

const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [viewingFile, setViewingFile] = useState<ProcessedFile | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoPlaceholderRef = useRef<HTMLDivElement>(null);
  const [logoPos, setLogoPos] = useState({ top: 0, left: 0, scale: 1, isFixed: false });

  const filesRef = useRef<ProcessedFile[]>(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const completedCount = files.filter(f => f.status === FileStatus.COMPLETED).length;

  useEffect(() => {
    const updateLogoPos = () => {
      if (isAboutOpen) {
        setLogoPos({ top: window.innerHeight * 0.35, left: window.innerWidth / 2, scale: 2.5, isFixed: true });
      } else if (logoPlaceholderRef.current) {
        const rect = logoPlaceholderRef.current.getBoundingClientRect();
        setLogoPos({ top: rect.top + rect.height / 2, left: rect.left + rect.width / 2, scale: 1, isFixed: false });
      }
    };
    updateLogoPos();
    window.addEventListener('resize', updateLogoPos);
    return () => window.removeEventListener('resize', updateLogoPos);
  }, [isAboutOpen, showSplash]);

  const addFiles = (newFiles: File[]) => {
    if (files.length + newFiles.length > MAX_FILES) {
      alert(`Max ${MAX_FILES} files allowed.`); return;
    }
    const processed = newFiles.map(file => ({
      id: generateId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: FileStatus.PENDING
    }));
    setFiles(prev => [...prev, ...processed]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = (Array.from(e.dataTransfer.files) as File[]).filter(f => 
      ACCEPTED_IMAGE_TYPES.includes(f.type) || ACCEPTED_VIDEO_TYPES.includes(f.type)
    );
    addFiles(dropped);
  };

  const processSingleFile = async (fileItem: ProcessedFile) => {
    setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: FileStatus.PROCESSING, error: undefined } : f));
    let success = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (!success && retryCount < MAX_RETRIES) {
      if (!filesRef.current.find(f => f.id === fileItem.id)) return;
      try {
        const metadata = await generateMetadata(fileItem.file, config);
        const lowerTitle = (metadata.title || "").toLowerCase();
        const isPlaceholder = lowerTitle.includes("solid black background") || lowerTitle.includes("black frame") || lowerTitle === "untitled content";

        if (fileItem.file.type.startsWith('video') && isPlaceholder) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) throw new Error("Video frame extraction failed (Black Frame detected).");
          await new Promise(r => setTimeout(r, 1000)); continue;
        }

        const processedBlob = await embedMetadata(fileItem.file, metadata);
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { 
          ...f, status: FileStatus.COMPLETED, metadata, processedBlob, error: undefined 
        } : f));
        success = true;
      } catch (error: any) {
        const errorMessage = error.message || "Unknown error";
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: FileStatus.ERROR, error: errorMessage } : f));
        await new Promise(r => setTimeout(r, 2000)); break;
      }
    }
  };

  const updateMetadataAndReEmbed = async (id: string, updatedMetadata: Metadata) => {
    const fileItem = files.find(f => f.id === id);
    if (!fileItem) return;
    try {
      const processedBlob = await embedMetadata(fileItem.file, updatedMetadata);
      setFiles(prev => prev.map(f => f.id === id ? { ...f, metadata: updatedMetadata, processedBlob } : f));
    } catch (err) { alert("Failed to re-embed metadata."); }
  };

  const processFiles = async () => {
    setIsProcessing(true);
    const pending = files.filter(f => f.status === FileStatus.PENDING || f.status === FileStatus.ERROR);
    const LIMIT = 5;
    const executing: Promise<void>[] = [];
    for (const item of pending) {
      const p = processSingleFile(item).then(() => { executing.splice(executing.indexOf(p), 1); });
      executing.push(p);
      if (executing.length >= LIMIT) await Promise.race(executing);
    }
    await Promise.all(executing);
    setIsProcessing(false);
  };

  const handleDownloadAll = async () => {
    const completed = files.filter(f => f.status === FileStatus.COMPLETED);
    if (completed.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new window.JSZip();
      completed.forEach(item => { zip.file(item.file.name, item.processedBlob || item.file); });
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url; a.download = `Fotag_Export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { alert("Zip failed."); } finally { setIsZipping(false); }
  };

  return (
    <>
      {showSplash && <Splash onComplete={() => setShowSplash(false)} />}
      <div className={`min-h-screen flex flex-col transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        {!showSplash && (
          <div style={{ position: 'fixed', top: logoPos.top, left: logoPos.left, transform: `translate(-50%, -50%) scale(${logoPos.scale})`, zIndex: isAboutOpen ? 100 : 50, pointerEvents: isAboutOpen ? 'auto' : 'none' }} className={`flex items-center gap-2 transition-all ease-in-out ${isAboutOpen ? 'duration-700' : 'duration-0'}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-yellow-500 animate-spin"></div>
              <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-green-500 to-brand-blue animate-hue-cycle select-none transform-gpu">Fotag</h1>
          </div>
        )}
        <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div ref={logoPlaceholderRef} className="w-24 h-8 opacity-0 pointer-events-none"></div>
            <div className="text-sm text-gray-400 font-mono">{files.length} / {MAX_FILES} Files</div>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full p-6">
          <SettingsPanel config={config} setConfig={setConfig} />
          <div onDragOver={e => e.preventDefault()} onDrop={handleDrop} className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 mb-8 ${isProcessing ? 'opacity-50' : 'hover:border-brand-blue hover:bg-gray-800 cursor-pointer'}`}>
             <input type="file" multiple ref={fileInputRef} onChange={e => e.target.files && addFiles(Array.from(e.target.files))} accept=".jpg,.jpeg,.png,.mp4,.mov" className="hidden" id="file-upload" />
             <label htmlFor="file-upload" className="flex flex-col items-center justify-center gap-4 cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center"><svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg></div>
                <div><h3 className="text-xl font-semibold text-gray-200">Drag & Drop Videos/Images</h3><p className="text-gray-500 mt-2">MP4, MOV, JPG, PNG supported</p></div>
             </label>
          </div>
          {files.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-gray-800/50 p-4 rounded-lg border border-gray-700 gap-4">
                <div className="text-gray-300">
                    <span className="font-bold text-white">{files.filter(f => f.status === FileStatus.PENDING).length}</span> pending
                    {files.filter(f => f.status === FileStatus.ERROR).length > 0 && <span className="ml-2 text-red-400">{files.filter(f => f.status === FileStatus.ERROR).length} errors</span>}
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setFiles([])} disabled={isProcessing} className="px-4 py-2 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg">Clear All</button>
                    {completedCount > 0 && <button onClick={handleDownloadAll} disabled={isZipping} className="px-5 py-2 bg-green-900/50 text-green-400 border border-green-600/30 rounded-lg">Download All</button>}
                    <button onClick={processFiles} disabled={isProcessing} className="px-6 py-2 bg-brand-blue hover:opacity-90 text-white rounded-lg font-bold">Start Batch</button>
                </div>
            </div>
          )}
          <FileList files={files} onRemove={id => setFiles(prev => prev.filter(f => f.id !== id))} onView={setViewingFile} onRegenerate={processSingleFile} />
        </main>
        <footer className="bg-gray-900 border-t border-gray-800 py-6 text-center select-none relative">
            <p className="text-gray-500 text-sm font-mono tracking-wide">ⓒ 2026 Neura Data / Fotag - Stock Metadata Tool</p>
            <button onClick={() => setIsAboutOpen(true)} className="absolute right-6 bottom-6 text-gray-600 hover:text-gray-400 text-xs uppercase font-bold">About</button>
        </footer>
        {viewingFile && <MetadataModal file={viewingFile} onSave={updateMetadataAndReEmbed} onClose={() => setViewingFile(null)} />}
        {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
      </div>
    </>
  );
};

export default App;
