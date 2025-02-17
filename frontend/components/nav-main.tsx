"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface NavItem {
  title: string;
  url?: string;
  icon?: React.ComponentType<{ className?: string }>;
  items?: NavItem[];
}

interface NavMainProps {
  items: NavItem[];
}

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname();
  const [openCategories, setOpenCategories] = React.useState<string[]>([]);

  const toggleCategory = (title: string) => {
    setOpenCategories(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  return (
    <div className="grid gap-1">
      {items.map((item, index) => (
        <div key={index}>
          {item.url && !item.items ? (
            <Link
              href={item.url}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                pathname === item.url && "bg-accent"
              )}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.title}</span>
            </Link>
          ) : (
            <Collapsible
              open={openCategories.includes(item.title)}
              onOpenChange={() => toggleCategory(item.title)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent">
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span>{item.title}</span>
                  <ChevronDown 
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform",
                      openCategories.includes(item.title) && "rotate-180"
                    )} 
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-1 pl-6">
                  {item.items?.map((subItem, subIndex) => (
                    <Link
                      key={subIndex}
                      href={subItem.url || "#"}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                        pathname === subItem.url && "bg-accent"
                      )}
                    >
                      {subItem.icon && <subItem.icon className="h-4 w-4" />}
                      <span>{subItem.title}</span>
                    </Link>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      ))}
    </div>
  );
}

