
import { GoogleGenAI } from "@google/genai";
import { Transaction, BankAccount } from "./types";

const API_KEY = process.env.API_KEY || "";

export const getFinancialAdvice = async (
  transactions: Transaction[],
  accounts: BankAccount[]
): Promise<string> => {
  if (!API_KEY) {
    return "目前未設定 API Key，無法提供 AI 財務建議。請進入正式模式並在 GitHub Secrets 中配置 API_KEY。";
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Prepare data context for AI
  const summary = transactions.reduce((acc, t) => {
    const type = t.type === 'INCOME' ? '收入' : '支出';
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const prompt = `
    你是一位專業的財務理財顧問。請根據以下使用者的財務數據提供精簡且具建設性的建議：
    
    總資產：$${totalBalance}
    目前的收支明細分析：
    ${JSON.stringify(summary, null, 2)}
    
    最近 10 筆交易：
    ${JSON.stringify(transactions.slice(0, 10), null, 2)}

    請從以下幾個面向分析：
    1. 支出結構是否健康？
    2. 是否有過度支出的分類？
    3. 給予一個具體的理財行動方案。
    
    請用繁體中文回答，並使用 Markdown 格式。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
    });
    return response.text || "AI 無法生成建議，請稍後再試。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI 呼叫失敗。請確認您的 API Key 是否正確且具有 gemini-3-pro-preview 的存取權限。";
  }
};
