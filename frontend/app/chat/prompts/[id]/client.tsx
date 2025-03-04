"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Star, Trash, Copy, MessageSquare } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

export interface PromptTemplate {
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

interface PromptDetailProps {
  prompt: PromptTemplate;
  promptId: string;
}

export function PromptDetail({ prompt: initialPrompt, promptId }: PromptDetailProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState<PromptTemplate>(initialPrompt);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt.content);
    toast({
      title: "Copied to clipboard",
      description: "Prompt content has been copied to your clipboard"
    });
  };

  const toggleFavorite = () => {
    setPrompt({
      ...prompt,
      isFavorited: !prompt.isFavorited
    });
    
    toast({
      title: prompt.isFavorited ? "Removed from favorites" : "Added to favorites",
      description: prompt.isFavorited 
        ? "Prompt has been removed from your favorites" 
        : "Prompt has been added to your favorites"
    });
  };

  const handleDelete = () => {
    // In a real app, this would call an API
    toast({
      title: "Prompt deleted",
      description: "The prompt has been permanently deleted"
    });
    
    setIsDeleteDialogOpen(false);
    router.push("/chat/prompts");
  };

  if (!prompt) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="mb-6">
          <Link href="/chat/prompts">
            <Button variant="ghost" className="px-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Prompts
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-xl font-semibold mb-2">Prompt Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The prompt you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/chat/prompts">
              <Button>Back to Prompts</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/chat/prompts">
          <Button variant="ghost" className="px-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Prompts
          </Button>
        </Link>
      </div>
      
      <div className="flex flex-col space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{prompt.title}</CardTitle>
                <CardDescription className="mt-2">{prompt.description}</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={toggleFavorite}
                >
                  <Star className={`h-5 w-5 ${prompt.isFavorited ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  <span className="sr-only">
                    {prompt.isFavorited ? "Remove from favorites" : "Add to favorites"}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/chat/prompts/${promptId}/edit`)}
                >
                  <Edit className="h-5 w-5" />
                  <span className="sr-only">Edit prompt</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash className="h-5 w-5" />
                  <span className="sr-only">Delete prompt</span>
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-4">
              {prompt.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {prompt.isPublic && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  Public
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Prompt Content</h3>
              <div className="bg-muted p-4 rounded-md font-mono text-sm whitespace-pre-wrap">
                {prompt.content}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={handleCopyPrompt}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy Content
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-medium text-muted-foreground">Category</h3>
                <p>{prompt.category}</p>
              </div>
              <div>
                <h3 className="font-medium text-muted-foreground">Usage Count</h3>
                <p>{prompt.usageCount} times</p>
              </div>
              <div>
                <h3 className="font-medium text-muted-foreground">Created</h3>
                <p>{formatDate(prompt.createdAt)}</p>
              </div>
              <div>
                <h3 className="font-medium text-muted-foreground">Last Updated</h3>
                <p>{formatDate(prompt.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button 
              className="w-full"
              onClick={() => router.push(`/chat/new?promptId=${prompt.id}`)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Use This Prompt in Chat
            </Button>
          </CardFooter>
        </Card>
      </div>
      
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
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 