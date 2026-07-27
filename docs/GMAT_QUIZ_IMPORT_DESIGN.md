# GMAT Quiz Import — Product and Technical Design

**Target route:** `/quiz`  
**Navigation label:** `Quiz Builder`  
**Deployment:** Existing React/Vite Vercel SPA

## Summary

Add a third tool to the existing GMAT Questions Timer app. The website must not call an LLM, upload PDFs, or run OCR. Users attach their PDF to an external LLM, copy the prompt provided by the site, and import the resulting JSON by file upload or paste.

The browser validates the JSON locally and creates an interactive GMAT-style quiz.

## Goals

- No backend or AI API cost.
- Strict, versioned JSON contract: `gmat-quiz@1`.
- Custom Practice and Custom Test modes.
- Official-length Quant, Verbal, and Data Insights simulations.
- Answers shown immediately only in Practice Mode.
- Reading Comprehension passage grouping.
- Modern Data Insights response controls.
- Responsive and accessible from 320px upward.
- Local persistence and refresh recovery.

## Non-goals

- Adaptive scoring.
- Estimated GMAT scores.
- Authentication or cloud storage.
- Scraping or bundling proprietary questions.
- Arbitrary HTML rendering.
- PDF processing inside this website.

## Routes

| Path | Tool |
|---|---|
| `/` | GMAT Timer |
| `/page-timer` | Page Timer |
| `/quiz` | Quiz Builder |

Generalize the existing manual pathname routing instead of adding a router solely for three paths.

## User flow

1. **Import**
   - Explain the external-LLM workflow.
   - Show a read-only copyable prompt.
   - Download prompt, schema, and sample JSON.
   - Upload `.json` or paste JSON.
   - Validate locally.
2. **Configure**
   - Custom Length or Official Length.
3. **Run**
   - One question at a time.
4. **Review**
   - Required for Official Length.
5. **Results**
   - Raw accuracy, timing, explanations, and source pages.

## Modes

### Custom Length — Practice

- User selects section and question count.
- No required overall countdown.
- Track elapsed time.
- User selects a response and clicks **Check Answer**.
- Reveal correctness and explanation immediately.
- Lock the checked question.
- `needs_review` questions may appear only as clearly labelled unscored practice.

### Custom Length — Test

- User selects section, count, and fixed duration.
- Hide answers and explanations until submission.
- Allow previous/next navigation and answer changes.
- Auto-submit at zero.
- Suggested duration:
  - Quant: proportional to 45/21 minutes per question.
  - Verbal: proportional to 45/23.
  - DI: proportional to 45/20.
  - Mixed: 2 minutes per question by default.

### Official Length

| Section | Questions | Time | Allowed types |
|---|---:|---:|---|
| Quantitative Reasoning | 21 | 45 min | PS |
| Verbal Reasoning | 23 | 45 min | CR, RC |
| Data Insights | 20 | 45 min | DS, MSR, TA, GI, TPA |

Rules:

- Require enough `ready`, scoreable questions.
- Use source order and take the first compatible questions.
- Initial pass is forward-only.
- Require a response before moving forward.
- After the final question, open Question Review.
- Timer continues during review.
- All questions can be reviewed.
- At most three responses may be changed during review.
- Auto-submit at zero.
- Display: `Official-length simulation uses current question counts and timing. It is not adaptive and does not calculate an official GMAT score.`

## JSON contract

Public files:

- `/gmat-quiz.schema.json`
- `/sample-gmat-quiz.json`
- `/pdf-to-gmat-json-prompt.txt`

Root object:

```json
{
  "schemaVersion": "gmat-quiz@1",
  "metadata": {},
  "assets": [],
  "passages": [],
  "stimuli": [],
  "questions": []
}
```

Supported content types:

- PS, CR, RC, DS, MSR, TA, GI, TPA
- SC_LEGACY and QC_LEGACY for Custom Mode only

Supported response types:

- `single_choice`
- `multi_select`
- `statement_matrix`
- `two_part`
- `dropdown_blanks`

Question taxonomy and response renderer must remain separate.

## Validation

Use JSON Schema Draft 2020-12 with Ajv plus semantic validation.

Semantic checks:

