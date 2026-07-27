# Codex Prompt — Add Quiz Builder

You are working in:

`https://github.com/rishabhkumardeveloper/gmat_questions_timer`

Implement a production-quality third tab called **Quiz Builder** at `/quiz`.

Read the repository before editing. Preserve the current React/Vite application, existing GMAT Timer, Page Timer, manual pathname routing, Vercel SPA rewrite, and current mobile behavior.

Reference these repositories for ideas only; do not copy question content or create runtime dependencies:

- `https://github.com/mister-teddy/gmat_question_bank`
- `https://github.com/mister-teddy/gmat-database`

Read `docs/GMAT_QUIZ_IMPORT_DESIGN.md` and treat it as the product/technical specification.

## Core workflow

The website must not call an LLM, upload PDFs, run OCR, or require a backend.

1. Show a copy-ready PDF-to-JSON prompt.
2. User attaches a PDF to an external LLM.
3. User imports the resulting JSON by upload or paste.
4. Validate locally.
5. Build an interactive GMAT-style quiz.

Use the exact repository assets:

- `public/pdf-to-gmat-json-prompt.txt`
- `public/gmat-quiz.schema.json`
- `public/sample-gmat-quiz.json`

## Routing and navigation

Add:

- route `/quiz`
- tab label `Quiz Builder`

Generalize the existing `window.location.pathname`, `history.pushState`, and `popstate` implementation. Do not add a routing dependency merely for three paths.

The navigation must remain usable at 320px and must not horizontally overflow.

## Stages

Use an explicit state machine:

- import
- configure
- running
- review
- results

## Import UI

Show:

- external-LLM workflow explanation;
- read-only prompt textarea;
- Copy Prompt;
- Download Prompt;
- Download JSON Schema;
- Download Sample JSON;
- `.json` file input;
- JSON paste textarea;
- Validate Quiz;
- Reset/Clear.

After validation, show:

- title;
- total, ready, and needs-review counts;
- counts by section and type;
- errors and warnings with JSON-pointer-like paths.

Invalid imports must not proceed.

## Product modes

### Custom Length — Practice

- section filter: All, Quant, Verbal, DI;
- question count;
- no required overall countdown;
- track elapsed time;
- response selected then `Check Answer`;
- reveal answer and explanation immediately;
- lock checked question;
- `needs_review` may be included only as labelled unscored practice.

### Custom Length — Test

- section filter and count;
- fixed duration in minutes;
- suggested duration proportional to:
  - Quant: 45/21 minutes per question;
  - Verbal: 45/23;
  - DI: 45/20;
  - Mixed: 2 minutes/question;
- hide answers and explanations until submission;
- previous/next navigation and answer changes allowed;
- auto-submit at zero.

### Official Length

Presets:

```js
export const OFFICIAL_SECTION_PRESETS = {
  QUANT: {
    label: "Quantitative Reasoning",
    questionCount: 21,
    durationSeconds: 45 * 60,
    allowedTypes: ["PS"]
  },
  VERBAL: {
    label: "Verbal Reasoning",
    questionCount: 23,
    durationSeconds: 45 * 60,
    allowedTypes: ["CR", "RC"]
  },
  DI: {
    label: "Data Insights",
    questionCount: 20,
    durationSeconds: 45 * 60,
    allowedTypes: ["DS", "MSR", "TA", "GI", "TPA"]
  }
};
```

Rules:

- require enough `ready`, scoreable, compatible questions;
- use source order;
- initial pass forward-only;
- require an answer before Next;
- after final question, open Question Review;
- timer continues;
- all questions reviewable;
- at most three responses may be changed;
- a change counts only when normalized response differs from the response saved at the end of the initial pass;
- block the fourth change with a clear message;
- auto-submit at zero;
- show:
  `Official-length simulation uses current question counts and timing. It is not adaptive and does not calculate an official GMAT score.`

Never calculate an estimated or scaled GMAT score.

## Supported content

Question types:

- PS
- CR
- RC
- DS
- MSR
- TA
- GI
- TPA
- SC_LEGACY
- QC_LEGACY

Legacy types work in Custom Mode only.

Response renderers:

- `single_choice`
- `multi_select`
- `statement_matrix`
- `two_part`
- `dropdown_blanks`

## Reading Comprehension

Desktop:

- split passage/question layout.

Mobile:

- stacked layout or accessible Passage/Question tabs.

Reuse passages through `passageId`; do not repeat them in each question.

## Data Insights

- render stimulus text and structured tables;
- MSR sources use tabs;
- use local horizontal table scrolling only;
- keep question controls outside the table scroller;
- unreconstructable visual questions remain `needs_review`.

## Validation

Use Ajv with JSON Schema Draft 2020-12 and the supplied schema, plus semantic validation.

Semantic checks:

1. IDs are unique.
2. References resolve.
3. Section/type combinations are valid.
4. Ready questions have valid answers.
5. Correct option IDs exist.
6. Single choice has one answer.
7. Multi-select has no duplicate answer IDs.
8. Matrix, two-part, and dropdown answers are complete.
9. RC has `passageId`.
10. Source-dependent DI has `stimulusId`.
11. Official Mode excludes legacy and needs-review content.
12. Unsafe keys and excessive sizes are rejected.

