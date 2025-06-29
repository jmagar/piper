"use client"

import { Agent } from "@/app/types/agent";

// FetchedToolInfo is now imported directly and used for the tools prop.
import { useCallback, useMemo, useRef, useState } from "react";
import type { FetchedToolInfo } from "@/lib/mcp/enhanced/types"; // Ensure FetchedToolInfo is explicitly available

// Mention prefixes
const AGENT_PREFIX = "@agents/"
const TOOL_PREFIX = "@tools/"
const PROMPT_PREFIX = "@prompts/"

const URL_PREFIX = "@url/"
const FILE_PREFIX = "@files/"

// Types
export type CommandType = "agents" | "tools" | "prompts" | "url" | "files";

// This should match the MCPTool interface in UnifiedSelectionModal
export interface MCPTool {
  name: string;
  description?: string;
  serverId: string;
  serverLabel: string;
}

export interface AttachedFile {
  id: string
  path: string
  name: string
  rawMention: string
}

export interface Prompt {
  id: string;
  name: string;
  description?: string;
  content: string; // Or whatever structure a prompt has
}

type UseAgentCommandProps = {
  onValueChangeAction: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  agents: Agent[];
  tools: FetchedToolInfo[]; // Explicitly use FetchedToolInfo[]
  prompts: Prompt[];
  defaultAgent: Agent | null;
  onFileMentioned: (filePath: string) => void;
};

