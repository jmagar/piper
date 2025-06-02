"use client"

import { useChatSession } from "@/app/providers/chat-session-provider"
// import { useUser } from "@/app/providers/user-provider"
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

type DatabaseRule = {
  id: string
  name: string
  description: string
  slug: string
  systemPrompt: string
}

export function useAgentCommand({
  value,
  onValueChange,
  agents,
  defaultAgent = null,
}: {
  value: string
  onValueChange: (value: string) => void
  agents: Agent[]
  defaultAgent?: Agent | null
}) {
  const searchParams = useSearchParams()
  const { chatId } = useChatSession()
  // const { user } = useUser() // Not needed in admin-only mode
  const { updateChatAgent } = useChats()

  const pathname = usePathname()
  const router = useRouter()

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(defaultAgent)
  const [showAgentCommand, setShowAgentCommand] = useState(false)
  const [showToolCommand, setShowToolCommand] = useState(false)
  const [showRuleCommand, setShowRuleCommand] = useState(false)
  const [agentSearchTerm, setAgentSearchTerm] = useState("")
  const [toolSearchTerm, setToolSearchTerm] = useState("")
  const [ruleSearchTerm, setRuleSearchTerm] = useState("")
  const [activeAgentIndex, setActiveAgentIndex] = useState(0)
  const [activeToolIndex, setActiveToolIndex] = useState(0)
  const [activeRuleIndex, setActiveRuleIndex] = useState(0)
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([])
  const [databaseRules, setDatabaseRules] = useState<DatabaseRule[]>([])
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null)
  const [selectedRule, setSelectedRule] = useState<DatabaseRule | null>(null)
  const [pendingTool, setPendingTool] = useState<MCPTool | null>(null) // Tool waiting for parameters

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const mentionStartPosRef = useRef<number | null>(null)

  // Fetch MCP tools on mount
  useEffect(() => {
    const fetchMCPTools = async () => {
      try {
        const response = await fetch('/api/mcp-tools-available')
        const data = await response.json()
        setMcpTools(data.tools || [])
      } catch (error) {
        console.error('Failed to fetch MCP tools:', error)
        setMcpTools([])
      }
    }
    fetchMCPTools()
  }, [])

  // Fetch database rules on mount
  useEffect(() => {
    const fetchDatabaseRules = async () => {
      try {
        const response = await fetch('/api/rules-available')
        const data = await response.json()
        console.log('Fetched database rules:', data.rules)
        setDatabaseRules(data.rules || [])
      } catch (error) {
        console.error('Failed to fetch database rules:', error)
      }
    }
    fetchDatabaseRules()
  }, [])

  // Fuzzy matching function
  const fuzzyMatch = useCallback((term: string, target: string): number => {
    const termLower = term.toLowerCase()
    const targetLower = target.toLowerCase()
    
    // Exact match gets highest score
    if (targetLower.includes(termLower)) {
      return targetLower.indexOf(termLower) === 0 ? 100 : 80
    }
    
    // Character sequence matching
    let termIndex = 0
    let score = 0
    for (let i = 0; i < targetLower.length && termIndex < termLower.length; i++) {
      if (targetLower[i] === termLower[termIndex]) {
        score += 1
        termIndex++
      }
    }
    
    return termIndex === termLower.length ? score * (50 / target.length) : 0
  }, [])

  const filteredAgents = agentSearchTerm
    ? agents
        .map(agent => ({
          agent,
          score: Math.max(
            fuzzyMatch(agentSearchTerm, agent.name),
            fuzzyMatch(agentSearchTerm, agent.description || '')
          )
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.agent)
    : agents

  const filteredTools = toolSearchTerm
    ? mcpTools
        .map(tool => ({
          tool,
          score: Math.max(
            fuzzyMatch(toolSearchTerm, tool.name),
            fuzzyMatch(toolSearchTerm, tool.description || ''),
            fuzzyMatch(toolSearchTerm, tool.serverLabel)
          )
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.tool)
    : mcpTools

  console.log('🔧 [useAgentCommand] filteredTools state:', {
    mcpToolsLength: mcpTools.length,
    toolSearchTerm,
    filteredToolsLength: filteredTools.length,
    firstFewFiltered: filteredTools.slice(0, 3)
  })

  const filteredRules = ruleSearchTerm
    ? databaseRules
        .map(rule => ({
          rule,
          score: Math.max(
            fuzzyMatch(ruleSearchTerm, rule.name),
            fuzzyMatch(ruleSearchTerm, rule.description || ''),
            fuzzyMatch(ruleSearchTerm, rule.slug)
          )
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.rule)
    : databaseRules

  // Sync with defaultAgent always (no localOverride anymore)
  useEffect(() => {
    setSelectedAgent(defaultAgent ?? null)
  }, [defaultAgent])

  // Remove selected agent on root
  useEffect(() => {
    if (pathname === "/") setSelectedAgent(null)
  }, [pathname])

  const updateAgentInUrl = useCallback(
    (agent: Agent | null) => {
      if (!searchParams) return

      const params = new URLSearchParams(searchParams.toString())
      if (agent) {
        params.set("agent", agent.slug)
      } else {
        params.delete("agent")
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const updateChatAgentDebounced = useMemo(
    () => debounce((agent: Agent | null) => {
      if (!chatId) return
      updateChatAgent(chatId, agent?.id ?? null)
    }, 500),
    [chatId, updateChatAgent]
  )

  const handleValueChange = useCallback(
    (newValue: string) => {
      onValueChange(newValue)
      const match = newValue.match(/@([^@\s]*)$/)
      if (match) {
        const searchTerm = match[1]
        console.log('Search term:', searchTerm, 'Available - agents:', agents.length, 'tools:', mcpTools.length, 'rules:', databaseRules.length)
        
        // 3-way fuzzy matching: agents, tools, and rules
        const agentScores = agents.map(agent => fuzzyMatch(searchTerm, agent.name))
        const toolScores = mcpTools.map(tool => fuzzyMatch(searchTerm, tool.name))
        const ruleScores = databaseRules.map(rule => fuzzyMatch(searchTerm, rule.name))
        
        const bestAgentScore = Math.max(0, ...agentScores)
        const bestToolScore = Math.max(0, ...toolScores)
        const bestRuleScore = Math.max(0, ...ruleScores)
        
        console.log('Best scores - Agent:', bestAgentScore, 'Tool:', bestToolScore, 'Rule:', bestRuleScore)
        
        // Check for direct matches to make it easier to trigger
        const hasToolMatch = searchTerm.length > 0 && mcpTools.some(tool => tool.name.toLowerCase().includes(searchTerm.toLowerCase()))
        const hasRuleMatch = searchTerm.length > 0 && databaseRules.some(rule => rule.name.toLowerCase().includes(searchTerm.toLowerCase()) || rule.slug.toLowerCase().includes(searchTerm.toLowerCase()))
        
        if ((bestRuleScore > 5 && bestRuleScore >= bestAgentScore && bestRuleScore >= bestToolScore) || hasRuleMatch) {
          console.log('Showing rule dropdown')
          setShowRuleCommand(true)
          setShowAgentCommand(false)
          setShowToolCommand(false)
          setRuleSearchTerm(searchTerm)
          setAgentSearchTerm("")
          setToolSearchTerm("")
        } else if ((bestToolScore > 5 && bestToolScore >= bestAgentScore) || hasToolMatch) {
          console.log('Showing tool dropdown')
          setShowToolCommand(true)
          setShowAgentCommand(false)
          setShowRuleCommand(false)
          setToolSearchTerm(searchTerm)
          setAgentSearchTerm("")
          setRuleSearchTerm("")
        } else {
          console.log('Showing agent dropdown')
          setShowAgentCommand(true)
          setShowToolCommand(false)
          setShowRuleCommand(false)
          setAgentSearchTerm(searchTerm)
          setToolSearchTerm("")
          setRuleSearchTerm("")
        }
        
        if (mentionStartPosRef.current === null && textareaRef.current) {
          const atIndex = newValue.lastIndexOf("@" + searchTerm)
          mentionStartPosRef.current = atIndex
        }
      } else {
        setShowAgentCommand(false)
        setShowToolCommand(false)
        setShowRuleCommand(false)
        setAgentSearchTerm("")
        setToolSearchTerm("")
        setRuleSearchTerm("")
        mentionStartPosRef.current = null
      }
    },
    [onValueChange, agents, mcpTools, databaseRules, fuzzyMatch]
  )

  const handleAgentSelect = useCallback(
    (agent: Agent) => {
      setSelectedAgent(agent)
      updateAgentInUrl(agent)
      updateChatAgentDebounced(agent)

      const start = mentionStartPosRef.current
      const text = value.replace(/@([^@\s]*)$/, "")
      onValueChange(
        start !== null ? value.slice(0, start) + text.slice(start) : text
      )

      setShowAgentCommand(false)
      setShowToolCommand(false)
      mentionStartPosRef.current = null
      textareaRef.current?.focus()
    },
    [value, onValueChange, updateAgentInUrl, updateChatAgentDebounced]
  )

  const handleToolSelect = useCallback(
    (tool: MCPTool) => {
      // Set tool as pending parameters instead of immediately adding to input
      setPendingTool(tool)
      setShowToolCommand(false)
      setShowAgentCommand(false)
      mentionStartPosRef.current = null
    },
    []
  )

  const handleToolParametersSubmit = useCallback(
    (tool: MCPTool, parameters: Record<string, unknown>) => {
      setSelectedTool(tool)
      
      // Add tool mention with parameters to the input using just the tool name
      const start = mentionStartPosRef.current
      const toolMention = `@${tool.name}(${JSON.stringify(parameters)})`
      
      if (start !== null) {
        const beforeMention = value.slice(0, start)
        const afterMention = value.slice(start).replace(/@([^@\s]*)$/, toolMention)
        onValueChange(beforeMention + afterMention)
      } else {
        onValueChange(value.replace(/@([^@\s]*)$/, toolMention))
      }

      setPendingTool(null)
      textareaRef.current?.focus()
    },
    [value, onValueChange]
  )

  const handleToolParametersCancel = useCallback(() => {
    setPendingTool(null)
    textareaRef.current?.focus()
  }, [])

  const handleRuleSelect = useCallback(
    (rule: DatabaseRule) => {
      setSelectedRule(rule)
      
      // Add rule mention to the input using rule slug
      const start = mentionStartPosRef.current
      const ruleMention = `@${rule.slug}`
      
      if (start !== null) {
        const beforeMention = value.slice(0, start)
        const afterMention = value.slice(start).replace(/@([^@\s]*)$/, ruleMention)
        onValueChange(beforeMention + afterMention)
      } else {
        onValueChange(value.replace(/@([^@\s]*)$/, ruleMention))
      }

      setShowRuleCommand(false)
      setShowAgentCommand(false)
      setShowToolCommand(false)
      mentionStartPosRef.current = null
      textareaRef.current?.focus()
    },
    [value, onValueChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isAgentCommand = showAgentCommand && filteredAgents.length > 0
      const isToolCommand = showToolCommand && filteredTools.length > 0
      const isRuleCommand = showRuleCommand && filteredRules.length > 0
      
      if (!isAgentCommand && !isToolCommand && !isRuleCommand) return

      if (["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(e.key))
        e.preventDefault()

      if (isAgentCommand) {
        if (e.key === "ArrowDown")
          setActiveAgentIndex((i) => (i + 1) % filteredAgents.length)
        if (e.key === "ArrowUp")
          setActiveAgentIndex(
            (i) => (i - 1 + filteredAgents.length) % filteredAgents.length
          )
        if (e.key === "Enter") handleAgentSelect(filteredAgents[activeAgentIndex])
        if (e.key === "Escape") setShowAgentCommand(false)
      } else if (isToolCommand) {
        if (e.key === "ArrowDown")
          setActiveToolIndex((i) => (i + 1) % filteredTools.length)
        if (e.key === "ArrowUp")
          setActiveToolIndex(
            (i) => (i - 1 + filteredTools.length) % filteredTools.length
          )
        if (e.key === "Enter") handleToolSelect(filteredTools[activeToolIndex])
        if (e.key === "Escape") setShowToolCommand(false)
      } else if (isRuleCommand) {
        if (e.key === "ArrowDown")
          setActiveRuleIndex((i) => (i + 1) % filteredRules.length)
        if (e.key === "ArrowUp")
          setActiveRuleIndex(
            (i) => (i - 1 + filteredRules.length) % filteredRules.length
          )
        if (e.key === "Enter") handleRuleSelect(filteredRules[activeRuleIndex])
        if (e.key === "Escape") setShowRuleCommand(false)
      }
    },
    [showAgentCommand, showToolCommand, showRuleCommand, filteredAgents, filteredTools, filteredRules, activeAgentIndex, activeToolIndex, activeRuleIndex, handleAgentSelect, handleToolSelect, handleRuleSelect]
  )

  const removeSelectedAgent = useCallback(() => {
    setSelectedAgent(null)
    updateAgentInUrl(null)
    if (chatId) {
      updateChatAgent(chatId, null).catch(console.error)
    }
    textareaRef.current?.focus()
  }, [updateAgentInUrl, chatId, updateChatAgent])

  useEffect(() => setActiveAgentIndex(0), [filteredAgents.length])
  useEffect(() => setActiveToolIndex(0), [filteredTools.length])
  useEffect(() => setActiveRuleIndex(0), [filteredRules.length])

      return {
      // Agent-related state and handlers
      showAgentCommand,
      agentSearchTerm,
      selectedAgent,
      activeAgentIndex,
      filteredAgents,
      handleAgentSelect,
      removeSelectedAgent,
      closeAgentCommand: () => setShowAgentCommand(false),
      setActiveAgentIndex,
      
      // Tool-related state and handlers  
      showToolCommand,
      toolSearchTerm,
      selectedTool,
      activeToolIndex,
      filteredTools,
      handleToolSelect,
      closeToolCommand: () => setShowToolCommand(false),
      setActiveToolIndex,
      pendingTool,
      handleToolParametersSubmit,
      handleToolParametersCancel,
      
      // Rule-related state and handlers
      showRuleCommand,
      ruleSearchTerm,
      selectedRule,
      activeRuleIndex,
      filteredRules,
      handleRuleSelect,
      closeRuleCommand: () => setShowRuleCommand(false),
      setActiveRuleIndex,
      
      // Shared state and handlers
      mentionStartPos: mentionStartPosRef.current,
      textareaRef,
      handleKeyDown,
      handleValueChange,
    }
}
