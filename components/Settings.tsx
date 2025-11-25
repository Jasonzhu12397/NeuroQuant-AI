
import React, { useState, useEffect } from 'react';
import { AiSettings, AiProvider } from '../types';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: AiSettings;
    onSave: (settings: AiSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
    const [provider, setProvider] = useState<AiProvider>(currentSettings.provider);
    const [apiKey, setApiKey] = useState(currentSettings.apiKey);
    const [baseUrl, setBaseUrl] = useState(currentSettings.baseUrl || '');
    const [modelName, setModelName] = useState(currentSettings.modelName);

    // Reset local state when modal opens with new props
    useEffect(() => {
        if (isOpen) {
            setProvider(currentSettings.provider);
            setApiKey(currentSettings.apiKey);
            setBaseUrl(currentSettings.baseUrl || '');
            setModelName(currentSettings.modelName);
        }
    }, [isOpen, currentSettings]);

    // Auto-fill defaults when provider changes
    useEffect(() => {
        if (provider === 'DEEPSEEK') {
            if (!baseUrl) setBaseUrl('https://api.deepseek.com');
            if (!modelName || modelName.includes('gemini')) setModelName('deepseek-chat');
        } else if (provider === 'GEMINI') {
            if (!modelName || !modelName.includes('gemini')) setModelName('gemini-2.5-flash');
        } else if (provider === 'OPENAI') {
            if (!baseUrl) setBaseUrl('https://api.openai.com/v1');
            if (!modelName || !modelName.includes('gpt')) setModelName('gpt-4o');
        }
    }, [provider]);

    const handleSave = () => {
        onSave({
            provider,
            apiKey,
            baseUrl: baseUrl.trim(),
            modelName: modelName.trim()
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
                
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-mono">
                    <span className="text-purple-500">⚙</span> AI CONFIGURATION
                </h3>

                <div className="space-y-5">
                    
                    {/* Provider Select */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Model Provider</label>
                        <select 
                            value={provider} 
                            onChange={(e) => setProvider(e.target.value as AiProvider)}
                            className="w-full bg-black border border-slate-800 text-white rounded px-3 py-3 font-mono text-sm focus:border-purple-500 focus:outline-none"
                        >
                            <option value="GEMINI">Google Gemini (Recommended)</option>
                            <option value="DEEPSEEK">DeepSeek (China)</option>
                            <option value="OPENAI">OpenAI (GPT-4)</option>
                            <option value="CUSTOM">Custom / Other (Qwen/Yi)</option>
                        </select>
                    </div>

                    {/* API Key */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">API Key</label>
                        <input 
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={provider === 'DEEPSEEK' ? "sk-..." : "Enter API Key"}
                            className="w-full bg-black border border-slate-800 text-white rounded px-3 py-3 font-mono text-sm focus:border-purple-500 focus:outline-none placeholder-slate-700"
                        />
                        <p className="text-[10px] text-slate-600">Keys are stored locally on your device.</p>
                    </div>

                    {/* Model Name */}
                    <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Model Name</label>
                         <input 
                            type="text"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            className="w-full bg-black border border-slate-800 text-white rounded px-3 py-3 font-mono text-sm focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    {/* Base URL (Conditional) */}
                    {(provider !== 'GEMINI') && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">API Base URL</label>
                            <input 
                                type="text"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                placeholder="https://api.example.com/v1"
                                className="w-full bg-black border border-slate-800 text-white rounded px-3 py-3 font-mono text-sm focus:border-purple-500 focus:outline-none placeholder-slate-700"
                            />
                            {provider === 'DEEPSEEK' && <p className="text-[9px] text-slate-600">Default: https://api.deepseek.com</p>}
                        </div>
                    )}

                    <div className="pt-4">
                        <button 
                            onClick={handleSave}
                            className="w-full bg-purple-900 hover:bg-purple-800 text-white font-bold py-3 rounded-lg font-mono tracking-wider transition border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        >
                            SAVE CONFIGURATION
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
