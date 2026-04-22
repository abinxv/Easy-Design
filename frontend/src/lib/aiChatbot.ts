import { apiRequest } from "./api";

export type AiChatbotRole = "assistant" | "user";

export interface AiChatbotMessage {
  role: AiChatbotRole;
  content: string;
}

export interface AiChatbotResponse {
  assistantMessage: string;
  meta: {
    model: string;
    provider: string;
  };
}

export function sendAiChatbotTurn(input: { messages: AiChatbotMessage[] }, token?: string | null) {
  return apiRequest<AiChatbotResponse>("/chatbot/message", {
    method: "POST",
    token,
    body: input,
  });
}
