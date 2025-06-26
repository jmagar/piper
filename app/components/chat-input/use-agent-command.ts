"use client"

import { Agent } from "@/app/types/agent";

// FetchedToolInfo is now imported directly and used for the tools prop.
import { useCallback, useMemo, useRef, useState } from "react";
import type { FetchedToolInfo } from "@/lib/mcp/enhanced/types"; // Ensure FetchedToolInfo is explicitly available
import { v4 as uuidv4 } from "uuid"

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

export interface AttachedUrl {
  id: string
  url: string
  rawMention: string
}

type UseAgentCommandProps = {
  onValueChangeAction: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  agents: Agent[];
  tools: FetchedToolInfo[]; // Explicitly use FetchedToolInfo[]
  prompts: Prompt[];
  defaultAgent: Agent | null;
};

/**
 * React hook for managing mention detection, filtering, selection, and insertion of agents, tools, prompts, URLs, and files in a textarea input.
 *
 * Provides state and handlers for modal UI, debounced mention detection, keyboard navigation, and maintaining attached entities. Supports dynamic filtering and insertion of mentions based on user input and cursor position.
 *
 * @returns An object containing state variables, filtered lists, and handlers for input changes, modal control, selection actions, file and URL management, and keyboard navigation.
 */
export function useAgentCommand({
  onValueChangeAction,
  textareaRef,
  agents,
  tools,
  prompts,
  defaultAgent
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
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [attachedUrls, setAttachedUrls] = useState<AttachedUrl[]>([])

  // Refs
  const mentionStartPosRef = useRef<number | null>(null)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Optimized memoized filtered lists with pre-computed lowercase strings
  const filteredAgents = useMemo(() => {
    if (!currentSearchTerm) return agents;
    const searchTermLower = currentSearchTerm.toLowerCase();
    return agents.filter(agent => agent.name.toLowerCase().includes(searchTermLower));
  }, [agents, currentSearchTerm]);

  const filteredTools = useMemo((): MCPTool[] => {
    if (activeCommandType !== "tools") return [];

    const searchTermLower = currentSearchTerm.toLowerCase();
    
    return tools
      .filter(tool => 
        !currentSearchTerm || 
        tool.name.toLowerCase().includes(searchTermLower) ||
        (tool.description?.toLowerCase().includes(searchTermLower))
      )
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        serverId: (tool.annotations as any)?.server_id || "unknown-server",
        serverLabel: (tool.annotations as any)?.server_label || "Unknown Server",
      }));
  }, [tools, activeCommandType, currentSearchTerm]);

  const filteredPrompts = useMemo(() => {
    if (!currentSearchTerm) return prompts;
    const searchTermLower = currentSearchTerm.toLowerCase();
    return prompts.filter(prompt => 
      prompt.name.toLowerCase().includes(searchTermLower) || 
      (prompt.description?.toLowerCase().includes(searchTermLower))
    );
  }, [prompts, currentSearchTerm]);

  // Utility functions
  const generateId = useCallback(() => uuidv4(), [])
  const resetMentionState = useCallback(() => { mentionStartPosRef.current = null }, [])

  const closeSelectionModal = useCallback(() => {
    setShowSelectionModal(false)
    setActiveCommandType(null)
    setCurrentSearchTerm("")
    setActiveSelectionIndex(0)
    resetMentionState()
  }, [resetMentionState])

  // Heavy mention detection logic (debounced)
  const processMentionDetection = useCallback((newValue: string) => {
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
  }, [textareaRef, closeSelectionModal])

  // Main input handler (immediate UI update + debounced mention detection)
  const handleInputChange = useCallback((newValue: string) => {
    // Immediate UI update - no debouncing for typing responsiveness
    onValueChangeAction(newValue)
    
    // Debounce the heavy mention detection logic
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      processMentionDetection(newValue)
    }, 150) // 150ms debounce delay
  }, [onValueChangeAction, processMentionDetection])

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

  const handleUrlSubmit = useCallback((url: string, rawMention: string) => {
    const newUrl: AttachedUrl = { id: uuidv4(), url, rawMention }
    setAttachedUrls(prev => [...prev, newUrl])
    if (textareaRef.current && mentionStartPosRef.current !== null) {
      const currentVal = textareaRef.current.value
      const textBefore = currentVal.substring(0, mentionStartPosRef.current)
      const textAfter = currentVal.substring(mentionStartPosRef.current + rawMention.length)
      const newValue = (textBefore + textAfter).trimStart()
      onValueChangeAction(newValue)
    }
    closeSelectionModal()
  }, [closeSelectionModal, onValueChangeAction, textareaRef])

  const handleFileSubmit = useCallback((filePath: string, rawMention: string) => {
    const fileName = filePath.split('/').pop() || filePath;
    // generateId() is stable, no need to list as dependency if generateId itself is memoized correctly.
    const newFile: AttachedFile = { id: generateId(), path: filePath, name: fileName, rawMention };
    setAttachedFiles(prev => (prev.find(f => f.rawMention === rawMention) ? prev : [...prev, newFile]));
  }, [generateId]); // Keeping generateId here as it's directly called. If generateId is `useCallback(() => uuidv4(), [])`, it's fine.

  const handleFileMentionSelectedFromModal = useCallback((filePath: string) => {
    insertMention(FILE_PREFIX, filePath)
  }, [insertMention])

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
    // URLs
    attachedUrls,
    setAttachedUrls, // Added setAttachedUrls
    removeAttachedUrl: (id: string) => setAttachedUrls(prev => prev.filter(u => u.id !== id)),
    handleUrlSubmit,
    // Files
    attachedFiles,
    handleFileSubmit,
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