export function useAgentCommand({
  onValueChangeAction,
  textareaRef,
  agents,
  tools,
  prompts,
  defaultAgent,
  onFileMentioned,
}: UseAgentCommandProps) {
  // State
  const [showSelectionModal, setShowSelectionModal] = useState(false)
  const [isFileExplorerModalOpen, setIsFileExplorerModalOpen] = useState(false)
  const [activeCommandType, setActiveCommandType] = useState<CommandType | null>(null)
  const [currentSearchTerm, setCurrentSearchTerm] = useState("")
  const [activeSelectionIndex, setActiveSelectionIndex] = useState(0)

  // Attached/Selected entities state
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(defaultAgent)
  const [selectedTool, setSelectedTool] = useState<FetchedToolInfo | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  const [pendingTool, setPendingTool] = useState<FetchedToolInfo | null>(null);

  // Refs
  const mentionStartPosRef = useRef<number | null>(null)

  // Memoized filtered lists
  const filteredAgents = useMemo(() => agents.filter(agent => agent.name.toLowerCase().includes(currentSearchTerm.toLowerCase())), [agents, currentSearchTerm])
  const filteredTools = useMemo((): MCPTool[] => {
    if (activeCommandType !== "tools") return [];

    // Determine which tools to display based on the search term
    const toolsToDisplay = !currentSearchTerm
      ? tools // If no search term, use all available tools
      : tools.filter( // Otherwise, filter by the search term
          (tool: FetchedToolInfo) => 
            tool.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            (tool.description &&
              tool.description.toLowerCase().includes(currentSearchTerm.toLowerCase()))
        );

    // Map the tools to display to the MCPTool format required by the modal
    return toolsToDisplay
      .map((tool: FetchedToolInfo): MCPTool => {
        let serverId = "unknown-server";
        let serverLabel = "Unknown Server";
        if (tool.annotations) {
          const annotations = tool.annotations as { server_id?: string; server_label?: string };
          if (typeof annotations.server_id === 'string') {
            serverId = annotations.server_id;
          }
          if (typeof annotations.server_label === 'string') {
            serverLabel = annotations.server_label;
          }
        }
        return {
          name: tool.name,
          description: tool.description,
          serverId: serverId,
          serverLabel: serverLabel,
        };
      }); // Closes .map() and the return statement of the factory function
  }, [tools, activeCommandType, currentSearchTerm]); // Dependency array for filteredTools

  const filteredPrompts = useMemo(() => {
    if (activeCommandType !== "prompts") return [];
    if (!currentSearchTerm) return prompts;
    const searchTermLower = currentSearchTerm.toLowerCase();
    return prompts.filter(
      prompt =>
        prompt.name.toLowerCase().includes(searchTermLower) ||
        (prompt.description &&
          prompt.description.toLowerCase().includes(searchTermLower))
    )
  }, [prompts, activeCommandType, currentSearchTerm]);
  // Utility functions
  const resetMentionState = useCallback(() => { mentionStartPosRef.current = null }, [])

  const closeSelectionModal = useCallback(() => {
    setShowSelectionModal(false)
    setActiveCommandType(null)
    setCurrentSearchTerm("")
    setActiveSelectionIndex(0)
    resetMentionState()
  }, [resetMentionState])

  const handleInputChange = useCallback((newValue: string) => {
    onValueChangeAction(newValue)
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = newValue.substring(0, cursorPos)

    const findLastMention = (prefix: string) => textBeforeCursor.lastIndexOf(prefix)
    const mentionPositions = [
      { pos: findLastMention(AGENT_PREFIX), type: "agents", prefix: AGENT_PREFIX },
      { pos: findLastMention(TOOL_PREFIX), type: "tools", prefix: TOOL_PREFIX },
      { pos: findLastMention(URL_PREFIX), type: "url", prefix: URL_PREFIX },
      { pos: findLastMention(PROMPT_PREFIX), type: "prompts", prefix: PROMPT_PREFIX },
      { pos: findLastMention(FILE_PREFIX), type: "files", prefix: FILE_PREFIX },
    ].sort((a, b) => b.pos - a.pos)

    const lastMention = mentionPositions[0]

    if (lastMention.pos === -1) {
      closeSelectionModal()
      return
    }

    const textAfterMention = textBeforeCursor.substring(lastMention.pos)
    if (textAfterMention.includes(" ")) {
      closeSelectionModal()
      return
    }

    setShowSelectionModal(true)
    setActiveCommandType(lastMention.type as CommandType)
    setCurrentSearchTerm(textBeforeCursor.substring(lastMention.pos + lastMention.prefix.length))
    mentionStartPosRef.current = lastMention.pos
    setActiveSelectionIndex(0)
  }, [onValueChangeAction, textareaRef, closeSelectionModal])

  const insertMention = useCallback((prefix: string, slugOrName: string) => {
    if (!textareaRef.current || mentionStartPosRef.current === null) return

    const currentVal = textareaRef.current.value
    const textToReplace = `${prefix}${currentSearchTerm}`
    const mentionText = `${prefix}${slugOrName} `

    const textBeforeMention = currentVal.substring(0, mentionStartPosRef.current)
    const textAfterMention = currentVal.substring(mentionStartPosRef.current + textToReplace.length)

    const newValue = `${textBeforeMention}${mentionText}${textAfterMention}`

    onValueChangeAction(newValue)

    const newCursorPos = mentionStartPosRef.current + mentionText.length
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)

    closeSelectionModal()
  }, [textareaRef, onValueChangeAction, closeSelectionModal, currentSearchTerm])

  // Action handlers
  const handleAgentSelectAction = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
    insertMention(AGENT_PREFIX, agent.name)
  }, [insertMention, setSelectedAgent]) // Added setSelectedAgent to dependencies

  const handlePromptSelectAction = useCallback((prompt: Prompt) => {
    setSelectedPrompt(prompt);
    insertMention(PROMPT_PREFIX, prompt.name);
  }, [insertMention, setSelectedPrompt]);

  const handleToolSelectAction = useCallback((selectedMCPTool: MCPTool) => {
    const originalTool = tools.find((t: FetchedToolInfo) => t.name === selectedMCPTool.name);
    if (originalTool) {
      setSelectedTool(originalTool);
      setPendingTool(originalTool); // Set pending tool for parameter input
      insertMention(TOOL_PREFIX, originalTool.name);
    } else {
      console.error("Original tool not found for selected MCPTool:", selectedMCPTool);
      closeSelectionModal(); // Close modal to prevent further issues
    }
  }, [tools, insertMention, setSelectedTool, setPendingTool, closeSelectionModal]);

  const handleUrlSubmit = useCallback((url: string) => {
    try {
      new URL(url); // Validate URL format
    } catch {
      console.error('Invalid URL format:', url);
      return;
    }
    insertMention(URL_PREFIX, url);
  }, [insertMention]);

  const handleFileMentionSelectedFromModal = useCallback(async (filePath: string) => {
    try {
      insertMention(FILE_PREFIX, filePath)
      await onFileMentioned(filePath)
    } catch (error) {
      console.error('Failed to process file mention:', error);
      // TODO: Add toast notification when toast system is available
      // For now, show alert as user feedback
      alert(`Failed to attach file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [insertMention, onFileMentioned]);

  const handleModalSearchChange = useCallback((term: string) => setCurrentSearchTerm(term), [])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSelectionModal) return

    const items = activeCommandType === 'agents' ? filteredAgents 
                  : activeCommandType === 'tools' ? filteredTools 
                  : activeCommandType === 'prompts' ? filteredPrompts 
                  : [];

    if (!items || items.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveSelectionIndex(prev => (prev + 1) % items.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveSelectionIndex(prev => (prev - 1 + items.length) % items.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = items[activeSelectionIndex]
      if (item) {
        if (activeCommandType === 'agents') handleAgentSelectAction(item as Agent);
        if (activeCommandType === 'prompts') handlePromptSelectAction(item as Prompt);
        if (activeCommandType === 'tools') handleToolSelectAction(item as MCPTool); // Correct cast to MCPTool
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      closeSelectionModal()
    }
  }, [showSelectionModal, activeCommandType, filteredAgents, filteredTools, filteredPrompts, activeSelectionIndex, handleAgentSelectAction, handleToolSelectAction, handlePromptSelectAction, closeSelectionModal])

  // Return all state and handlers
  return {
    handleInputChange,
    handleKeyDown,
    showSelectionModal,
    closeSelectionModal,
    activeCommandType,
    currentSearchTerm,
    handleModalSearchChange,
    activeSelectionIndex,
    // Agents
    filteredAgents,
    selectedAgent,
    setSelectedAgent, // Added setSelectedAgent
    removeSelectedAgent: () => setSelectedAgent(null),
    handleAgentSelectAction,
    // Tools
    filteredTools,
    selectedTool,
    setSelectedTool,
    removeSelectedTool: () => setSelectedTool(null),
    pendingTool,
    setPendingTool,
    handleToolSelectAction,
    handleUrlSubmit,
    // Files
    isFileExplorerModalOpen,
    setIsFileExplorerModalOpen,
    handleFileMentionSelectedFromModal,
    // Prompts
    filteredPrompts,
    selectedPrompt,
    removeSelectedPrompt: () => setSelectedPrompt(null),
    handlePromptSelectAction,
  }
}
