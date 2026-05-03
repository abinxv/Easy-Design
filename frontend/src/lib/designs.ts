import { apiRequest } from "./api";

export interface RoomCatalogEntry {
  slug: string;
  label: string;
  previewKey: string;
  items: string[];
}

export interface Inspiration {
  kind: "overview" | "item" | "palette" | "combo";
  title: string;
  description: string;
  searchQuery: string;
  pinterestUrl: string;
  previewKey: string;
  tags: string[];
}

export interface SavedDesign {
  id: string;
  room: string;
  roomLabel: string;
  selectedItems: string[];
  inspirations: Inspiration[];
  createdAt: string;
  updatedAt?: string;
}

export interface SearchInspirationsResponse {
  room: {
    slug: string;
    label: string;
  };
  selectedItems: string[];
  inspirations: Inspiration[];
  savedDesign: SavedDesign | null;
}

export function fetchRoomCatalog() {
  return apiRequest<{ rooms: RoomCatalogEntry[] }>("/designs/catalog");
}

export function searchInspirations(input: { room: string; selectedItems: string[] }, token?: string | null) {
  return apiRequest<SearchInspirationsResponse>("/designs/inspirations/search", {
    method: "POST",
    token,
    body: input,
  });
}

export function fetchDesignHistory(token: string) {
  return apiRequest<{ designs: SavedDesign[] }>("/designs", { token });
}
