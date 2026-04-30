import React, { useState, useEffect, useMemo } from "react";
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
  LibraryPrompt,
  ExtensionMessage,
} from "../shared/types";

import { TaskTypeSelector } from "./components/TaskTypeSelector";
import { TargetToolSelector } from "./components/TargetToolSelector";
import { GlobalSettings as GlobalSettingsComponent } from "./components/GlobalSettings";
import { ContextSection } from "./components/ContextSection";
import { BugFixForm } from "./components/BugFixForm";
import { FeatureForm } from "./components/FeatureForm";
import { RefactorForm } from "./components/RefactorForm";
import { CodeReviewForm } from "./components/CodeReviewForm";
import { QualityScorer } from "./components/QualityScorer";
import { PromptPreview } from "./components/PromptPreview";
import { ActionButtons } from "./components/ActionButtons";
import { generatePrompt } from "./utils/promptGenerator";
import { computeScore } from "./utils/scorer";

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  language: "",
  runtime: "",
  framework: "",
  styleGuide: "",
  defaultTool: "claude-code",
};

const DEFAULT_CONTEXT_DATA: ContextData = {
  activeFile: "",
  activeFilePath: "",
  language: "",
  projectName: "",
  codeSnippet: "",
  terminalError: "",
  gitDiff: "",
  testFile: "",
};

const DEFAULT_CONTEXT_ATTACHMENTS: ContextAttachments = {
  codeSnippet: false,
  codeSnippetLineRange: "",
  terminalError: false,
  gitDiff: false,
  testFile: false,
};

const DEFAULT_BUG_FIX: BugFixFields = {
  whatIsBroken: "",
  expectedBehavior: "",
  actualBehavior: "",
  constraints: "",
};

const DEFAULT_FEATURE: FeatureFields = {
  role: "",
  goal: "",
  reason: "",
  acceptanceCriteria: "",
  scopeBoundaries: "",
  dependencies: "",
};

const DEFAULT_REFACTOR: RefactorFields = {
  currentState: "",
  refactorGoal: "",
  constraints: "",
  targetOutputFormat: "",
};

const DEFAULT_CODE_REVIEW: CodeReviewFields = {
  focusAreas: [],
  knownExclusions: "",
  reviewDepth: "quick",
};

