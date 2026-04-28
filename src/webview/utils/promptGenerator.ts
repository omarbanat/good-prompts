import {
  TaskType,
  TargetTool,
  GlobalSettings,
  ContextData,
  ContextAttachments,
  BugFixFields,
  FeatureFields,
  RefactorFields,
  CodeReviewFields
} from '../../shared/types';

export interface GeneratePromptParams {
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

function buildContextBlock(
  contextData: ContextData,
  contextAttachments: ContextAttachments
): string {
  const parts: string[] = [];

  if (contextAttachments.codeSnippet && contextData.codeSnippet) {
    parts.push(`\`\`\`\n${contextData.codeSnippet}\n\`\`\``);
  }

  if (contextAttachments.terminalError && contextData.terminalError) {
    parts.push(`Error:\n${contextData.terminalError}`);
  }

  if (contextAttachments.gitDiff && contextData.gitDiff) {
    parts.push(`Git diff:\n\`\`\`diff\n${contextData.gitDiff}\n\`\`\``);
  }

  if (contextAttachments.testFile && contextData.testFile) {
    parts.push(`Test file:\n\`\`\`\n${contextData.testFile}\n\`\`\``);
  }

  return parts.join('\n\n');
}

function generateClaudeCodePrompt(params: GeneratePromptParams): string {
  const { taskType, contextData, contextAttachments, globalSettings, bugFixFields, featureFields, refactorFields, codeReviewFields } = params;
  const fileRef = contextData.activeFile ? `\`${contextData.activeFile}\`` : 'the active file';

  switch (taskType) {
    case 'bug-fix': {
      const lines: string[] = [];
      lines.push(`In ${fileRef}, fix the following bug.`);
      if (bugFixFields.whatIsBroken) {
        lines.push(`\nWhat is broken: ${bugFixFields.whatIsBroken}`);
      }
      if (bugFixFields.expectedBehavior) {
        lines.push(`\nExpected behavior: ${bugFixFields.expectedBehavior}`);
      }
      if (bugFixFields.actualBehavior) {
        lines.push(`\nActual behavior: ${bugFixFields.actualBehavior}`);
      }
      const ctx = buildContextBlock(contextData, contextAttachments);
      if (ctx) { lines.push(`\n${ctx}`); }
      if (bugFixFields.constraints) {
        lines.push(`\nConstraints: ${bugFixFields.constraints}`);
      }
      lines.push('\nDo not modify any other files.');
      lines.push('Return only the modified code with inline comments.');
      return lines.join('\n');
    }

    case 'feature': {
      const lines: string[] = [];
      const role = featureFields.role || 'developer';
      const goal = featureFields.goal || '...';
      const reason = featureFields.reason || '...';
      lines.push(`As a ${role}, I want to ${goal}, so that ${reason}.`);
      if (featureFields.acceptanceCriteria) {
        lines.push(`\nAcceptance criteria:\n${featureFields.acceptanceCriteria}`);
      }
      if (featureFields.scopeBoundaries) {
        lines.push(`\nScope boundaries (do NOT change):\n${featureFields.scopeBoundaries}`);
      }
      if (featureFields.dependencies) {
        lines.push(`\nDependencies / constraints:\n${featureFields.dependencies}`);
      }
      const ctx = buildContextBlock(contextData, contextAttachments);
      if (ctx) { lines.push(`\n${ctx}`); }
      lines.push(`\nImplement this in ${fileRef}.`);
      lines.push('Do not modify any other files.');
      lines.push('Return only the modified code with inline comments.');
      return lines.join('\n');
    }

    case 'refactor': {
      const lines: string[] = [];
      lines.push(`In ${fileRef}, refactor the following code.`);
      if (refactorFields.currentState) {
        lines.push(`\nCurrent state:\n${refactorFields.currentState}`);
      }
      if (refactorFields.refactorGoal) {
        lines.push(`\nRefactor goal: ${refactorFields.refactorGoal}`);
      }
      const ctx = buildContextBlock(contextData, contextAttachments);
      if (ctx) { lines.push(`\n${ctx}`); }
      if (refactorFields.constraints) {
        lines.push(`\nConstraints: ${refactorFields.constraints}`);
      }
      if (refactorFields.targetOutputFormat) {
        lines.push(`\nOutput format: ${refactorFields.targetOutputFormat}`);
      }
      lines.push('\nDo not modify any other files.');
      lines.push('Return only the refactored code with inline comments.');
      return lines.join('\n');
    }

    case 'code-review': {
      const lines: string[] = [];
      lines.push(`Review ${fileRef}.`);
      if (codeReviewFields.focusAreas.length > 0) {
        lines.push(`\nFocus areas: ${codeReviewFields.focusAreas.join(', ')}`);
      }
      if (codeReviewFields.knownExclusions) {
        lines.push(`\nKnown issues to exclude: ${codeReviewFields.knownExclusions}`);
      }
      const depth = codeReviewFields.reviewDepth === 'thorough' ? 'thorough review' : 'quick scan';
      lines.push(`\nReview depth: ${depth}`);
      const ctx = buildContextBlock(contextData, contextAttachments);
      if (ctx) { lines.push(`\n${ctx}`); }
      if (globalSettings.language) {
        lines.push(`\nLanguage: ${globalSettings.language}`);
      }
      lines.push('\nReturn a structured list of findings with severity and suggested fixes.');
      return lines.join('\n');
    }
  }
}

function generateCopilotPrompt(params: GeneratePromptParams): string {
  const { taskType, globalSettings, contextData, contextAttachments, bugFixFields, featureFields, refactorFields, codeReviewFields } = params;
  const lang = globalSettings.language || contextData.language || 'the given language';
  const framework = globalSettings.framework ? ` working on a ${globalSettings.framework} application` : '';

  const lines: string[] = [];
  lines.push(`You are a senior ${lang} engineer${framework}.`);

  const ctx = buildContextBlock(contextData, contextAttachments);
  if (ctx) { lines.push(`\n${ctx}`); }

  switch (taskType) {
    case 'bug-fix': {
      if (bugFixFields.whatIsBroken) { lines.push(`\nIssue: ${bugFixFields.whatIsBroken}`); }
      if (bugFixFields.expectedBehavior) { lines.push(`Expected behavior: ${bugFixFields.expectedBehavior}`); }
      if (bugFixFields.actualBehavior) { lines.push(`Actual behavior: ${bugFixFields.actualBehavior}`); }
      if (bugFixFields.constraints) { lines.push(`Constraints: ${bugFixFields.constraints}`); }
      break;
    }
    case 'feature': {
      const role = featureFields.role || 'developer';
      const goal = featureFields.goal || '...';
      const reason = featureFields.reason || '...';
      lines.push(`\nUser story: As a ${role}, I want to ${goal}, so that ${reason}.`);
      if (featureFields.acceptanceCriteria) { lines.push(`Acceptance criteria:\n${featureFields.acceptanceCriteria}`); }
      if (featureFields.scopeBoundaries) { lines.push(`Do not change: ${featureFields.scopeBoundaries}`); }
      break;
    }
    case 'refactor': {
      if (refactorFields.currentState) { lines.push(`\nCurrent state:\n${refactorFields.currentState}`); }
      if (refactorFields.refactorGoal) { lines.push(`Refactor for: ${refactorFields.refactorGoal}`); }
      if (refactorFields.constraints) { lines.push(`Constraints: ${refactorFields.constraints}`); }
      break;
    }
    case 'code-review': {
      if (codeReviewFields.focusAreas.length > 0) { lines.push(`\nReview focusing on: ${codeReviewFields.focusAreas.join(', ')}`); }
      if (codeReviewFields.knownExclusions) { lines.push(`Exclude: ${codeReviewFields.knownExclusions}`); }
      lines.push(`Depth: ${codeReviewFields.reviewDepth}`);
      break;
    }
  }

  lines.push('\nProvide only the corrected code block.');
  return lines.join('\n');
}


function generateChatGPTPrompt(params: GeneratePromptParams): string {
  const { taskType, globalSettings, contextData, contextAttachments, bugFixFields, featureFields, refactorFields, codeReviewFields } = params;

  const lines: string[] = [];

  // Context section
  lines.push('## Context');
  if (contextData.activeFile) { lines.push(`File: ${contextData.activeFile}`); }
  if (contextData.projectName) { lines.push(`Project: ${contextData.projectName}`); }
  if (globalSettings.language || contextData.language) {
    lines.push(`Language: ${globalSettings.language || contextData.language}`);
  }
  if (globalSettings.framework) { lines.push(`Framework: ${globalSettings.framework}`); }

  const ctx = buildContextBlock(contextData, contextAttachments);
  if (ctx) {
    lines.push('\n## Code');
    lines.push(ctx);
  }

  switch (taskType) {
    case 'bug-fix': {
      lines.push('\n## Problem');
      if (bugFixFields.whatIsBroken) { lines.push(bugFixFields.whatIsBroken); }
      lines.push('\n## Expected Behavior');
      if (bugFixFields.expectedBehavior) { lines.push(bugFixFields.expectedBehavior); }
      if (bugFixFields.actualBehavior) {
        lines.push('\n## Actual Behavior');
        lines.push(bugFixFields.actualBehavior);
      }
      if (bugFixFields.constraints) {
        lines.push('\n## Constraints');
        lines.push(bugFixFields.constraints);
      }
      break;
    }
    case 'feature': {
      const role = featureFields.role || 'developer';
      const goal = featureFields.goal || '...';
      const reason = featureFields.reason || '...';
      lines.push('\n## User Story');
      lines.push(`As a ${role}, I want to ${goal}, so that ${reason}.`);
      if (featureFields.acceptanceCriteria) {
        lines.push('\n## Acceptance Criteria');
        lines.push(featureFields.acceptanceCriteria);
      }
      if (featureFields.scopeBoundaries) {
        lines.push('\n## Scope (Do NOT change)');
        lines.push(featureFields.scopeBoundaries);
      }
      if (featureFields.dependencies) {
        lines.push('\n## Dependencies / Constraints');
        lines.push(featureFields.dependencies);
      }
      break;
    }
    case 'refactor': {
      if (refactorFields.currentState) {
        lines.push('\n## Current State');
        lines.push(refactorFields.currentState);
      }
      lines.push('\n## Refactor Goal');
      if (refactorFields.refactorGoal) { lines.push(refactorFields.refactorGoal); }
      if (refactorFields.constraints) {
        lines.push('\n## Constraints');
        lines.push(refactorFields.constraints);
      }
      break;
    }
    case 'code-review': {
      lines.push('\n## Review Request');
      if (codeReviewFields.focusAreas.length > 0) {
        lines.push(`Focus on: ${codeReviewFields.focusAreas.join(', ')}`);
      }
      if (codeReviewFields.knownExclusions) {
        lines.push(`Exclude: ${codeReviewFields.knownExclusions}`);
      }
      lines.push(`Depth: ${codeReviewFields.reviewDepth}`);
      break;
    }
  }

  lines.push('\n## Output Format');
  if (taskType === 'code-review') {
    lines.push('Return a structured review with findings, severity levels (critical/major/minor), and suggested fixes.');
  } else if (taskType === 'refactor') {
    const fmt = refactorFields.targetOutputFormat || 'Return the refactored code with comments explaining changes.';
    lines.push(fmt);
  } else {
    lines.push('Return only the modified code with inline comments explaining each change.');
  }

  return lines.join('\n');
}

function generateGeminiPrompt(params: GeneratePromptParams): string {
  const { taskType, globalSettings, contextData, contextAttachments, bugFixFields, featureFields, refactorFields, codeReviewFields } = params;

  const lines: string[] = [];
  lines.push('Please follow these steps exactly:');
  lines.push('');

  const ctx = buildContextBlock(contextData, contextAttachments);

  switch (taskType) {
    case 'bug-fix': {
      lines.push(`1. Read the code in \`${contextData.activeFile || 'the file'}\`.`);
      if (ctx) {
        lines.push('');
        lines.push(ctx);
        lines.push('');
      }
      lines.push(`2. The bug is: ${bugFixFields.whatIsBroken || '(describe the bug)'}`);
      lines.push(`3. Expected behavior: ${bugFixFields.expectedBehavior || '(expected behavior)'}`);
      lines.push(`4. Actual behavior: ${bugFixFields.actualBehavior || '(actual behavior)'}`);
      if (bugFixFields.constraints) {
        lines.push(`5. Constraints: ${bugFixFields.constraints}`);
        lines.push(`   Remember: ${bugFixFields.constraints}`);
      }
      lines.push('6. Fix only the bug. Do not refactor or change anything else.');
      lines.push('7. Return the modified code only. Keep your response under 500 lines.');
      break;
    }
    case 'feature': {
      const role = featureFields.role || 'developer';
      const goal = featureFields.goal || '...';
      const reason = featureFields.reason || '...';
      lines.push(`1. Understand the user story: As a ${role}, I want to ${goal}, so that ${reason}.`);
      if (featureFields.acceptanceCriteria) {
        lines.push(`2. Acceptance criteria:\n${featureFields.acceptanceCriteria}`);
      }
      if (featureFields.scopeBoundaries) {
        lines.push(`3. Do NOT modify: ${featureFields.scopeBoundaries}`);
        lines.push(`   Important: Do NOT modify: ${featureFields.scopeBoundaries}`);
      }
      if (ctx) { lines.push(''); lines.push(ctx); lines.push(''); }
      if (featureFields.dependencies) {
        lines.push(`4. Dependencies: ${featureFields.dependencies}`);
      }
      lines.push('5. Implement only what is described in the acceptance criteria.');
      lines.push('6. Return the modified code only. Keep your response under 500 lines.');
      break;
    }
    case 'refactor': {
      lines.push(`1. Read the code in \`${contextData.activeFile || 'the file'}\`.`);
      if (ctx) { lines.push(''); lines.push(ctx); lines.push(''); }
      if (refactorFields.currentState) {
        lines.push(`2. Current state: ${refactorFields.currentState}`);
      }
      if (refactorFields.refactorGoal) {
        lines.push(`3. Refactor goal: ${refactorFields.refactorGoal}`);
      }
      if (refactorFields.constraints) {
        lines.push(`4. Constraints: ${refactorFields.constraints}`);
        lines.push(`   Remember: ${refactorFields.constraints}`);
      }
      lines.push('5. Apply refactoring changes only. Do not add new features.');
      if (refactorFields.targetOutputFormat) {
        lines.push(`6. Output format: ${refactorFields.targetOutputFormat}`);
      } else {
        lines.push('6. Return the refactored code with comments. Keep your response under 500 lines.');
      }
      break;
    }
    case 'code-review': {
      lines.push(`1. Read the code in \`${contextData.activeFile || 'the file'}\`.`);
      if (ctx) { lines.push(''); lines.push(ctx); lines.push(''); }
      if (codeReviewFields.focusAreas.length > 0) {
        lines.push(`2. Focus your review on: ${codeReviewFields.focusAreas.join(', ')}.`);
      }
      if (codeReviewFields.knownExclusions) {
        lines.push(`3. Do NOT report: ${codeReviewFields.knownExclusions}`);
        lines.push(`   Remember: Do NOT report: ${codeReviewFields.knownExclusions}`);
      }
      const depth = codeReviewFields.reviewDepth === 'thorough' ? 'thorough' : 'quick';
      lines.push(`4. Perform a ${depth} review.`);
      if (globalSettings.language || contextData.language) {
        lines.push(`5. Language: ${globalSettings.language || contextData.language}`);
      }
      lines.push('6. Format findings as: [Severity] Issue - Suggested Fix. Keep your response under 500 lines.');
      break;
    }
  }

  return lines.join('\n');
}

export function generatePrompt(params: GeneratePromptParams): string {
  switch (params.targetTool) {
    case 'claude-code':
      return generateClaudeCodePrompt(params);
    case 'copilot':
      return generateCopilotPrompt(params);
    case 'chatgpt':
      return generateChatGPTPrompt(params);
    case 'gemini':
      return generateGeminiPrompt(params);
    case 'other':
      // Generic prompt similar to ChatGPT structured format
      return generateChatGPTPrompt(params);
    default:
      return generateClaudeCodePrompt(params);
  }
}
