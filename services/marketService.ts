import { MarketData, StrategyConfig, BacktestResult, Trade, SignalType, AiSignal, Exchange } from '../types';

// --- Helper: Symbol Mapping ---
const getExchangeSymbol = (asset: string, exchange: Exchange): string => {
  // asset is usually "BTC", "ETH"
  switch (exchange) {
    case 'OKX': return `${asset}-USDT`;
    case 'COINBASE': return `${asset}-USD`;
    case 'BINANCE': default: return `${asset}USDT`;
  }
};

// --- Real Data Fetching ---

// 1. Binance
export const fetchBinanceData = async (symbol: string, interval: string = '1d'): Promise<MarketData[]> => {
  // Binance Public API: KLines endpoint
  const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`);
  if (!response.ok) throw new Error(`Binance API Error: ${response.statusText}`);
  const rawData = await response.json();
  
  return rawData.map((d: any[]) => ({
    date: new Date(d[0]).toISOString().split('T')[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5]),
  }));
};

// 2. OKX
export const fetchOkxData = async (symbol: string): Promise<MarketData[]> => {
  // OKX API v5
  // Note: OKX returns data in reverse chronological order (newest first)
  const response = await fetch(`https://www.okx.com/api/v5/market/candles?instId=${symbol}&bar=1D&limit=300`);
  if (!response.ok) throw new Error(`OKX API Error: ${response.statusText}`);
  const json = await response.json();
  
  if (json.code !== '0') throw new Error(`OKX Error: ${json.msg}`);

  const rawData = json.data; // [ts, o, h, l, c, vol, ...]
  
  return rawData.reverse().map((d: string[]) => ({
    date: new Date(parseInt(d[0])).toISOString().split('T')[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5]),
  }));
};

// 3. Coinbase
export const fetchCoinbaseData = async (symbol: string): Promise<MarketData[]> => {
  // Coinbase Pro API
  const response = await fetch(`https://api.exchange.coinbase.com/products/${symbol}/candles?granularity=86400`);
  if (!response.ok) throw new Error(`Coinbase API Error: ${response.statusText}`);
  const rawData = await response.json(); // [time, low, high, open, close, volume]
  
  return rawData.reverse().map((d: number[]) => ({
    date: new Date(d[0] * 1000).toISOString().split('T')[0],
    low: d[1],
    high: d[2],
    open: d[3],
    close: d[4],
    volume: d[5],
  }));
};

// --- Master Fetcher with Fallback ---

export const fetchMarketData = async (asset: string, exchange: Exchange): Promise<{data: MarketData[], isSimulation: boolean}> => {
    const symbol = getExchangeSymbol(asset, exchange);
    
    try {
        let data: MarketData[] = [];
        if (exchange === 'BINANCE') {
            data = await fetchBinanceData(symbol);
        } else if (exchange === 'OKX') {
            data = await fetchOkxData(symbol);
        } else if (exchange === 'COINBASE') {
            data = await fetchCoinbaseData(symbol);
        }
        
        if (data.length === 0) throw new Error("No data returned");
        return { data, isSimulation: false };
        
    } catch (error) {
        console.warn(`${exchange} connection failed (likely CORS), switching to simulation.`, error);
        // Fallback to simulation
        // We calculate a start price based on asset roughly to make it look realistic
        let startPrice = 100;
        if (asset === 'BTC') startPrice = 65000;
        if (asset === 'ETH') startPrice = 3500;
        if (asset === 'SOL') startPrice = 150;
        if (asset === 'DOGE') startPrice = 0.15;
        if (asset === 'PEPE') startPrice = 0.00001;

        return { 
            data: generateMarketData(365, startPrice), 
            isSimulation: true 
        };
    }
};

// --- Synthetic Data (Fallback) ---

function randn_bm() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export const generateMarketData = (days: number = 365, startPrice: number = 100): MarketData[] => {
  const data: MarketData[] = [];
  let currentPrice = startPrice;
  const drift = 0.0003; 
  const volatility = 0.03; // Higher volatility for crypto feel

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const change = currentPrice * (drift + volatility * randn_bm());
    const close = Math.max(0.000001, currentPrice + change);
    const open = currentPrice;
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      date: date.toISOString().split('T')[0],
      open: Number(open.toFixed(8)),
      high: Number(high.toFixed(8)),
      low: Number(low.toFixed(8)),
      close: Number(close.toFixed(8)),
      volume
    });

    currentPrice = close;
  }
  return data;
};

// --- Indicators & Backtest Engine ---

export const calculateSMA = (data: MarketData[], windowSize: number): number[] => {
  const sma = data.map((_, idx, arr) => {
    if (idx < windowSize - 1) return NaN;
    const slice = arr.slice(idx - windowSize + 1, idx + 1);
    const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
    return sum / windowSize;
  });
  return sma;
};

