'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Folder, 
  FolderOpen, 
  FileJson, 
  FileCode,
  Search,
  Plus,
  MoreHorizontal,
  Trash,
  Download,
  Edit,
  Copy
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  FileExplorerNode,
  getFileExplorerTree,
  downloadDocument,
  getDocument,
  deleteDocument
} from '@/lib/document-storage';

interface FileExplorerProps {
  onFileSelect?: (fileId: string) => void;
  className?: string;
  showToolbar?: boolean;
  onCreateNew?: () => void;
}

/**
 * An elegant, modern file explorer sidebar component
 */
export function FileExplorer({
  onFileSelect,
  className,
  showToolbar = true,
  onCreateNew
}: FileExplorerProps) {
  const router = useRouter();
  const [files, setFiles] = React.useState<FileExplorerNode[]>([]);
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch file tree on component mount
  React.useEffect(() => {
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        const data = await getFileExplorerTree();
        setFiles(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching file tree:', err);
        setError('Failed to load files. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, []);

  // Filter files based on search query
  const filteredFiles = React.useMemo(() => {
    if (!searchQuery.trim()) return files;
    
    const query = searchQuery.toLowerCase();
    
    // Helper function to search recursively through file tree
    const searchInNode = (node: FileExplorerNode): FileExplorerNode | null => {
      // Check if current node matches
      if (node.title.toLowerCase().includes(query)) {
        return { ...node, children: node.children ? node.children.map(child => ({ ...child })) : [] };
      }
      
      // If it's a folder, search in children
      if (node.isFolder && node.children) {
        const matchingChildren = node.children
          .map(searchInNode)
          .filter((child): child is FileExplorerNode => child !== null);
        
        if (matchingChildren.length > 0) {
          return { ...node, children: matchingChildren };
        }
      }
      
      return null;
    };
    
    return files
      .map(searchInNode)
      .filter((node): node is FileExplorerNode => node !== null);
  }, [files, searchQuery]);

  // Toggle folder expansion
  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Handle file selection
  const handleFileSelect = (fileId: string) => {
    setSelectedFile(fileId);
    if (onFileSelect) {
      onFileSelect(fileId);
    } else {
      router.push(`/documents/${fileId}`);
    }
  };

  // Handle file download
  const handleDownload = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const document = await getDocument(fileId);
      downloadDocument(document);
    } catch (err) {
      console.error('Error downloading file:', err);
      // Could add toast notification here
    }
  };

  // Handle file delete
  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteDocument(fileId);
        // Refresh file list
        const data = await getFileExplorerTree();
        setFiles(data);
        if (selectedFile === fileId) {
          setSelectedFile(null);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
        // Could add toast notification here
      }
    }
  };

  // Handle file edit
  const handleEdit = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/documents/edit/${fileId}`);
  };

  // Render file icon based on file type
  const renderFileIcon = (type: string) => {
    switch (type) {
      case 'json':
        return <FileJson className="h-4 w-4 mr-2 text-blue-500" />;
      case 'yaml':
      case 'yml':
        return <FileCode className="h-4 w-4 mr-2 text-purple-500" />;
      case 'javascript':
      case 'js':
        return <FileCode className="h-4 w-4 mr-2 text-yellow-500" />;
      case 'typescript':
      case 'ts':
        return <FileCode className="h-4 w-4 mr-2 text-blue-500" />;
      case 'python':
      case 'py':
        return <FileCode className="h-4 w-4 mr-2 text-green-500" />;
      case 'html':
        return <FileCode className="h-4 w-4 mr-2 text-orange-500" />;
      case 'css':
        return <FileCode className="h-4 w-4 mr-2 text-pink-500" />;
      default:
        return <FileText className="h-4 w-4 mr-2 text-gray-500" />;
    }
  };

  // Recursive component to render file tree
  const renderFileTree = (nodes: FileExplorerNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id} className="file-node">
        <div
          className={cn(
            'flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-muted transition-colors text-sm',
            selectedFile === node.id && 'bg-muted text-primary font-medium',
            level > 0 && 'ml-4'
          )}
          style={{ paddingLeft: `${level * 8 + 8}px` }}
          onClick={() => !node.isFolder && handleFileSelect(node.id)}
        >
          {node.isFolder ? (
            <div 
              className="flex items-center grow"
              onClick={(e) => toggleFolder(node.id, e)}
            >
              <span className="mr-1 text-gray-500">
                {expandedFolders.has(node.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
              {expandedFolders.has(node.id) ? (
                <FolderOpen className="h-4 w-4 mr-2 text-blue-500" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-blue-500" />
              )}
              <span className="truncate">{node.title}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center grow">
                {renderFileIcon(node.type)}
                <span className="truncate">{node.title}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 ml-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => handleEdit(node.id, e as any)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => handleDownload(node.id, e as any)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      const newWindow = window.open(`/documents/${node.id}`, '_blank');
                      if (newWindow) newWindow.focus();
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive" 
                    onClick={(e) => handleDelete(node.id, e as any)}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
        
        {node.isFolder && expandedFolders.has(node.id) && node.children && node.children.length > 0 && (
          <div className="pl-4">
            {renderFileTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className={cn("file-explorer h-full flex flex-col border-r", className)}>
      {showToolbar && (
        <div className="file-explorer-toolbar p-2 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onCreateNew}
              title="Create New File"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-pulse text-muted-foreground">Loading files...</div>
            </div>
          ) : error ? (
            <div className="text-destructive p-2 text-sm">{error}</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-muted-foreground p-2 text-sm">
              {searchQuery ? 'No matching files found' : 'No files found'}
            </div>
          ) : (
            renderFileTree(filteredFiles)
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 