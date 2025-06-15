"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input'; // For future path input - Removed unused import
import { Folder, File, AlertCircle, Loader2 } from 'lucide-react'; // Removed unused ArrowUp
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import path from 'path-browserify'; // Using path-browserify for client-side path manipulation
import { FileUploader } from './file-uploader'; // Added import

interface FileSystemItem {
  name: string;
  type: 'file' | 'directory' | 'inaccessible';
  size?: number;
  lastModified?: string;
  relativePath: string;
  error?: string;
}

interface ApiResponse {
  path: string; // Current relative path listed
  items: FileSystemItem[];
  error?: string;
}

interface FileExplorerProps {
  onFileSelectForMention?: (path: string) => void;
}

export function FileExplorer({ onFileSelectForMention }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string>(''); // Relative to UPLOADS_DIR
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // const [pathInput, setPathInput] = useState<string>(''); // Removed unused state
  const [selectedItemPath, setSelectedItemPath] = useState<string | null>(null);

  const handleAttachSelectedFile = () => {
    if (selectedItemPath && onFileSelectForMention) {
      onFileSelectForMention(selectedItemPath);
      setSelectedItemPath(null); // Clear selection after attaching
    }
  };

  const fetchDirectoryContents = useCallback(async (fetchPath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/files/list?path=${encodeURIComponent(fetchPath)}`);
      const data: ApiResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Failed to fetch directory contents for ${fetchPath}`);
      }
      setItems(data.items || []);
      setCurrentPath(data.path); // Update currentPath based on API response
      // setPathInput(data.path); // Removed: Sync path input with current path
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      setItems([]); // Clear items on error
    }
    setIsLoading(false);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    fetchDirectoryContents(currentPath);
  }, [fetchDirectoryContents, currentPath]);

  useEffect(() => {
    fetchDirectoryContents(currentPath);
  }, [fetchDirectoryContents, currentPath]); // Added currentPath to dependency array

  const handleItemClick = (item: FileSystemItem) => {
    setSelectedItemPath(item.relativePath);
    if (item.type === 'directory') {
      // If it's a directory, also navigate into it
      // setSelectedItemPath(null); // Optionally reset selection after navigating into a dir, or keep it selected
      fetchDirectoryContents(item.relativePath);
    }
    // If onFileSelectForMention is provided and item is a file, could call it here directly
    // or wait for an explicit 'Attach' button click.
  };

  const navigateToPath = (newPath: string) => {
    const cleanedPath = path.normalize(newPath).replace(/^\/+/, ''); // Normalize and remove leading slashes
    fetchDirectoryContents(cleanedPath);
  };
  
  // Removed unused handlePathInputChange

  // Removed unused handlePathInputSubmit

  const generateBreadcrumbs = () => {
    const pathSegments = currentPath.split('/').filter(segment => segment !== '');
    const breadcrumbItems = pathSegments.map((segment, index) => {
      const pathToSegment = pathSegments.slice(0, index + 1).join('/');
      return (
        <React.Fragment key={pathToSegment}>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigateToPath(pathToSegment); }}>
              {segment}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </React.Fragment>
      );
    });

    return (
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#" onClick={(e: React.MouseEvent) => { e.preventDefault(); navigateToPath(''); }}>
              <Folder size={16} className="mr-1 inline-block" /> Root
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbItems}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Error loading files: {error}</p>
        <Button onClick={() => fetchDirectoryContents(currentPath)} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        {generateBreadcrumbs()}
      </div>
       {/* Optional: Direct path input - can be enabled if desired
       <form onSubmit={handlePathInputSubmit} className="mb-4 flex gap-2">
        <Input 
          type="text" 
          value={pathInput} 
          onChange={handlePathInputChange} 
          placeholder="Enter path (e.g., folder/subfolder)"
          className="flex-grow"
        />
        <Button type="submit">Go</Button>
      </form> 
      */}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Last Modified</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                This directory is empty.
              </TableCell>
            </TableRow>
          )}
          {items.map((item) => (
            <TableRow 
              key={item.name}
              onClick={() => handleItemClick(item)}
              className={`${item.relativePath === selectedItemPath ? 'bg-primary/10' : ''} ${item.type === 'directory' ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/50 cursor-pointer'}`}
            >
              <TableCell>
                {item.type === 'directory' ? <Folder className="text-blue-500" /> : 
                 item.type === 'file' ? <File className="text-gray-500" /> : 
                 <AlertCircle className="text-red-500" />}
              </TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.type === 'inaccessible' ? 'Inaccessible' : item.type.charAt(0).toUpperCase() + item.type.slice(1)}</TableCell>
              <TableCell className="text-right">
                {item.type === 'file' && item.size !== undefined 
                  ? (item.size / 1024).toFixed(2) + ' KB' 
                  : '-'}
              </TableCell>
              <TableCell>
                {item.lastModified ? new Date(item.lastModified).toLocaleString() : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {onFileSelectForMention && (
        <div className="mt-4 flex justify-end">
          <Button 
            onClick={handleAttachSelectedFile} 
            disabled={!selectedItemPath}
          >
            Attach Selected File
          </Button>
        </div>
      )}

      <FileUploader 
        currentExplorerPath={currentPath} 
        onUploadSuccess={handleUploadSuccess} 
      />
    </div>
  );
}
