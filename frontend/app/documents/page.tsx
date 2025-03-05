'use client';

import { useState, useEffect } from 'react';
import { useActionState, useOptimistic } from 'react';
import { toast } from 'sonner';
import { FileExplorerNode } from '@/lib/document-storage';
import { ConnectionTestResult } from '@/lib/connection-test';
import { MarkdownEditor } from '@/components/shared/markdown-editor/markdown-editor';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Check, 
  PlusCircle, 
  Save, 
  Trash2, 
  X 
} from 'lucide-react';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import { FileExplorer } from '@/components/shared/file-explorer/file-explorer';
import { ConnectionStatus } from '@/components/shared/system/connection-status';

// Document saving action using Action pattern
async function saveDocumentAction(state: any, formData: FormData) {
  const content = formData.get('content') as string;
  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const tags = formData.get('tags') as string;
  const path = formData.get('path') as string;
  const parentId = formData.get('parentId') as string;
  
  try {
    // Check if we have an ID (update existing) or not (create new)
    let response;
    if (id) {
      response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          metadata: {
            title,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            path,
            parentId: parentId || null,
          },
        }),
      });
    } else {
      response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          metadata: {
            title,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            path,
            parentId: parentId || null,
          },
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save document');
    }

    const document = await response.json();
    return { document, error: null };
  } catch (error) {
    console.error('Error saving document:', error);
    return { 
      document: null, 
      error: error instanceof Error ? error.message : 'Failed to save document' 
    };
  }
}

// Document loading action
async function loadDocumentAction(state: any, id: string) {
  try {
    const response = await fetch(`/api/documents/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to load document (${response.status})`);
    }
    
    const document = await response.json();
    return { document, error: null };
  } catch (error) {
    console.error('Error loading document:', error);
    return { 
      document: null, 
      error: error instanceof Error ? error.message : 'Failed to load document' 
    };
  }
}

// Document deletion action
async function deleteDocumentAction(state: any, id: string) {
  try {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete document');
    }
    
    const result = await response.json();
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete document' 
    };
  }
}

