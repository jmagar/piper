import { AvailableModelData } from "./base"
import { getProvider, getProviderIcon } from "@/lib/providers"

type SubMenuProps = {
  hoveredModelData: AvailableModelData
}

export function SubMenu({ hoveredModelData }: SubMenuProps) {
  const providerDetails = getProvider(hoveredModelData.providerId)
  const ProviderIcon = getProviderIcon(hoveredModelData.providerId)

  return (
    <div className="bg-popover border-border w-[280px] rounded-md border p-3 shadow-md">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {ProviderIcon && <ProviderIcon className="size-5" />}
          <h3 className="font-medium">{hoveredModelData.name}</h3>
        </div>

        <p className="text-muted-foreground text-sm">
          {hoveredModelData.description} {/* This comes from OpenRouter API via AvailableModelData */}
        </p>

        {/* Sections for vision, tools, reasoning removed as these fields are not in AvailableModelData */}
        {/* If these details become available from the API, they can be re-added here. */}

        <div className="mt-2 flex flex-col gap-2 border-t pt-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Provider</span>
            <span>{providerDetails?.name || hoveredModelData.providerId}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-sm font-medium">Model ID</span>
            <span className="text-muted-foreground text-xs">
              {hoveredModelData.id}
            </span>
          </div>

          {hoveredModelData.context_length && (
            <div className="flex justify-between text-sm">
              <span className="text-sm font-medium">Context</span>
              <span className="text-muted-foreground text-xs">
                {hoveredModelData.context_length.toLocaleString()} tokens
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
