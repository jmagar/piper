"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  isPublic: boolean;
  isFavorited: boolean;
}

// Mock data for single prompt
const MOCK_PROMPT: PromptTemplate = {
  id: "prompt-1",
  title: "Document Summary",
  description: "Generates a concise summary of any uploaded document with key points highlighted.",
  content: "Summarize the following document. Extract key points and highlight important information: {document}",
  category: "Documentation",
  tags: ["summary", "document", "extraction"],
  createdAt: "2023-02-15T10:30:00Z",
  updatedAt: "2023-03-05T14:22:00Z",
  usageCount: 42,
  isPublic: true,
  isFavorited: true
};

const CATEGORIES = ["Documentation", "Development", "Productivity", "Data", "Customer Support", "Content", "Other"];

export default function EditPromptPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    content?: string;
    category?: string;
  }>({});

  useEffect(() => {
    // In a real app, this would fetch data from an API
    // For demo, we'll just use the mock data
    if (MOCK_PROMPT) {
      setTitle(MOCK_PROMPT.title);
      setDescription(MOCK_PROMPT.description);
      setContent(MOCK_PROMPT.content);
      setCategory(MOCK_PROMPT.category);
      setTags(MOCK_PROMPT.tags);
      setIsPublic(MOCK_PROMPT.isPublic);
      setIsLoading(false);
    }
  }, [params.id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    
    if (!content.trim()) {
      newErrors.content = "Prompt content is required";
    }
    
    if (!category) {
      newErrors.category = "Category is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTag = () => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTag("");
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please check the form for errors"
      });
      return;
    }
    
    // In a real app, this would send the data to an API
    toast({
      title: "Prompt updated",
      description: "Your prompt template has been updated successfully"
    });
    
    // Navigate back to prompt details
    router.push(`/chat/prompts/${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-xl">Loading prompt...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <Link href={`/chat/prompts/${params.id}`}>
          <Button variant="ghost" className="px-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Prompt Details
          </Button>
        </Link>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Edit Prompt Template</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Prompt Details</CardTitle>
            <CardDescription>
              Edit your prompt template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="title" className="text-sm font-medium">
                  Title <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-muted-foreground">Used {MOCK_PROMPT.usageCount} times</span>
              </div>
              <Input
                id="title"
                placeholder="E.g., Document Summarizer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="description"
                placeholder="Describe what this prompt does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={errors.description ? "border-red-500" : ""}
                rows={2}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Prompt Content <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="content"
                placeholder="Write your prompt here... Use {variable} for placeholders"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`font-mono ${errors.content ? "border-red-500" : ""}`}
                rows={8}
              />
              {errors.content && (
                <p className="text-sm text-red-500">{errors.content}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use curly braces to define variables, e.g., {"{document}"}, {"{code}"}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger fullWidth={false} className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="tags" className="text-sm font-medium">Tags</label>
                <div className="flex space-x-2">
                  <Input
                    id="tags"
                    placeholder="Add tags..."
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddTag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((t, i) => (
                      <Badge key={i} variant="secondary" className="px-2 py-1">
                        {t}
                        <button
                          type="button"
                          className="ml-1"
                          onClick={() => handleRemoveTag(t)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <label htmlFor="public" className="text-sm font-medium cursor-pointer">
                Make this prompt public
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/chat/prompts/${params.id}`)}
            >
              Cancel
            </Button>
            <Button type="submit">Update Prompt</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 