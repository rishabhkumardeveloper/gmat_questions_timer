export function normalizeResponse(response, type) {
  if (!response) return null;
  if (type === "multi_select") return [...response].sort();
  if (typeof response === "object") return Object.fromEntries(Object.entries(response).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,Array.isArray(v)?[...v].sort():v]));
  return response;
}
export function scoreResponse(question, response) {
  if (question.status !== "ready" || !question.correctAnswer) return { scoreable:false, correct:false };
  let expected;
  if (["single_choice","multi_select"].includes(question.responseType)) expected=question.responseType==="single_choice"?question.correctAnswer.optionIds[0]:question.correctAnswer.optionIds;
  else if (question.responseType==="statement_matrix") expected=question.correctAnswer.statementChoices;
  else if (question.responseType==="two_part") expected=question.correctAnswer.taskChoices;
  else expected=question.correctAnswer.blankChoices;
  return { scoreable:true, correct:JSON.stringify(normalizeResponse(response,question.responseType))===JSON.stringify(normalizeResponse(expected,question.responseType)) };
}
