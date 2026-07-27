export const IMPORT_KEY = "gmat-quiz-import-v1";
export const SESSION_KEY = "gmat-quiz-session-v1";
export const RESULTS_KEY = "gmat-quiz-results-v1";
export const MAX_JSON_BYTES = 5 * 1024 * 1024;
export const OFFICIAL_PRESETS = {
  QUANT: { label: "Quantitative Reasoning", count: 21, minutes: 45, types: ["PS"] },
  VERBAL: { label: "Verbal Reasoning", count: 23, minutes: 45, types: ["CR", "RC"] },
  DI: { label: "Data Insights", count: 20, minutes: 45, types: ["DS", "MSR", "TA", "GI", "TPA"] },
};
export const TYPE_SECTIONS = { PS:"QUANT", QC_LEGACY:"QUANT", CR:"VERBAL", RC:"VERBAL", SC_LEGACY:"VERBAL", DS:"DI", MSR:"DI", TA:"DI", GI:"DI", TPA:"DI" };
export const OFFICIAL_DISCLAIMER = "Official-length simulation uses current question counts and timing. It is not adaptive and does not calculate an official GMAT score.";
