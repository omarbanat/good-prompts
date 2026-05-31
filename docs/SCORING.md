# Prompt Quality Scoring

Reference for understanding, extending, or debugging the GoodPrompts quality scorer.

---

## Overview

The scorer is a pure function — `computeScore` in `src/webview/utils/scorer.ts` — with no side effects and no network calls. It runs on every React render via `useMemo` in `App.tsx`, giving the user a live score as they fill in the form.

The score is a number from **0 to 100**, broken into four dimensions of 25 points each:

| Dimension | Max | What it measures |
|---|---|---|
| Clarity | 25 | Is the task description specific enough for the model to act on? |
| Context | 25 | Does the model have the workspace and code signals it needs? |
| Scope | 25 | Are the boundaries and success criteria defined? |
| Expected Output | 25 | Does the prompt tell the model what to produce? |

---

## Thresholds

| Total | Label |
|---|---|
| 0–49 | Not ready |
| 50–74 | Needs improvement |
| 75–100 | Ready to submit |

When any dimension scores below 15 out of 25, a plain-language suggestion is appended to the result and shown inline in the `QualityScorer` component.

---

## Dimension breakdown

### Clarity (0–25)

Scores whether the user's primary task description is meaningful and specific.

The primary field varies by task type:

| Task type | Primary field |
|---|---|
| Bug Fix | What is broken |
| Feature | Goal (the "I want" part of the user story) |
| Refactor | Current state description |
| Code Review | Focus areas (joined as a string) |

**Scoring rules:**

| Points | Condition |
|---|---|
| +10 | Primary field has ≥ 20 characters of non-whitespace content |
| +10 | Primary field is not a single vague verb (fix, update, change, improve, do, make, help) |
| +5 | Target tool is not `other` |

The vague-word check (`isVague`) only fires when the field is 1–2 words and every word matches the blocklist. A sentence like "fix the JWT expiry handler" passes because it has more than two words.

**Suggestion trigger:** score < 15 → "Add more detail to your task description"

---

### Context (0–25)

Scores whether the model will have the workspace signals it needs to produce accurate code.

**Scoring rules:**

| Points | Condition |
|---|---|
| +10 | `contextData.activeFile` is non-empty (auto-detected from the active editor) |
| +5 | At least one context attachment is active: code snippet captured, or terminal error / git diff / test file checkbox enabled |
| +5 | `globalSettings.language` or `globalSettings.framework` is set |
| +5 | `contextData.projectName` is non-empty (auto-detected from workspace) |

**Suggestion trigger:** score < 15 → "Add code snippet or terminal error for better context"

---

### Scope (0–25)

Scores whether the boundaries and success criteria are defined. Rules are task-specific because "scope" means different things for each task type.

**Bug Fix:**

| Points | Condition |
|---|---|
| +15 | Constraints field has ≥ 20 characters |
| +10 | Expected behavior field has ≥ 20 characters |

**Feature:**

| Points | Condition |
|---|---|
| +15 | Scope boundaries field has ≥ 20 characters |
| +10 | Acceptance criteria field has ≥ 20 characters |

**Refactor:**

| Points | Condition |
|---|---|
| +15 | Constraints field has ≥ 20 characters |
| +10 | Refactor goal is selected (non-empty string) |

**Code Review:**

| Points | Condition |
|---|---|
| +15 | At least one focus area checkbox is selected |
| +10 | Review depth is set (Quick Scan or Thorough Review) |

**Suggestion trigger:** score < 15 → "Specify what should NOT be changed to prevent over-engineering"

---

### Expected Output (0–25)

Scores whether the generated prompt will contain explicit instructions about what the model should produce.

This dimension has two independent sub-scores that can stack:

**+10 — output format field filled (task-specific):**

| Task type | Field checked |
|---|---|
| Refactor | `targetOutputFormat` is non-empty |
| Code Review | `reviewDepth` is set |
| Bug Fix, Feature | Not applicable (these tasks earn the 15 via template) |

**+15 — tool template includes explicit output instructions:**

This reflects whether the *generated prompt*, given the current inputs, will contain a concrete output instruction. The rules differ by tool:

| Target tool | Condition for +15 |
|---|---|
| `claude-code` | Task-specific constraint / scope boundary field has ≥ 20 characters — because the Claude Code templates append "Return only the modified code" only when that field is filled |
| `copilot` | Always — every Copilot template closes with "Provide only the corrected code block" |
| `chatgpt` | Always — every ChatGPT template includes an `## Output Format` section |
| `gemini` | Always — every Gemini template includes an explicit output length and format instruction |
| `other` | Primary field has ≥ 20 characters (weak proxy: structured content implies the user knows what they want) |

**Suggestion trigger:** score < 15 → "Specify the expected output format (e.g., 'return only the modified function')"

---

## Design decisions

**Why pure function?** The scorer runs synchronously on every keystroke. A pure function with no I/O makes this safe and testable without mocking.

**Why 20 characters as the content threshold?** It filters out placeholder-length text ("fix bug", "add feature") without penalising concise but specific inputs. The threshold is intentionally low — the vague-word check handles the quality dimension; the length check handles only emptiness.

**Why does Scope weight the constraint field at 15 vs. the secondary field at 10?** Constraints ("do not change the public API") prevent the model from over-engineering or breaking callers. They are consistently higher-value than a secondary field because they bound the solution space regardless of task type.

**Why does Expected Output differ by tool?** The 15-point bonus reflects what the *generated* prompt will actually contain, not what the user filled in. Copilot, ChatGPT, and Gemini templates always emit an output format instruction unconditionally. The Claude Code template only emits it when scope/constraint fields are filled, so the score mirrors that conditional.

---

## Extending the scorer

**Adding a new task type:** Add a case to the `primaryField` switch, the `scope` switch, and the `hasExplicitOutputFormat` switch in `scorer.ts`. Mirror the same structure as existing cases.

**Adding a new target tool:** Add a branch in the `hasExplicitOutputFormat` block. Set it to `true` if the template unconditionally includes an output instruction; otherwise gate it on a field being filled.

**Changing thresholds:** The per-dimension suggestion trigger (< 15) and the global status thresholds (50, 75) are the two tuning points. They are not exported as constants — extract them if you need to make them configurable.
