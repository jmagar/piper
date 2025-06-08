"use client"

// New multi-character prefixes
const AGENT_PREFIX = "@agents/";
const TOOL_PREFIX = "@tools/";
const PROMPT_PREFIX = "@prompts/";
const URL_PREFIX = "@url/";
const FILE_PREFIX = "@files/";

import { useChatSession } from "@/app/providers/chat-session-provider"
import { Agent } from "@/app/types/agent"
import { useChats } from "@/lib/chat-store/chats/provider"
import { debounce } from "@/lib/utils"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type MCPTool = {
  name: string
  description?: string
  serverId: string
  serverLabel: string
}

// Defines the structure for an attached URL, used for UI display
export interface AttachedUrl {
  id: string; // Unique identifier, can be the rawMention itself
  url: string; // The actual URL string
  rawMention: string; // The full mention string, e.g., "@url/http://example.com"
}

export interface AttachedFile {
  id: string; // Unique ID, can be the full path for now
  path: string; // Path relative to UPLOADS_DIR
  name: string; // Filename extracted from the path
  rawMention: string; // The full @files/... string
  // type?: string; // Optional: from mime-type
  // size?: number; // Optional: in bytes
}

export type DatabasePrompt = {
  id: string
  name: string
  description: string
  slug: string
  systemPrompt: string
}

interface McpToolsApiResponse {
  tools?: MCPTool[];
}

interface DatabasePromptsApiResponse {
  prompts?: DatabasePrompt[];
}

type UseAgentCommandProps = {
  value: string;
  onValueChangeAction: (value: string) => void;
  agents: Agent[];
  defaultAgent?: Agent | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  // agentCommandSlash, toolCommandSlash, promptCommandSlash are deprecated
};

const MENTION_PREFIXES_CONFIG = [
  { type: 'agents' as const, prefix: AGENT_PREFIX },
  { type: 'tools' as const, prefix: TOOL_PREFIX },
  { type: 'prompts' as const, prefix: PROMPT_PREFIX },
  { type: 'url' as const, prefix: URL_PREFIX },
  { type: 'files' as const, prefix: FILE_PREFIX },
];

