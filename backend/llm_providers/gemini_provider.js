import BaseLLMProvider from "./base_llm_provider";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default class GeminiProvider extends BaseLLMProvider {
    constructor(modelName="gemini-1.5-flash-latest") {
        super();
        this.name = "Gemini";
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const base_provider = new GoogleGenerativeAI(apiKey);
        this.provider = base_provider.getGenerativeModel({ model: modelName });
    }

    async generateContent(prompt) {
        const result = await this.provider.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
}