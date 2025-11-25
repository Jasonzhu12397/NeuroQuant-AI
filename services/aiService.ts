
import { GoogleGenAI, Type } from "@google/genai";
import { AiSettings, MarketData, AiSignal, SignalType, StrategyConfig, BacktestResult } from "../types";

// --- Prompts ---

const SYSTEM_INSTRUCTION = `
You are "NeuroQuant", an elite AI Trading System trained on the behavior of the top 1% profitable traders on Binance and OKEx.
You have access to historical OHLCV data. Your objective is to learn from price action and volume to maximize ROI.

Advanced Strategy Instructions:
1. **Whale Accumulation (Smart Money)**: Identify periods of high volume with low price volatility. This often indicates whales are accumulating before a pump. BUY here.
2. **Black Swan / Panic Reversion**: If price crashes significantly (-10% or more) in a short time with massive volume, this is a panic sell. BUY the dip for a mean reversion.
3. **Volume Breakouts**: If price breaks resistance with surging volume/turnover, FOLLOW the trend (Buy High, Sell Higher).
4. **Stop Loss / Capital Preservation**: If a trade goes wrong, SELL immediately. Do not hold bags.
5. **Avoid Choppy/Sideways Markets**: If volume is low and price is flat, HOLD (Do not trade).
`;

// --- Adapter Functions ---

// 1. Google Gemini Adapter
const callGemini = async (settings: AiSettings, prompt: string): Promise<string | null> => {
    if (!settings.apiKey) return null;
    try {
        const ai = new GoogleGenAI({ apiKey: settings.apiKey });
        const response = await ai.models.generateContent({
            model: settings.modelName || "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
            }
        });
        return response.text || null;
    } catch (e) {
        console.error("Gemini API Error:", e);
        throw e;
    }
};

// 2. Universal OpenAI-Compatible Adapter (DeepSeek, OpenAI, Qwen, etc.)
const callOpenAICompatible = async (settings: AiSettings, prompt: string): Promise<string | null> => {
    if (!settings.apiKey) return null;
    
    // Default Base URLs if not provided
    let baseUrl = settings.baseUrl;
    if (!baseUrl) {
        if (settings.provider === 'DEEPSEEK') baseUrl = 'https://api.deepseek.com';
        else if (settings.provider === 'OPENAI') baseUrl = 'https://api.openai.com/v1';
        else baseUrl = 'https://api.openai.com/v1'; // Fallback
    }
    // Ensure no trailing slash for clean appending
    baseUrl = baseUrl.replace(/\/$/, ""); 

    // Construct the payload
    // Note: We inject the System Instruction into the messages array for OpenAI format
    const payload = {
        model: settings.modelName || (settings.provider === 'DEEPSEEK' ? 'deepseek-chat' : 'gpt-4o'),
        messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: prompt + "\n\nOutput strictly valid JSON." }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" } // DeepSeek/OpenAI support this
    };

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API Error ${response.status}: ${err}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;

    } catch (e) {
        console.error(`${settings.provider} API Error:`, e);
        throw e;
    }
};

// --- Main Service Methods ---

export const generateAiTradingSignals = async (marketData: MarketData[], settings: AiSettings): Promise<AiSignal[]> => {
    // Data decimation for token efficiency (every 2nd or 3rd candle if data is huge)
    // For now, we send last 100 candles to keep it snappy for mobile
    const recentData = marketData.slice(-100); 
    const csvData = recentData.map(d => `${d.date},${d.open},${d.high},${d.low},${d.close},${d.volume}`).join('\n');

    const prompt = `
    Input Data (CSV):
    Date,Open,High,Low,Close,Volume
    ${csvData}
    
    Output: A JSON array of trading signals. 
    Format: [{"date": "YYYY-MM-DD", "action": "BUY"|"SELL", "reason": "...", "confidence": 85}]
    Only return signals where you have high confidence based on the system instructions.
  `;

    let rawText: string | null = null;

    try {
        if (settings.provider === 'GEMINI') {
            rawText = await callGemini(settings, prompt);
        } else {
            rawText = await callOpenAICompatible(settings, prompt);
        }

        if (rawText) {
            // Cleanup generic markdown code blocks if present (DeepSeek often adds them)
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const rawSignals = JSON.parse(cleanJson) as any[];
            
            return rawSignals.map(s => ({
                date: s.date,
                action: s.action === 'BUY' ? SignalType.BUY : SignalType.SELL,
                reason: s.reason,
                confidence: s.confidence || 85,
                strategySource: settings.provider
            }));
        }
    } catch (error) {
        console.error("AI Signal Generation Failed", error);
    }
    return [];
};

export const analyzeStrategyWithAI = async (
    config: StrategyConfig,
    result: BacktestResult,
    settings: AiSettings
): Promise<{ analysis: string; suggestions: string[] } | null> => {

    const prompt = `
    Task: Analyze the recent trading performance simulation.
    
    Context:
    - Mode: ${config.mode}
    - Asset: ${config.symbol}
    - Total Return: ${result.totalReturn.toFixed(2)}%
    - Win Rate: ${result.winRate.toFixed(2)}%
    
    Output JSON: { "analysis": "string paragraph", "suggestions": ["string", "string"] }
    `;

    let rawText: string | null = null;

    try {
        if (settings.provider === 'GEMINI') {
            rawText = await callGemini(settings, prompt);
        } else {
            rawText = await callOpenAICompatible(settings, prompt);
        }

        if (rawText) {
             const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
             return JSON.parse(cleanJson);
        }
    } catch (e) {
        console.error("Analysis Failed", e);
    }
    return null;
};
