import React, { useEffect, useState } from 'react';
import { Agent } from "../../types/agent";
import { Prompt } from './use-agent-command';

// Tool structure provided by useAgentCommand
interface MCPTool {
  name: string; // Used as ID and for display
  description?: string;
  serverId: string; // Available from useAgentCommand's MCPTool
  serverLabel: string; // Available from useAgentCommand's MCPTool
}


interface UnifiedSelectionModalProps {
  isOpen: boolean;
  activeCommandType: 'agents' | 'tools' | 'prompts' | 'url' | 'files' | null;
  searchTerm: string;
  agents: Agent[];
  tools: MCPTool[];
  prompts: Prompt[];
  onSelectAgent: (agent: Agent) => void;
  onSelectTool: (tool: MCPTool) => void;
  onSelectPrompt?: (prompt: Prompt) => void;
  onUrlSubmit?: (url: string) => void;
  onClose: () => void;
  activeIndex: number;
  onModalSearchChange: (newSearchTerm: string) => void;
  onTriggerFileUpload?: () => void;
  onTriggerFileBrowse?: () => void;
}

export const UnifiedSelectionModal: React.FC<UnifiedSelectionModalProps> = ({
  isOpen,
  activeCommandType,
  searchTerm,
  agents,
  tools,
  prompts,
  onSelectAgent,
  onSelectTool,
  onSelectPrompt,
  onUrlSubmit,
  onClose,
  activeIndex,
  onModalSearchChange,
  onTriggerFileUpload,
  onTriggerFileBrowse,
}: UnifiedSelectionModalProps) => {
  const [urlInputValue, setUrlInputValue] = useState('');

  useEffect(() => {
    if (isOpen && activeCommandType === 'url') {
      setUrlInputValue('');
    } else if (!isOpen) {
      setUrlInputValue('');
    }
  }, [isOpen, activeCommandType]);

  useEffect(() => {
    if (isOpen && activeCommandType !== 'url' && activeIndex >= 0) {
      let activeElementId: string | undefined;
      switch (activeCommandType) {
        case 'agents':
          if (agents[activeIndex]) activeElementId = `agent-option-${activeIndex}`;
          break;
        case 'tools':
          if (tools[activeIndex]) activeElementId = `tool-option-${activeIndex}`;
          break;
        case 'prompts':
          if (prompts[activeIndex]) activeElementId = `prompt-option-${activeIndex}`;
          break;
        default:
          break;
      }

      if (activeElementId) {
        const element = document.getElementById(activeElementId);
        element?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [isOpen, activeIndex, activeCommandType, agents, tools, prompts]);

  if (!isOpen || !activeCommandType) {
    return null;
  }

  return (
    <div 
      className="absolute bottom-full mb-1 left-0 z-20 w-full max-h-60 overflow-y-auto bg-background p-2 shadow-lg border rounded-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unified-selection-modal-title"
    >
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose} 
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
      >
        <span aria-hidden="true">&times;</span>
      </button>
      {/* Search Input for agents, tools, prompts */}
      {['agents', 'tools', 'prompts'].includes(activeCommandType || '') && activeCommandType !== 'files' && (
        <div className="p-1 mb-2">
          <input
            type="text"
            placeholder={`Search ${activeCommandType}...`}
            value={searchTerm} 
            onChange={(e) => onModalSearchChange(e.target.value)}
            className="w-full p-2 border border-border rounded-md bg-background focus:ring-ring focus:border-ring text-sm"
            aria-label={`Search ${activeCommandType}`}
            autoFocus 
          />
        </div>
      )}

      <h3 id="unified-selection-modal-title" className="sr-only">
        {activeCommandType ? `Select ${activeCommandType.slice(0, -1)}` : 'Selection Modal'}
      </h3>

      {/* URL Input Field */} 
      {activeCommandType === 'url' && (
        <div className="p-2">
          <input
            type="text"
            value={urlInputValue} // Assumes urlInputValue is in state
            onChange={(e) => setUrlInputValue(e.target.value)} // Assumes setUrlInputValue is in state
            onKeyDown={(e) => {
              if (e.key === 'Enter' && urlInputValue.trim() && onUrlSubmit) {
                e.preventDefault();
                onUrlSubmit(urlInputValue.trim());
              }
            }}
            placeholder="Enter or paste URL and press Enter"
            className="w-full p-2 border rounded bg-background text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1.5">Submit a URL to include its content as context.</p>
        </div>
      )}
      
      {/* Agent List */}
      {activeCommandType === 'agents' && (
        <ul role="listbox" aria-label="Agents list" className="max-h-[calc(60vh-120px)] overflow-y-auto" id="agent-listbox" aria-activedescendant={activeCommandType === 'agents' && agents[activeIndex] ? `agent-option-${activeIndex}` : undefined}>
          {agents.length > 0 ? (
            agents.map((agent, index) => (
              <li
                id={`agent-option-${index}`}
                key={agent.id}
                role="option"
                aria-selected={activeIndex === index}
                className={`p-2 cursor-pointer rounded-md ${activeIndex === index ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                onClick={() => onSelectAgent(agent)}
              >
                <div className="font-medium">{agent.name}</div>
                {agent.description && (
                  <div className="text-xs text-gray-500">{agent.description}</div>
                )}
              </li>
            ))
          ) : (
            searchTerm ? (
              <li className="p-2 text-gray-500" role="option" aria-disabled="true" aria-selected="false">No agents match &apos;{searchTerm}&apos;.</li>
            ) : (
              <li className="p-2 text-gray-500" role="option" aria-disabled="true" aria-selected="false">No agents available.</li>
            )
          )}
        </ul>
      )}

      {activeCommandType === 'tools' && (
        <ul role="listbox" aria-label="Tools list" className="max-h-[calc(60vh-120px)] overflow-y-auto" id="tool-listbox" aria-activedescendant={activeCommandType === 'tools' && tools[activeIndex] ? `tool-option-${activeIndex}` : undefined}>
          {tools.length > 0 ? (
            tools.map((tool, index) => (
              <li
                id={`tool-option-${index}`}
                key={tool.name}
                role="option"
                aria-selected={activeIndex === index}
                className={`p-2 cursor-pointer rounded-md ${activeIndex === index ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                onClick={() => onSelectTool(tool)}
              >
                <div className="font-medium">{tool.name}</div>
                {tool.description && (
                  <div className="text-xs text-gray-500">{tool.description}</div>
                )}
              </li>
            ))
          ) : (
            searchTerm ? (
              <li className="p-2 text-gray-500" role="option" aria-disabled="true" aria-selected="false">No tools match &apos;{searchTerm}&apos;.</li>
            ) : (
              <li className="p-2 text-gray-500" role="option" aria-disabled="true" aria-selected="false">No tools available.</li>
            )
          )}
        </ul>
      )}

      {activeCommandType === 'prompts' && (
        <ul role="listbox" aria-label="Prompts list" className="max-h-[calc(60vh-120px)] overflow-y-auto" id="prompt-listbox" aria-activedescendant={activeCommandType === 'prompts' && prompts[activeIndex] ? `prompt-option-${activeIndex}` : undefined}>
          {prompts.length > 0 ? (
            prompts.map((prompt, index) => (
              <li
                id={`prompt-option-${index}`}
                key={prompt.id}
                role="option"
                aria-selected={activeIndex === index}
                className={`p-2 cursor-pointer rounded-md ${activeIndex === index ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                onClick={() => onSelectPrompt?.(prompt)}
              >
                <div className="font-medium">{prompt.name}</div>
                {prompt.description && (
                  <div className="text-xs text-gray-500">{prompt.description}</div>
                )}
              </li>
            ))
          ) : (
            searchTerm ? (
              <li className="p-2 text-gray-500" role="option" aria-disabled="true" aria-selected="false">No prompts match &apos;{searchTerm}&apos;.</li>
            ) : (
              <li className="p-2 text-gray-500" role="option" aria-disabled="true" aria-selected="false">No prompts available.</li>
            )
          )}
        </ul>
      )}
      
      {/* File Options (Upload/Browse) */}
      {activeCommandType === 'files' && (
        <ul role="listbox" aria-label="File actions" className="max-h-[calc(60vh-120px)] overflow-y-auto">
          <li
            role="option"
            className={`p-3 cursor-pointer rounded-md hover:bg-muted`}
            onClick={() => {
              if (onTriggerFileUpload) onTriggerFileUpload();
              onClose();
            }}
          >
            <div className="font-medium">Upload Files</div>
            <div className="text-xs text-gray-500">Select files from your device</div>
          </li>
          <li
            role="option"
            className={`p-3 cursor-pointer rounded-md hover:bg-muted`}
            onClick={() => {
              if (onTriggerFileBrowse) onTriggerFileBrowse();
              onClose(); // Close this modal, FileExplorerModal will open
            }}
          >
            <div className="font-medium">Browse Files</div>
            <div className="text-xs text-gray-500">Select from already uploaded files</div>
          </li>
        </ul>
      )}

      {activeCommandType === 'url' && (
        <div className="p-2">
          {/* URL Input Field was here, but it's better handled by the input at the top when activeCommandType is 'url' */}
          {/* Retaining the descriptive text or using the main input for URL entry */}
          <input
            type="text"
            value={urlInputValue} 
            onChange={(e) => setUrlInputValue(e.target.value)} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && urlInputValue.trim() && onUrlSubmit) {
                e.preventDefault();
                onUrlSubmit(urlInputValue.trim());
              }
            }}
            placeholder="Enter or paste URL and press Enter"
            className="w-full p-2 border rounded bg-background text-foreground placeholder-muted-foreground focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1.5">Submit a URL to include its content as context.</p>
        </div>
      )}
    </div>
  );
};
