import {
  TaskType,
  TargetTool,
  GlobalSettings,
  ContextData,
  ContextAttachments,
  BugFixFields,
  FeatureFields,
  RefactorFields,
  CodeReviewFields,
  QualityScore
} from '../../shared/types';

const VAGUE_WORDS = /^(fix|update|change|improve|do|make|help)$/i;

function isVague(text: string): boolean {
  const words = text.trim().split(/\s+/);
  return words.length <= 2 && words.every(w => VAGUE_WORDS.test(w));
}

function hasSubstantiveContent(text: string, minLength = 20): boolean {
  return text.trim().length >= minLength;
}

export interface ScorerParams {
  taskType: TaskType;
  targetTool: TargetTool;
  globalSettings: GlobalSettings;
  contextData: ContextData;
  contextAttachments: ContextAttachments;
  bugFixFields: BugFixFields;
  featureFields: FeatureFields;
  refactorFields: RefactorFields;
  codeReviewFields: CodeReviewFields;
}

export function computeScore(params: ScorerParams): QualityScore {
  const {
    taskType,
    targetTool,
    globalSettings,
    contextData,
    contextAttachments,
    bugFixFields,
    featureFields,
    refactorFields,
    codeReviewFields
  } = params;

  const suggestions: string[] = [];

  // ---- Clarity (0-25) ----
  let clarity = 0;

  // +10 if task-specific required fields are non-empty (> 20 chars)
  let primaryField = '';
  switch (taskType) {
    case 'bug-fix':
      primaryField = bugFixFields.whatIsBroken;
      break;
    case 'feature':
      primaryField = featureFields.goal;
      break;
    case 'refactor':
      primaryField = refactorFields.currentState;
      break;
    case 'code-review':
      primaryField = codeReviewFields.focusAreas.join(', ');
      break;
  }

  if (hasSubstantiveContent(primaryField)) {
    clarity += 10;
  }

  // +10 if specificity (no vague words alone)
  if (primaryField.trim().length > 0 && !isVague(primaryField)) {
    clarity += 10;
  }

  // +5 if targetTool is selected (not 'other')
  if (targetTool !== 'other') {
    clarity += 5;
  }

  if (clarity < 15) {
    suggestions.push('Add more detail to your task description');
  }

  // ---- Context (0-25) ----
  let context = 0;

  // +10 if activeFile is detected
  if (contextData.activeFile) {
    context += 10;
  }

  // +5 if any attachment is enabled
  const anyAttachment =
    contextAttachments.codeSnippet ||
    contextAttachments.terminalError ||
    contextAttachments.gitDiff ||
    contextAttachments.testFile;
  if (anyAttachment) {
    context += 5;
  }

  // +5 if language/framework is set in globalSettings
  if (globalSettings.language || globalSettings.framework) {
    context += 5;
  }

  // +5 if projectName is detected
  if (contextData.projectName) {
    context += 5;
  }

  if (context < 15) {
    suggestions.push('Add code snippet or terminal error for better context');
  }

  // ---- Scope (0-25) ----
  let scope = 0;

  switch (taskType) {
    case 'bug-fix': {
      if (hasSubstantiveContent(bugFixFields.constraints)) { scope += 15; }
      if (hasSubstantiveContent(bugFixFields.expectedBehavior)) { scope += 10; }
      break;
    }
    case 'feature': {
      if (hasSubstantiveContent(featureFields.scopeBoundaries)) { scope += 15; }
      if (hasSubstantiveContent(featureFields.acceptanceCriteria)) { scope += 10; }
      break;
    }
    case 'refactor': {
      if (hasSubstantiveContent(refactorFields.constraints)) { scope += 15; }
      if (refactorFields.refactorGoal !== '') { scope += 10; }
      break;
    }
    case 'code-review': {
      if (codeReviewFields.focusAreas.length > 0) { scope += 15; }
      if (codeReviewFields.reviewDepth) { scope += 10; }
      break;
    }
  }

  if (scope < 15) {
    suggestions.push('Specify what should NOT be changed to prevent over-engineering');
  }

  // ---- Expected Output (0-25) ----
  let expectedOutput = 0;

  // +10 if any output format field is filled
  let hasOutputFormat = false;
  if (taskType === 'refactor' && refactorFields.targetOutputFormat) {
    hasOutputFormat = true;
  }
  if (taskType === 'code-review' && codeReviewFields.reviewDepth) {
    hasOutputFormat = true;
  }
  if (hasOutputFormat) {
    expectedOutput += 10;
  }

  // +15 if the prompt template for the selected tool includes explicit output format instruction
  // Rule: if targetTool is 'claude-code' and scopeBoundaries/constraints are filled → +15
  let hasExplicitOutputFormat = false;
  if (targetTool === 'claude-code') {
    switch (taskType) {
      case 'bug-fix':
        hasExplicitOutputFormat = hasSubstantiveContent(bugFixFields.constraints);
        break;
      case 'feature':
        hasExplicitOutputFormat = hasSubstantiveContent(featureFields.scopeBoundaries);
        break;
      case 'refactor':
        hasExplicitOutputFormat = hasSubstantiveContent(refactorFields.constraints);
        break;
      case 'code-review':
        hasExplicitOutputFormat = codeReviewFields.focusAreas.length > 0;
        break;
    }
  } else if (targetTool === 'chatgpt' || targetTool === 'gemini') {
    // These templates always include output format sections
    hasExplicitOutputFormat = true;
  } else if (targetTool === 'copilot') {
    hasExplicitOutputFormat = true;
  } else if (targetTool === 'other') {
    hasExplicitOutputFormat = hasSubstantiveContent(primaryField);
  }

  if (hasExplicitOutputFormat) {
    expectedOutput += 15;
  }

  if (expectedOutput < 15) {
    suggestions.push("Specify the expected output format (e.g., 'return only the modified function')");
  }

  const total = Math.min(100, clarity + context + scope + expectedOutput);

  return {
    total,
    clarity,
    context,
    scope,
    expectedOutput,
    suggestions
  };
}
