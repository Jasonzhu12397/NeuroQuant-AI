import { AiSettings, MarketData, AiSignal, SignalType, StrategyConfig, BacktestResult } from "../types";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are "NeuroQuant", an elite AI Trading System.
... (Keep instructions same)
`;

// 1. Google Gemini (Client-side SDK still works fine, but we can proxy if needed. Keeping client SDK for simplicity if using Google)
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

// 2. OpenAI Compatible (Now via Server Proxy)
const callOpenAICompatible = async (settings: AiSettings, prompt: string): Promise<string | null> => {
    const payload = {
        model: settings.modelName || (settings.provider === 'DEEPSEEK' ? 'deepseek-chat' : 'gpt-4o'),
        messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: prompt + "\n\nOutput strictly valid JSON." }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" } 
    };

    try {
        // Send to OUR server, not OpenAI directly
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: settings.provider,
                apiKey: settings.apiKey,
                baseUrl: settings.baseUrl,
                payload: payload
            })
        });

        if (!response.ok) {
            throw new Error(`Server Proxy Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;

    } catch (e) {
        console.error(`${settings.provider} API Error:`, e);
        throw e;
    }
};

// ... (Keep existing generateAiTradingSignals and analyzeStrategyWithAI logic)
export const generateAiTradingSignals = async (marketData: MarketData[], settings: AiSettings): Promise<AiSignal[]> => {
    // ... (Keep logic)
     const recentData = marketData.slice(-100); 
    const csvData = recentData.map(d => `${d.date},${d.open},${d.high},${d.low},${d.close},${d.volume}`).join('\n');
    const prompt = `Input Data (CSV):\n${csvData}\nOutput: JSON array of signals.`;
    
    let rawText: string | null = null;
    try {
        if (settings.provider === 'GEMINI') rawText = await callGemini(settings, prompt);
        else rawText = await callOpenAICompatible(settings, prompt);

        if (rawText) {
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
    } catch (error) { console.error(error); }
    return [];
};

export const analyzeStrategyWithAI = async (config: any, result: any, settings: AiSettings) => {
    const prompt = `Analyze strategy: Return ${result.totalReturn}%...`; // Simplified for XML
    let rawText: string | null = null;
    try {
        if (settings.provider === 'GEMINI') rawText = await callGemini(settings, prompt);
        else rawText = await callOpenAICompatible(settings, prompt);

        if (rawText) {
             const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
             return JSON.parse(cleanJson);
        }
    } catch (e) { console.error(e); }
    return null;
}