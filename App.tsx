import React, { useState, useEffect, useCallback } from 'react';
import { fetchMarketData, calculateSMA, runBacktest } from './services/marketService';
import { analyzeStrategyWithAI, generateAiTradingSignals } from './services/aiService';
import { MarketData, StrategyConfig, BacktestResult, AiSettings } from './types';
import { Controls } from './components/Controls';
import { Visualizer } from './components/Visualizer';
import { Settings } from './components/Settings';

const App: React.FC = () => {
  // --- AI Settings State ---
  const [showSettings, setShowSettings] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => {
      const saved = localStorage.getItem('neuroquant_settings');
      if (saved) return JSON.parse(saved);
      
      let envKey = '';
      try {
        // Safe access to process.env
        if (typeof process !== 'undefined' && process && process.env) {
            envKey = process.env.API_KEY || '';
        }
      } catch (e) {
        // ignore error in browsers where process is not defined
      }

      return {
          provider: 'GEMINI',
          apiKey: envKey,
          modelName: 'gemini-2.5-flash',
          baseUrl: ''
      };
  });

  const handleSaveSettings = (newSettings: AiSettings) => {
      setAiSettings(newSettings);
      localStorage.setItem('neuroquant_settings', JSON.stringify(newSettings));
  };

  // --- App State ---
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isSimulation, setIsSimulation] = useState(false);

  const [config, setConfig] = useState<StrategyConfig>({
    mode: 'ALGO', 
    exchange: 'BINANCE',
    symbol: 'BTC',
    initialCapital: 10000,
    shortWindow: 10,
    longWindow: 50,
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    useRsiFilter: false,
  });
  
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [shortMA, setShortMA] = useState<number[]>([]);
  const [longMA, setLongMA] = useState<number[]>([]);
  
  // AI Execution State
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isAiTrading, setIsAiTrading] = useState(false); 
  const [aiAnalysis, setAiAnalysis] = useState<{analysis: string, suggestions: string[]} | null>(null);
  const [aiLearningStep, setAiLearningStep] = useState<string>(''); 

  const [showInstallModal, setShowInstallModal] = useState(false);

  // Load Data Effect
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      setDataError(null);
      setResults(null);
      
      try {
        const result = await fetchMarketData(config.symbol, config.exchange);
        setMarketData(result.data);
        setIsSimulation(result.isSimulation);
        if (result.isSimulation) {
            setDataError(`Connection to ${config.exchange} blocked. Using High-Fidelity Simulation.`);
        }
      } catch (error) {
        console.error(error);
        setDataError("Exchange connection failed completely.");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [config.symbol, config.exchange]);

  // Run Backtest Logic
  const handleRunBacktest = useCallback(async () => {
    if (marketData.length === 0) return;

    setAiAnalysis(null);

    const sMA = calculateSMA(marketData, config.shortWindow);
    const lMA = calculateSMA(marketData, config.longWindow);
    setShortMA(sMA);
    setLongMA(lMA);

    if (config.mode === 'AI') {
        if (!aiSettings.apiKey) {
            alert("Please configure your AI API Key in Settings first.");
            setShowSettings(true);
            return;
        }

        setIsAiTrading(true);
        
        const steps = [
            `Connecting to ${aiSettings.provider} Neural Net...`,
            `Analysing ${config.exchange} Order Flow...`,
            "Detecting Whale Accumulation Patterns...",
            "Finalizing Trade Signals..."
        ];

        for (const step of steps) {
            setAiLearningStep(step);
            await new Promise(r => setTimeout(r, 800)); 
        }
        
        const aiSignals = await generateAiTradingSignals(marketData, aiSettings);
        const res = runBacktest(marketData, config, aiSignals);
        setResults(res);
        setIsAiTrading(false);
        setAiLearningStep('');
    } else {
        const res = runBacktest(marketData, config);
        setResults(res);
    }

  }, [marketData, config, aiSettings]);

  // Initial Run
  useEffect(() => {
    if(marketData.length > 0 && !results && !isLoadingData && !isAiTrading) {
         handleRunBacktest(); 
    }
  }, [marketData, isLoadingData, handleRunBacktest]);

  const handleAskAI = async () => {
    if (!results) return;
    if (!aiSettings.apiKey) {
        setShowSettings(true);
        return;
    }
    setIsAnalyzing(true);
    const response = await analyzeStrategyWithAI(config, results, aiSettings);
    setAiAnalysis(response);
    setIsAnalyzing(false);
  };

  const StatCard = ({ label, value, color }: { label: string, value: string, color?: string }) => (
    <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center min-h-[100px]">
      <span className="text-slate-500 text-[10px] uppercase tracking-widest mb-2">{label}</span>
      <span className={`text-2xl font-mono font-bold ${color || 'text-white'}`}>{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans selection:bg-purple-500 selection:text-white pb-20">
      
      {/* Modals */}
      <Settings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        currentSettings={aiSettings}
        onSave={handleSaveSettings}
      />

      {showInstallModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                <button onClick={() => setShowInstallModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-purple-500">➜</span> Install NeuroQuant
                </h3>
                 <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">🍎 iPhone (Safari)</h4>
                        <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                            <li>Tap the <span className="text-white font-bold">Share Button</span> (Bottom center).</li>
                            <li>Scroll down and tap <span className="text-white font-bold">Add to Home Screen</span>.</li>
                            <li>Tap <span className="text-white font-bold">Add</span> at the top right.</li>
                        </ol>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">🤖 Android (Chrome)</h4>
                        <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                            <li>Tap the <span className="text-white font-bold">Menu (⋮)</span> at top right.</li>
                            <li>Select <span className="text-white font-bold">Install App</span> or "Add to Home Screen".</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.5)]">
               <span className="font-bold text-white text-lg">N</span>
            </div>
            <div>
                <h1 className="text-lg font-bold tracking-tight text-white font-mono leading-none">NEURO<span className="text-purple-500">QUANT</span></h1>
                <p className="text-[9px] text-slate-500 font-mono tracking-wider">
                    {aiSettings.provider === 'GEMINI' ? 'GOOGLE GEMINI' : aiSettings.provider === 'DEEPSEEK' ? 'DEEPSEEK AI' : aiSettings.provider}
                </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-white transition p-2 hover:bg-white/5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
             </button>
             <button onClick={() => setShowInstallModal(true)} className="text-xs text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 px-3 py-1.5 rounded-full transition hidden md:block">
                 Install App
             </button>
             <div className="md:hidden">
                 <button onClick={() => setShowInstallModal(true)} className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-full text-xs font-bold text-purple-400 transition">
                    INSTALL
                 </button>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Loading / Learning Overlay */}
        {(isLoadingData || isAiTrading) && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4 text-center">
                <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-purple-900 rounded-full opacity-20"></div>
                    <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
                {isLoadingData ? (
                    <p className="text-purple-400 font-mono animate-pulse text-lg">Connecting to {config.exchange} Feed...</p>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xl font-bold text-white tracking-wider">NEUROQUANT LEARNING</p>
                        <p className="text-purple-400 font-mono text-sm animate-pulse">{aiLearningStep}</p>
                    </div>
                )}
            </div>
        )}

        {/* Warning Banner for Simulation */}
        {isSimulation && !isLoadingData && (
             <div className="bg-yellow-900/20 border border-yellow-700/50 p-2 rounded text-center">
                 <p className="text-[10px] text-yellow-500 font-mono">
                    ⚠ DIRECT CONNECTION BLOCKED (CORS). SHOWING HIGH-FIDELITY {config.exchange} SIMULATION.
                 </p>
             </div>
        )}

        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
             <Controls 
                config={config} 
                setConfig={setConfig} 
                onRun={handleRunBacktest}
                isAnalyzing={isAnalyzing}
                isAiTrading={isAiTrading}
             />
             {!isLoadingData && marketData.length > 0 && (
                <Visualizer 
                    data={marketData} 
                    shortMA={shortMA} 
                    longMA={longMA} 
                    results={results}
                />
             )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
               <StatCard 
                 label="ROI" 
                 value={results ? `${results.totalReturn.toFixed(2)}%` : '0.00%'} 
                 color={results && results.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}
               />
               <StatCard 
                 label="Balance" 
                 value={results ? `$${results.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '$10,000'}
               />
               <StatCard 
                 label="Drawdown" 
                 value={results ? `${results.maxDrawdown.toFixed(2)}%` : '0.00%'}
                 color="text-red-400"
               />
               <StatCard 
                 label="Win Rate" 
                 value={results ? `${results.winRate.toFixed(2)}%` : '0.00%'}
                 color="text-purple-400"
               />
            </div>

            {/* AI Analysis */}
            <div className="glass-panel rounded-xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <div className="p-5 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2 font-mono text-sm">
                    <span className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_#a855f7]"></span>
                    STRATEGY REPORT
                  </h3>
                  <button 
                    onClick={handleAskAI}
                    disabled={isAnalyzing || isAiTrading || !results}
                    className="text-[10px] border border-slate-700 hover:bg-slate-800 text-slate-300 px-3 py-1 rounded transition uppercase tracking-wide disabled:opacity-50"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Risk'}
                  </button>
                </div>

                {aiAnalysis ? (
                  <div className="space-y-4 animate-fadeIn">
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">
                      {aiAnalysis.analysis}
                    </p>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Optimization Protocols</p>
                      {aiAnalysis.suggestions.map((s, i) => (
                        <div key={i} className="flex gap-2 text-xs text-slate-400">
                          <span className="text-purple-500">➜</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-600 text-xs font-mono">
                    {isAnalyzing ? "Processing Strategy Metrics..." : (results ? "Strategy ready. Click 'Analyze Risk' for insights." : "Loading Strategy...")}
                  </div>
                )}
              </div>
            </div>

            {/* Trade Log */}
            <div className="glass-panel rounded-xl p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                <h4 className="text-[10px] font-bold text-slate-500 mb-3 sticky top-0 bg-black/80 backdrop-blur pb-2 border-b border-slate-800 uppercase tracking-widest">Execution Log</h4>
                <div className="space-y-2">
                    {results?.trades.slice().reverse().map((trade, i) => (
                        <div key={i} className="flex flex-col text-xs p-2 rounded hover:bg-white/5 transition border-l-2 border-slate-800 hover:border-purple-500">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-500 font-mono">{trade.date}</span>
                                <span className={`font-bold px-1.5 rounded-sm ${trade.type === 'BUY' ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                                    {trade.type}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300 font-mono">
                                    ${trade.price.toLocaleString()}
                                </span>
                                {trade.reason && (
                                    <span className="text-[9px] text-purple-400/80 italic max-w-[140px] text-right truncate">
                                        {trade.reason}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {(!results?.trades || results.trades.length === 0) && (
                        <div className="text-center text-slate-700 text-xs py-4 font-mono">NO TRADES RECORDED</div>
                    )}
                </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;