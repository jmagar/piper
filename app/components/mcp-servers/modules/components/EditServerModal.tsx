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

export interface EditServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (server: MCPServerConfigFromUI) => void;
  serverToEdit: MCPServerConfigFromUI | null; // Allow null for when no server is selected
  existingServers: MCPServerConfigFromUI[];
}

const getInitialFormState = (server: MCPServerConfigFromUI | null): Omit<MCPServerConfigFromUI, 'id'> & { transport: FormMCPTransport } => {
  if (!server) {
    return {
      name: '',
      displayName: '',
      enabled: true,
      transport: { type: 'stdio', command: '', env: '' },
    };
  }
  // Deep copy transport to avoid modifying the original object if it's just a string for env
  const transportCopy = JSON.parse(JSON.stringify(server.transport));
  if (transportCopy.type === 'stdio' && typeof transportCopy.env === 'object') {
    transportCopy.env = JSON.stringify(transportCopy.env);
  }

  return {
    name: server.name,
    displayName: server.displayName || '',
    enabled: server.enabled,
    transport: transportCopy,
  };
};

export function EditServerModal({ isOpen, onClose, onSubmit, serverToEdit, existingServers }: EditServerModalProps) {
  const actions = useServerActions();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [formData, setFormData] = useState<MCPServerConfigFromUI & { transport: FormMCPTransport }>({
    id: '', // Will be set in useEffect
    name: '',
    displayName: '',
    enabled: true,
    transport: { type: 'stdio', command: '', env: '' }, // Default transport
    isEnvManaged: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && serverToEdit) {
      const { transport, ...restOfServerToEdit } = serverToEdit;
      let initialFormTransport = transport as FormMCPTransport;

      if (initialFormTransport.type === 'stdio') {
        if (initialFormTransport.env && typeof initialFormTransport.env === 'object') {
          try {
            initialFormTransport = { ...initialFormTransport, env: JSON.stringify(initialFormTransport.env, null, 2) };
          } catch {
            initialFormTransport = { ...initialFormTransport, env: '' };
            setFormError('Failed to stringify existing environment variables.');
          }
        } else if (typeof initialFormTransport.env === 'undefined' || initialFormTransport.env === null) { // Handles undefined or null
          initialFormTransport = { ...initialFormTransport, env: '' };
        }
        // If it's already a string, it's fine (e.g. from a previous edit in the modal before saving)
      }

      setFormData({
        ...restOfServerToEdit,
        displayName: serverToEdit.displayName || '', // Ensure displayName is not undefined
        transport: initialFormTransport,
      } as MCPServerConfigFromUI & { transport: FormMCPTransport });
      setFormError(null);
    } else if (isOpen && !serverToEdit) {
      // Handle case where modal is opened without a server to edit (e.g. error or edge case)
      // Optionally close modal or show an error message
      const initialState = getInitialFormState(null);
      setFormData({
        id: '', // Provide empty id for consistency
        ...initialState,
      } as MCPServerConfigFromUI & { transport: FormMCPTransport }); // Reset to blank
    }
  }, [isOpen, serverToEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean, name: keyof ServerFormData) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleTransportTypeChange = (value: 'sse' | 'http' | 'stdio') => {
    let newTransportConf: FormMCPTransport;
    switch (value) {
      case 'sse':
        newTransportConf = { type: 'sse', url: (formData.transport as MCPTransportSSE)?.url || '' };
        break;
      case 'http':
        newTransportConf = { type: 'http', url: (formData.transport as MCPTransportSSE)?.url || '' };
        break;
      case 'stdio':
      default:
        newTransportConf = { type: 'stdio', command: (formData.transport as FormMCPTransportStdio)?.command || '', env: (formData.transport as FormMCPTransportStdio)?.env || '' };
        break;
    }
    setFormData((prev: MCPServerConfigFromUI & { transport: FormMCPTransport }) => ({ ...prev, transport: newTransportConf }));
  };

  const handleTransportConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const newTransport = { ...prev.transport };

      if (newTransport.type === 'stdio') {
        const stdioTransport = newTransport as FormMCPTransportStdio;
        if (name === 'args' && typeof value === 'string') {
          stdioTransport.args = value.split(' ').filter(arg => arg.trim() !== '');
        } else if (name === 'env') {
          stdioTransport.env = value; // env is already string in FormMCPTransportStdio
        } else if (name === 'command' || name === 'cwd') {
          if (name === 'command') stdioTransport.command = value;
          if (name === 'cwd') stdioTransport.cwd = value;
        }
      } else if ((newTransport.type === 'sse' || newTransport.type === 'http') && name === 'url') {
        (newTransport as MCPTransportSSE).url = value;
      }

      return { ...prev, transport: newTransport };
    });
  };

  const handleRealSubmit = async () => {
    setIsSaving(true);
    setFormError(null);

    if (!serverToEdit) {
      setFormError('No server selected for editing.');
      setIsSaving(false);
      return;
    }

    // Prepare data for validation and submission
    // Prepare transport config for validation and submission (parse env string)
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
      isEnvManaged: serverToEdit.isEnvManaged, // Preserve this flag
    };

    // For validation, create ServerFormData with the original form transport (before parsing)
    const serverDataForValidation: ServerFormData = {
      id: serverToEdit.id,
      name: formData.name,
      displayName: formData.displayName || formData.name, // Ensure it's a string
      enabled: formData.enabled,
      transport: formData.transport, // Use original form transport for validation
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
            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" placeholder="e.g., my-sabnzbd-server (unique key)" title="Unique identifier for the server (no spaces or special characters). This is read-only if the server is managed by environment variables." readOnly={serverToEdit?.isEnvManaged} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="displayName" className="text-right">Display Name</Label>
            <Input id="displayName" name="displayName" value={formData.displayName || ''} onChange={handleInputChange} className="col-span-3" placeholder="e.g., SABnzbd Living Room" title="User-friendly name displayed in the UI." readOnly={serverToEdit?.isEnvManaged} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="enabled" className="text-right">Enabled</Label>
            <Switch id="enabled" name="enabled" checked={formData.enabled} onCheckedChange={(checked) => handleSwitchChange(checked, 'enabled' as keyof ServerFormData)} disabled={serverToEdit?.isEnvManaged} />
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
                <SelectItem value="http">HTTP (Streamable)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* STDIO Fields */}
          {formData.transport.type === 'stdio' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="command" className="text-right">Command</Label>
                <Input id="command" name="command" value={(formData.transport as MCPTransportStdio).command || ''} onChange={handleTransportConfigChange} className="col-span-3" placeholder="e.g., /usr/bin/python or my-script.sh" title="The command to execute for STDIO transport." readOnly={serverToEdit?.isEnvManaged} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="args" className="text-right">Arguments</Label>
                <Input id="args" name="args" value={(formData.transport as MCPTransportStdio)?.args?.join(' ') || ''} onChange={handleTransportConfigChange} className="col-span-3" placeholder="e.g., --port 8080 --host 0.0.0.0" title="Space-separated arguments for the command." readOnly={serverToEdit?.isEnvManaged} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cwd" className="text-right">Working Dir</Label>
                <Input id="cwd" name="cwd" value={(formData.transport as MCPTransportStdio)?.cwd || ''} onChange={handleTransportConfigChange} className="col-span-3" placeholder="e.g., /opt/mcp-server (Optional)" title="Current working directory for the command (Optional)." readOnly={serverToEdit?.isEnvManaged} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="env" className="text-right">Environment</Label>
                <Input id="env" name="env" value={(formData.transport as MCPTransportStdio & { env: string })?.env || ''} onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    transport: {
                      ...prev.transport,
                      env: value, // Stored as string, will be parsed in handleSubmit
                    } as MCPTransport,
                  }));
                }} className="col-span-3" placeholder='e.g., {"API_KEY":"secret"}' title='Environment variables as a JSON string (e.g., {"KEY":"VALUE"}).' readOnly={serverToEdit?.isEnvManaged} />
              </div>
            </>
          )}

          {/* SSE/HTTP Fields */}
          {(formData.transport.type === 'sse' || formData.transport.type === 'http') && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">URL</Label>
                <Input id="url" name="url" value={(formData.transport as MCPTransportSSE).url || ''} onChange={handleTransportConfigChange} className="col-span-3" placeholder="e.g., http://localhost:8000/events" title="Full URL for SSE or HTTP stream endpoint." readOnly={serverToEdit?.isEnvManaged} />
              </div>
              {/* TODO: Add headers field for SSE/HTTP if needed */}
            </>
          )}
        </div>

        {formError && (
          <p className="text-sm text-red-500 px-1 py-2 text-center">{formError}</p>
        )}

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="secondary" onClick={async () => {
            if (!serverToEdit) return;
            setIsTestingConnection(true);
            setFormError(null);

            const tempServerConfig: MCPServerConfigFromUI = {
              id: serverToEdit.id,
              name: formData.name,
              displayName: formData.displayName || formData.name,
              enabled: formData.enabled,
              transport: JSON.parse(JSON.stringify(formData.transport)),
            };

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
                setFormError('Environment variables are not valid JSON for testing.');
                setIsTestingConnection(false);
                return;
              }
            }
            if (!tempServerConfig.name) {
                setFormError('Server Name (Key) is required to test connection.');
                setIsTestingConnection(false);
                return;
            }

            const testResult = await actions.testConnection(tempServerConfig);
            setIsTestingConnection(false);
            if (!testResult.success) {
              // setFormError(testResult.error || 'Test connection failed from modal.');
            }
          }} disabled={isTestingConnection || isSaving || serverToEdit?.isEnvManaged}>
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
            <Button type="button" onClick={handleRealSubmit} disabled={isSaving || isTestingConnection || serverToEdit?.isEnvManaged}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
