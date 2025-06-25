'use client';

import React, { useState, useEffect } from 'react';
import { Save, X, CheckCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MCPServerConfigFromUI, MCPTransport, MCPTransportStdio, MCPTransportSSE, ServerFormData, FormMCPTransport, FormMCPTransportStdio } from '../utils/serverTypes';
import { validateServerForm } from '../utils/serverValidation';
import { useServerActions } from '../hooks/useServerActions';

export interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (server: MCPServerConfigFromUI) => void;
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

const initialFormState: FormState = {
  name: '',
  displayName: '',
  enabled: true,
  transport: { type: 'stdio', command: '', env: '' },
  retries: 3,
};

export function AddServerModal({ isOpen, onClose, onSubmit, existingServers }: AddServerModalProps) {
  const actions = useServerActions();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormState);
      setFormError(null);
    }
  }, [isOpen]);

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
      id: crypto.randomUUID(), // Generate ID for new server
      name: formData.name,
      displayName: formData.displayName || formData.name,
      enabled: formData.enabled,
      transport: finalTransportConfig,
      retries: formData.retries,
      isEnvManaged: false, // New servers are not environment-managed
    };

    // For validation, create ServerFormData with the original form transport (before parsing)
    const serverDataForValidation: ServerFormData = {
      id: crypto.randomUUID(),
      name: formData.name,
      displayName: formData.displayName || formData.name,
      enabled: formData.enabled,
      transport: formData.transport, // Use original form transport for validation
      retries: formData.retries,
    };

    const validationResult = validateServerForm(serverDataForValidation, existingServers);
    if (!validationResult.isValid) {
      setFormError(validationResult.error || 'Validation failed. Please check the fields.');
      setIsSaving(false);
      return;
    }

    const result = await actions.addServer(serverDataToSubmit);
    setIsSaving(false);

    if (result.success && result.data) {
      onSubmit(result.data); // Pass the server data returned from API (might include backend-generated fields)
      onClose();
    } else {
      setFormError(result.error || 'Failed to add server. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New MCP Server</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Common Fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name (Key)
            </Label>
            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" placeholder="e.g., my-sabnzbd-server (unique key)" title="Unique identifier for the server (no spaces or special characters)." />
            {/* Specific field errors can be handled if validateServerForm returns detailed errors */}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="displayName" className="text-right">
              Display Name
            </Label>
            <Input id="displayName" name="displayName" value={formData.displayName || ''} onChange={handleInputChange} className="col-span-3" placeholder="e.g., SABnzbd Living Room" title="User-friendly name displayed in the UI." />
            {/* TODO: Add error display for displayName if validateServerForm provides it */}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="enabled" className="text-right">
              Enabled
            </Label>
            <Switch id="enabled" name="enabled" checked={formData.enabled} onCheckedChange={(checked) => handleSwitchChange(checked, 'enabled')} />
          </div>


          {/* Transport Type Selector */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="transportType" className="text-right">
              Transport Type
            </Label>
            <Select value={formData.transport.type} onValueChange={handleTransportTypeChange}>
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
                <Label htmlFor="command" className="text-right">
                  Command
                </Label>
                <Input id="command" name="command" value={(formData.transport as MCPTransportStdio).command || ''} onChange={handleTransportConfigChange} className="col-span-3" placeholder="e.g., /usr/bin/python or my-script.sh" title="The command to execute for STDIO transport." />
                {/* Specific field errors for transport */}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="args" className="text-right">
                  Arguments
                </Label>
                <Input id="args" name="args" value={(formData.transport as MCPTransportStdio)?.args?.join(' ') || ''} onChange={handleTransportConfigChange} className="col-span-3" placeholder="e.g., --port 8080 --host 0.0.0.0" title="Space-separated arguments for the command." />
                {/* Specific field errors for transport */}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cwd" className="text-right">
                  Working Dir
                </Label>
                <Input id="cwd" name="cwd" value={(formData.transport as MCPTransportStdio)?.cwd || ''} onChange={handleTransportConfigChange} className="col-span-3" placeholder="e.g., /opt/mcp-server (Optional)" title="Current working directory for the command (Optional)." />
                {/* Specific field errors for transport */}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="env" className="text-right">
                  Environment
                </Label>
                <Input id="env" name="env" value={(formData.transport as FormMCPTransportStdio)?.env || ''} onChange={handleTransportConfigChange} className="col-span-3" placeholder='e.g., {"API_KEY":"secret"}' title='Environment variables as a JSON string (e.g., {"KEY":"VALUE"}).' />
                {/* Specific field errors for transport */}
              </div>
            </>
          )}

          {/* SSE/HTTP Fields */}
          {(formData.transport.type === 'sse' || formData.transport.type === 'streamable-http') && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">
                  URL
                </Label>
                <Input id="url" name="url" value={(formData.transport as MCPTransportSSE).url || ''} onChange={handleTransportConfigChange} className="col-span-3" placeholder="e.g., http://localhost:8000/events" title="Full URL for SSE or HTTP stream endpoint." />
                {/* Specific field errors for transport */}
              </div>
              {/* TODO: Add headers field for SSE/HTTP if needed */}
            </>
          )}
        </div>
        {formError && <p className="w-full text-red-500 text-sm text-center py-2">{formError}</p>}
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="secondary" onClick={async () => {
            setIsTestingConnection(true);
            setFormError(null);
            // Construct a temporary server config from current form data for testing
            const tempServerConfig: MCPServerConfigFromUI = {
              id: 'test-connection-id',
              name: formData.name,
              displayName: formData.displayName || formData.name,
              enabled: formData.enabled,
              transport: { ...formData.transport } as MCPTransport,
              retries: formData.retries,
            };
            // Parse env for stdio if it's a string
            const transportStdio = tempServerConfig.transport as MCPTransportStdio;
            if (transportStdio.type === 'stdio' && typeof transportStdio.env === 'string') {
              try {
                const envString: string = transportStdio.env;
                if (envString.trim() === '') {
                  delete transportStdio.env;
                } else {
                  transportStdio.env = JSON.parse(envString);
                }
              } catch {
                // Error parsing JSON, formError and isTestingConnection set below
                // No need to use the error object 'e' itself
                setFormError('Environment variables are not valid JSON for testing.');
                setIsTestingConnection(false);
                return;
              }
            }
            // Basic validation before testing (name is required for display in toast)
            if (!tempServerConfig.name) {
                setFormError('Server Name (Key) is required to test connection.');
                setIsTestingConnection(false);
                return;
            }
            const testResult = await actions.testConnection(tempServerConfig);
            setIsTestingConnection(false);
            // Toast is handled by useServerActions, but we can set formError if specific modal feedback is needed
            if (!testResult.success) {
              // setFormError(testResult.error || 'Test connection failed from modal.');
            }
          }} disabled={isTestingConnection || isSaving}>
            {isTestingConnection ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Test Connection
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleRealSubmit} disabled={isSaving || isTestingConnection}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Add Server
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
