'use client';

import React, { useState, useEffect } from 'react';
import { Save, X, CheckCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useServerActions } from '../hooks/useServerActions';
import { validateServerForm } from '../utils/serverValidation';
import { MCPServerConfigFromUI, FormMCPTransport, FormMCPTransportStdio, MCPTransportSSE, MCPTransportStdio, MCPTransport, ServerFormData } from '../utils/serverTypes';

export interface EditServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (server: MCPServerConfigFromUI) => void;
  serverToEdit: MCPServerConfigFromUI | null; // Allow null for when no server is selected
  existingServers: MCPServerConfigFromUI[];
}

// Form state type that uses FormMCPTransport for handling string env
type FormState = {
  name: string;
  displayName: string;
  enabled: boolean;
  transport: FormMCPTransport;
  retries: number;
};

const getInitialFormState = (server: MCPServerConfigFromUI | null): FormState => {
  if (!server) {
    return {
      name: '',
      displayName: '',
      enabled: true,
      transport: { type: 'stdio', command: '', env: '' },
      retries: 3,
    };
  }
  
  // Convert server transport to form transport (parse object env to string)
  let formTransport: FormMCPTransport;
  if (server.transport.type === 'stdio') {
    const stdioTransport = server.transport as MCPTransportStdio;
    formTransport = {
      type: 'stdio',
      command: stdioTransport.command,
      args: stdioTransport.args,
      cwd: stdioTransport.cwd,
      env: stdioTransport.env ? JSON.stringify(stdioTransport.env, null, 2) : '',
    };
  } else {
    formTransport = server.transport as MCPTransportSSE;
  }

  return {
    name: server.name,
    displayName: server.displayName || '',
    enabled: server.enabled,
    transport: formTransport,
    retries: server.retries,
  };
};

