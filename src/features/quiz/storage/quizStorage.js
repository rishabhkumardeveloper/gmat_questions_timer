import { IMPORT_KEY, SESSION_KEY, RESULTS_KEY } from "../constants";
export function readLocal(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { localStorage.removeItem(key); return null; } }
export function writeLocal(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ } }
export function loadSession() { const value=readLocal(SESSION_KEY); if (!value || Date.now()-(value.savedAt||0)>7*864e5) { localStorage.removeItem(SESSION_KEY); return null; } return value; }
export { IMPORT_KEY, SESSION_KEY, RESULTS_KEY };
