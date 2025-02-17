"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"

// Available models by provider
const MODELS = {
  anthropic: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-opus-20241022", label: "Claude 3.5 Opus" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
  openai: [
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  groq: [
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
    { value: "mixtral-8x7b-instant", label: "Mixtral 8x7B" },
  ],
} as const;

type ModelValue = typeof MODELS[keyof typeof MODELS][number]['value'];
type Provider = keyof typeof MODELS;

interface ModelSelectorState {
  open: boolean;
  loading: boolean;
  error: string | null;
  currentProvider: Provider;
  value: ModelValue | "";
  search: string;
}

const initialState: ModelSelectorState = {
  open: false,
  loading: true,
  error: null,
  currentProvider: "anthropic",
  value: "",
  search: "",
};

function logError(context: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorDetails = error instanceof Error ? {
    name: error.name,
    stack: error.stack,
    cause: error.cause,
  } : {};

  console.error(`Error in ${context}:`, {
    message: errorMessage,
    ...errorDetails,
    timestamp: new Date().toISOString(),
  });

  toast.error(`Error: ${errorMessage}`);
  return errorMessage;
}

function isValidProvider(provider: unknown): provider is Provider {
  return typeof provider === 'string' && provider in MODELS;
}

export function ModelSelector() {
  const [state, setState] = React.useState<ModelSelectorState>(initialState);

  const fetchConfig = React.useCallback(async () => {
    try {
      const response = await fetch('/api/config');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch configuration: ${errorText}`);
      }

      const data = await response.json();

      if (!data?.llm?.model_provider || !data?.llm?.model) {
        throw new Error('Invalid configuration format received');
      }

      if (!isValidProvider(data.llm.model_provider)) {
        throw new Error(`Unsupported model provider: ${data.llm.model_provider}`);
      }

      setState(prev => ({
        ...prev,
        loading: false,
        currentProvider: data.llm.model_provider,
        value: data.llm.model,
      }));
    } catch (err) {
      const errorMessage = logError('ModelSelector.fetchConfig', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  React.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSelect = React.useCallback(async (selectedValue: string) => {
    try {
      const selectedModel = MODELS[state.currentProvider].find(
        model => model.value === selectedValue
      );

      if (!selectedModel) {
        throw new Error('Invalid model selected');
      }

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: state.currentProvider,
          model: selectedModel.value,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update configuration: ${errorText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error('Failed to update model configuration');
      }

      setState(prev => ({
        ...prev,
        value: selectedModel.value,
        open: false,
      }));
      toast.success(`Model updated to ${selectedModel.label}`);
    } catch (err) {
      const errorMessage = logError('ModelSelector.handleSelect', err);
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
    }
  }, [state.currentProvider]);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState(prev => ({ ...prev, open }));
  }, []);

  const handleSearch = React.useCallback((search: string) => {
    setState(prev => ({ ...prev, search }));
  }, []);

  const selectedModel = state.value 
    ? MODELS[state.currentProvider].find(model => model.value === state.value) 
    : null;

  const filteredModels = React.useMemo(() => {
    const models = MODELS[state.currentProvider];
    if (!state.search) return models;
    
    const searchLower = state.search.toLowerCase();
    return models.filter(model => 
      model.label.toLowerCase().includes(searchLower) ||
      model.value.toLowerCase().includes(searchLower)
    );
  }, [state.currentProvider, state.search]);

  if (state.loading) {
    return (
      <Button variant="outline" className="w-[250px] justify-between" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (state.error) {
    return (
      <Button 
        variant="outline" 
        className="w-[250px] justify-between text-destructive hover:text-destructive" 
        onClick={fetchConfig}
      >
        Error: {state.error} (Click to retry)
      </Button>
    );
  }

  return (
    <div className="relative w-[250px]">
      <Popover open={state.open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={state.open}
            className="w-full justify-between"
          >
            {selectedModel?.label || "Select model..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search models..." 
              value={state.search}
              onValueChange={handleSearch}
            />
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup>
              {filteredModels.map((model) => (
                <CommandItem
                  key={model.value}
                  value={model.value}
                  onSelect={() => handleSelect(model.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      state.value === model.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {model.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
} 