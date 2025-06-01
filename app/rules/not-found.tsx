"use client"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { Button } from "@/components/ui/button"
import { Article } from "@phosphor-icons/react"
import Link from "next/link"

export default function RuleNotFound() {
  return (
    <LayoutApp>
      <div className="bg-background mx-auto max-w-2xl pt-20">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-muted flex size-20 items-center justify-center rounded-full mb-6">
            <Article className="size-10 text-muted-foreground" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Rule not found</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            The rule you&apos;re looking for doesn&apos;t exist or may have been deleted.
          </p>

          <div className="flex gap-4">
            <Button asChild>
              <Link href="/rules">
                Browse all rules
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                Go home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </LayoutApp>
  )
} 