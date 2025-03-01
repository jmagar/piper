"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, MessageCircle, Terminal, Thermometer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { MCPConfig } from '../types';

interface LLMSettingsProps {
  config: MCPConfig;
  isEditing: boolean;
  updateLLMValue: (key: keyof MCPConfig['llm'], value: string | number) => void;
}

export const LLMSettings = ({ config, isEditing, updateLLMValue }: LLMSettingsProps) => {
  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label 
              htmlFor="model_provider" 
              className="text-base flex items-center gap-1.5"
            >
              <Terminal className="h-4 w-4 text-primary" />
              Provider
            </Label>
            <Input
              id="model_provider"
              value={config.llm.model_provider}
              onChange={(e) => updateLLMValue('model_provider', e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-3">
            <Label 
              htmlFor="model" 
              className="text-base flex items-center gap-1.5"
            >
              <Cpu className="h-4 w-4 text-primary" />
              Model
            </Label>
            <Input
              id="model"
              value={config.llm.model}
              onChange={(e) => updateLLMValue('model', e.target.value)}
              className="h-10"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <Label 
            htmlFor="temperature" 
            className="text-base flex items-center justify-between"
          >
            <div className="flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-primary" />
              <span>Temperature</span>
            </div>
            <Badge variant="outline" className="font-mono">{config.llm.temperature.toFixed(1)}</Badge>
          </Label>
          <Slider
            id="temperature"
            min={0}
            max={1}
            step={0.1}
            value={[config.llm.temperature]}
            onValueChange={(values: number[]) => updateLLMValue('temperature', values[0])}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Deterministic (0.0)</span>
            <span>Creative (1.0)</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <Label 
            htmlFor="max_tokens" 
            className="text-base flex items-center gap-1.5"
          >
            <MessageCircle className="h-4 w-4 text-primary" />
            Max Tokens
          </Label>
          <Input
            id="max_tokens"
            type="number"
            min={1}
            max={100000}
            value={config.llm.max_tokens}
            onChange={(e) => updateLLMValue('max_tokens', parseInt(e.target.value, 10))}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of tokens to generate in the response.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <motion.div 
        className="space-y-2 bg-muted/40 p-4 rounded-lg border border-border/40"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Terminal className="h-4 w-4 text-primary" />
          Provider
        </h3>
        <p className="text-base font-medium">{config.llm.model_provider}</p>
      </motion.div>
      <motion.div 
        className="space-y-2 bg-muted/40 p-4 rounded-lg border border-border/40"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Cpu className="h-4 w-4 text-primary" />
          Model
        </h3>
        <p className="text-base font-medium">{config.llm.model}</p>
      </motion.div>
      <motion.div 
        className="space-y-2 bg-muted/40 p-4 rounded-lg border border-border/40"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Thermometer className="h-4 w-4 text-primary" />
          Temperature
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-base font-medium">{config.llm.temperature}</p>
          <div className="w-full max-w-[140px] bg-muted h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full" 
              style={{ width: `${config.llm.temperature * 100}%` }}
            />
          </div>
        </div>
      </motion.div>
      <motion.div 
        className="space-y-2 bg-muted/40 p-4 rounded-lg border border-border/40"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-primary" />
          Max Tokens
        </h3>
        <p className="text-base font-medium">{config.llm.max_tokens}</p>
      </motion.div>
    </div>
  );
};
