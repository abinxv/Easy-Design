import heroLivingRoom from "@/assets/hero-living-room.jpg";
import styleBohemian from "@/assets/style-bohemian.jpg";
import styleContemporary from "@/assets/style-contemporary.jpg";
import styleIndustrial from "@/assets/style-industrial.jpg";
import styleMidcentury from "@/assets/style-midcentury.jpg";
import styleMinimalist from "@/assets/style-minimalist.jpg";
import styleScandinavian from "@/assets/style-scandinavian.jpg";

const previewPools: Record<string, string[]> = {
  bedroom: [styleMinimalist, styleScandinavian, styleMidcentury],
  kitchen: [styleContemporary, styleIndustrial, styleScandinavian],
  "living-room": [heroLivingRoom, styleMidcentury, styleBohemian],
  bathroom: [styleContemporary, styleMinimalist, styleScandinavian],
  office: [styleIndustrial, styleMinimalist, styleMidcentury],
  fallback: [heroLivingRoom, styleMinimalist, styleContemporary],
};

const kindOffsets: Record<string, number> = {
  overview: 0,
  item: 1,
  palette: 2,
  combo: 1,
};

export function getInspirationPreview(room: string, index: number, kind: string) {
  const pool = previewPools[room] || previewPools.fallback;
  const offset = kindOffsets[kind] ?? 0;
  return pool[(index + offset) % pool.length];
}
