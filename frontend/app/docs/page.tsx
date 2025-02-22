'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import 'swagger-ui-react/swagger-ui.css';
import { Book, Code, Loader2 } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";


// OpenAPI Spec
const spec = {
  openapi: "3.0.0",
  info: {
    title: "MCP API",
    version: "1.0.0",
    description: "Model Context Protocol API"
  },
  servers: [
    {
      url: "https://piper.tootie.tv",
      description: "Production server"
    }
  ],
  // ... rest of the spec remains unchanged
};

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
});

export default function ApiDocs() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration issues
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 w-full overflow-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="h-full flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Book className="w-8 h-8" />
                    API Documentation
                  </h1>
                  <p className="text-base text-muted-foreground">
                    Explore and test the Model Context Protocol API
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      window.open(url);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Code className="w-4 h-4" />
                    View OpenAPI Spec
                  </Button>
                </div>
              </div>

              <div className="prose max-w-none dark:prose-invert">
                <SwaggerUI 
                  spec={spec}
                  docExpansion="list"
                  defaultModelsExpandDepth={5}
                  filter={true}
                  tryItOutEnabled={true}
                  supportedSubmitMethods={[
                    'get',
                    'post',
                    'put',
                    'delete',
                    'patch',
                    'options',
                    'head'
                  ]}
                  onComplete={() => {
                    // Add custom styling for better dark mode support
                    const style = document.createElement('style');
                    style.textContent = `
                      .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #0ea5e9 !important; }
                      .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #22c55e !important; }
                      .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #f59e0b !important; }
                      .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #ef4444 !important; }
                      .dark .swagger-ui, 
                      .dark .swagger-ui .opblock-description-wrapper p,
                      .dark .swagger-ui .opblock-external-docs-wrapper p,
                      .dark .swagger-ui .opblock-title_normal p,
                      .dark .swagger-ui table thead tr td,
                      .dark .swagger-ui table thead tr th,
                      .dark .swagger-ui .responses-inner h4,
                      .dark .swagger-ui .responses-inner h5,
                      .dark .swagger-ui .opblock-section-header h4 {
                        color: #e5e7eb !important;
                      }
                      .dark .swagger-ui .opblock {
                        background: rgba(255,255,255,0.05) !important;
                        border-color: rgba(255,255,255,0.1) !important;
                      }
                      .dark .swagger-ui input[type=text],
                      .dark .swagger-ui textarea {
                        background: rgba(255,255,255,0.05) !important;
                        border-color: rgba(255,255,255,0.1) !important;
                        color: #e5e7eb !important;
                      }
                      .dark .swagger-ui select {
                        background: rgba(255,255,255,0.05) !important;
                        border-color: rgba(255,255,255,0.1) !important;
                        color: #e5e7eb !important;
                      }
                      .dark .swagger-ui .tab li {
                        background: rgba(255,255,255,0.05) !important;
                        border-color: rgba(255,255,255,0.1) !important;
                        color: #e5e7eb !important;
                      }
                    `;
                    document.head.appendChild(style);
                  }}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}