export function useAgentCommand({
  onValueChangeAction,
  agents,
  defaultAgent = null,
  textareaRef,
  value, // The current input value from props
}: UseAgentCommandProps) {
  const searchParams = useSearchParams();
  const { chatId } = useChatSession();
  const { updateChatAgent } = useChats();
  const pathname = usePathname();
  const router = useRouter();

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(defaultAgent);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [activeCommandType, setActiveCommandType] = useState<'agents' | 'tools' | 'prompts' | 'url' | 'files' | null>(null);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [activeSelectionIndex, setActiveSelectionIndex] = useState(0);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [databasePrompts, setDatabasePrompts] = useState<DatabasePrompt[]>([]);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<DatabasePrompt | null>(null);
  const [pendingTool, setPendingTool] = useState<MCPTool | null>(null); // For tools requiring params
  const [attachedUrls, setAttachedUrls] = useState<AttachedUrl[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isFileExplorerModalOpen, setIsFileExplorerModalOpen] = useState(false);
  
  const mentionStartPosRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveSelectionIndex(0);
  }, [currentSearchTerm]);

  useEffect(() => {
    const fetchMCPTools = async () => {
      try {
        const response = await fetch('/api/mcp-tools-available');
        const data: McpToolsApiResponse = await response.json();
        setMcpTools(data.tools || []);
      } catch (error) {
        console.error('Failed to fetch MCP tools:', error);
        setMcpTools([]);
      }
    };
    fetchMCPTools();
  }, []);

  useEffect(() => {
    const fetchDatabasePrompts = async () => {
      try {
        const response = await fetch('/api/prompts-available');
        const data: DatabasePromptsApiResponse = await response.json();
        setDatabasePrompts(data.prompts || []);
      } catch (error) {
        console.error('Failed to fetch database prompts:', error);
      }
    };
    fetchDatabasePrompts();
  }, []);

  const fuzzyMatch = useCallback((term: string, target: string): number => {
    const termLower = term.toLowerCase();
    const targetLower = target.toLowerCase();
    if (targetLower.includes(termLower)) {
      return targetLower.indexOf(termLower) === 0 ? 100 : 80;
    }
    let termIndex = 0;
    let score = 0;
    for (let i = 0; i < targetLower.length && termIndex < termLower.length; i++) {
      if (targetLower[i] === termLower[termIndex]) {
        score += 1;
        termIndex++;
      }
    }
    return termIndex === termLower.length ? score * (50 / target.length) : 0;
  }, []);

  const filteredAgents = currentSearchTerm
    ? agents
        .map(agent => ({ agent, score: Math.max(fuzzyMatch(currentSearchTerm, agent.name), fuzzyMatch(currentSearchTerm, agent.description || '')) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.agent)
    : agents;

  const filteredTools = currentSearchTerm
    ? mcpTools
        .map(tool => ({ tool, score: Math.max(fuzzyMatch(currentSearchTerm, tool.name), fuzzyMatch(currentSearchTerm, tool.description || ''), fuzzyMatch(currentSearchTerm, tool.serverLabel)) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.tool)
    : mcpTools;

  const filteredPrompts = currentSearchTerm
    ? databasePrompts
        .map(prompt => ({ prompt, score: Math.max(fuzzyMatch(currentSearchTerm, prompt.name), fuzzyMatch(currentSearchTerm, prompt.description || ''), fuzzyMatch(currentSearchTerm, prompt.slug)) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.prompt)
    : databasePrompts;

  useEffect(() => {
    setSelectedAgent(defaultAgent ?? null);
  }, [defaultAgent]);

  const removeSelectedAgent = useCallback(() => {
    if (selectedAgent) {
      const agentMentionPattern = new RegExp(`${AGENT_PREFIX}${selectedAgent.id}\s?`, 'g');
      const newText = value.replace(agentMentionPattern, "").trimStart();
      onValueChangeAction(newText);
      setSelectedAgent(null);
      if (chatId && defaultAgent?.id !== selectedAgent.id) {
        updateChatAgent(chatId, null);
      }
      if (textareaRef.current) textareaRef.current.focus();
    }
  }, [selectedAgent, value, onValueChangeAction, textareaRef, chatId, updateChatAgent, defaultAgent]);

  const removeSelectedTool = useCallback(() => {
    if (selectedTool) {
      const toolMentionPattern = new RegExp(`${TOOL_PREFIX}${selectedTool.name}\s?`, 'g');
      const newText = value.replace(toolMentionPattern, "").trimStart();
      onValueChangeAction(newText);
      setSelectedTool(null);
      if (textareaRef.current) textareaRef.current.focus();
    }
  }, [selectedTool, value, onValueChangeAction, textareaRef]);

  const removeSelectedPrompt = useCallback(() => {
    if (selectedPrompt) {
      const promptMentionPattern = new RegExp(`${PROMPT_PREFIX}${selectedPrompt.slug}\s?`, 'g');
      const newText = value.replace(promptMentionPattern, "").trimStart();
      onValueChangeAction(newText);
      setSelectedPrompt(null);
      if (textareaRef.current) textareaRef.current.focus();
    }
  }, [selectedPrompt, value, onValueChangeAction, textareaRef]);

  const removeAttachedUrl = useCallback((rawMentionToRemove: string) => {
    setAttachedUrls(prev => prev.filter(au => au.rawMention !== rawMentionToRemove));
    if (textareaRef.current) {
      const currentText = textareaRef.current.value;
      const newTextValue = currentText.replace(rawMentionToRemove + ' ', '').replace(rawMentionToRemove, '');
      if (currentText !== newTextValue) {
        onValueChangeAction(newTextValue);
        if (textareaRef.current) textareaRef.current.value = newTextValue;
      }
      textareaRef.current.focus();
    }
  }, [onValueChangeAction, textareaRef, setAttachedUrls]);

  const removeAttachedFile = useCallback((rawMentionToRemove: string) => {
    setAttachedFiles(prev => prev.filter(af => af.rawMention !== rawMentionToRemove));
    if (textareaRef.current) {
      const currentText = textareaRef.current.value;
      const newTextValue = currentText.replace(rawMentionToRemove + ' ', '').replace(rawMentionToRemove, '');
      if (currentText !== newTextValue) {
        onValueChangeAction(newTextValue);
        if (textareaRef.current) textareaRef.current.value = newTextValue;
      }
      textareaRef.current.focus();
    }
  }, [onValueChangeAction, textareaRef, setAttachedFiles]);

  const resetMentionState = useCallback(() => {
    setShowSelectionModal(false);
    setActiveCommandType(null);
    setCurrentSearchTerm("");
    mentionStartPosRef.current = null;
    setActiveSelectionIndex(0);
  }, []);

  const closeSelectionModal = resetMentionState;

  const isValidHttpUrl = (str: string): boolean => {
    try {
      const urlCheck = new URL(str);
      return urlCheck.protocol === "http:" || urlCheck.protocol === "https:";
    } catch (_) {
      return false;
    }
  };

  const insertMention = useCallback((prefixToInsert: string, slugOrName: string, textToReplaceLength: number) => {
    if (!textareaRef.current || mentionStartPosRef.current === null) return;
    const currentVal = textareaRef.current.value;
    const mentionText = `${prefixToInsert}${slugOrName} `;
    const textBeforeMention = currentVal.substring(0, mentionStartPosRef.current);
    const textAfterMention = currentVal.substring(mentionStartPosRef.current + textToReplaceLength);
    const newValue = `${textBeforeMention}${mentionText}${textAfterMention}`;
    onValueChangeAction(newValue);
    if (textareaRef.current) textareaRef.current.value = newValue;
    const newCursorPos = mentionStartPosRef.current + mentionText.length;
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
    resetMentionState();
  }, [textareaRef, onValueChangeAction, resetMentionState]);

  const handleAgentSelectAction = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    if (chatId) updateChatAgent(chatId, agent.id);
    const textToReplaceLength = (MENTION_PREFIXES_CONFIG.find(p => p.type === 'agents')?.prefix || '').length + currentSearchTerm.length;
    insertMention(AGENT_PREFIX, agent.id, textToReplaceLength);
  }, [setSelectedAgent, chatId, updateChatAgent, insertMention, currentSearchTerm]);

  const handleToolSelectAction = useCallback((tool: MCPTool) => {
    const toolRequiresParams = tool.name.includes('generate_');
    if (toolRequiresParams) {
      setPendingTool(tool);
      resetMentionState();
    } else {
      setSelectedTool(tool);
      const textToReplaceLength = (MENTION_PREFIXES_CONFIG.find(p => p.type === 'tools')?.prefix || '').length + currentSearchTerm.length;
      insertMention(TOOL_PREFIX, tool.name, textToReplaceLength);
    }
  }, [setPendingTool, setSelectedTool, insertMention, currentSearchTerm, resetMentionState]);

  const handlePromptSelectAction = useCallback((prompt: DatabasePrompt) => {
    setSelectedPrompt(prompt);
    const textToReplaceLength = (MENTION_PREFIXES_CONFIG.find(p => p.type === 'prompts')?.prefix || '').length + currentSearchTerm.length;
    insertMention(PROMPT_PREFIX, prompt.slug, textToReplaceLength);
  }, [setSelectedPrompt, insertMention, currentSearchTerm]);

  const handleUrlSubmit = useCallback((urlToSubmit: string, rawMention: string) => {
    if (!isValidHttpUrl(urlToSubmit)) return;
    const newUrlAttachment: AttachedUrl = { id: rawMention, url: urlToSubmit, rawMention };
    setAttachedUrls(prev => prev.find(u => u.rawMention === rawMention) ? prev : [...prev, newUrlAttachment]);
    if (textareaRef.current && mentionStartPosRef.current !== null) {
      const currentVal = textareaRef.current.value;
      const textBefore = currentVal.substring(0, mentionStartPosRef.current);
      // Ensure the full rawMention (including potential space if it was typed to trigger) is removed
      const textAfter = currentVal.substring(mentionStartPosRef.current + rawMention.length + (currentVal[mentionStartPosRef.current + rawMention.length] === ' ' ? 1 : 0) );
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
  }, [setAttachedUrls, onValueChangeAction, textareaRef, resetMentionState]);

  const handleFileSubmit = useCallback((filePath: string, rawMention: string) => {
    const fileName = filePath.split('/').pop() || filePath;
    const newFileAttachment: AttachedFile = { id: rawMention, path: filePath, name: fileName, rawMention };
    setAttachedFiles(prev => prev.find(f => f.rawMention === rawMention) ? prev : [...prev, newFileAttachment]);
    if (textareaRef.current && mentionStartPosRef.current !== null) {
      const currentVal = textareaRef.current.value;
      const textBefore = currentVal.substring(0, mentionStartPosRef.current);
      // Ensure the full rawMention (including potential space if it was typed to trigger) is removed
      const textAfter = currentVal.substring(mentionStartPosRef.current + rawMention.length + (currentVal[mentionStartPosRef.current + rawMention.length] === ' ' ? 1 : 0) );
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
  }, [setAttachedFiles, onValueChangeAction, textareaRef, resetMentionState]);

  const handleFileMentionSelectedFromModal = useCallback((filePath: string) => {
    if (textareaRef.current && mentionStartPosRef.current !== null) {
      insertMention(FILE_PREFIX, filePath, filePath.length);
    } else {
      const newText = `${value.substring(0, mentionStartPosRef.current ?? 0)}${FILE_PREFIX}${filePath} ${value.substring(textareaRef.current?.selectionEnd ?? 0)}`.trimStart();
      onValueChangeAction(newText);
    }
    setIsFileExplorerModalOpen(false);
    resetMentionState();
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [insertMention, resetMentionState, textareaRef, onValueChangeAction, value]);

  const processInputForMentions = useCallback((currentValue: string, cursorPosition: number) => {
    let activeTypeUpdate: typeof activeCommandType = null;
    let mentionStartUpdate: number | null = null;
    let termUpdate = "";
    let shouldResetGlobal = true; // Assume we will reset unless a prefix is actively being typed

    for (const config of MENTION_PREFIXES_CONFIG) {
      const prefix = config.prefix;
      // Find the last occurrence of the prefix that is before or at the current cursor position minus prefix length
      let lastMentionIndex = -1;
      let searchIndex = cursorPosition - prefix.length;
      while(searchIndex >= 0) {
        const tempIndex = currentValue.lastIndexOf(prefix, searchIndex);
        if (tempIndex !== -1) {
            // Check if this is a valid start of a mention (not part of a longer word or another mention)
            // This basic check assumes prefixes are distinct enough not to be substrings of each other in problematic ways
            lastMentionIndex = tempIndex;
            break;
        }
        searchIndex = tempIndex -1; // Continue searching backwards
      }

      if (lastMentionIndex !== -1 && cursorPosition >= lastMentionIndex + prefix.length) {
        const potentialTerm = currentValue.substring(lastMentionIndex + prefix.length, cursorPosition);
        const spaceInTermIndex = potentialTerm.indexOf(' ');
        const fullTypedMentionWithPrefix = currentValue.substring(lastMentionIndex, cursorPosition);

        if (config.type === 'url' || config.type === 'files') {
          // If a space is typed *after* a potential URL/file path, then we attempt to confirm it.
          if (currentValue[cursorPosition] === ' ' || currentValue[cursorPosition-1] === ' ') { // Space typed at cursor or just before
            const termToSubmit = potentialTerm.trim();
            const rawMentionToSubmit = `${prefix}${termToSubmit}`;
            if (termToSubmit.length > 0) {
              mentionStartPosRef.current = lastMentionIndex; // Set ref before calling submit
              if (config.type === 'url' && isValidHttpUrl(termToSubmit)) {
                handleUrlSubmit(termToSubmit, rawMentionToSubmit);
                return; // Stop processing, URL submitted
              } else if (config.type === 'files') {
                handleFileSubmit(termToSubmit, rawMentionToSubmit);
                return; // Stop processing, File submitted
              }
            }
          }
          // If no space in the term yet, it's actively being typed.
          if (spaceInTermIndex === -1) {
            activeTypeUpdate = config.type;
            mentionStartUpdate = lastMentionIndex;
            termUpdate = potentialTerm;
            shouldResetGlobal = false;
            break; // Found active typing for URL/File, show modal/indicator
          }
        } else { // Agents, Tools, Prompts - modal logic
          if (spaceInTermIndex === -1) { // No space within the term itself
            activeTypeUpdate = config.type;
            mentionStartUpdate = lastMentionIndex;
            termUpdate = potentialTerm;
            shouldResetGlobal = false;
            break; // Found active typing for modal-based mention
          }
        }
      }
    }

    if (shouldResetGlobal) {
      if (showSelectionModal) resetMentionState(); // Only reset if modal was open
    } else if (activeTypeUpdate && mentionStartUpdate !== null) {
      mentionStartPosRef.current = mentionStartUpdate;
      setActiveCommandType(activeTypeUpdate);
      setCurrentSearchTerm(termUpdate);
      if (activeTypeUpdate === 'files') {
        if (!isFileExplorerModalOpen) setIsFileExplorerModalOpen(true);
        if (showSelectionModal) setShowSelectionModal(false); // Ensure regular modal doesn't open for files
      } else {
        if (!showSelectionModal) setShowSelectionModal(true);
      }
      setActiveSelectionIndex(0);
    } else if (!activeTypeUpdate && showSelectionModal) {
        // This case means no prefix is actively being typed, but the modal is shown.
        // This could happen if the user deletes the prefix or moves the cursor.
        // We should reset if the current text at mentionStartPosRef.current no longer matches the activeCommandType's prefix.
        const currentActivePrefixConfig = MENTION_PREFIXES_CONFIG.find(c => c.type === activeCommandType);
        if (mentionStartPosRef.current !== null && currentActivePrefixConfig && 
            !currentValue.substring(mentionStartPosRef.current, cursorPosition).startsWith(currentActivePrefixConfig.prefix)) {
            resetMentionState();
        }
    }
  }, [activeCommandType, showSelectionModal, handleUrlSubmit, handleFileSubmit, resetMentionState, isValidHttpUrl, setActiveCommandType, setCurrentSearchTerm, setShowSelectionModal, setActiveSelectionIndex]);

  const debouncedProcessInput = useMemo(() => debounce(processInputForMentions, 150), [processInputForMentions]);

  const handleInputChange = useCallback((newText: string) => {
    onValueChangeAction(newText);
    if (textareaRef.current) {
      // Pass the current value from the textarea directly to ensure consistency if newText is stale
      debouncedProcessInput(textareaRef.current.value, textareaRef.current.selectionStart ?? textareaRef.current.value.length);
    }
  }, [onValueChangeAction, debouncedProcessInput, textareaRef]);
  
  const confirmSelection = useCallback(() => {
    if (!showSelectionModal || !activeCommandType || !textareaRef.current) {
      resetMentionState();
      return;
    }

    switch (activeCommandType) {
      case 'agents':
        if (filteredAgents.length > 0 && activeSelectionIndex < filteredAgents.length) {
          handleAgentSelectAction(filteredAgents[activeSelectionIndex]);
        } else { resetMentionState(); }
        break;
      case 'tools':
        if (filteredTools.length > 0 && activeSelectionIndex < filteredTools.length) {
          handleToolSelectAction(filteredTools[activeSelectionIndex]);
        } else { resetMentionState(); }
        break;
      case 'prompts':
        if (filteredPrompts.length > 0 && activeSelectionIndex < filteredPrompts.length) {
          handlePromptSelectAction(filteredPrompts[activeSelectionIndex]);
        } else { resetMentionState(); }
        break;
      case 'url':
        if (currentSearchTerm && isValidHttpUrl(currentSearchTerm)) {
          const rawMention = `${URL_PREFIX}${currentSearchTerm}`;
          if(mentionStartPosRef.current === null && value) mentionStartPosRef.current = value.lastIndexOf(URL_PREFIX, textareaRef.current.selectionStart - URL_PREFIX.length) ?? 0;
          handleUrlSubmit(currentSearchTerm, rawMention);
        } else { resetMentionState(); }
        break;
      case 'files':
        if (currentSearchTerm) {
          const rawMention = `${FILE_PREFIX}${currentSearchTerm}`;
          if(mentionStartPosRef.current === null && value) mentionStartPosRef.current = value.lastIndexOf(FILE_PREFIX, textareaRef.current.selectionStart - FILE_PREFIX.length) ?? 0;
          handleFileSubmit(currentSearchTerm, rawMention);
        } else { resetMentionState(); }
        break;
      default: resetMentionState(); break;
    }
  }, [
    showSelectionModal, activeCommandType, textareaRef, value, 
    filteredAgents, filteredTools, filteredPrompts, activeSelectionIndex, currentSearchTerm,
    handleAgentSelectAction, handleToolSelectAction, handlePromptSelectAction,
    handleUrlSubmit, handleFileSubmit, resetMentionState, isValidHttpUrl
  ]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSelectionModal || !activeCommandType) return;
      let itemsCount = 0;
      let canConfirmWithEnterOrTab = false;

      switch (activeCommandType) {
        case 'agents': itemsCount = filteredAgents.length; canConfirmWithEnterOrTab = itemsCount > 0; break;
        case 'tools': itemsCount = filteredTools.length; canConfirmWithEnterOrTab = itemsCount > 0; break;
        case 'prompts': itemsCount = filteredPrompts.length; canConfirmWithEnterOrTab = itemsCount > 0; break;
        case 'url': 
        case 'files': 
          itemsCount = 0; 
          canConfirmWithEnterOrTab = !!currentSearchTerm;
          if (activeCommandType === 'url') canConfirmWithEnterOrTab = canConfirmWithEnterOrTab && isValidHttpUrl(currentSearchTerm);
          break;
        default: itemsCount = 0;
      }

      if (event.key === "ArrowDown") {
        if (itemsCount > 0) { event.preventDefault(); setActiveSelectionIndex(prev => (prev + 1) % itemsCount); }
      } else if (event.key === "ArrowUp") {
        if (itemsCount > 0) { event.preventDefault(); setActiveSelectionIndex(prev => (prev - 1 + itemsCount) % itemsCount); }
      } else if (event.key === "Enter" || event.key === "Tab") {
        if (canConfirmWithEnterOrTab) {
          event.preventDefault();
          confirmSelection();
        } else if (event.key === "Enter" && (activeCommandType === 'url' || activeCommandType === 'files')){
          event.preventDefault();
          resetMentionState();
        } else if (event.key === "Tab" && !canConfirmWithEnterOrTab) {
            event.preventDefault();
            resetMentionState();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        resetMentionState();
      }
    },
    [
      showSelectionModal, activeCommandType, confirmSelection, resetMentionState, 
      filteredAgents.length, filteredTools.length, filteredPrompts.length, 
      currentSearchTerm, setActiveSelectionIndex, isValidHttpUrl
    ]
  );

  useEffect(() => {
    const agentSlugFromUrl = searchParams.get("agent");
    if (agentSlugFromUrl) {
      const agentFromUrl = agents.find(a => a.slug === agentSlugFromUrl);
      if (agentFromUrl) {
        if (selectedAgent?.id !== agentFromUrl.id) {
            setSelectedAgent(agentFromUrl);
        }
        if (chatId) updateChatAgent(chatId, agentFromUrl.id);
      }
    } else if (selectedAgent && !defaultAgent) {
        // If no agent in URL, but one is selected, and it's not the default, deselect it
        // removeSelectedAgent(); // This might cause loops if not careful with dependencies
    }
  }, [searchParams, agents, chatId, updateChatAgent, setSelectedAgent, selectedAgent, defaultAgent]);

  const updateAgentInUrl = useCallback(
    (agent: Agent | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (agent) params.set("agent", agent.slug);
      else params.delete("agent");
      // router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const handleModalSearchChange = (newSearchTerm: string) => {
    setCurrentSearchTerm(newSearchTerm);
    setActiveSelectionIndex(0); // Reset selection index when search term changes
  };

  useEffect(() => {
    if (pathname === "/") setSelectedAgent(null);
  }, [pathname]);
  return {
    selectedAgent,
    setSelectedAgent, // Added back
    removeSelectedAgent,
    selectedTool,
    setSelectedTool, // Added back
    removeSelectedTool,
    selectedPrompt,
    removeSelectedPrompt,
    pendingTool,
    setPendingTool, // Added back
    closeSelectionModal, // Alias for resetMentionState
    setActiveSelectionIndex,
    handleModalSearchChange,
    attachedUrls,
    removeAttachedUrl,
    attachedFiles,
    removeAttachedFile,

    // For displaying selection UI (consolidated)
    showSelectionModal,
    isFileExplorerModalOpen, 
    setIsFileExplorerModalOpen, 
    handleFileMentionSelectedFromModal, 
    activeCommandType,
    currentSearchTerm,
    activeSelectionIndex,
    filteredAgents,
    filteredTools,
    filteredPrompts,

    // Actions (consolidated)
    handleInputChange,
    confirmSelection,
    handleKeyDown,
    
    // Exposing specific handlers
    handleAgentSelectAction, 
    handleToolSelectAction,  
    handlePromptSelectAction,
    handleUrlSubmit,       
    handleFileSubmit,      
    resetMentionState,
    isValidHttpUrl,
    insertMention,
    // Pass through data for modal/UI
    agents,
    mcpTools,
    databasePrompts,
  };
}
