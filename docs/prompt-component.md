# Prompt Template Management System
_Last Updated: March 10, 2024 3:15 PM EST_

## Overview

The Prompt Template Management System provides a comprehensive interface for creating, editing, browsing, and managing prompt templates. It allows users to save frequently used prompts, categorize them with tags, mark favorites, and track usage statistics for optimizing workflow.

## Resources Used

- [Next.js App Router](https://nextjs.org/docs/app): Used for routing and page structure
- [Lucide React](https://lucide.dev/): Icon library for UI elements
- [shadcn/ui](https://ui.shadcn.com/): Component library for UI elements like Cards, Dialogs, and Dropdowns
- [React Hook Form](https://react-hook-form.com/): Form handling for creating and editing prompts

## Problem

Users frequently need to reuse similar prompts when interacting with AI systems. Without a system to save and organize these prompts:

- Users waste time rewriting similar prompts
- There's no consistency between similar prompt uses
- Users can't easily share useful prompts with others
- It's difficult to track which prompts are most effective

## Solution

The Prompt Template Management System addresses these issues through:

1. A comprehensive browsing interface with sorting, filtering, and search
2. Creation and editing workflows with proper validation
3. Organization features including tagging, categories, and favoriting
4. Usage tracking to identify the most valuable prompts

## Implementation Details

### 1. Prompt Template Browsing

The `PromptsPage` component provides a feature-rich interface for browsing and managing prompt templates, including search, filtering, and sorting functionality.

```typescript
// frontend/app/chat/prompts/page.tsx
"use client";

import React, { useState } from "react";
import { PlusIcon, SearchIcon, TagIcon, BookmarkIcon, ClockIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Component implementation with search, filtering and management features
export default function PromptsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [promptIdToDelete, setPromptIdToDelete] = useState<string | null>(null);

  // Handler functions for search, filtering, favorite toggling, and deletion
  
  return (
    <div className="container mx-auto py-6">
      {/* Search, filtering, and prompt template cards */}
    </div>
  );
}
```

### 2. Prompt Display Component

The `PromptCards` component (aliased as `Prompts` for use in the dashboard) displays prompt templates in card format with usage statistics.

```typescript
// frontend/components/dashboard/prompts.tsx
"use client";

import Link from "next/link";
import { CopyIcon, PlusIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

export function PromptCards() {
  const handleCopy = () => {
    // Copy prompt implementation
    toast({
      title: "Prompt copied",
      description: "Prompt template has been copied to clipboard"
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with title and create button */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Prompt template cards */}
      </div>
    </div>
  );
}

// Export PromptCards as Prompts for backward compatibility
export const Prompts = PromptCards;
```

### 3. Prompt Creation Interface

The Prompt Creation page provides a form for adding new prompt templates with fields for title, description, content, category, tags, and visibility settings.

```typescript
// frontend/app/chat/prompts/create/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

export default function CreatePromptPage() {
  // Form state management
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  
  // Form validation and submission handlers
  
  return (
    <div className="container mx-auto py-6">
      {/* Form with fields for prompt creation */}
    </div>
  );
}
```

### 4. Prompt Editing Interface

The Prompt Edit page allows users to modify existing prompt templates with pre-populated form fields.

```typescript
// frontend/app/chat/prompts/[id]/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

export default function EditPromptPage() {
  // Get the prompt ID from the URL
  const params = useParams();
  const promptId = params.id as string;
  
  // Form state and data fetching implementation
  
  return (
    <div className="container mx-auto py-6">
      {/* Form with pre-populated fields for prompt editing */}
    </div>
  );
}
```

## API Reference

### PromptTemplate Interface

```typescript
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
```

### PromptsPage Component

- **Description**: Main browsing interface for prompt templates
- **Route**: `/chat/prompts`
- **Features**:
  - Search by title, description, or tags
  - Filter by public/private and favorites
  - Sort by creation date, usage count, or title
  - Actions: use, edit, delete, and toggle favorite

### CreatePromptPage Component

- **Description**: Form interface for creating new prompt templates
- **Route**: `/chat/prompts/create`
- **Features**:
  - Field validation for required inputs
  - Tag management with add/remove functionality
  - Public/private visibility toggle
  - Preview capability

### EditPromptPage Component

- **Description**: Form interface for editing existing prompt templates
- **Route**: `/chat/prompts/[id]/edit`
- **Features**:
  - Pre-populated form with existing prompt data
  - Same validation and functionality as the create form
  - Option to delete the prompt

### PromptCards/Prompts Component

- **Description**: Reusable component for displaying prompt templates in card format
- **Props**:
  - `limit?: number` - Maximum number of prompts to display (default: 5)
  - `compact?: boolean` - When true, displays a compact version (default: false)

## Technical Details

### Form Validation

The prompt creation and editing forms implement client-side validation:

```typescript
const validateForm = () => {
  let isValid = true;
  
  if (!title.trim()) {
    setTitleError("Title is required");
    isValid = false;
  }
  
  if (!content.trim()) {
    setContentError("Content is required");
    isValid = false;
  }
  
  if (!category.trim()) {
    setCategoryError("Category is required");
    isValid = false;
  }
  
  return isValid;
};
```

### Tag Management

The tag management system allows users to add and remove tags:

```typescript
const addTag = () => {
  const trimmedTag = currentTag.trim();
  if (trimmedTag && !tags.includes(trimmedTag)) {
    setTags([...tags, trimmedTag]);
    setCurrentTag("");
  }
};

const removeTag = (tagToRemove: string) => {
  setTags(tags.filter(tag => tag !== tagToRemove));
};
```

## Benefits

1. **Improved Productivity**: Users can save time by reusing prompt templates instead of rewriting prompts
2. **Consistent Results**: Using standardized prompts leads to more consistent AI responses
3. **Knowledge Sharing**: Public prompts enable collaboration and sharing of effective prompts
4. **Organized Workflow**: Categorization, tagging, and favorites help organize prompts for easier access
5. **Optimization**: Usage statistics help identify the most valuable prompt patterns

## Future Enhancements

1. Implement prompt versioning to track changes over time
2. Add a commenting system for collaborative improvement of prompts
3. Create prompt collections for grouping related prompts
4. Add AI-assisted prompt improvement suggestions
5. Implement prompt template variables for more dynamic prompt generation
6. Develop prompt effectiveness metrics beyond simple usage count 