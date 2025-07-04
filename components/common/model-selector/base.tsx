"use client"

import { PopoverContentAuth } from "@/components/chat-input/popover-content-auth"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FREE_MODELS_IDS } from "@/lib/config"
import { getProviderIcon } from "@/lib/providers"
import { cn } from "@/lib/utils"
import { CaretDown, Star, Question } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import { SubMenu } from "./sub-menu"

export type AvailableModelData = {
  id: string;
  name: string;
  description: string;
  context_length: number | null;
  providerId: string;
  starred?: boolean;
};

type ModelSelectorProps = {
  availableModels: AvailableModelData[];
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;
  className?: string;
  isUserAuthenticated?: boolean;
  onStarModel?: (modelId: string) => void;
}

export function ModelSelector({
  availableModels,
  selectedModelId,
  setSelectedModelId,
  className,
  isUserAuthenticated = true,
  onStarModel,
}: ModelSelectorProps) {
  const currentModel = availableModels.find((model) => model.id === selectedModelId);
  const CurrentProviderIcon = currentModel ? getProviderIcon(currentModel.providerId) : Question;

  const isMobile = useBreakpoint(768)

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "p" || e.key === "P") && e.metaKey && e.shiftKey) {
        e.preventDefault()
        if (isMobile) {
          setIsDrawerOpen((prev) => !prev)
        } else {
          setIsDropdownOpen((prev) => !prev)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isMobile])

  const renderModelItem = (model: AvailableModelData, isDesktop: boolean) => {
    const ProviderIcon = getProviderIcon(model.providerId);

    const itemContent = (
      <div
        className={cn(
          "flex w-full items-center justify-between px-3 py-2",
          selectedModelId === model.id && "bg-accent"
        )}
      >
        <div 
          className="flex flex-grow items-center gap-3 cursor-pointer" 
          onClick={() => {
            setSelectedModelId(model.id)
            if (isMobile) {
              setIsDrawerOpen(false)
            } else {
              setIsDropdownOpen(false)
            }
          }}
        >
          {ProviderIcon && <ProviderIcon className="size-5" />} 
          <div className="flex flex-col gap-0">
            <span className={cn("text-sm", selectedModelId === model.id && "font-semibold")}>{model.name}</span>
          </div>
        </div>
        {onStarModel && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full w-8 h-8 p-1 hover:bg-accent/50" 
            onClick={(e) => {
              e.stopPropagation(); 
              onStarModel(model.id);
            }}
          >
            {model.starred ? (
              <Star weight="fill" className={cn("size-4 text-yellow-500")} />
            ) : (
              <Star className={cn("size-4 text-muted-foreground")} />
            )}
          </Button>
        )}
      </div>
    );

    if (isDesktop) {
      return (
        <HoverCard key={model.id} openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div className={cn("hover:bg-accent/80 rounded-md transition-colors duration-150", selectedModelId === model.id && "bg-accent")}>
              {itemContent}
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="right" align="start" className="w-auto p-0 z-[60]" sideOffset={10}>
            <SubMenu hoveredModelData={model} />
          </HoverCardContent>
        </HoverCard>
      );
    }
    return (
        <div key={model.id} className={cn("hover:bg-accent/80 rounded-md transition-colors duration-150", selectedModelId === model.id && "bg-accent")}>
            {itemContent}
        </div>
    );
  }

  const filteredModels = availableModels.filter((model) => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;

    const aIsFree = FREE_MODELS_IDS.includes(a.id);
    const bIsFree = FREE_MODELS_IDS.includes(b.id);
    if (aIsFree && !bIsFree) return -1;
    if (!aIsFree && bIsFree) return 1;

    return a.name.localeCompare(b.name);
  });

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-7 bg-background/50 hover:bg-background/80 border-border/40 text-xs font-medium justify-between min-w-[180px] transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {CurrentProviderIcon && <CurrentProviderIcon className="size-3" />} 
        <span className="truncate">{currentModel?.name || "Select Model"}</span>
      </div>
      <CaretDown className="size-3 opacity-50" />
    </Button>
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setSearchQuery(e.target.value)
  }

  if (!isUserAuthenticated) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className={cn(
                  "border-border dark:bg-secondary text-accent-foreground h-9 w-auto border bg-transparent",
                  className
                )}
                type="button"
              >
                {CurrentProviderIcon && (
                  <CurrentProviderIcon className="size-5" />
                )}
                {currentModel?.name || "Select Model"}
                <CaretDown className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Select a model</TooltipContent>
        </Tooltip>
        <PopoverContentAuth />
      </Popover>
    )
  }

  if (isMobile) {
    const drawerContent = (
      <div className="flex flex-col">
        <div className="flex max-h-[400px] w-full flex-col overflow-y-auto sm:w-[300px]">
          <div className="bg-popover sticky top-0 z-10 px-3 py-2">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="h-9 w-full rounded-md"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
          {filteredModels.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No models found.
            </div>
          )}
          {filteredModels.map((model) => renderModelItem(model, false))}
        </div>
      </div>
    );

    return (
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[80%]">
          <DrawerHeader>
            <DrawerTitle>Select a Model</DrawerTitle>
          </DrawerHeader>
          {drawerContent}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        className="p-0"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()} 
        sideOffset={5} 
      >
        <div className="flex max-h-[400px] w-full flex-col overflow-y-auto sm:w-[300px]">
          <div className="bg-popover sticky top-0 z-10 px-3 py-2">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="h-9 w-full rounded-md"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
          {filteredModels.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No models found.
            </div>
          )}
          {filteredModels.map((model) => renderModelItem(model, true))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
