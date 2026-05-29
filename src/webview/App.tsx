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
  OutputOptions,
  LibraryPrompt,
  MCPAttachedItem,
  ExtensionMessage,
} from "../shared/types";

import { TaskTypeSelector } from "./components/TaskTypeSelector";
import { TargetToolSelector } from "./components/TargetToolSelector";
import { GlobalSettings as GlobalSettingsComponent } from "./components/GlobalSettings";
import { ContextSection } from "./components/ContextSection";
import { MCPSection, ServerBrowseState } from "./components/MCPSection";
import { BugFixForm } from "./components/BugFixForm";
import { FeatureForm } from "./components/FeatureForm";
import { RefactorForm } from "./components/RefactorForm";
import { CodeReviewForm } from "./components/CodeReviewForm";
import { QualityScorer } from "./components/QualityScorer";
import { PromptPreview } from "./components/PromptPreview";
import { ActionButtons } from "./components/ActionButtons";
import { generatePrompt } from "./utils/promptGenerator";
import { computeScore } from "./utils/scorer";
import { postMessage } from "./hooks/useVSCode";

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  language: "",
  runtime: "",
  framework: "",
  styleGuide: "",
  defaultTool: "claude-code",
  mcpServers: [],
};

const DEFAULT_CONTEXT_DATA: ContextData = {
  activeFile: "",
  activeFilePath: "",
  relativeFilePath: "",
  language: "",
  projectName: "",
  codeSnippet: "",
  codeSnippetLineRange: "",
  terminalError: "",
  gitDiff: "",
  testFile: "",
};

