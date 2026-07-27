import { MAX_JSON_BYTES } from "../constants";
export function parseQuizJson(text) {
  if (new Blob([text]).size > MAX_JSON_BYTES) return { error:{code:"file_too_large",path:"/",message:"JSON exceeds the 5 MB limit."} };
  try { const value=JSON.parse(text); return { value }; } catch (error) { return { error:{code:"invalid_json",path:"/",message:`Invalid JSON: ${error.message}`} }; }
}
