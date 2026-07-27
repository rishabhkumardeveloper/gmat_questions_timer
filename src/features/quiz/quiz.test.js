import { describe,expect,it } from "vitest";
import sample from "../../../public/sample-gmat-quiz.json";
import { validateQuiz } from "./utils/validateQuiz";
import { parseQuizJson } from "./utils/parseQuizJson";
import { compatibleQuestions,countOfficialChanges } from "./utils/buildSession";
import { scoreResponse } from "./utils/scoreResponse";
import { getRemainingSeconds } from "./hooks/useDeadlineTimer";
import { OFFICIAL_PRESETS } from "./constants";

describe("quiz validation",()=>{
 it("imports the valid synthetic sample",()=>expect(validateQuiz(sample).valid).toBe(true));
 it("reports syntax errors with a path",()=>expect(parseQuizJson("{").error.path).toBe("/"));
 it("finds duplicate IDs",()=>{const q=structuredClone(sample);q.questions.push(structuredClone(q.questions[0]));expect(validateQuiz(q).errors.some(x=>x.code==="duplicate_id")).toBe(true)});
 it("finds broken references",()=>{const q=structuredClone(sample);q.questions[1].passageId="missing";expect(validateQuiz(q).errors.some(x=>x.code==="broken_passage_reference")).toBe(true)});
 it("finds invalid correct options",()=>{const q=structuredClone(sample);q.questions[0].correctAnswer.optionIds=["Z"];expect(validateQuiz(q).errors.some(x=>x.code==="invalid_correct_option")).toBe(true)});
 it("excludes needs-review content officially",()=>expect(compatibleQuestions(sample,"VERBAL",true).every(q=>q.status==="ready")).toBe(true));
});
describe("sessions and scoring",()=>{
 it("uses current official counts and times",()=>expect(OFFICIAL_PRESETS).toMatchObject({QUANT:{count:21,minutes:45},VERBAL:{count:23,minutes:45},DI:{count:20,minutes:45}}));
 it("filters by section",()=>expect(compatibleQuestions(sample,"DI").every(q=>q.section==="DI")).toBe(true));
 it("caps official review changes",()=>expect(countOfficialChanges({a:"A",b:"A",c:"A",d:"A"},{a:"B",b:"B",c:"B",d:"B"})).toBe(4));
 it("derives timer from wall clock after delays",()=>expect(getRemainingSeconds(10_000,9_500)).toBe(1));
 it("scores every supported response shape",()=>{const base={status:"ready"};expect(scoreResponse({...base,responseType:"single_choice",correctAnswer:{optionIds:["A"]}},"A").correct).toBe(true);expect(scoreResponse({...base,responseType:"multi_select",correctAnswer:{optionIds:["B","A"]}},["A","B"]).correct).toBe(true);expect(scoreResponse({...base,responseType:"statement_matrix",correctAnswer:{statementChoices:{x:"YES"}}},{x:"YES"}).correct).toBe(true);expect(scoreResponse({...base,responseType:"two_part",correctAnswer:{taskChoices:{x:["A"]}}},{x:["A"]}).correct).toBe(true);expect(scoreResponse({...base,responseType:"dropdown_blanks",correctAnswer:{blankChoices:{x:"A"}}},{x:"A"}).correct).toBe(true)});
});
