"use client";

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle, MessageCircle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MCPConfig } from '../types';
import { listItemVariants } from '../animations';

interface ExampleQueriesProps {
  config: MCPConfig;
  isEditing: boolean;
  addExampleQuery: (query: string) => void;
  removeExampleQuery: (index: number) => void;
}

export const ExampleQueries = ({ 
  config, 
  isEditing, 
  addExampleQuery, 
  removeExampleQuery 
}: ExampleQueriesProps) => {
  const [newQuery, setNewQuery] = useState<string>('');

  const handleAddQuery = () => {
    if (newQuery.trim()) {
      addExampleQuery(newQuery);
      setNewQuery('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-primary" />
          Example Queries
        </h3>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>These queries serve as examples for users interacting with the LLM</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {isEditing && (
        <div className="flex space-x-2 mb-4">
          <Input
            placeholder="Add a new example query"
            value={newQuery}
            onChange={(e) => setNewQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddQuery()}
            className="h-10 flex-1"
          />
          <Button onClick={handleAddQuery} className="h-10 px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <ul className="space-y-3">
        <AnimatePresence>
          {config.example_queries.map((query, index) => (
            <motion.li 
              key={index}
              custom={index}
              variants={listItemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="p-3 bg-muted/40 rounded-lg text-sm flex justify-between items-center border border-border/40 group"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{query}</span>
              </div>
              {isEditing && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeExampleQuery(index)}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
        
        {config.example_queries.length === 0 && (
          <li className="p-6 bg-muted/40 rounded-lg text-sm flex flex-col items-center justify-center border border-border/40 text-muted-foreground">
            <MessageCircle className="h-6 w-6 mb-2" />
            <p>No example queries added yet</p>
            {isEditing && (
              <p className="text-xs mt-1">Add some queries to help users get started</p>
            )}
          </li>
        )}
      </ul>
    </div>
  );
};
