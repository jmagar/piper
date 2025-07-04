"use client"

import React from 'react';
import { FileExplorer } from '@/components/files/file-explorer';
import { LayoutApp } from '@/components/layout/layout-app';

export default function FilesPage() {
  return (
    <LayoutApp>
      <div className="container mx-auto p-4 pt-8 md:pt-6">
        {/* <h1 className="text-2xl font-bold mb-4">Files</h1> */}
        <FileExplorer />
        {/* Placeholder for file upload component - to be added later */}
        {/* 
        <div className="mt-8 p-4 border rounded-md bg-muted/30">
          <p className="text-muted-foreground">File Upload Component Area</p>
        </div>
        */}
      </div>
    </LayoutApp>
  );
}