1. Unique IDs.
2. Valid passage, stimulus, and asset references.
3. Compatible section/type combinations.
4. Every ready question has a valid answer.
5. Correct option IDs exist.
6. Single choice has exactly one answer.
7. Multi-select contains no duplicates.
8. Matrix, two-part, and dropdown responses are complete.
9. RC requires `passageId`.
10. Source-dependent DI requires `stimulusId`.
11. Official Mode excludes legacy and `needs_review` questions.
12. Dangerous keys and excessive content are rejected.

Return issues with `code`, JSON-pointer-like `path`, and `message`.

## Security limits

- JSON: 5 MB maximum.
- Questions: 500.
- Passages: 100.
- Stimuli: 100.
- Assets: 25.
- Decoded assets: 10 MB.
- Reject `__proto__`, `prototype`, and `constructor` recursively.
- Never use `dangerouslySetInnerHTML`.
- Render imported strings as text.
- Reject remote assets and SVG.
- Optional assets may be base64 PNG, JPEG, or WebP only.

## Timer implementation

Use a wall-clock deadline, not only decrementing state:

```js
const expiresAt = Date.now() + durationSeconds * 1000;
const remainingSeconds = Math.max(
  0,
  Math.ceil((expiresAt - Date.now()) / 1000)
);
```

Recalculate on interval and `visibilitychange`. Persist `expiresAt`. Auto-submit exactly once. Do not pause in hidden tabs.

## Persistence

Versioned localStorage keys:

- `gmat-quiz-import-v1`
- `gmat-quiz-session-v1`
- `gmat-quiz-results-v1`

Offer Resume, Discard Session, and Clear Imported Quiz. Expire abandoned active sessions after seven days.

## Rendering

### Reading Comprehension

- Desktop split: passage left, question right.
- Mobile stacked or accessible Passage/Question tabs.
- Reuse passage by `passageId`.

### Data Insights

- Render text and structured tables.
- MSR sources use tabs.
- Table overflow remains local.
- Keep controls outside table scrollers.
- Mark questions dependent on unreconstructable charts `needs_review`.

## Scoring

Only `ready` questions with valid answers are scoreable.

- Single choice: exact match.
- Multi-select: exact set match.
- Statement matrix: every row matches.
- Two-part: every task matches.
- Dropdown blanks: every blank matches.

No partial credit in overall raw accuracy and no estimated GMAT score.

## Suggested structure

```text
src/
  App.jsx
  routes.js
  features/quiz/
    QuizWorkspace.jsx
    constants.js
    llmPrompt.js
    schema/quizSchema.js
    storage/quizStorage.js
    utils/
    hooks/
    components/
public/
  gmat-quiz.schema.json
  sample-gmat-quiz.json
  pdf-to-gmat-json-prompt.txt
```

Use stages: `import`, `configure`, `running`, `review`, `results`.

## Accessibility and mobile

- Native form controls and visible labels.
- Visible focus states.
- 44px touch targets.
- No color-only feedback.
- `aria-live` for timer warnings.
- Keyboard-accessible navigation.
- No page-wide horizontal scrolling.
- Verify at 320px and 390px.

## Tests

Add Vitest, React Testing Library, jest-dom, and jsdom.

Cover:

- valid and invalid imports;
- duplicate IDs and broken references;
- invalid answer IDs;
- mode filtering;
- official counts and time;
- three-change review cap;
- deadline timer and hidden-tab behavior;
- auto-submit once;
- every response renderer;
- Practice immediate feedback;
- Test answer hiding;
- RC passage display;
- existing timers still rendering.

## Acceptance criteria

- Third tab and direct `/quiz` load work.
- Prompt, schema, and sample are downloadable.
- Paste and file imports work.
- Invalid files cannot start a quiz.
- Practice, Custom Test, and all Official presets work.
- Official review caps response changes at three.
- Timers survive background throttling and refresh.
- RC and DI rendering are responsive.
- Answers appear only at the correct time.
- Existing timer tools do not regress.
- Tests and `npm run build` pass.

## Privacy and legal wording

> Import only material you are authorized to use. Quiz content is processed locally in your browser.

> This tool is not affiliated with or endorsed by GMAC. “GMAT” is a trademark of its respective owner.