export default function DocumentsPage() {
  // Document state
  const [currentDocument, setCurrentDocument] = useState<any>(null);
  const [optimisticDocument, setOptimisticDocument] = useOptimistic(currentDocument);
  
  // Editor state
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  
  // System state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [validConnections, setValidConnections] = useState<boolean>(false);
  
  // Define actions using useActionState
  const [loadState, loadAction, isLoadPending] = useActionState(loadDocumentAction, { document: null, error: null });
  const [saveState, saveAction, isSavePending] = useActionState(saveDocumentAction, { document: null, error: null });
  const [deleteState, deleteAction, isDeletePending] = useActionState(deleteDocumentAction, { success: false, error: null });
  
  // Set theme based on system preference
  useEffect(() => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDarkMode ? 'dark' : 'light');
    
    // Listen for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Update the document when loaded
  useEffect(() => {
    if (loadState?.document) {
      setCurrentDocument(loadState.document);
      setContent(loadState.document.content);
      setTitle(loadState.document.metadata.title || '');
      setTags(loadState.document.metadata.tags || []);
      toast.success('Document loaded successfully');
    } else if (loadState?.error) {
      toast.error(`Error loading document: ${loadState.error}`);
    }
  }, [loadState]);
  
  // Handle save results
  useEffect(() => {
    if (saveState?.document) {
      setCurrentDocument(saveState.document);
      if (!currentDocument?.id) {
        // If it was a new document, update the URL without reload
        window.history.pushState({}, '', `/documents?id=${saveState.document.id}`);
      }
      toast.success('Document saved successfully');
    } else if (saveState?.error) {
      toast.error(`Error saving document: ${saveState.error}`);
    }
  }, [saveState, currentDocument?.id]);
  
  // Handle delete results
  useEffect(() => {
    if (deleteState?.success) {
      setCurrentDocument(null);
      setContent('');
      setTitle('');
      setTags([]);
      toast.success('Document deleted successfully');
      // Remove ID from URL
      window.history.pushState({}, '', `/documents`);
    } else if (deleteState?.error) {
      toast.error(`Error deleting document: ${deleteState.error}`);
    }
  }, [deleteState]);
  
  // Load document from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      loadAction(id);
    }
  }, [loadAction]);
  
  // Handle connection test results
  const handleConnectionTestComplete = (results: ConnectionTestResult[]) => {
    const allSuccessful = results.every(r => r.success);
    setValidConnections(allSuccessful);
    
    if (!allSuccessful) {
      const failedServices = results
        .filter(r => !r.success)
        .map(r => r.service)
        .join(', ');
      
      toast.error(`Connection issues with: ${failedServices}`);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (fileId: string) => {
    loadAction(fileId);
  };
  
  // Handle content changes
  const handleContentChange = (value: string) => {
    setContent(value);
    
    // Apply optimistic update
    if (currentDocument) {
      setOptimisticDocument({
        ...currentDocument,
        content: value,
      });
    }
  };
  
  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };
  
  // Add tag
  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };
  
  // Remove tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // Create a new document
  const createNewDocument = () => {
    setCurrentDocument(null);
    setContent('# New Document\n\nStart typing here...');
    setTitle('New Document');
    setTags([]);
    
    // Remove ID from URL
    window.history.pushState({}, '', `/documents`);
  };
  
  // Delete current document
  const handleDelete = () => {
    if (currentDocument?.id) {
      if (window.confirm('Are you sure you want to delete this document?')) {
        deleteAction(currentDocument.id);
      }
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* File Explorer */}
        <div className="w-full lg:w-1/4">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Files</h2>
                <Button 
                  size="sm" 
                  onClick={createNewDocument} 
                  className="gap-1"
                >
                  <PlusCircle className="h-4 w-4" /> New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="h-[calc(100vh-200px)] overflow-auto">
              <FileExplorer
                onFileSelect={handleFileSelect}
              />
            </CardContent>
            <CardFooter className="pt-2 border-t">
              <ConnectionStatus 
                autoTest={true} 
                onTestComplete={handleConnectionTestComplete}
              />
            </CardFooter>
          </Card>
        </div>
        
        {/* Editor */}
        <div className="w-full lg:w-3/4">
          <Card className="h-full">
            <form action={formData => saveAction(formData)}>
              <input type="hidden" name="id" value={currentDocument?.id || ''} />
              <input type="hidden" name="path" value={currentDocument?.metadata?.path || ''} />
              <input type="hidden" name="parentId" value={currentDocument?.metadata?.parentId || ''} />
              <input type="hidden" name="content" value={content} />
              <input type="hidden" name="tags" value={tags.join(',')} />
              
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row gap-2 justify-between items-start md:items-center">
                  <Input
                    name="title"
                    placeholder="Document Title"
                    value={title}
                    onChange={handleTitleChange}
                    className="text-xl font-bold flex-grow"
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="gap-1" 
                      disabled={isSavePending || !validConnections}
                    >
                      {isSavePending ? 'Saving...' : (
                        <>
                          <Save className="h-4 w-4" /> Save
                        </>
                      )}
                    </Button>
                    
                    {currentDocument?.id && (
                      <Button 
                        type="button"
                        variant="destructive" 
                        onClick={handleDelete}
                        disabled={isDeletePending}
                        className="gap-1"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Tags section */}
                <div className="mt-2">
                  <div className="flex gap-2 flex-wrap">
                    {tags.map(tag => (
                      <Badge key={tag} className="gap-1">
                        {tag}
                        <button 
                          type="button"
                          onClick={() => removeTag(tag)} 
                          className="ml-1 text-xs rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    
                    <div className="flex gap-1">
                      <Input
                        placeholder="Add tag"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="w-24 h-6 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="h-6 text-xs px-2"
                        onClick={addTag}
                      >
                        <PlusCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {/* Connection errors */}
              {!validConnections && (
                <div className="px-6">
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription>
                      Unable to connect to required services. Check your connection settings.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              {/* Load errors */}
              {loadState?.error && (
                <div className="px-6">
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Document Load Error</AlertTitle>
                    <AlertDescription>
                      {loadState.error}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              <Separator />
              
              <CardContent className="p-0 h-[calc(100vh-250px)]">
                <MarkdownEditor
                  value={content}
                  onChange={handleContentChange}
                  theme={theme}
                />
              </CardContent>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
} 