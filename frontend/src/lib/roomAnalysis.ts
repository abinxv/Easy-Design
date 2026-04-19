import { apiRequest } from "./api";

export interface RoomAnalysisStatus {
  ready: boolean;
  services: {
    cloudinary: boolean;
    roboflow: boolean;
    googleVision: boolean;
  };
  notes: string[];
}

export interface RoomMatch {
  kind: "web" | "shopping" | "search" | "store";
  source: string;
  title: string;
  url: string;
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
  searchQuery: string;
  webEntities: string[];
  matches: RoomMatch[];
}

export interface RoomAnalysisResponse {
  analysisId: string;
  sourceImageUrl: string | null;
  sourceImage: {
    width: number;
    height: number;
  };
  detectionProvider: string;
  searchProvider: string;
  warnings: string[];
  detectedObjects: DetectedRoomObject[];
}

export function fetchRoomAnalysisStatus() {
  return apiRequest<RoomAnalysisStatus>("/room-analysis/config");
}

export function analyzeRoomPhoto(
  input: {
    imageDataUrl: string;
    fileName?: string;
  },
  token?: string | null
) {
  return apiRequest<RoomAnalysisResponse>("/room-analysis/analyze", {
    method: "POST",
    token,
    body: input,
  });
}
