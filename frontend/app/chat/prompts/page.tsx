"use client";

import React, { useState } from "react";
import { PlusIcon, SearchIcon, TagIcon, BookmarkIcon, ClockIcon, StarIcon, CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Mock data for demonstration
const MOCK_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "prompt-1",
    title: "Document Summary",
    description: "Generates a concise summary of any uploaded document with key points highlighted.",
    content: "Summarize the following document. Extract key points and highlight important information: {{document}}",
    category: "Documentation",
    tags: ["summary", "document", "extraction"],
    createdAt: "2023-02-15T10:30:00Z",
    updatedAt: "2023-03-05T14:22:00Z",
    usageCount: 42,
    isPublic: true,
    isFavorited: true
  },
  {
    id: "prompt-2",
    title: "Code Review",
    description: "Analyzes code for bugs, performance issues, and suggests improvements.",
    content: "Review the following code and provide feedback on: 1) Potential bugs 2) Performance issues 3) Improvement suggestions 4) Best practices compliance\n\n```{{language}}\n{{code}}\n```",
    category: "Development",
    tags: ["code", "review", "development"],
    createdAt: "2023-02-20T09:15:00Z",
    updatedAt: "2023-03-10T11:45:00Z",
    usageCount: 37,
    isPublic: true,
    isFavorited: false
  },
  {
    id: "prompt-3",
    title: "Meeting Notes",
    description: "Converts audio transcripts into structured meeting notes with action items.",
    content: "Convert the following meeting transcript into structured notes with: 1) Key discussion points 2) Decisions made 3) Action items with assignees 4) Follow-up questions\n\n{{transcript}}",
    category: "Productivity",
    tags: ["meeting", "transcription", "notes"],
    createdAt: "2023-02-18T15:20:00Z",
    updatedAt: "2023-03-08T16:30:00Z",
    usageCount: 28,
    isPublic: false,
    isFavorited: true
  },
  {
    id: "prompt-4",
    title: "Data Analysis",
    description: "Performs statistical analysis on CSV data and generates insights.",
    content: "Analyze the following CSV data. Provide statistical summary, identify trends, and suggest insights:\n\n{{data}}",
    category: "Data",
    tags: ["data", "analysis", "statistics"],
    createdAt: "2023-02-10T11:45:00Z",
    updatedAt: "2023-03-01T13:20:00Z",
    usageCount: 19,
    isPublic: false,
    isFavorited: false
  },
  {
    id: "prompt-5",
    title: "Customer Email Response",
    description: "Generates professional responses to customer inquiries.",
    content: "Generate a professional, helpful response to the following customer email. Maintain a friendly tone and address all their questions:\n\n{{email}}",
    category: "Customer Support",
    tags: ["email", "customer", "support"],
    createdAt: "2023-02-25T14:30:00Z",
    updatedAt: "2023-03-12T09:15:00Z",
    usageCount: 56,
    isPublic: true,
    isFavorited: true
  },
  {
    id: "prompt-6",
    title: "Blog Post Outline",
    description: "Creates structured outlines for blog posts on any topic.",
    content: "Create a detailed outline for a blog post about {{topic}}. Include: 1) Attention-grabbing introduction 2) 3-5 main sections with subsections 3) Conclusion with call-to-action 4) SEO keywords to target",
    category: "Content",
    tags: ["blog", "writing", "outline"],
    createdAt: "2023-02-13T10:00:00Z",
    updatedAt: "2023-03-07T11:30:00Z",
    usageCount: 31,
    isPublic: true,
    isFavorited: false
  }
];

const CATEGORIES = ["All", "Documentation", "Development", "Productivity", "Data", "Customer Support", "Content"];
const SORT_OPTIONS = ["Most Used", "Recently Updated", "Alphabetical", "Recently Created"];

