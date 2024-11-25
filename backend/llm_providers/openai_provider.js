import BaseLLMProvider from "./base_llm_provider";
import OpenAI from "openai";

export default class OpenAIProvider extends BaseLLMProvider {
    constructor(modelName="gpt-3.5-turbo") {
        super();
        this.name = "OpenAI";
        
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY is not set");
        }

        this.provider = new OpenAI({
            apiKey: apiKey
        });
        this.modelName = modelName;
    }

    async generateContent(prompt) {
        const completion = await this.provider.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: this.modelName,
        });

        return completion.choices[0].message.content;
    }
}
