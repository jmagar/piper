'use client';

import { useState } from 'react';

import { PlusCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { McpService } from '../lib/api-client';

import type { Tool, ToolParameter} from '../lib/api-client';


interface McpToolFormProps {
  onSuccess?: (tool: Tool) => void;
  onError?: (error: string) => void;
}

export function McpToolForm({ onSuccess, onError }: McpToolFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Tool>>({
    name: '',
    description: '',
    type: 'system',
    parameters: [],
  });

  const [newParameter, setNewParameter] = useState<Partial<ToolParameter>>({
    name: '',
    type: '',
    description: '',
    required: false,
  });

  const handleAddParameter = () => {
    if (!newParameter.name || !newParameter.type) return;

    setFormData(prev => ({
      ...prev,
      parameters: [...(prev.parameters || []), newParameter],
    }));

    setNewParameter({
      name: '',
      type: '',
      description: '',
      required: false,
    });
  };

  const handleRemoveParameter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters?.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tool = await McpService.upsertTool({ requestBody: formData });
      setFormData({
        name: '',
        description: '',
        type: 'system',
        parameters: [],
      });
      onSuccess?.(tool);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to create tool');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Enter tool name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            placeholder="Enter tool description"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as Tool['type'] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tool type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="plugin">Plugin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label>Parameters</Label>
          
          <div className="space-y-4">
            {formData.parameters?.map((param, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border rounded-lg relative">
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={param.name} readOnly />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Input value={param.type} readOnly />
                    </div>
                  </div>
                  {param.description ? <div>
                      <Label>Description</Label>
                      <Input value={param.description} readOnly />
                    </div> : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemoveParameter(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="space-y-4 p-4 border rounded-lg border-dashed">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paramName">Parameter Name</Label>
                  <Input
                    id="paramName"
                    value={newParameter.name}
                    onChange={(e) => setNewParameter({ ...newParameter, name: e.target.value })}
                    placeholder="Enter parameter name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paramType">Parameter Type</Label>
                  <Input
                    id="paramType"
                    value={newParameter.type}
                    onChange={(e) => setNewParameter({ ...newParameter, type: e.target.value })}
                    placeholder="e.g., string, number, boolean"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paramDescription">Parameter Description</Label>
                <Input
                  id="paramDescription"
                  value={newParameter.description}
                  onChange={(e) => setNewParameter({ ...newParameter, description: e.target.value })}
                  placeholder="Enter parameter description"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="paramRequired"
                  checked={newParameter.required}
                  onChange={(e) => setNewParameter({ ...newParameter, required: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="paramRequired">Required</Label>
              </div>

              <Button
                type="button"
                onClick={handleAddParameter}
                disabled={!newParameter.name || !newParameter.type}
                className="w-full"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Parameter
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading || !formData.name || !formData.description || formData.parameters?.length === 0}>
        {loading ? 'Creating...' : 'Create Tool'}
      </Button>
    </form>
  );
} 