import React from 'react';
import { StrategyConfig, SupportedAssets, Exchange } from '../types';

interface ControlsProps {
  config: StrategyConfig;
  setConfig: React.Dispatch<React.SetStateAction<StrategyConfig>>;
  onRun: () => void;
  isAnalyzing: boolean;
  isAiTrading: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ config, setConfig, onRun, isAnalyzing, isAiTrading }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'symbol' || name === 'exchange' ? value : Number(value))
    }));
  };

  const toggleMode = (mode: 'ALGO' | 'AI') => {
      setConfig(prev => ({ ...prev, mode }));
  };

  return (
    <div className="glass-panel p-6 rounded-xl mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-lg font-mono tracking-widest text-slate-400 flex items-center gap-2 uppercase">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
           Control Deck
        </h2>
        
        {/* Mode Toggles */}
        <div className="bg-black/50 p-1 rounded-lg flex border border-white/10 self-start md:self-auto">
            <button 
                onClick={() => toggleMode('ALGO')}
                className={`px-6 py-2 rounded-md text-xs font-bold font-mono uppercase tracking-wider transition-all ${config.mode === 'ALGO' ? 'bg-slate-800 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Classic Algo
            </button>
            <button 
                onClick={() => toggleMode('AI')}
                className={`px-6 py-2 rounded-md text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${config.mode === 'AI' ? 'bg-purple-900/50 text-purple-400 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
            >
                NeuroQuant AI
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        
        {/* Overlay for AI Mode */}
        {config.mode === 'AI' && (
            <div className="absolute inset-0 top-16 bg-black/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4 border border-purple-500/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center mb-2 animate-pulse border border-purple-500/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d8b4fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12L2.1 12.1"></path><path d="M12 12l4.5-4.5"></path></svg>
                </div>
                <p className="text-purple-300 font-bold font-mono tracking-wider mb-1">AUTO-PILOT ACTIVE</p>
                <p className="text-xs text-slate-500 max-w-xs">NeuroQuant is analyzing {config.exchange} order books and whale movements autonomously.</p>
            </div>
        )}

        {/* Exchange Selector */}
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Source</label>
            <div className="relative group">
                <select
                    name="exchange"
                    value={config.exchange}
                    onChange={handleChange}
                    disabled={isAiTrading}
                    className="w-full bg-black border border-slate-800 text-slate-200 rounded px-3 py-3 appearance-none focus:outline-none focus:border-purple-500 transition font-mono text-sm group-hover:border-slate-600"
                >
                    <option value="BINANCE">Binance (Public)</option>
                    <option value="OKX">OKX (V5 API)</option>
                    <option value="COINBASE">Coinbase Pro</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>

        {/* Asset Selector */}
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Asset</label>
            <div className="relative group">
                <select
                    name="symbol"
                    value={config.symbol}
                    onChange={handleChange}
                    disabled={isAiTrading}
                    className="w-full bg-black border border-slate-800 text-slate-200 rounded px-3 py-3 appearance-none focus:outline-none focus:border-purple-500 transition font-mono text-sm group-hover:border-slate-600"
                >
                    {SupportedAssets.map(asset => (
                        <option key={asset.value} value={asset.value}>{asset.label}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>

        {/* Moving Averages */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MA Short (Days)</label>
          <input
            type="number"
            name="shortWindow"
            value={config.shortWindow}
            onChange={handleChange}
            className="w-full bg-black border border-slate-800 text-slate-200 rounded px-3 py-3 focus:outline-none focus:border-cyan-500 transition font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MA Long (Days)</label>
          <input
            type="number"
            name="longWindow"
            value={config.longWindow}
            onChange={handleChange}
            className="w-full bg-black border border-slate-800 text-slate-200 rounded px-3 py-3 focus:outline-none focus:border-indigo-500 transition font-mono text-sm"
          />
        </div>

        {/* Action */}
        <div className="flex items-end z-20 col-span-1 lg:col-span-4 mt-2">
          <button
            onClick={onRun}
            disabled={isAnalyzing || isAiTrading}
            className={`w-full font-bold font-mono tracking-widest py-4 px-4 rounded-lg shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase border border-white/5 relative overflow-hidden group ${
                config.mode === 'AI' 
                ? 'bg-purple-900 text-purple-100 hover:bg-purple-800' 
                : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${config.mode === 'AI' ? 'from-purple-600/20 to-pink-600/20' : 'from-cyan-600/20 to-blue-600/20'} translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700`}></div>
            <span className="relative z-10 flex items-center justify-center gap-3">
                {isAiTrading ? (
                    <>
                     <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                     Initializing NeuroQuant Engine...
                    </>
                ) : config.mode === 'AI' ? (
                    <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    Activate AI Strategy
                    </>
                ) : (
                    <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    Run Simulation
                    </>
                )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};