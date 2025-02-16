"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Cpu } from "lucide-react"
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
import { useState, useEffect } from "react"

interface Model {
  provider: string
  name: string
}

export function ModelSelector() {
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('http://localhost:4100/api/config');
        if (response.ok) {
          const data = await response.json();
          const model: Model = {
            provider: data.llm.model_provider,
            name: data.llm.model
          };
          setModels([model]); // In the future, we can fetch multiple models
          setSelectedModel(model);
        }
      } catch (error) {
        console.error('Error fetching model config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  if (loading) {
    return (
      <Button variant="ghost" className="w-full justify-start">
        <Cpu className="size-4 shrink-0 opacity-70" />
        <span className="ml-2">Loading...</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-state={open ? "open" : "closed"}
        >
          <div className="flex items-center gap-2 truncate">
            <Cpu className="size-4 shrink-0 opacity-70" />
            <span className="truncate">
              {selectedModel ? (
                <span className="capitalize">
                  {selectedModel.provider} - {selectedModel.name}
                </span>
              ) : (
                "Select model..."
              )}
            </span>
          </div>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandEmpty>No model found.</CommandEmpty>
          <CommandGroup>
            {models.map((model) => (
              <CommandItem
                key={`${model.provider}-${model.name}`}
                value={`${model.provider}-${model.name}`}
                onSelect={() => {
                  setSelectedModel(model)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "size-4 opacity-0",
                    selectedModel?.name === model.name && "opacity-100"
                  )}
                />
                <span className="capitalize">
                  {model.provider} - {model.name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 