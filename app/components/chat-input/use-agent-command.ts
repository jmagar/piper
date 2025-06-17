"use client"

import { Agent } from "@/app/types/agent";
import { FetchedToolInfo as MCPTool } from "@/lib/mcp/enhanced/types";

// Define Prompt locally as it's not clearly exported from a central schema file
export interface Prompt {
  id: string;
  name: string; // Or title, or whatever field is used for display
  content: string; // The actual prompt text
  // Add other fields if necessary based on usage
}

interface ToolInputSchema {
  type?: string; // Typically 'object'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: { [key: string]: unknown };
  required?: string[];
}
import { useCallback, useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

// Mention prefixes
const AGENT_PREFIX = "@agents/"
const TOOL_PREFIX = "@tools/"
const PROMPT_PREFIX = "@prompts/"
const URL_PREFIX = "@url/"
const FILE_PREFIX = "@files/" // Keep this if file mentions are separate

const ALL_PREFIXES = [AGENT_PREFIX, TOOL_PREFIX, PROMPT_PREFIX, URL_PREFIX, FILE_PREFIX]

export interface AttachedUrl {
  id: string
  url: string
  rawMention: string
}

export interface AttachedFile {
  id: string; 
  path: string; 
  name: string; 
  rawMention: string; 
}

type UseAgentCommandProps = {
  value: string
  onValueChangeAction: (value: string) => void
  agents: Agent[]
  defaultAgent: Agent | null
  textareaRef: React.RefObject<HTMLTextAreaElement>
}

export function useAgentCommand({
  value,
  onValueChangeAction,
  agents,
  defaultAgent,
  textareaRef,
}: UseAgentCommandProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(defaultAgent)
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null)
  const [pendingTool, setPendingTool] = useState<MCPTool | null>(null); 
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [attachedUrls, setAttachedUrls] = useState<AttachedUrl[]>([])
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]) 

  const [showSelectionModal, setShowSelectionModal] = useState(false)
  const [activeCommandType, setActiveCommandType] = useState<"agents" | "tools" | "prompts" | "url" | "files" | null>(null)
  const [currentSearchTerm, setCurrentSearchTerm] = useState("")
  const [activeSelectionIndex, setActiveSelectionIndex] = useState(0)
  const [isFileExplorerModalOpen, setIsFileExplorerModalOpen] = useState(false);

  const mentionStartPosRef = useRef<number | null>(null)
  const lastProcessedValueRef = useRef<string>(value) // To track changes precisely

  const generateId = useCallback(() => {
    try {
      return uuidv4()
    } catch {
      return Date.now().toString() + Math.random().toString(36).substr(2, 5)
    }
  }, [])

  const resetMentionState = useCallback(() => {
    setShowSelectionModal(false)
    setActiveCommandType(null)
    setCurrentSearchTerm("")
    setActiveSelectionIndex(0)
    mentionStartPosRef.current = null
  }, [])

  const insertTextAndMoveCursor = useCallback((textToInsert: string, textToReplaceLength: number) => {
    if (!textareaRef.current || mentionStartPosRef.current === null) return

    const currentVal = textareaRef.current.value
    const textBeforeMention = currentVal.substring(0, mentionStartPosRef.current)
    const textAfterMention = currentVal.substring(mentionStartPosRef.current + textToReplaceLength)
    
    const newValue = `${textBeforeMention}${textToInsert}${textAfterMention}`
    onValueChangeAction(newValue) // Update parent state
    
    // Directly update textarea value and cursor
    textareaRef.current.value = newValue 
    const newCursorPos = mentionStartPosRef.current + textToInsert.length
    
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [textareaRef, onValueChangeAction]);

  const processInputForMentions = useCallback((currentValue: string, cursorPosition: number) => {
    let prefixFound = false;
    for (const prefix of ALL_PREFIXES) {
      const lastAtPos = currentValue.lastIndexOf("@", cursorPosition -1 );
      if (lastAtPos !== -1) {
        const textAfterAt = currentValue.substring(lastAtPos, cursorPosition);
        if (textAfterAt.startsWith(prefix)) {
          mentionStartPosRef.current = lastAtPos;
          const commandType = prefix.replace("@", "").replace("/", "") as "agents" | "tools" | "prompts" | "url" | "files";
          setActiveCommandType(commandType);
          setCurrentSearchTerm(textAfterAt.substring(prefix.length));
          setShowSelectionModal(true);
          setActiveSelectionIndex(0);
          prefixFound = true;
          break;
        }
      }
    }
    if (!prefixFound && showSelectionModal) {
      resetMentionState();
    }
  }, [showSelectionModal, resetMentionState]);

  const handleInputChange = useCallback((newValue: string) => {
    onValueChangeAction(newValue) // Update parent state first
    lastProcessedValueRef.current = newValue
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart
      processInputForMentions(newValue, cursorPosition)
    }
  }, [onValueChangeAction, processInputForMentions, textareaRef])

  const completeMention = useCallback((prefixToInsert: string, slugOrName: string, itemToSelect?: Agent | MCPTool | Prompt) => {
    if (!textareaRef.current || mentionStartPosRef.current === null) return;

    const mentionText = `${prefixToInsert}${slugOrName} `;
    const textToReplace = `${prefixToInsert}${currentSearchTerm}`;
    insertTextAndMoveCursor(mentionText, textToReplace.length);

    if (itemToSelect) {
      if (prefixToInsert === AGENT_PREFIX) setSelectedAgent(itemToSelect as Agent);
      else if (prefixToInsert === TOOL_PREFIX) {
        const tool = itemToSelect as MCPTool;
        const schema = tool.inputSchema as ToolInputSchema;
        if (schema && typeof schema === 'object' && schema.properties && typeof schema.properties === 'object' && Object.keys(schema.properties).length > 0) {
          setPendingTool(tool); // Set tool as pending if it has parameters
        } else {
          setSelectedTool(tool); // Directly select if no parameters
        }
      }
      else if (prefixToInsert === PROMPT_PREFIX) setSelectedPrompt(itemToSelect as Prompt);
    }
    resetMentionState();
  }, [currentSearchTerm, insertTextAndMoveCursor, resetMentionState, textareaRef]);


  const handleAgentSelectAction = useCallback((agent: Agent) => {
    completeMention(AGENT_PREFIX, agent.slug, agent);
  }, [completeMention]);

  const handleToolSelectAction = useCallback((tool: MCPTool) => {
    completeMention(TOOL_PREFIX, tool.name, tool);
  }, [completeMention]);

  const handlePromptSelectAction = useCallback((prompt: Prompt) => {
    completeMention(PROMPT_PREFIX, prompt.id, prompt); // Assuming prompt.id is the 'slug'
  }, [completeMention]);

  const handleUrlSubmit = useCallback((url: string, rawMention: string) => {
    const newUrlAttachment: AttachedUrl = { id: generateId(), url, rawMention };
    setAttachedUrls(prev => prev.find(u => u.rawMention === rawMention) ? prev : [...prev, newUrlAttachment]);
    
    if (textareaRef.current && mentionStartPosRef.current !== null) {
        const currentVal = textareaRef.current.value;
        const textBefore = currentVal.substring(0, mentionStartPosRef.current);
        // Ensure space after mention if not already there, and remove the typed part
        const textAfter = currentVal.substring(mentionStartPosRef.current + rawMention.length + (currentVal[mentionStartPosRef.current + rawMention.length] === ' ' ? 1: 0) );
        const newValue = (textBefore + textAfter).trimStart(); 
        onValueChangeAction(newValue); 
        if(textareaRef.current) textareaRef.current.value = newValue;
        const newCursorPos = mentionStartPosRef.current; 
        setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }
    resetMentionState();
  }, [setAttachedUrls, onValueChangeAction, textareaRef, resetMentionState, generateId]);

  const handleFileSubmit = useCallback((filePath: string, rawMention: string) => {
    const fileName = filePath.split('/').pop() || filePath;
    const newFileAttachment: AttachedFile = { 
      id: generateId(), 
      path: filePath, 
      name: fileName, 
      rawMention 
    };
    setAttachedFiles(prev => prev.find(f => f.rawMention === rawMention) ? prev : [...prev, newFileAttachment]);
    if (textareaRef.current && mentionStartPosRef.current !== null) {
      const currentVal = textareaRef.current.value;
      const textBefore = currentVal.substring(0, mentionStartPosRef.current);
      const textAfter = currentVal.substring(mentionStartPosRef.current + rawMention.length + (currentVal[mentionStartPosRef.current + rawMention.length] === ' ' ? 1 : 0));
      const newValue = (textBefore + textAfter).trimStart();
      onValueChangeAction(newValue);
      if (textareaRef.current) textareaRef.current.value = newValue;
      const newCursorPos = mentionStartPosRef.current;
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
    resetMentionState();
  }, [setAttachedFiles, onValueChangeAction, textareaRef, resetMentionState, generateId]);

  const handleFileMentionSelectedFromModal = useCallback((filePath: string) => {
    if (textareaRef.current && mentionStartPosRef.current !== null) {
      // Calculate length of text to replace (e.g., "@files/partialPath")
      const textToReplaceLength = FILE_PREFIX.length + currentSearchTerm.length;
      insertTextAndMoveCursor(`${FILE_PREFIX}${filePath} `, textToReplaceLength);
    } else {
      // Fallback if mentionStartPosRef is null (e.g. direct button click)
      const currentVal = textareaRef.current?.value || "";
      const cursorPos = textareaRef.current?.selectionStart || currentVal.length;
      const newValue = `${currentVal.substring(0, cursorPos)}${FILE_PREFIX}${filePath} ${currentVal.substring(cursorPos)}`.trimStart();
      onValueChangeAction(newValue);
      if(textareaRef.current) textareaRef.current.value = newValue;
      const newCursorPos = (cursorPos + FILE_PREFIX.length + filePath.length + 1);
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
    resetMentionState();
    setIsFileExplorerModalOpen(false); // Close the file explorer modal
  }, [currentSearchTerm, insertTextAndMoveCursor, resetMentionState, onValueChangeAction, textareaRef]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSelectionModal) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setActiveSelectionIndex(prev => (prev + 1) % (activeCommandType === "agents" ? agents.length : activeCommandType === "tools" ? 10 : activeCommandType === "prompts" ? 10 : 1)) // Replace with actual list lengths
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        setActiveSelectionIndex(prev => (prev - 1 + (activeCommandType === "agents" ? agents.length : activeCommandType === "tools" ? 10 : activeCommandType === "prompts" ? 10 : 1)) % (activeCommandType === "agents" ? agents.length : activeCommandType === "tools" ? 10 : activeCommandType === "prompts" ? 10 : 1)) // Replace with actual list lengths
      } else if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        // Trigger selection based on activeCommandType and activeSelectionIndex
        // This part needs to be implemented based on how filteredItems are stored/accessed
        resetMentionState()
      } else if (event.key === "Escape") {
        event.preventDefault()
        resetMentionState()
      } else if (event.key === "Tab") {
        event.preventDefault();
        // Similar to Enter, complete selection
        resetMentionState();
      }
    }
  }, [showSelectionModal, activeCommandType, agents.length, resetMentionState])
  
  const handleModalSearchChange = useCallback((term: string) => {
    setCurrentSearchTerm(term);
  }, []);

  const closeSelectionModal = useCallback(() => {
    resetMentionState();
  }, [resetMentionState]);

  // Filter logic (simplified, replace with actual filtering)
  const filteredAgents = agents.filter(agent => agent.name.toLowerCase().includes(currentSearchTerm.toLowerCase()))
  const filteredTools: MCPTool[] = []; // Placeholder for actual tool filtering
  const filteredPrompts: Prompt[] = []; // Placeholder for actual prompt filtering

  useEffect(() => {
    setSelectedAgent(defaultAgent)
  }, [defaultAgent])

  useEffect(() => {
    // If the value prop changes externally, update our internal ref and re-process
    if (value !== lastProcessedValueRef.current && textareaRef.current) {
        lastProcessedValueRef.current = value;
        const cursorPosition = textareaRef.current.selectionStart;
        processInputForMentions(value, cursorPosition);
    }
  }, [value, processInputForMentions, textareaRef]);

  return {
    selectedAgent,
    setSelectedAgent,
    selectedTool,
    setSelectedTool,
    pendingTool,
    setPendingTool,
    selectedPrompt,
    setSelectedPrompt,
    removeSelectedPrompt: () => setSelectedPrompt(null),
    attachedUrls,
    setAttachedUrls,
    removeAttachedUrl: (id: string) => setAttachedUrls(prev => prev.filter(url => url.id !== id)),
    attachedFiles, 
    setAttachedFiles, 
    removeAttachedFile: (id: string) => setAttachedFiles(prev => prev.filter(file => file.id !== id)),
    showSelectionModal,
    activeCommandType,
    currentSearchTerm,
    filteredAgents,
    filteredTools, // Add actual filtered tools
    filteredPrompts, // Add actual filtered prompts
    handleAgentSelectAction,
    handleToolSelectAction,
    handlePromptSelectAction,
    handleUrlSubmit,
    handleFileSubmit, 
    handleFileMentionSelectedFromModal, 
    closeSelectionModal,
    activeSelectionIndex,
    handleKeyDown,
    handleInputChange,
    handleModalSearchChange,
    isFileExplorerModalOpen,
    setIsFileExplorerModalOpen,
  }
}
