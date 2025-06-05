"use client"

// New multi-character prefixes
const AGENT_PREFIX = "@agents/";
const TOOL_PREFIX = "@tools/";
const PROMPT_PREFIX = "@prompts/";
const URL_PREFIX = "@url/";

import { useChatSession } from "@/app/providers/chat-session-provider"
import { Agent } from "@/app/types/agent"
import { useChats } from "@/lib/chat-store/chats/provider"
import { debounce } from "@/lib/utils"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type MCPTool = {
  name: string
  description?: string
  serverId: string
  serverLabel: string
}

export type DatabasePrompt = {
  id: string
  name: string
  description: string
  slug: string
  systemPrompt: string
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
  const [activeCommandType, setActiveCommandType] = useState<'agents' | 'tools' | 'prompts' | 'url' | null>(null);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [activeSelectionIndex, setActiveSelectionIndex] = useState(0);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [databasePrompts, setDatabasePrompts] = useState<DatabasePrompt[]>([]);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<DatabasePrompt | null>(null);
  const [pendingTool, setPendingTool] = useState<MCPTool | null>(null); // For tools requiring params
  
  const mentionStartPosRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveSelectionIndex(0);
  }, [currentSearchTerm]);

  useEffect(() => {
    const fetchMCPTools = async () => {
      try {
        const response = await fetch('/api/mcp-tools-available');
        const data = await response.json();
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
        const data = await response.json();
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

  useEffect(() => {
    if (pathname === "/") setSelectedAgent(null);
  }, [pathname]);

  const updateAgentInUrl = useCallback(
    (agent: Agent | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (agent) params.set("agent", agent.slug);
      else params.delete("agent");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const updateChatAgentDebounced = useMemo(
    () => debounce((agent: Agent) => {
      if (chatId) updateChatAgent(chatId, agent.id);
    }, 300),
    [chatId, updateChatAgent]
  );

  const closeSelectionModal = useCallback(() => {
    setShowSelectionModal(false);
    setActiveCommandType(null);
    setCurrentSearchTerm("");
    setActiveSelectionIndex(0);
    mentionStartPosRef.current = null;
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [textareaRef]);

  const insertMention = useCallback((prefix: string, slugOrName: string, extraSpace = true) => {
    if (!textareaRef.current || mentionStartPosRef.current === null) return;
    const text = textareaRef.current.value;
    const mention = `${prefix}${slugOrName}${extraSpace ? ' ' : ''}`;
    const textBeforeMention = text.substring(0, mentionStartPosRef.current);
    let textAfterMentionStart = mentionStartPosRef.current + (currentSearchTerm.length + prefix.length);
    if (currentSearchTerm === "") {
      textAfterMentionStart = mentionStartPosRef.current + prefix.length;
    }
    textAfterMentionStart = Math.min(textAfterMentionStart, text.length);
    const textAfterMention = text.substring(textAfterMentionStart);
    const newValue = `${textBeforeMention}${mention}${textAfterMention}`.trimStart();
    onValueChangeAction(newValue);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newCursorPos = (mentionStartPosRef.current ?? 0) + mention.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
    closeSelectionModal();
  }, [textareaRef, onValueChangeAction, closeSelectionModal, currentSearchTerm]);

  const confirmSelection = useCallback(() => {
    if (!activeCommandType || !showSelectionModal) return;
    let selectedItem: Agent | MCPTool | DatabasePrompt | string | null = null;
    let prefix = "";
    let slugOrName = "";
    switch (activeCommandType) {
      case 'agents':
        selectedItem = filteredAgents[activeSelectionIndex];
        if (selectedItem && 'slug' in selectedItem) {
          prefix = AGENT_PREFIX;
          slugOrName = selectedItem.slug;
          setSelectedAgent(selectedItem as Agent);
          updateAgentInUrl(selectedItem as Agent);
          updateChatAgentDebounced(selectedItem as Agent);
        }
        break;
      case 'tools':
        selectedItem = filteredTools[activeSelectionIndex];
        if (selectedItem && 'name' in selectedItem) {
          prefix = TOOL_PREFIX;
          slugOrName = selectedItem.name;
          setSelectedTool(selectedItem as MCPTool);
        }
        break;
      case 'prompts':
        selectedItem = filteredPrompts[activeSelectionIndex];
        if (selectedItem && 'slug' in selectedItem) {
          prefix = PROMPT_PREFIX;
          slugOrName = selectedItem.slug;
          setSelectedPrompt(selectedItem as DatabasePrompt);
        }
        break;
      case 'url':
        if (currentSearchTerm) {
          prefix = URL_PREFIX;
          slugOrName = currentSearchTerm;
        }
        break;
    }
    if (selectedItem || (activeCommandType === 'url' && currentSearchTerm)) {
      insertMention(prefix, slugOrName);
    } else {
      closeSelectionModal();
    }
  }, [
    activeCommandType, showSelectionModal, filteredAgents, filteredTools, filteredPrompts,
    activeSelectionIndex, setSelectedAgent, setSelectedTool, setSelectedPrompt, insertMention,
    updateAgentInUrl, updateChatAgentDebounced, currentSearchTerm, closeSelectionModal
  ]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSelectionModal || !activeCommandType) return;
      const itemsCount =
        activeCommandType === 'agents' ? filteredAgents.length :
        activeCommandType === 'tools' ? filteredTools.length :
        activeCommandType === 'prompts' ? filteredPrompts.length : 0;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveSelectionIndex(prev => (prev + 1) % (itemsCount || 1)); // Ensure modulo is not with 0
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveSelectionIndex(prev => (prev - 1 + (itemsCount || 1)) % (itemsCount || 1)); // Ensure modulo is not with 0
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        confirmSelection();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeSelectionModal();
      }
    },
    [showSelectionModal, activeCommandType, filteredAgents, filteredTools, filteredPrompts, confirmSelection, closeSelectionModal, setActiveSelectionIndex]
  );

  const handleInputChange = useCallback(
    (currentVal: string) => {
      onValueChangeAction(currentVal);
      if (!textareaRef.current) return;
      const cursorPos = textareaRef.current.selectionStart;
      let detectedPrefixConfig = null;
      let term = "";
      for (const config of MENTION_PREFIXES_CONFIG) {
        const prefixIndex = currentVal.lastIndexOf(config.prefix, cursorPos - 1);
        if (prefixIndex !== -1) {
          if (prefixIndex === 0 || currentVal[prefixIndex - 1] === ' ' || currentVal[prefixIndex - 1] === '\n') {
            const potentialTerm = currentVal.substring(prefixIndex + config.prefix.length, cursorPos);
            if (config.type !== 'url' && potentialTerm.includes(' ')) {
              continue;
            }
            detectedPrefixConfig = config;
            term = potentialTerm;
            mentionStartPosRef.current = prefixIndex;
            break;
          }
        }
      }
      if (detectedPrefixConfig) {
        setActiveCommandType(detectedPrefixConfig.type);
        setCurrentSearchTerm(term);
        setShowSelectionModal(true);
        setActiveSelectionIndex(0);
      } else {
        // If no full prefix, check for standalone "@"
        if (cursorPos > 0 && textareaRef.current) { // Ensure cursorPos and textareaRef are valid
          const charBeforeCursor = currentVal[cursorPos - 1];
          const atPosition = cursorPos - 1;
          // Check if it's a standalone '@' and not part of a longer known prefix that was somehow missed
          if (charBeforeCursor === '@' && 
              (atPosition === 0 || currentVal[atPosition - 1] === ' ' || currentVal[atPosition - 1] === '\n') &&
              !MENTION_PREFIXES_CONFIG.some(config => {
                const prefixEndingAtIndex = currentVal.substring(0, atPosition + 1);
                return prefixEndingAtIndex.endsWith(config.prefix);
              })
            ) {
            // It's a standalone @
            setActiveCommandType(null); // UnifiedSelectionModal should handle null to show all categories
            setCurrentSearchTerm('');
            setShowSelectionModal(true);
            setActiveSelectionIndex(0);
            mentionStartPosRef.current = atPosition;
          } else {
            closeSelectionModal(); // Close if no recognized prefix and not a valid standalone @
          }
        } else {
          closeSelectionModal(); // Close if no input or other edge cases
        }
      }
    },
    [onValueChangeAction, textareaRef, closeSelectionModal, setActiveCommandType, setCurrentSearchTerm, setShowSelectionModal, setActiveSelectionIndex, mentionStartPosRef]
  );

  const removeSelected = useCallback(() => {
    setSelectedAgent(null);
    setSelectedTool(null);
    setSelectedPrompt(null);
  }, [setSelectedAgent, setSelectedTool, setSelectedPrompt]);

  // Placeholder for submitting tool parameters
  // const handleToolParametersSubmitAction = useCallback( // Commenting out as it's unused for now(params: Record<string, unknown>) => {
    // if (pendingTool) {
    //   insertMention(TOOL_PREFIX, `${pendingTool.name} ${JSON.stringify(params)}`);
    //   setPendingTool(null);
    // }
  // }, [pendingTool, insertMention, setPendingTool]);

  // Placeholder for canceling tool parameter entry
  // const handleToolParametersCancelAction = useCallback(() => { // Commenting out as it's unused for now
    // setPendingTool(null);
    // closeSelectionModalAction();
  // }, [setPendingTool, closeSelectionModalAction]);

  const handleAgentSelectAction = useCallback(
    (agent: Agent) => {
      setSelectedAgent(agent);
      updateAgentInUrl(agent);
      updateChatAgentDebounced(agent);
      insertMention(AGENT_PREFIX, agent.slug);
    },
    [setSelectedAgent, updateAgentInUrl, updateChatAgentDebounced, insertMention]
  );

  const handleToolSelectAction = useCallback(
    (tool: MCPTool) => {
      // For tools that require parameters, set as pendingTool and show params modal (future)
      // For now, directly insert.
      setSelectedTool(tool);
      // setPendingTool(tool); // Future: This could trigger a parameter modal
      insertMention(TOOL_PREFIX, tool.name);
    },
    [setSelectedTool, insertMention]
  );

  const handlePromptSelectAction = useCallback(
    (prompt: DatabasePrompt) => {
      setSelectedPrompt(prompt);
      insertMention(PROMPT_PREFIX, prompt.slug);
    },
    [setSelectedPrompt, insertMention]
  );

  const handleUrlSubmit = useCallback((url: string) => {
    if (!textareaRef.current || mentionStartPosRef.current === null) return;

    const currentValue = textareaRef.current.value;
    const prefix = MENTION_PREFIXES_CONFIG.find(p => p.type === 'url')?.prefix || '@url/'; // Default just in case
    const fullMention = `${prefix}${url}`;

    const textBeforeMention = currentValue.substring(0, mentionStartPosRef.current);
    // Find the end of the current mention/search term to replace it entirely
    // This assumes the cursor might be somewhere after the prefix if the user was typing directly
    // For modal submission, selectionStart is likely at the end of the prefix.
    const selectionStart = textareaRef.current.selectionStart;
    const textAfterMention = currentValue.substring(selectionStart);

    const newValue = `${textBeforeMention}${fullMention} ${textAfterMention}`.trimStart(); // Add a space after for better UX
    textareaRef.current.value = newValue;
    const newCursorPos = mentionStartPosRef.current + fullMention.length + 1; // +1 for the trailing space
    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);

    setShowSelectionModal(false);
    setActiveCommandType(null);
    setCurrentSearchTerm('');
    setActiveSelectionIndex(0);
    mentionStartPosRef.current = null;
    textareaRef.current.focus();

    // Ensure the main input state is updated through the proper channel
    handleInputChange(newValue);
  }, [textareaRef, setShowSelectionModal, setActiveCommandType, setCurrentSearchTerm, setActiveSelectionIndex, handleInputChange]);

  return {
    selectedAgent,
    selectedTool,
    selectedPrompt,
    pendingTool,
    setPendingTool,
    filteredAgents,
    filteredTools,
    filteredPrompts,
    showSelectionModal,
    activeCommandType,
    currentSearchTerm,
    activeSelectionIndex,
    handleInputChange,
    handleKeyDown,
    removeSelected,
    removeSelectedAgent,
    removeSelectedTool,
    removeSelectedPrompt,
    closeSelectionModal: closeSelectionModal,
    setActiveSelectionIndex,
    setCurrentSearchTerm,
    setSelectedAgent,
    setSelectedTool,
    setSelectedPrompt,
    mentionStartPos: mentionStartPosRef.current,
    handleModalSearchChange: (newSearchTerm: string) => {
      setCurrentSearchTerm(newSearchTerm);
      setActiveSelectionIndex(0); // Reset index on new search
    },
    confirmSelection,
    handleAgentSelectAction,
    handleToolSelectAction,
    handlePromptSelectAction,
    handleUrlSubmit
    // Expose the original onValueChangeAction if needed by the parent for other purposes
    // onValueChangeAction: onValueChangeAction 
  };
}
