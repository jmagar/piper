'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Save, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { MarkdownEditor } from '@/components/ui/markdown-editor'; // Will implement or use Textarea for now

// Type definitions
interface KnowledgeDocumentCreateRequest {
  title: string;
  content: string;
  collection: string;
  tags?: string[] | undefined;
  metadata?: Record<string, any> | undefined;
}

interface KnowledgeDocumentCreateResponse {
  id: string;
  status: string;
  message: string;
}

interface KnowledgeDocument {
  title: string;
  content: string;
  collection: string;
  tags?: string[];
}

interface KnowledgeDocumentCreatorProps {
  mode?: 'create' | 'edit';
  documentId?: string;
  initialData?: KnowledgeDocument;
}

export function KnowledgeDocumentCreator({ 
  mode = 'create', 
  documentId,
  initialData
}: KnowledgeDocumentCreatorProps = {}) {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<string>(mode === 'edit' ? 'editor' : 'editor');
  const [title, setTitle] = useState<string>(initialData?.title || '');
  const [content, setContent] = useState<string>(initialData?.content || '');
  const [collection, setCollection] = useState<string>(initialData?.collection || '');
  const [collections, setCollections] = useState<string[]>([]);
  const [newCollection, setNewCollection] = useState<string>('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [autoExtract, setAutoExtract] = useState<boolean>(true);

  // Fetch available collections on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch('/api/knowledge/collections');
        if (!response.ok) throw new Error('Failed to fetch collections');
        
        const data = await response.json();
        setCollections(data.collections || []);
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    };

    fetchCollections();
  }, []);

  // Handle adding a new tag
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  // Handle removing a tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle adding a new collection
  const handleAddCollection = () => {
    if (newCollection.trim() && !collections.includes(newCollection.trim())) {
      setCollections([...collections, newCollection.trim()]);
      setCollection(newCollection.trim());
      setNewCollection('');
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Make sure we're not setting undefined to a File | null state
      if (selectedFile) {
        setFile(selectedFile);
        // Split by dot and take all but the last element (extension)
        const fileNameParts = selectedFile.name.split('.');
        if (fileNameParts.length > 1) {
          // Remove the extension and join back if there were multiple dots
          fileNameParts.pop();
          setTitle(fileNameParts.join('.'));
        } else {
          setTitle(selectedFile.name);
        }
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    // Validate required fields
    if (!title.trim()) {
      setError('Title is required');
      setIsLoading(false);
      return;
    }
    
    if (!collection.trim()) {
      setError('Collection is required');
      setIsLoading(false);
      return;
    }
    
    if (!content.trim() && !file) {
      setError('Content or file is required');
      setIsLoading(false);
      return;
    }
    
    try {
      // If a file was selected, upload it first
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('collection', collection);
        
        if (tags.length > 0) {
          formData.append('tags', JSON.stringify(tags));
        }
        
        formData.append('auto_extract', autoExtract.toString());
        
        const uploadResponse = await fetch('/api/knowledge/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Failed to upload document');
        }
        
        const uploadResult = await uploadResponse.json();
        setSuccess('Document uploaded successfully!');
        
        // Redirect to the document view page
        setTimeout(() => {
          router.push(`/knowledge/document/${uploadResult.id}`);
        }, 1500);
        
        return;
      }
      
      // Otherwise, create a document from the content
      const documentData: KnowledgeDocumentCreateRequest = {
        title,
        content,
        collection,
        tags: tags.length > 0 ? tags : undefined,
      };
      
      const createResponse = await fetch('/api/knowledge/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData),
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create document');
      }
      
      const createResult: KnowledgeDocumentCreateResponse = await createResponse.json();
      setSuccess('Document created successfully!');
      
      // Redirect to the document view page
      setTimeout(() => {
        router.push(`/knowledge/document/${createResult.id}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error creating document:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Knowledge Document</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
              <TabsTrigger value="editor">Markdown Editor</TabsTrigger>
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Document title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="collection">Collection</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={collection} 
                      onValueChange={setCollection}
                    >
                      <SelectTrigger fullWidth={true} className="flex-1">
                        <SelectValue placeholder="Select or create a collection" />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        placeholder="New collection"
                        value={newCollection}
                        onChange={(e) => setNewCollection(e.target.value)}
                        className="w-40"
                      />
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={handleAddCollection}
                        disabled={!newCollection.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <TabsContent value="editor" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter document content in markdown format..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[300px]"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Upload Document</Label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {file ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB • {file.type || 'Unknown type'}
                        </p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setFile(null)}
                        >
                          Change File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Drag and drop a file, or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Supported formats: PDF, DOCX, TXT, MD, CSV, JSON
                          </p>
                        </div>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => document.getElementById('file')?.click()}
                        >
                          Select File
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="autoExtract" 
                    checked={autoExtract}
                    onCheckedChange={setAutoExtract}
                  />
                  <Label htmlFor="autoExtract">
                    Automatically extract content from file
                  </Label>
                </div>
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      placeholder="Add a tag and press Enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                    />
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="py-1">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                          <button
                            type="button"
                            className="ml-1 text-muted-foreground hover:text-foreground"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    {success}
                  </AlertDescription>
                </Alert>
              )}
              
              <CardFooter className="px-0 pb-0 pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full md:w-auto"
                >
                  {isLoading ? 'Processing...' : 'Create Document'}
                  {!isLoading && <Save className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}