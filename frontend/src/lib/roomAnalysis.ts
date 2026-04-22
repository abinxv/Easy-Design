import { apiRequest } from "./api";

export interface RoomAnalysisStatus {
  ready: boolean;
  services: {
    cloudinary: boolean;
    gemini: boolean;
    roboflow: boolean;
    serpApi: boolean;
    googleVision: boolean;
  };
  notes: string[];
}

export interface RoomMatch {
  kind: "product" | "web" | "shopping" | "search" | "store";
  source: string;
  title: string;
  url: string;
  provider?: string;
  thumbnailUrl?: string | null;
  price?: {
    amount: number | null;
    currency: string | null;
    value: string | null;
  } | null;
  inStock?: boolean | null;
}

export interface DetectedRoomObject {
  id: string;
  label: string;
  rawLabel: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cropImageUrl: string | null;
}

export interface MatchedRoomObject extends DetectedRoomObject {
  matchMode: string;
  searchQuery: string;
  webEntities: string[];
  matches: RoomMatch[];
}

export interface RoomDetectionResponse {
  analysisId: string;
  requestedObjects: string[];
  sourceImageUrl: string | null;
  sourceImage: {
    width: number;
    height: number;
  };
  detectionProvider: string;
  warnings: string[];
  detectedObjects: DetectedRoomObject[];
}

export interface RoomAnalysisResponse {
  analysisId: string;
  selectedObjectIds: string[];
  sourceImageUrl: string | null;
  sourceImage: {
    width: number;
    height: number;
  };
  detectionProvider: string;
  searchProvider: string;
  warnings: string[];
  detectedObjects: MatchedRoomObject[];
  savedUpload?: RoomUpload | null;
}

export interface RoomUpload {
  id: string;
  analysisId: string;
  fileName: string;
  sourceImageUrl: string | null;
  sourceImage: {
    width: number;
    height: number;
  };
  detectionProvider: string;
  searchProvider: string;
  warnings: string[];
  detectedObjects: MatchedRoomObject[];
  createdAt: string;
  updatedAt?: string;
}

export interface RoomShopCartItem {
  id: string;
  objectId: string;
  label: string;
  title: string;
  source: string;
  url: string;
  thumbnailUrl: string | null;
  provider?: string;
  price?: RoomMatch["price"];
  addedAt: string;
}

export interface RoomShopCartSuggestion {
  id: string;
  title: string;
  category: string;
  reason: string;
  searchQuery: string;
}

export interface RoomShopCart {
  id: string | null;
  items: RoomShopCartItem[];
  suggestions: RoomShopCartSuggestion[];
  createdAt: string | null;
  updatedAt: string | null;
}

export function fetchRoomAnalysisStatus() {
  return apiRequest<RoomAnalysisStatus>("/room-analysis/config");
}

export function detectRoomPhoto(
  input: {
    imageDataUrl: string;
    fileName?: string;
  },
  token?: string | null
) {
  return apiRequest<RoomDetectionResponse>("/room-analysis/detect", {
    method: "POST",
    token,
    body: input,
  });
}

export function matchDetectedRoomObjects(
  input: {
    analysisId: string;
    detectionProvider: string;
    detectedObjects: DetectedRoomObject[];
    selectedObjectIds: string[];
    sourceImage: {
      width: number;
      height: number;
    };
    sourceImageUrl: string | null;
  },
  token?: string | null
) {
  return apiRequest<RoomAnalysisResponse>("/room-analysis/match", {
    method: "POST",
    token,
    body: input,
  });
}

export function analyzeRoomPhoto(
  input: {
    imageDataUrl: string;
    fileName?: string;
    targetObjects?: string[];
  },
  token?: string | null
) {
  return apiRequest<RoomAnalysisResponse>("/room-analysis/analyze", {
    method: "POST",
    token,
    body: input,
  });
}

export function fetchRoomUploads(token: string) {
  return apiRequest<{ uploads: RoomUpload[] }>("/room-analysis/uploads", { token });
}

export function fetchRoomShopCart(token: string) {
  return apiRequest<{ cart: RoomShopCart }>("/room-analysis/cart", { token });
}

export function saveRoomShopCart(input: { items: RoomShopCartItem[] }, token: string) {
  return apiRequest<{ cart: RoomShopCart }>("/room-analysis/cart", {
    method: "PUT",
    token,
    body: input,
  });
}

export function clearRoomShopCart(token: string) {
  return apiRequest<{ cart: RoomShopCart }>("/room-analysis/cart", {
    method: "DELETE",
    token,
  });
}

export function generateRoomShopCartSuggestions(
  input: { items: RoomShopCartItem[] },
  token?: string | null
) {
  return apiRequest<{ cart: RoomShopCart; suggestions: RoomShopCartSuggestion[] }>("/room-analysis/cart/suggestions", {
    method: "POST",
    token,
    body: input,
  });
}
