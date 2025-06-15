"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"

interface LLMSettings {
  provider: string
  apiKeys: {
    openai: string
    anthropic: string
    google: string
    openrouter: string
  }
  defaultModel: string
  temperature: number
  maxTokens: number
  streamingEnabled: boolean
}

const llmProviders = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google" },
  { id: "openrouter", name: "OpenRouter" },
]

const commonModels = [
  "gpt-4",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
  "claude-3-sonnet",
  "claude-3-haiku",
  "gemini-pro",
  "gemini-pro-vision",
]

interface ProvidersSettingsTabProps {
  isMobileLayout: boolean
}

export function ProvidersSettingsTab({ isMobileLayout }: ProvidersSettingsTabProps) {
  const [llmSettings, setLLMSettings] = useState<LLMSettings>({
    provider: "openai",
    apiKeys: {
      openai: "",
      anthropic: "",
      google: "",
      openrouter: "",
    },
    defaultModel: "gpt-4",
    temperature: 0.7,
    maxTokens: 1000,
    streamingEnabled: true,
  })

  useEffect(() => {
    const savedLLMSettings = localStorage.getItem('llm-settings')
    if (savedLLMSettings) {
      setLLMSettings(JSON.parse(savedLLMSettings))
    }
  }, [])

  const saveLLMSettings = () => {
    localStorage.setItem('llm-settings', JSON.stringify(llmSettings))
    toast({ title: "LLM settings saved", status: "success" })
  }

  const mobileLayout = (
    <div className="space-y-6">
      {/* LLM Provider Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">LLM Provider Configuration</h3>
        
        {/* Default Provider */}
        <div className="space-y-2">
          <Label htmlFor="provider-select-mobile">Default Provider</Label>
          <Select
            value={llmSettings.provider}
            onValueChange={(value) => setLLMSettings(prev => ({ ...prev, provider: value }))}
          >
            <SelectTrigger id="provider-select-mobile">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {llmProviders.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Keys */}
        <div className="space-y-3">
          <Label>API Keys</Label>
          {llmProviders.map((provider) => (
            <div key={provider.id} className="space-y-1">
              <Label htmlFor={`${provider.id}-key-mobile`} className="text-xs text-muted-foreground">
                {provider.name} API Key
              </Label>
              <Input
                id={`${provider.id}-key-mobile`}
                type="password"
                placeholder={`Enter ${provider.name} API key`}
                value={llmSettings.apiKeys[provider.id as keyof typeof llmSettings.apiKeys]}
                onChange={(e) => setLLMSettings(prev => ({
                  ...prev,
                  apiKeys: { ...prev.apiKeys, [provider.id]: e.target.value }
                }))}
              />
            </div>
          ))}
        </div>

        {/* Model Settings */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="default-model-mobile">Default Model</Label>
            <Select
              value={llmSettings.defaultModel}
              onValueChange={(value) => setLLMSettings(prev => ({ ...prev, defaultModel: value }))}
            >
              <SelectTrigger id="default-model-mobile">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {commonModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature-mobile">Temperature: {llmSettings.temperature}</Label>
            <input
              id="temperature-mobile"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={llmSettings.temperature}
              onChange={(e) => setLLMSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-tokens-mobile">Max Tokens</Label>
            <Input
              id="max-tokens-mobile"
              type="number"
              value={llmSettings.maxTokens}
              onChange={(e) => setLLMSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="streaming-mobile"
              checked={llmSettings.streamingEnabled}
              onCheckedChange={(checked) => setLLMSettings(prev => ({ ...prev, streamingEnabled: checked }))}
            />
            <Label htmlFor="streaming-mobile">Enable Streaming</Label>
          </div>
        </div>

        <Button onClick={saveLLMSettings} className="w-full">
          Save LLM Settings
        </Button>
      </div>
    </div>
  )

  const desktopLayout = (
    <div className="flex-1 space-y-6 p-1">
      {/* LLM Provider Settings */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium">LLM Provider Configuration</h3>
        
        {/* Default Provider */}
        <div className="space-y-2">
          <Label htmlFor="provider-select-desktop">Default Provider</Label>
          <Select
            value={llmSettings.provider}
            onValueChange={(value) => setLLMSettings(prev => ({ ...prev, provider: value }))}
          >
            <SelectTrigger id="provider-select-desktop" className="w-full">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {llmProviders.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Keys */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">API Keys</Label>
          <div className="grid grid-cols-2 gap-4">
            {llmProviders.map((provider) => (
              <div key={provider.id} className="space-y-2">
                <Label htmlFor={`${provider.id}-key-desktop`} className="text-xs text-muted-foreground">
                  {provider.name} API Key
                </Label>
                <Input
                  id={`${provider.id}-key-desktop`}
                  type="password"
                  placeholder={`Enter ${provider.name} API key`}
                  value={llmSettings.apiKeys[provider.id as keyof typeof llmSettings.apiKeys]}
                  onChange={(e) => setLLMSettings(prev => ({
                    ...prev,
                    apiKeys: { ...prev.apiKeys, [provider.id]: e.target.value }
                  }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Model Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Model Configuration</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-model-desktop">Default Model</Label>
              <Select
                value={llmSettings.defaultModel}
                onValueChange={(value) => setLLMSettings(prev => ({ ...prev, defaultModel: value }))}
              >
                <SelectTrigger id="default-model-desktop">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {commonModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens-desktop">Max Tokens</Label>
              <Input
                id="max-tokens-desktop"
                type="number"
                value={llmSettings.maxTokens}
                onChange={(e) => setLLMSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature-desktop">Temperature: {llmSettings.temperature}</Label>
            <input
              id="temperature-desktop"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={llmSettings.temperature}
              onChange={(e) => setLLMSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="streaming-desktop"
              checked={llmSettings.streamingEnabled}
              onCheckedChange={(checked) => setLLMSettings(prev => ({ ...prev, streamingEnabled: checked }))}
            />
            <Label htmlFor="streaming-desktop">Enable Streaming Completion</Label>
          </div>
        </div>

        <Button onClick={saveLLMSettings} size="lg">
          Save LLM Settings
        </Button>
      </div>
    </div>
  )

  return isMobileLayout ? mobileLayout : desktopLayout;
}