Validation output:

```js
{
  valid,
  errors: [{ code, path, message }],
  warnings: [{ code, path, message }],
  summary
}
```

Do not silently repair content-changing errors.

## Security

Before rendering:

- 5 MB maximum JSON file;
- 500 questions;
- 100 passages;
- 100 stimuli;
- 25 assets;
- 10 MB decoded assets;
- reject `__proto__`, `prototype`, and `constructor` recursively;
- never use `dangerouslySetInnerHTML`;
- render strings as text;
- no expression evaluation;
- no remote asset URLs;
- optional assets: base64 PNG/JPEG/WebP only;
- reject SVG.

## Timer

Use a wall-clock deadline:

```js
const expiresAt = Date.now() + durationSeconds * 1000;
const remainingSeconds = Math.max(
  0,
  Math.ceil((expiresAt - Date.now()) / 1000)
);
```

Requirements:

- recalculate on interval and `visibilitychange`;
- persist `expiresAt`;
- do not pause in hidden tabs;
- auto-submit exactly once;
- accessible final-minute and expiry announcements.

## Persistence

Use:

- `gmat-quiz-import-v1`
- `gmat-quiz-session-v1`
- `gmat-quiz-results-v1`

Support:

- resume active session;
- discard session;
- clear imported quiz;
- safe recovery from malformed storage;
- seven-day active-session expiry.

## Scoring

Only `ready` questions with valid answers are scoreable.

- single choice: exact option match;
- multi-select: exact set;
- statement matrix: every row;
- two-part: every task;
- dropdown blanks: every blank.

No partial credit in raw overall accuracy.

Results must show:

- correct/scoreable;
- raw accuracy;
- unanswered;
- unscored;
- total time;
- average time;
- breakdown by type;
- per-question response, correct answer, explanation, source page, answer origin, and confidence;
- explicit statement that no official score was calculated.

## Recommended structure

```text
src/
  App.jsx
  routes.js
  features/
    quiz/
      QuizWorkspace.jsx
      constants.js
      llmPrompt.js
      schema/quizSchema.js
      storage/quizStorage.js
      utils/
        parseQuizJson.js
        validateQuiz.js
        normalizeQuiz.js
        buildSession.js
        scoreResponse.js
      hooks/
        useDeadlineTimer.js
        useQuizSession.js
      components/
        QuizImportPanel.jsx
        PromptPanel.jsx
        ImportValidationSummary.jsx
        QuizConfiguration.jsx
        QuizRunner.jsx
        QuestionReview.jsx
        QuizResults.jsx
        PassagePanel.jsx
        StimulusPanel.jsx
        renderers/
```

Refactor only as much as needed. Existing tools must remain behaviorally unchanged.

## Accessibility and responsive requirements

- native controls;
- visible labels and focus;
- 44px targets;
- no color-only status;
- keyboard navigation;
- aria-live timer warnings;
- confirm manual submission but not timeout auto-submit;
- no page-wide horizontal scrolling;
- test 320px and 390px widths.

## Privacy and legal copy

Near import:

`Import only material you are authorized to use. Quiz content is processed locally in your browser.`

Footer:

`This tool is not affiliated with or endorsed by GMAC. “GMAT” is a trademark of its respective owner.`

Do not bundle scraped or proprietary questions.

## Tests

Add and configure:

- Vitest
- React Testing Library
- `@testing-library/jest-dom`
- jsdom

Test at minimum:

1. valid sample import;
2. invalid JSON syntax;
3. duplicate IDs;
4. broken references;
5. invalid answer IDs;
6. needs-review exclusion;
7. official counts and times;
8. official type filtering;
9. three-change cap;
10. deadline after hidden-tab delay;
11. auto-submit exactly once;
12. all response scoring;
13. Practice immediate answer reveal;
14. Test no answer reveal before submit;
15. RC passage rendering;
16. existing tabs still render.

Run:

```bash
npm install
npm test
npm run build
```

Add a test script if absent.

## Acceptance checklist

- [ ] Third tab exists.
- [ ] `/quiz` works on direct load.
- [ ] Prompt can be copied/downloaded.
- [ ] Schema/sample are downloadable.
- [ ] JSON paste and upload work.
- [ ] Invalid imports are blocked with paths.
- [ ] Custom Practice works.
- [ ] Custom Test works.
- [ ] Official Quant is 21/45.
- [ ] Official Verbal is 23/45.
- [ ] Official DI is 20/45.
- [ ] Official review caps changes at three.
- [ ] Timer survives background throttling and refresh.
- [ ] RC and DI layouts work.
- [ ] Answers reveal only at the correct time.
- [ ] No estimated GMAT score.
- [ ] Existing timers still work.
- [ ] Tests pass.
- [ ] Build passes.

Implement the feature now. At completion, summarize changed files, test results, build result, and honest limitations.