export const calculateRSI = (data: MarketData[], period: number): number[] => {
  const rsiArray: number[] = new Array(data.length).fill(NaN);
  if (data.length <= period) return rsiArray;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  rsiArray[period] = 100 - (100 / (1 + avgGain / (avgLoss === 0 ? 1 : avgLoss)));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / (avgLoss === 0 ? 1 : avgLoss);
    rsiArray[i] = 100 - (100 / (1 + rs));
  }

  return rsiArray;
};

export const runBacktest = (
    data: MarketData[], 
    config: StrategyConfig, 
    aiSignals?: AiSignal[]
): BacktestResult => {
  let cash = config.initialCapital;
  let holdings = 0;
  const trades: Trade[] = [];
  const history: { date: string; balance: number }[] = [];

  const shortSMA = calculateSMA(data, config.shortWindow);
  const longSMA = calculateSMA(data, config.longWindow);
  const rsi = calculateRSI(data, config.rsiPeriod);

  let peakBalance = config.initialCapital;
  let maxDrawdown = 0;

  const aiSignalMap = new Map<string, AiSignal>();
  if (config.mode === 'AI' && aiSignals) {
    aiSignals.forEach(s => aiSignalMap.set(s.date, s));
  }

  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    const date = data[i].date;
    
    // Skip initial period logic
    if (config.mode === 'ALGO' && i < Math.max(config.longWindow, config.rsiPeriod)) {
        history.push({ date, balance: cash });
        continue;
    }

    let signal = SignalType.HOLD;
    let reason = '';

    if (config.mode === 'AI') {
        const aiDecision = aiSignalMap.get(date);
        if (aiDecision) {
            signal = aiDecision.action;
            reason = aiDecision.reason;
        }
    } else {
        const prevShort = shortSMA[i - 1];
        const currShort = shortSMA[i];
        const prevLong = longSMA[i - 1];
        const currLong = longSMA[i];
        const currRSI = rsi[i];

        const crossoverBuy = prevShort <= prevLong && currShort > currLong;
        const crossoverSell = prevShort >= prevLong && currShort < currLong;

        const rsiBuyAllowed = !config.useRsiFilter || (currRSI < config.rsiOversold);
        const rsiSellForce = config.useRsiFilter && (currRSI > config.rsiOverbought);

        if (crossoverBuy && rsiBuyAllowed) {
            signal = SignalType.BUY;
        } else if (crossoverSell || rsiSellForce) {
            signal = SignalType.SELL;
        }
    }

    // Execute Trade
    if (signal === SignalType.BUY && cash > price) {
      const amountToBuy = (cash * 0.99) / price; // Use 99% of cash to handle fees/rounding
      if (amountToBuy > 0) {
        const cost = amountToBuy * price;
        if(cost <= cash) {
            cash -= cost;
            holdings += amountToBuy;
            trades.push({
            date,
            type: SignalType.BUY,
            price,
            amount: amountToBuy,
            balanceAfter: cash + (holdings * price),
            reason: reason || 'Technical Signal'
            });
        }
      }
    } else if (signal === SignalType.SELL && holdings > 0) {
      cash += holdings * price;
      trades.push({
        date,
        type: SignalType.SELL,
        price,
        amount: holdings,
        balanceAfter: cash,
        reason: reason || 'Technical Signal'
      });
      holdings = 0;
    }

    const currentTotalValue = cash + (holdings * price);
    history.push({ date, balance: currentTotalValue });

    if (currentTotalValue > peakBalance) peakBalance = currentTotalValue;
    const drawdown = (peakBalance - currentTotalValue) / peakBalance;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const finalBalance = cash + (holdings * data[data.length - 1].close);
  const totalReturn = ((finalBalance - config.initialCapital) / config.initialCapital) * 100;
  
  const profitableTrades = trades.filter((t, i) => {
      if (t.type === SignalType.SELL) {
          // Find matching buy
          let entryPrice = 0;
           for (let j = i - 1; j >= 0; j--) {
              if (trades[j].type === SignalType.BUY) {
                  entryPrice = trades[j].price;
                  break;
              }
          }
          return t.price > entryPrice;
      }
      return false;
  }).length;
  
  const sellTradesCount = trades.filter(t => t.type === SignalType.SELL).length;
  const winRate = sellTradesCount > 0 ? (profitableTrades / sellTradesCount) * 100 : 0;

  return {
    trades,
    finalBalance,
    totalReturn,
    winRate,
    maxDrawdown: maxDrawdown * 100,
    history
  };
};