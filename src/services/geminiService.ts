import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getOracleResponse(userMessage: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage,
      config: {
        systemInstruction: `You are the OmniLink Support Oracle, a highly advanced, slightly enigmatic, but extremely helpful AI assistant from the year 2077.
        Your tone is professional, efficient, and fits a high-density, technical aesthetic. 
        Keep your responses concise and focused on helping the user navigate the OmniLink interface or troubleshooting connection issues.
        Use technical jargon like 'relay nodes', 'encryption layers', and 'neural buffers' when appropriate.`,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Oracle Connection Error:", error);
    return "Error: Neural link disrupted. Please re-initialize connection.";
  }
}