export const App: React.FC = () => {
  const [taskType, setTaskType] = useState<TaskType>("bug-fix");
  const [targetTool, setTargetTool] = useState<TargetTool>("claude-code");
  const [toolAutoDetected, setToolAutoDetected] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(
    DEFAULT_GLOBAL_SETTINGS,
  );
  const [contextData, setContextData] =
    useState<ContextData>(DEFAULT_CONTEXT_DATA);
  const [contextAttachments, setContextAttachments] =
    useState<ContextAttachments>(DEFAULT_CONTEXT_ATTACHMENTS);
  const [bugFixFields, setBugFixFields] =
    useState<BugFixFields>(DEFAULT_BUG_FIX);
  const [featureFields, setFeatureFields] =
    useState<FeatureFields>(DEFAULT_FEATURE);
  const [refactorFields, setRefactorFields] =
    useState<RefactorFields>(DEFAULT_REFACTOR);
  const [codeReviewFields, setCodeReviewFields] =
    useState<CodeReviewFields>(DEFAULT_CODE_REVIEW);
  const [library, setLibrary] = useState<LibraryPrompt[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Listen for messages from the extension host
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as ExtensionMessage;
      switch (message.type) {
        case "init": {
          const {
            settings,
            context,
            library: lib,
            detectedTool,
          } = message.payload;
          setGlobalSettings(settings);
          setContextData(context);
          setLibrary(lib);
          if (detectedTool) {
            setTargetTool(detectedTool);
            setToolAutoDetected(true);
          } else {
            setTargetTool(settings.defaultTool);
            setToolAutoDetected(false);
          }
          break;
        }
        case "contextUpdated": {
          setContextData((prev) => ({ ...prev, ...message.payload }));
          break;
        }
        case "promptSaved": {
          setLibrary((prev) => [message.payload, ...prev]);
          break;
        }
        case "promptCopied":
        case "error":
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const generatedPrompt = useMemo(() => {
    return generatePrompt({
      taskType,
      targetTool,
      globalSettings,
      contextData,
      contextAttachments,
      bugFixFields,
      featureFields,
      refactorFields,
      codeReviewFields,
    });
  }, [
    taskType,
    targetTool,
    globalSettings,
    contextData,
    contextAttachments,
    bugFixFields,
    featureFields,
    refactorFields,
    codeReviewFields,
  ]);

  const qualityScore = useMemo(() => {
    return computeScore({
      taskType,
      targetTool,
      globalSettings,
      contextData,
      contextAttachments,
      bugFixFields,
      featureFields,
      refactorFields,
      codeReviewFields,
    });
  }, [
    taskType,
    targetTool,
    globalSettings,
    contextData,
    contextAttachments,
    bugFixFields,
    featureFields,
    refactorFields,
    codeReviewFields,
  ]);

  const handleAttachmentChange = (
    key: keyof ContextAttachments,
    value: boolean,
  ) => {
    setContextAttachments((prev) => ({ ...prev, [key]: value }));
  };

  const handleLineRangeChange = (value: string) => {
    setContextAttachments((prev) => ({ ...prev, codeSnippetLineRange: value }));
  };

  const handleTerminalErrorChange = (value: string) => {
    setContextData((prev) => ({ ...prev, terminalError: value }));
    setContextAttachments((prev) => ({
      ...prev,
      terminalError: value.length > 0,
    }));
  };

  const handleReset = () => {
    setBugFixFields(DEFAULT_BUG_FIX);
    setFeatureFields(DEFAULT_FEATURE);
    setRefactorFields(DEFAULT_REFACTOR);
    setCodeReviewFields(DEFAULT_CODE_REVIEW);
    setContextAttachments(DEFAULT_CONTEXT_ATTACHMENTS);
  };

  const handleToolChange = (tool: TargetTool) => {
    setTargetTool(tool);
    setToolAutoDetected(false);
  };

  const sectionStyle: React.CSSProperties = {
    padding: 12,
    backgroundColor: "var(--vscode-sideBar-background)",
    border: "1px solid var(--vscode-panel-border)",
    borderRadius: 6,
    marginBottom: 16,
  };

  const renderTaskForm = () => {
    switch (taskType) {
      case "bug-fix":
        return (
          <BugFixForm
            fields={bugFixFields}
            contextData={contextData}
            contextAttachments={contextAttachments}
            onChange={setBugFixFields}
          />
        );
      case "feature":
        return (
          <FeatureForm fields={featureFields} onChange={setFeatureFields} />
        );
      case "refactor":
        return (
          <RefactorForm fields={refactorFields} onChange={setRefactorFields} />
        );
      case "code-review":
        return (
          <CodeReviewForm
            fields={codeReviewFields}
            onChange={setCodeReviewFields}
          />
        );
    }
  };

  return (
    <div
      style={{
        padding: "12px 14px",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: "1px solid var(--vscode-panel-border)",
        }}
      >
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            GoodPrompts
          </h1>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>
            Better prompts for AI coding assistants
          </div>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          title={showSettings ? "Hide settings" : "Settings"}
          style={{
            backgroundColor: showSettings
              ? "var(--vscode-button-background)"
              : "transparent",
            color: showSettings
              ? "var(--vscode-button-foreground)"
              : "var(--vscode-editor-foreground)",
            border:
              "1px solid var(--vscode-input-border, rgba(255,255,255,0.2))",
            borderRadius: 4,
            padding: "4px 10px",
            fontSize: 16,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ⚙
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <GlobalSettingsComponent
          settings={globalSettings}
          onSave={(settings) => {
            setGlobalSettings(settings);
            setShowSettings(false);
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}

      {/* Main form */}
      {!showSettings && (
        <>
          <TaskTypeSelector taskType={taskType} onChange={setTaskType} />

          <TargetToolSelector
            targetTool={targetTool}
            toolAutoDetected={toolAutoDetected}
            onChange={handleToolChange}
          />

          <ContextSection
            contextData={contextData}
            contextAttachments={contextAttachments}
            onAttachmentChange={handleAttachmentChange}
            onLineRangeChange={handleLineRangeChange}
            onTerminalErrorChange={handleTerminalErrorChange}
          />

          <div style={sectionStyle}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: 0.75,
                marginBottom: 12,
              }}
            >
              {taskType === "bug-fix" && "Bug Fix Details"}
              {taskType === "feature" && "Feature Details"}
              {taskType === "refactor" && "Refactor Details"}
              {taskType === "code-review" && "Code Review Details"}
            </div>
            {renderTaskForm()}
          </div>

          <QualityScorer score={qualityScore} />

          <PromptPreview prompt={generatedPrompt} contextData={contextData} />

          <ActionButtons
            prompt={generatedPrompt}
            taskType={taskType}
            targetTool={targetTool}
            score={qualityScore.total}
            onReset={handleReset}
          />

          {library.length > 0 && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: "var(--vscode-sideBar-background)",
                border: "1px solid var(--vscode-panel-border)",
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  opacity: 0.75,
                  marginBottom: 8,
                }}
              >
                Saved Prompts ({library.length})
              </div>
              {library.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "6px 8px",
                    marginBottom: 4,
                    backgroundColor: "var(--vscode-input-background)",
                    borderRadius: 3,
                    cursor: "default",
                    borderLeft: "3px solid var(--vscode-button-background)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500 }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.5 }}>
                      Score: {item.score}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
                    {item.taskType} · {item.targetTool} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {library.length > 5 && (
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                  +{library.length - 5} more saved prompts
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
