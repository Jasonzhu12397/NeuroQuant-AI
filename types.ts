export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
}

export interface MarketData {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export interface Trade {
  date: string;
  type: SignalType;
  price: number;
  amount: number;
  balanceAfter: number;
  reason?: string; 
}

export const SupportedAssets = [
  { label: 'Bitcoin (BTC)', value: 'BTC' },
  { label: 'Ethereum (ETH)', value: 'ETH' },
  { label: 'Solana (SOL)', value: 'SOL' },
  { label: 'Dogecoin (DOGE)', value: 'DOGE' },
  { label: 'XRP (XRP)', value: 'XRP' },
  { label: 'BNB (BNB)', value: 'BNB' },
  { label: 'Cardano (ADA)', value: 'ADA' },
  { label: 'Pepe (PEPE)', value: 'PEPE' },
];

export type AiProvider = 'GEMINI' | 'DEEPSEEK' | 'OPENAI' | 'CUSTOM';
export type Exchange = 'BINANCE' | 'OKX' | 'COINBASE';

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
  baseUrl?: string; // For DeepSeek/Custom/OpenAI proxies
  modelName: string; // e.g., 'gemini-2.5-flash', 'deepseek-chat', 'gpt-4o'
}

export interface StrategyConfig {
  mode: 'ALGO' | 'AI';
  exchange: Exchange;
  symbol: string; 
  initialCapital: number;
  shortWindow: number; 
  longWindow: number;  
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  useRsiFilter: boolean;
}

export interface BacktestResult {
  trades: Trade[];
  finalBalance: number;
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  history: { date: string; balance: number }[];
}

export interface AnalysisResponse {
  analysis: string;
  suggestions: string[];
}

export interface AiSignal {
  date: string;
  action: SignalType;
  reason: string;
  confidence?: number; // 0-100
  strategySource?: string; // e.g., "Whale Accumulation", "Black Swan Reversion"
}