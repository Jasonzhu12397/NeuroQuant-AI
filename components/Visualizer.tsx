
import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
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

export const Visualizer: React.FC<VisualizerProps> = ({ data, shortMA, longMA, results }) => {
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
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-black/90 border border-slate-800 p-3 rounded shadow-2xl backdrop-blur-md text-xs max-w-[250px]">
          <p className="font-mono text-slate-400 mb-2 border-b border-slate-800 pb-1">{label}</p>
          {payload.map((p: any) => {
             if (p.name === 'Buy' || p.name === 'Sell') return null;
             return (
                <div key={p.name} className="flex justify-between gap-4 mb-1" style={{ color: p.color }}>
                <span className="opacity-70">{p.name}:</span>
                <span className="font-mono font-bold">{Number(p.value).toFixed(2)}</span>
                </div>
            );
          })}
          
          {dataPoint.buySignal && (
             <div className="mt-2 text-green-400 border border-green-900/50 bg-green-900/10 p-2 rounded">
                <span className="font-bold block tracking-wider">BUY EXECUTION</span>
                <span className="italic opacity-80 text-[10px]">{dataPoint.tradeReason}</span>
             </div>
          )}
          {dataPoint.sellSignal && (
             <div className="mt-2 text-red-400 border border-red-900/50 bg-red-900/10 p-2 rounded">
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
    <div className="glass-panel rounded-xl p-4 h-[500px]">
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: '#525252' }} 
              tickMargin={10}
              minTickGap={50}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              domain={['auto', 'auto']} 
              tick={{ fontSize: 10, fill: '#525252' }} 
              orientation="right"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{stroke: '#525252', strokeWidth: 1}} />
            <Legend verticalAlign="top" height={36} iconType="circle"/>

            <Area 
              type="monotone" 
              dataKey="close" 
              stroke="#8b5cf6" 
              fillOpacity={1} 
              fill="url(#colorClose)" 
              name="Price"
              strokeWidth={2}
            />

            <Line 
              type="monotone" 
              dataKey="shortMA" 
              stroke="#06b6d4" 
              dot={false} 
              strokeWidth={1} 
              name="Short MA"
              opacity={0.7}
            />
            <Line 
              type="monotone" 
              dataKey="longMA" 
              stroke="#6366f1" 
              dot={false} 
              strokeWidth={1} 
              name="Long MA"
              opacity={0.7}
            />

            <Line
              dataKey="buySignal"
              stroke="none"
              isAnimationActive={false}
              dot={{ r: 6, fill: '#000', stroke: '#22c55e', strokeWidth: 2 }}
              name="Buy"
              legendType="circle"
            />

             <Line
              dataKey="sellSignal"
              stroke="none"
              isAnimationActive={false}
              dot={{ r: 6, fill: '#000', stroke: '#ef4444', strokeWidth: 2 }}
              name="Sell"
              legendType="circle"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};