export function EditServerModal({ isOpen, onClose, onSubmit, serverToEdit, existingServers }: EditServerModalProps) {
  const actions = useServerActions();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [formData, setFormData] = useState<FormState>(getInitialFormState(null));
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormState(serverToEdit));
      setFormError(null);
    }
  }, [isOpen, serverToEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean, name: string) => {
    if (name === 'enabled') {
      setFormData(prev => ({ ...prev, enabled: checked }));
    }
  };

  const handleTransportTypeChange = (value: 'sse' | 'streamable-http' | 'stdio') => {
    let newTransportConf: FormMCPTransport;
    switch (value) {
      case 'sse':
        newTransportConf = { type: 'sse', url: (formData.transport as MCPTransportSSE)?.url || '' };
        break;
      case 'streamable-http':
        newTransportConf = { type: 'streamable-http', url: (formData.transport as MCPTransportSSE)?.url || '' };
        break;
      case 'stdio':
      default:
        newTransportConf = { type: 'stdio', command: (formData.transport as FormMCPTransportStdio)?.command || '', env: (formData.transport as FormMCPTransportStdio)?.env || '' };
        break;
    }
    setFormData(prev => ({ ...prev, transport: newTransportConf }));
  };

  const handleTransportConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue: string | string[] = value;
    if (name === 'args' && typeof value === 'string') {
      processedValue = value.split(' ').filter(arg => arg.trim() !== '');
    } else if (name === 'env' && typeof value === 'string') {
      processedValue = value;
    }
    const newTransport = { ...formData.transport };
    if (newTransport.type === 'stdio') {
      const stdioTransport = newTransport as FormMCPTransportStdio;
      if (name === 'args') {
        stdioTransport.args = processedValue as string[];
      } else if (name === 'env') {
        stdioTransport.env = processedValue as string;
      } else if (name === 'command' || name === 'cwd') {
        if (name === 'command') stdioTransport.command = processedValue as string;
        if (name === 'cwd') stdioTransport.cwd = processedValue as string;
      }
    } else if ((newTransport.type === 'sse' || newTransport.type === 'streamable-http') && name === 'url') {
      (newTransport as MCPTransportSSE).url = processedValue as string;
    }
    setFormData(prev => ({ ...prev, transport: newTransport }));
  };

  const handleRealSubmit = async () => {
    setIsSaving(true);
    setFormError(null);

    if (!serverToEdit) {
      setFormError('No server selected for editing.');
      setIsSaving(false);
      return;
    }

    // Convert FormMCPTransport to MCPTransport for submission
    let finalTransportConfig: MCPTransport;
    if (formData.transport.type === 'stdio') {
      const formStdioTransport = formData.transport as FormMCPTransportStdio;
      let parsedEnv: Record<string, string> | undefined;
      if (formStdioTransport.env && formStdioTransport.env.trim() !== '') {
        try {
          parsedEnv = JSON.parse(formStdioTransport.env);
        } catch /* istanbul ignore next */ {
          setFormError('Environment variables are not valid JSON.');
          setIsSaving(false);
          return;
        }
      }
      finalTransportConfig = {
        type: 'stdio',
        command: formStdioTransport.command,
        args: formStdioTransport.args,
        cwd: formStdioTransport.cwd,
        env: parsedEnv,
      };
    } else {
      finalTransportConfig = formData.transport as MCPTransportSSE;
    }

    const serverDataToSubmit: MCPServerConfigFromUI = {
      id: serverToEdit.id,
      name: formData.name,
      displayName: formData.displayName || formData.name,
      enabled: formData.enabled,
      transport: finalTransportConfig,
      retries: formData.retries,
      isEnvManaged: serverToEdit.isEnvManaged, // Preserve this flag
    };

    // For validation, create ServerFormData with the original form transport (before parsing)
    const serverDataForValidation: ServerFormData = {
      id: serverToEdit.id,
      name: formData.name,
      displayName: formData.displayName || formData.name,
      enabled: formData.enabled,
      transport: formData.transport, // Use original form transport for validation
      retries: formData.retries,
    };

    const validationResult = validateServerForm(serverDataForValidation, existingServers.filter(s => s.id !== serverToEdit.id));
    if (!validationResult.isValid) {
      setFormError(validationResult.error || 'Validation failed. Please check the fields.');
      setIsSaving(false);
      return;
    }

    const result = await actions.updateServer(serverDataToSubmit);
    setIsSaving(false);

    if (result.success && result.data) {
      onSubmit(result.data);
      onClose();
    } else {
      setFormError(result.error || 'Failed to update server. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit MCP Server</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Common Fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name (Key)</Label>
            <Input 
              id="name" 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange} 
              className="col-span-3" 
              placeholder="e.g., my-sabnzbd-server (unique key)" 
              title="Unique identifier for the server (no spaces or special characters). This is read-only if the server is managed by environment variables." 
              readOnly={serverToEdit?.isEnvManaged} 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="displayName" className="text-right">Display Name</Label>
            <Input 
              id="displayName" 
              name="displayName" 
              value={formData.displayName || ''} 
              onChange={handleInputChange} 
              className="col-span-3" 
              placeholder="e.g., SABnzbd Living Room" 
              title="User-friendly name displayed in the UI." 
              readOnly={serverToEdit?.isEnvManaged} 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="enabled" className="text-right">Enabled</Label>
            <Switch 
              id="enabled" 
              name="enabled" 
              checked={formData.enabled} 
              onCheckedChange={(checked) => handleSwitchChange(checked, 'enabled')} 
              disabled={serverToEdit?.isEnvManaged} 
            />
          </div>

          {/* Transport Type Selector */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="transportType" className="text-right">Transport Type</Label>
            <Select value={formData.transport.type} onValueChange={handleTransportTypeChange} disabled={serverToEdit?.isEnvManaged}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select transport type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stdio">STDIO</SelectItem>
                <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                <SelectItem value="streamable-http">HTTP (Streamable)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* STDIO Fields */}
          {formData.transport.type === 'stdio' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="command" className="text-right">Command</Label>
                <Input 
                  id="command" 
                  name="command" 
                  value={(formData.transport as FormMCPTransportStdio).command || ''} 
                  onChange={handleTransportConfigChange} 
                  className="col-span-3" 
                  placeholder="e.g., /usr/bin/python or my-script.sh" 
                  title="The command to execute for STDIO transport." 
                  readOnly={serverToEdit?.isEnvManaged} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="args" className="text-right">Arguments</Label>
                <Input 
                  id="args" 
                  name="args" 
                  value={(formData.transport as FormMCPTransportStdio)?.args?.join(' ') || ''} 
                  onChange={handleTransportConfigChange} 
                  className="col-span-3" 
                  placeholder="e.g., --port 8080 --host 0.0.0.0" 
                  title="Space-separated arguments for the command." 
                  readOnly={serverToEdit?.isEnvManaged} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cwd" className="text-right">Working Dir</Label>
                <Input 
                  id="cwd" 
                  name="cwd" 
                  value={(formData.transport as FormMCPTransportStdio)?.cwd || ''} 
                  onChange={handleTransportConfigChange} 
                  className="col-span-3" 
                  placeholder="e.g., /opt/mcp-server (Optional)" 
                  title="Current working directory for the command (Optional)." 
                  readOnly={serverToEdit?.isEnvManaged} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="env" className="text-right">Environment</Label>
                <Input 
                  id="env" 
                  name="env" 
                  value={(formData.transport as FormMCPTransportStdio)?.env || ''} 
                  onChange={handleTransportConfigChange} 
                  className="col-span-3" 
                  placeholder='e.g., {"API_KEY":"secret"}' 
                  title='Environment variables as a JSON string (e.g., {"KEY":"VALUE"}).' 
                  readOnly={serverToEdit?.isEnvManaged} 
                />
              </div>
            </>
          )}

          {/* SSE/HTTP Fields */}
          {(formData.transport.type === 'sse' || formData.transport.type === 'streamable-http') && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">URL</Label>
                <Input 
                  id="url" 
                  name="url" 
                  value={(formData.transport as MCPTransportSSE).url || ''} 
                  onChange={handleTransportConfigChange} 
                  className="col-span-3" 
                  placeholder="e.g., http://localhost:8000/events" 
                  title="Full URL for SSE or HTTP stream endpoint." 
                  readOnly={serverToEdit?.isEnvManaged} 
                />
              </div>
            </>
          )}
        </div>

        {formError && (
          <p className="text-sm text-red-500 px-1 py-2 text-center">{formError}</p>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRealSubmit}
            disabled={isSaving || isTestingConnection}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
