
import React from 'react';
import { AppConfig } from '../types';
import { DEFAULT_CONFIG } from '../constants';

interface SettingsPanelProps {
  config: AppConfig;
  setConfig: (config: AppConfig) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-200 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        Metadata Configuration
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title Settings */}
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-brand-blue uppercase tracking-wider">Title Constraints</h4>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Min Length</label>
                    <input 
                        type="number" 
                        value={config.minTitleLength}
                        onChange={(e) => setConfig({...config, minTitleLength: Number(e.target.value)})}
                        min={100}
                        max={config.maxTitleLength}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Max Length</label>
                    <input 
                        type="number" 
                        value={config.maxTitleLength}
                        onChange={(e) => setConfig({...config, maxTitleLength: Number(e.target.value)})}
                        min={config.minTitleLength}
                        max={200}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                    />
                </div>
            </div>
            <p className="text-xs text-gray-500">Hard limit: 200 chars.</p>
        </div>

        {/* Keyword Settings */}
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-green-400 uppercase tracking-wider">Keyword Constraints</h4>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Min Count</label>
                    <input 
                        type="number" 
                        value={config.minKeywords}
                        onChange={(e) => setConfig({...config, minKeywords: Number(e.target.value)})}
                        min={10}
                        max={config.maxKeywords}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Max Count</label>
                    <input 
                        type="number" 
                        value={config.maxKeywords}
                        onChange={(e) => setConfig({...config, maxKeywords: Number(e.target.value)})}
                        min={config.minKeywords}
                        max={50}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                    />
                </div>
            </div>
            <p className="text-xs text-gray-500">Hard limit: 50 keywords.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
