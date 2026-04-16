import { apiRequest } from "./api";
import type { Inspiration, SavedDesign } from "./designs";

export type DesignAssistantStage = "choose-room" | "choose-items" | "results";

export interface DesignAssistantState {
  stage: DesignAssistantStage;
  room: string | null;
  selectedItems: string[];
}

export interface DesignAssistantAction {
  kind: "room" | "item" | "submit" | "reset";
  value?: string;
}

export interface DesignAssistantQuickReply {
  label: string;
  action: DesignAssistantAction;
}

export interface DesignAssistantResponse {
  assistantMessage: string;
  state: DesignAssistantState;
  room: {
    slug: string;
    label: string;
  } | null;
  selectedItems: string[];
  quickReplies: DesignAssistantQuickReply[];
  inspirations: Inspiration[];
  savedDesign: SavedDesign | null;
  didGenerateResults: boolean;
  meta: {
    usedAiCopy: boolean;
    model: string | null;
  };
}

export interface DesignAssistantTurnInput {
  message?: string;
  action?: DesignAssistantAction;
  state?: Partial<DesignAssistantState> | null;
}

export function sendDesignAssistantTurn(input: DesignAssistantTurnInput, token?: string | null) {
  return apiRequest<DesignAssistantResponse>("/designs/assistant", {
    method: "POST",
    token,
    body: input,
  });
}
