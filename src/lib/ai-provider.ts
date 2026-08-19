import { google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const getAIModel = () => {
  // Switch to true to use OpenRouter, false to use direct Google Gemini API
  const useOpenRouter = true; 

  if (useOpenRouter) {
    return openrouter("google/gemini-2.5-flash");
  } else {
    return google("gemini-3.6-flash");
  }
};