const DEFAULT_CONTEXT_ATTACHMENTS: ContextAttachments = {
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
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [contextData, setContextData] = useState<ContextData>(DEFAULT_CONTEXT_DATA);
  const [contextAttachments, setContextAttachments] = useState<ContextAttachments>(DEFAULT_CONTEXT_ATTACHMENTS);
  const [bugFixFields, setBugFixFields] = useState<BugFixFields>(DEFAULT_BUG_FIX);
  const [featureFields, setFeatureFields] = useState<FeatureFields>(DEFAULT_FEATURE);
  const [refactorFields, setRefactorFields] = useState<RefactorFields>(DEFAULT_REFACTOR);
  const [codeReviewFields, setCodeReviewFields] = useState<CodeReviewFields>(DEFAULT_CODE_REVIEW);
  const [outputOptions, setOutputOptions] = useState<OutputOptions>({ scopeToFile: true, codeOnly: true, format: 'structured' });
  const [library, setLibrary] = useState<LibraryPrompt[]>([]);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<LibraryPrompt | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // MCP state
  const [mcpItems, setMCPItems] = useState<MCPAttachedItem[]>([]);
  const [serverBrowseState, setServerBrowseState] = useState<Record<string, ServerBrowseState>>({});

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as ExtensionMessage;
      switch (message.type) {
        case "init": {
          const { settings, context, library: lib, detectedTool } = message.payload;
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
        case "mcpServerBrowsed": {
          const { serverId, resources, tools } = message.payload;
          setServerBrowseState(prev => ({
            ...prev,
            [serverId]: { loading: false, resources, tools }
          }));
          break;
        }
        case "mcpContentFetched": {
          setMCPItems(prev => [...prev, message.payload]);
          break;
        }
        case "mcpError": {
          const { serverId, message: errMsg } = message.payload;
          setServerBrowseState(prev => ({
            ...prev,
            [serverId]: { loading: false, error: errMsg, resources: [], tools: [] }
          }));
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
      outputOptions,
      mcpItems,
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
    outputOptions,
    mcpItems,
    bugFixFields,
    featureFields,
    refactorFields,
    codeReviewFields,
  ]);

  const displayPrompt = selectedLibraryItem?.prompt ?? generatedPrompt;

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

  const handleAttachmentChange = (key: keyof ContextAttachments, value: boolean) => {
    setContextAttachments((prev) => ({ ...prev, [key]: value }));
  };

  const handleTerminalErrorChange = (value: string) => {
    setContextData((prev) => ({ ...prev, terminalError: value }));
    setContextAttachments((prev) => ({ ...prev, terminalError: value.length > 0 }));
  };

  const handleReset = () => {
    setBugFixFields(DEFAULT_BUG_FIX);
    setFeatureFields(DEFAULT_FEATURE);
    setRefactorFields(DEFAULT_REFACTOR);
    setCodeReviewFields(DEFAULT_CODE_REVIEW);
    setContextAttachments(DEFAULT_CONTEXT_ATTACHMENTS);
    setMCPItems([]);
  };

  const handleToolChange = (tool: TargetTool) => {
    setTargetTool(tool);
    setToolAutoDetected(false);
  };

  const handleBrowseMCPServer = (serverId: string) => {
    setServerBrowseState(prev => ({
      ...prev,
      [serverId]: { loading: true, resources: [], tools: [] }
    }));
    postMessage({ type: 'browseMCPServer', payload: { serverId } });
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
        return <FeatureForm fields={featureFields} onChange={setFeatureFields} />;
      case "refactor":
        return <RefactorForm fields={refactorFields} onChange={setRefactorFields} />;
      case "code-review":
        return <CodeReviewForm fields={codeReviewFields} onChange={setCodeReviewFields} />;
    }
  };

  return (
    <div style={{ padding: "12px 14px", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--vscode-panel-border)",
      }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>GoodPrompts</h1>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>
            Better prompts for AI coding assistants
          </div>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          title={showSettings ? "Hide settings" : "Settings"}
          style={{
            backgroundColor: showSettings ? "var(--vscode-button-background)" : "transparent",
            color: showSettings ? "var(--vscode-button-foreground)" : "var(--vscode-editor-foreground)",
            border: "1px solid var(--vscode-input-border, rgba(255,255,255,0.2))",
            borderRadius: 4, padding: "4px 10px", fontSize: 16, lineHeight: 1, cursor: "pointer",
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
            onTerminalErrorChange={handleTerminalErrorChange}
          />

          <MCPSection
            servers={globalSettings.mcpServers}
            mcpItems={mcpItems}
            browseState={serverBrowseState}
            onBrowse={handleBrowseMCPServer}
            onRemoveItem={(id) => setMCPItems(prev => prev.filter(i => i.id !== id))}
          />

          <div style={sectionStyle}>
            <div style={{
              fontSize: 12, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: "0.05em", opacity: 0.75, marginBottom: 12,
            }}>
              {taskType === "bug-fix" && "Bug Fix Details"}
              {taskType === "feature" && "Feature Details"}
              {taskType === "refactor" && "Refactor Details"}
              {taskType === "code-review" && "Code Review Details"}
            </div>
            {renderTaskForm()}
          </div>

          <QualityScorer score={qualityScore} />

          <PromptPreview prompt={displayPrompt} contextData={contextData} />

          <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            {taskType !== 'code-review' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={outputOptions.scopeToFile}
                  onChange={e => setOutputOptions(prev => ({ ...prev, scopeToFile: e.target.checked }))}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                Limit to this file
              </label>
            )}
            {taskType !== 'code-review' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={outputOptions.codeOnly}
                  onChange={e => setOutputOptions(prev => ({ ...prev, codeOnly: e.target.checked }))}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                Code only
              </label>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <span style={{ opacity: 0.75 }}>Format:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="outputFormat"
                  checked={outputOptions.format === 'structured'}
                  onChange={() => setOutputOptions(prev => ({ ...prev, format: 'structured' }))}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                Structured
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="outputFormat"
                  checked={outputOptions.format === 'xml'}
                  onChange={() => setOutputOptions(prev => ({ ...prev, format: 'xml' }))}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                XML
              </label>
            </div>
          </div>

          {selectedLibraryItem && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', marginBottom: 8, borderRadius: 4,
              backgroundColor: 'var(--vscode-input-background)',
              border: '1px solid var(--vscode-button-background)', fontSize: 11
            }}>
              <span style={{ opacity: 0.8 }}>Viewing: <strong>{selectedLibraryItem.title}</strong></span>
              <button
                onClick={() => setSelectedLibraryItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.6, padding: '0 2px' }}
              >
                ✕ Back to form
              </button>
            </div>
          )}

          <ActionButtons
            prompt={displayPrompt}
            taskType={taskType}
            targetTool={targetTool}
            score={qualityScore.total}
            onReset={handleReset}
          />

          {library.length > 0 && (
            <div style={{
              marginBottom: 16, padding: 12,
              backgroundColor: 'var(--vscode-sideBar-background)',
              border: '1px solid var(--vscode-panel-border)', borderRadius: 6,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.75, marginBottom: 8 }}>
                Saved Prompts ({library.length})
              </div>
              {library.map((item) => {
                const isSelected = selectedLibraryItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedLibraryItem(isSelected ? null : item)}
                    style={{
                      padding: '6px 8px', marginBottom: 4,
                      backgroundColor: isSelected ? 'var(--vscode-list-activeSelectionBackground, var(--vscode-button-background))' : 'var(--vscode-input-background)',
                      color: isSelected ? 'var(--vscode-list-activeSelectionForeground, var(--vscode-button-foreground))' : 'inherit',
                      borderRadius: 3, cursor: 'pointer',
                      borderLeft: `3px solid var(--vscode-button-background)`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{item.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, opacity: 0.6 }}>Score: {item.score}</span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (selectedLibraryItem?.id === item.id) { setSelectedLibraryItem(null); }
                            setLibrary(prev => prev.filter(i => i.id !== item.id));
                            postMessage({ type: 'deleteFromLibrary', payload: item.id });
                          }}
                          title="Delete"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.5, padding: '0 2px', color: 'inherit' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>
                      {item.taskType} · {item.targetTool} · {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
