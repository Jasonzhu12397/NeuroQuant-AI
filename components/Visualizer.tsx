import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { MarketData, BacktestResult, SignalType } from '../types';

interface VisualizerProps {
  data: MarketData[];
  shortMA: number[];
  longMA: number[];
  results: BacktestResult | null;
}

// Custom Candle Shape Component
const Candle = (props: any) => {
  const { x, y, width, height, payload, yAxis } = props;
  if (!payload || !yAxis || !yAxis.scale) return null;
  const { open, high, low, close } = payload;
  
  if (open === undefined || close === undefined) return null;

  const yOpen = yAxis.scale(open);
  const yClose = yAxis.scale(close);
  const yHigh = yAxis.scale(high);
  const yLow = yAxis.scale(low);

  const isBullish = close >= open;
  const color = isBullish ? '#22c55e' : '#ef4444'; // Green : Red
  const fill = isBullish ? 'transparent' : '#ef4444'; // Hollow for Bullish, Solid for Bearish

  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(1, Math.abs(yOpen - yClose)); 
  
  const candleWidth = Math.max(2, width * 0.6); 
  const candleX = x + (width - candleWidth) / 2;

  // Doji (Open ~= Close)
  if (Math.abs(open - close) < 0.000001) {
       return (
         <g>
           <line x1={x + width / 2} y1={yHigh} x2={x + width / 2} y2={yLow} stroke={isBullish ? '#fff' : color} strokeWidth={1} />
           <line x1={candleX} y1={yOpen} x2={candleX + candleWidth} y2={yOpen} stroke={isBullish ? '#fff' : color} strokeWidth={1} />
         </g>
       )
  }

  return (
    <g>
      {/* Wick */}
      <line 
        x1={x + width / 2} 
        y1={yHigh} 
        x2={x + width / 2} 
        y2={yLow} 
        stroke={color} 
        strokeWidth={1} 
      />
      {/* Body */}
      <rect 
        x={candleX} 
        y={bodyTop} 
        width={candleWidth} 
        height={bodyHeight} 
        fill={fill} 
        stroke={color}
        strokeWidth={1.5}
      />
    </g>
  );
};

export const Visualizer: React.FC<VisualizerProps> = ({ data, shortMA, longMA, results }) => {
  const [chartType, setChartType] = useState<'CANDLE' | 'LINE'>('CANDLE');

  const chartData = data.map((d, i) => {
    const buyTrade = results?.trades.find(t => t.date === d.date && t.type === SignalType.BUY);
    const sellTrade = results?.trades.find(t => t.date === d.date && t.type === SignalType.SELL);
    
    return {
        ...d,
        shortMA: shortMA[i],
        longMA: longMA[i],
        buySignal: buyTrade?.price,
        sellSignal: sellTrade?.price,
        tradeReason: buyTrade?.reason || sellTrade?.reason,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the payload item that has the OHLC data
      const dataPoint = payload.find((p: any) => p.payload.open !== undefined)?.payload;
      
      if (!dataPoint) return null;

      return (
        <div className="bg-black/95 border border-slate-700 p-3 rounded shadow-2xl backdrop-blur-md text-xs max-w-[250px] z-50">
          <p className="font-mono text-slate-300 mb-2 border-b border-slate-800 pb-1 font-bold">{label}</p>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
             <div className="flex justify-between">
                <span className="text-slate-500">Open:</span>
                <span className="font-mono text-slate-200">{dataPoint.open.toFixed(2)}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-slate-500">High:</span>
                <span className="font-mono text-slate-200">{dataPoint.high.toFixed(2)}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-slate-500">Low:</span>
                <span className="font-mono text-slate-200">{dataPoint.low.toFixed(2)}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-slate-500">Close:</span>
                <span className={`font-mono font-bold ${dataPoint.close >= dataPoint.open ? 'text-green-400' : 'text-red-400'}`}>
                    {dataPoint.close.toFixed(2)}
                </span>
             </div>
             <div className="flex justify-between col-span-2 mt-1 pt-1 border-t border-slate-800/50">
                <span className="text-slate-500">Vol:</span>
                <span className="font-mono text-yellow-500/80">{Math.floor(dataPoint.volume).toLocaleString()}</span>
             </div>
          </div>

          <div className="space-y-1 border-t border-slate-800 pt-2 mb-2">
             {payload.map((p: any) => {
                 if (['Buy', 'Sell', 'Close', 'Price'].includes(p.name)) return null;
                 return (
                    <div key={p.name} className="flex justify-between gap-4" style={{ color: p.color }}>
                    <span className="opacity-70">{p.name}:</span>
                    <span className="font-mono font-bold">{Number(p.value).toFixed(2)}</span>
                    </div>
                );
             })}
          </div>
          
          {dataPoint.buySignal && (
             <div className="mt-2 text-green-400 border border-green-900/50 bg-green-900/20 p-2 rounded animate-pulse">
                <span className="font-bold block tracking-wider">BUY EXECUTION</span>
                <span className="italic opacity-80 text-[10px]">{dataPoint.tradeReason}</span>
             </div>
          )}
          {dataPoint.sellSignal && (
             <div className="mt-2 text-red-400 border border-red-900/50 bg-red-900/20 p-2 rounded animate-pulse">
                <span className="font-bold block tracking-wider">SELL EXECUTION</span>
                <span className="italic opacity-80 text-[10px]">{dataPoint.tradeReason}</span>
             </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-xl p-4 h-[500px] flex flex-col">
      {/* Chart Controls */}
      <div className="flex justify-between items-center mb-2 px-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chart Type</span>
            <div className="flex bg-black/50 rounded p-0.5 border border-slate-800">
                <button 
                    onClick={() => setChartType('CANDLE')}
                    className={`px-3 py-1 text-[10px] rounded transition-all font-mono uppercase ${chartType === 'CANDLE' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Candles
                </button>
                <button 
                    onClick={() => setChartType('LINE')}
                    className={`px-3 py-1 text-[10px] rounded transition-all font-mono uppercase ${chartType === 'LINE' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Line
                </button>
            </div>
          </div>
          <div className="flex gap-4 text-[10px] font-mono text-slate-500">
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> MA Short</span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500"></span> MA Long</span>
          </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: '#525252' }} 
              tickMargin={10}
              minTickGap={30}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              domain={['auto', 'auto']} 
              tick={{ fontSize: 10, fill: '#525252' }} 
              orientation="right"
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{stroke: '#525252', strokeWidth: 1, strokeDasharray: '4 4'}} />
            
            {/* Main Price Action */}
            {chartType === 'CANDLE' ? (
                <Bar 
                  dataKey="close" 
                  shape={<Candle />} 
                  isAnimationActive={false} 
                  legendType="none"
                />
            ) : (
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="#8b5cf6"
                  fill="url(#colorPrice)"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Price"
                  isAnimationActive={false}
                />
            )}

            <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
            </defs>

            {/* Indicators */}
            <Line type="monotone" dataKey="shortMA" stroke="#06b6d4" dot={false} strokeWidth={1.5} name="Short MA" isAnimationActive={false} />
            <Line type="monotone" dataKey="longMA" stroke="#8b5cf6" dot={false} strokeWidth={1.5} name="Long MA" isAnimationActive={false} />

            {/* Signals */}
            <Line dataKey="buySignal" stroke="none" isAnimationActive={false} dot={{ r: 4, fill: '#000', stroke: '#22c55e', strokeWidth: 2 }} name="Buy" />
            <Line dataKey="sellSignal" stroke="none" isAnimationActive={false} dot={{ r: 4, fill: '#000', stroke: '#ef4444', strokeWidth: 2 }} name="Sell" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
