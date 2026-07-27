import Ajv2020 from "ajv/dist/2020";
import schema from "../../../../public/gmat-quiz.schema.json";
import { TYPE_SECTIONS } from "../constants";

const ajv = new Ajv2020({ allErrors:true, strict:true });
const schemaValidate = ajv.compile(schema);
const issue=(code,path,message)=>({code,path,message});
function findUnsafe(value,path="") { const out=[]; if(value&&typeof value==="object") for(const key of Object.keys(value)){const p=`${path}/${key.replaceAll("~","~0").replaceAll("/","~1")}`;if(["__proto__","prototype","constructor"].includes(key))out.push(issue("unsafe_key",p,`The key “${key}” is not allowed.`));else out.push(...findUnsafe(value[key],p));} return out; }
export function validateQuiz(quiz) {
  const errors=findUnsafe(quiz), warnings=[];
  if(!schemaValidate(quiz)) for(const e of schemaValidate.errors) errors.push(issue(`schema_${e.keyword}`,e.instancePath||"/",e.message||"Schema validation failed."));
  const unique=(items,label)=>{const seen=new Set();items?.forEach((x,i)=>{if(seen.has(x.id))errors.push(issue("duplicate_id",`/${label}/${i}/id`,`${label.slice(0,-1)} ID “${x.id}” is duplicated.`));seen.add(x.id)});return seen};
  const passages=unique(quiz?.passages,"passages"), stimuli=unique(quiz?.stimuli,"stimuli"), assets=unique(quiz?.assets,"assets"); unique(quiz?.questions,"questions");
  quiz?.assets?.forEach((a,i)=>{if(!/^data:image\/(png|jpeg|webp);base64,/.test(a.dataUrl||""))errors.push(issue("invalid_asset",`/assets/${i}/dataUrl`,"Only base64 PNG, JPEG, and WebP assets are allowed.")); const bytes=Math.ceil(((a.dataUrl||"").split(",")[1]?.length||0)*.75);if(bytes>10*1024*1024)errors.push(issue("asset_too_large",`/assets/${i}/dataUrl`,"Decoded asset exceeds 10 MB."));});
  quiz?.stimuli?.forEach((s,i)=>s.sources?.forEach((x,j)=>{if(x.assetId&&!assets.has(x.assetId))errors.push(issue("broken_asset_reference",`/stimuli/${i}/sources/${j}/assetId`,`Asset “${x.assetId}” does not exist.`));}));
  quiz?.questions?.forEach((q,i)=>{
    const p=`/questions/${i}`;
    if(TYPE_SECTIONS[q.type]&&TYPE_SECTIONS[q.type]!==q.section)errors.push(issue("section_type_mismatch",`${p}/type`,`${q.type} is not valid for ${q.section}.`));
    if(q.passageId&&!passages.has(q.passageId))errors.push(issue("broken_passage_reference",`${p}/passageId`,`Passage “${q.passageId}” does not exist.`));
    if(q.stimulusId&&!stimuli.has(q.stimulusId))errors.push(issue("broken_stimulus_reference",`${p}/stimulusId`,`Stimulus “${q.stimulusId}” does not exist.`));
    if(q.type==="RC"&&!q.passageId)errors.push(issue("rc_requires_passage",`${p}/passageId`,"RC questions require a passageId."));
    if(["MSR","TA","GI","TPA"].includes(q.type)&&!q.stimulusId)errors.push(issue("di_requires_stimulus",`${p}/stimulusId`,`${q.type} questions require a stimulusId.`));
    if(q.status==="needs_review")warnings.push(issue("unscored_needs_review",`${p}/status`,"This question is unscored and available only in Custom Practice."));
    if(q.status!=="ready")return;
    if(!q.correctAnswer){errors.push(issue("missing_answer",`${p}/correctAnswer`,"Ready questions require a correct answer."));return;}
    const optionIds=new Set(q.options?.map(o=>o.id)); const answerIds=q.correctAnswer.optionIds||[];
    if(q.responseType==="single_choice"&&answerIds.length!==1)errors.push(issue("single_answer_count",`${p}/correctAnswer/optionIds`,"Single choice requires exactly one correct option."));
    answerIds.forEach(id=>{if(!optionIds.has(id))errors.push(issue("invalid_correct_option",`${p}/correctAnswer/optionIds`,`Correct option “${id}” does not exist.`))});
    const checkMap=(items,map,key)=>items?.forEach(x=>{if(!map||!(x.id in map))errors.push(issue("incomplete_answer",`${p}/correctAnswer/${key}`,`Answer for “${x.id}” is required.`))});
    if(q.responseType==="statement_matrix")checkMap(q.statements,q.correctAnswer.statementChoices,"statementChoices");
    if(q.responseType==="two_part")checkMap(q.tasks,q.correctAnswer.taskChoices,"taskChoices");
    if(q.responseType==="dropdown_blanks")checkMap(q.blanks,q.correctAnswer.blankChoices,"blankChoices");
  });
  const qs=quiz?.questions||[]; const countsBy=(key)=>Object.fromEntries([...new Set(qs.map(q=>q[key]))].filter(Boolean).map(v=>[v,qs.filter(q=>q[key]===v).length]));
  return { valid:errors.length===0,errors,warnings,summary:{title:quiz?.metadata?.title||"Untitled",total:qs.length,ready:qs.filter(q=>q.status==="ready").length,needsReview:qs.filter(q=>q.status==="needs_review").length,bySection:countsBy("section"),byType:countsBy("type")} };
}