export default function PromptsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Recently Updated");
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleFavorite = (id: string) => {
    // In a real app, this would call an API to toggle the favorite status
    toast({
      title: "Prompt favorited",
      description: "Prompt has been added to your favorites"
    });
  };

  const handleDeletePrompt = (id: string) => {
    setPromptToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    // In a real app, this would call an API to delete the prompt
    toast({
      title: "Prompt deleted",
      description: "Prompt has been permanently deleted"
    });
    setIsDeleteDialogOpen(false);
    setPromptToDelete(null);
  };

  const filteredPrompts = MOCK_PROMPT_TEMPLATES.filter(prompt => {
    const matchesSearch = 
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || prompt.category === selectedCategory;
    const matchesPublic = showPublicOnly ? prompt.isPublic : true;
    const matchesFavorites = showFavoritesOnly ? prompt.isFavorited : true;
    
    return matchesSearch && matchesCategory && matchesPublic && matchesFavorites;
  });

  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    switch (sortBy) {
      case "Most Used":
        return b.usageCount - a.usageCount;
      case "Recently Updated":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "Alphabetical":
        return a.title.localeCompare(b.title);
      case "Recently Created":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prompt Templates</h1>
          <p className="text-muted-foreground">Create and manage your AI prompt templates</p>
        </div>
        <Link href="/chat/prompts/create">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Prompt
          </Button>
        </Link>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            className="pl-10"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]" fullWidth={false}>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]" fullWidth={false}>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex space-x-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="show-public" 
            checked={showPublicOnly} 
            onCheckedChange={() => setShowPublicOnly(!showPublicOnly)} 
          />
          <label htmlFor="show-public" className="text-sm font-medium leading-none cursor-pointer">
            Public only
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="show-favorites" 
            checked={showFavoritesOnly} 
            onCheckedChange={() => setShowFavoritesOnly(!showFavoritesOnly)} 
          />
          <label htmlFor="show-favorites" className="text-sm font-medium leading-none cursor-pointer">
            Favorites only
          </label>
        </div>
      </div>

      <Tabs defaultValue="grid" className="space-y-4">
        <div className="flex justify-end">
          <TabsList>
            <TabsTrigger value="grid" className="flex items-center">
              <div className="grid grid-cols-2 gap-1 h-4 w-4">
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
              </div>
              <span className="sr-only">Grid view</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center">
              <div className="flex flex-col gap-1 h-4 w-4">
                <div className="bg-current h-[2px] w-full rounded-sm"></div>
                <div className="bg-current h-[2px] w-full rounded-sm"></div>
                <div className="bg-current h-[2px] w-full rounded-sm"></div>
              </div>
              <span className="sr-only">List view</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="grid" className="mt-0">
          {sortedPrompts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPrompts.map((prompt) => (
                <Card key={prompt.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-medium">{prompt.title}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(prompt.id)}
                      >
                        <StarIcon 
                          className={`h-4 w-4 ${prompt.isFavorited ? "fill-yellow-400 text-yellow-400" : ""}`} 
                        />
                        <span className="sr-only">
                          {prompt.isFavorited ? "Remove from favorites" : "Add to favorites"}
                        </span>
                      </Button>
                    </div>
                    <CardDescription className="line-clamp-2 h-10">
                      {prompt.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {prompt.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <ClockIcon className="mr-1 h-3 w-3" />
                        <span>Updated {formatDate(prompt.updatedAt)}</span>
                      </div>
                      <div className="flex items-center">
                        {prompt.isPublic ? (
                          <Badge variant="outline" className="text-xs px-1 border-green-500 text-green-600">
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-1">
                            Private
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between pt-0">
                    <div className="text-xs text-muted-foreground">
                      Used {prompt.usageCount} times
                    </div>
                    <div className="flex space-x-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/chat/new?promptId=${prompt.id}`)}>
                            Use in Chat
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/chat/prompts/${prompt.id}`)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/chat/prompts/${prompt.id}/edit`)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeletePrompt(prompt.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <BookmarkIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No prompts found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="list">
          {sortedPrompts.length > 0 ? (
            <div className="rounded-md border">
              <div className="divide-y">
                {sortedPrompts.map((prompt) => (
                  <div key={prompt.id} className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h3 className="text-sm font-medium truncate mr-2">{prompt.title}</h3>
                        {prompt.isFavorited && (
                          <StarIcon className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        )}
                        {prompt.isPublic && (
                          <Badge variant="outline" className="ml-2 text-xs px-1 border-green-500 text-green-600">
                            Public
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        <TagIcon className="h-3 w-3 text-muted-foreground mr-1" />
                        <div className="flex flex-wrap gap-1">
                          {prompt.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs text-muted-foreground">
                              {tag}{prompt.tags.indexOf(tag) < Math.min(2, prompt.tags.length - 1) ? "," : ""}
                            </span>
                          ))}
                          {prompt.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{prompt.tags.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center ml-4 space-x-2">
                      <div className="hidden md:block text-xs text-muted-foreground">
                        Used {prompt.usageCount} times
                      </div>
                      <div className="hidden md:block text-xs text-muted-foreground">
                        Updated {formatDate(prompt.updatedAt)}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/chat/new?promptId=${prompt.id}`)}
                      >
                        Use
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <span className="sr-only">Open menu</span>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8.625 2.5C8.625 3.12132 8.12132 3.625 7.5 3.625C6.87868 3.625 6.375 3.12132 6.375 2.5C6.375 1.87868 6.87868 1.375 7.5 1.375C8.12132 1.375 8.625 1.87868 8.625 2.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM7.5 13.625C8.12132 13.625 8.625 13.1213 8.625 12.5C8.625 11.8787 8.12132 11.375 7.5 11.375C6.87868 11.375 6.375 11.8787 6.375 12.5C6.375 13.1213 6.87868 13.625 7.5 13.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/chat/prompts/${prompt.id}`)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/chat/prompts/${prompt.id}/edit`)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleFavorite(prompt.id)}>
                            {prompt.isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeletePrompt(prompt.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <BookmarkIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No prompts found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prompt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this prompt template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 