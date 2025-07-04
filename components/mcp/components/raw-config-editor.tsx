'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react'; // For loading spinner
import Editor, { OnChange, OnMount } from '@monaco-editor/react';
import { Button } from '@/components/ui/button'; // Assuming a Button component exists
import { toast } from 'sonner'; // Assuming sonner for notifications
import { mcpConfigJsonSchema } from '@/lib/schemas/mcp-config.schema';


// It's good practice to define types for props if this component were to accept any
// interface RawConfigEditorProps {}

const RawConfigEditor: React.FC = () => {
  console.log('[RawConfigEditor] Component mounted');
  const [configText, setConfigText] = useState<string>(''); // Initialize empty, will be filled by fetch or error
  const [parseError, setParseError] = useState<string | null>(null); // Initialize empty, will be filled by fetch or error
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const initialContentRef = useRef<string>('');

  useEffect(() => {
    console.log('[RawConfigEditor] Initial fetch effect triggered');
    const fetchConfig = async () => {
      console.log('[RawConfigEditor] Fetching MCP configuration...');
      setIsLoading(true);
      try {
        const response = await fetch('/api/mcp/config');
        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.statusText}`);
        }
        const data = await response.json();
        const fetchedContent = JSON.stringify(data, null, 2);
        setConfigText(fetchedContent);
        initialContentRef.current = fetchedContent; // Store initial content
        console.log('[RawConfigEditor] MCP configuration fetched successfully.');
        toast.success('MCP Config loaded successfully');
      } catch (error) {
        console.error('[RawConfigEditor] Error fetching MCP configuration', { error });
        const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching config';
        setConfigText(`// Error loading configuration:\n// ${errorMessage}`);
        toast.error(`Failed to load MCP Config: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();

    return () => {
      console.log('[RawConfigEditor] Component unmounted');
    };
  }, []);

  const handleSaveConfig = async () => {
    if (parseError) {
      toast.error(parseError); // Keep toast for explicit save attempt on error
      appLogger.warn(`[RawConfigEditor] Save attempt with invalid JSON: ${parseError}`);
      return;
    }
    if (configText.trim() === '') {
      toast.error('Cannot save empty configuration.');
      appLogger.warn('[RawConfigEditor] Save attempt with empty configuration.');
      return;
    }

    appLogger.info('[RawConfigEditor] Saving MCP configuration...');
    setIsSaving(true);
    try {
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(configText);
      } catch {
        toast.error('Invalid JSON format. Please correct before saving.');
        setIsSaving(false);
        return;
      }

      const response = await fetch('/api/mcp/config', {
        method: 'PUT', // Or POST, depending on API design for updates
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedConfig),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save config: ${response.statusText} - ${errorData}`);
      }
      initialContentRef.current = configText; // Update initial content to current saved content
      toast.success('MCP Config saved successfully');
      appLogger.info('[RawConfigEditor] MCP configuration saved successfully.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error saving config';
      toast.error(`Failed to save MCP Config: ${errorMessage}`);
      appLogger.error('[RawConfigEditor] Error saving MCP configuration', { error });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditorChange: OnChange = (value) => {
    appLogger.info('[RawConfigEditor] Editor content changed');
    const newText = value || '';
    setConfigText(newText);

    if (newText.trim() === '') {
      setParseError('JSON content cannot be empty.');
    } else {
      try {
        JSON.parse(newText);
        setParseError(null); // Clear error if JSON is valid
      } catch (_e) {
        if (_e instanceof Error) {
          appLogger.debug('[RawConfigEditor] JSON parsing error', { error: _e });
        } else {
          appLogger.debug('[RawConfigEditor] JSON parsing error. Non-Error object thrown', { error: _e });
        }
        // More specific error messages could be extracted from '_e' if desired
        setParseError('Invalid JSON format. Please check syntax.');
      }
    }
  };

  const handleEditorDidMount: OnMount = (_editor, monacoInstance) => {
    appLogger.info('[RawConfigEditor] Monaco editor mounted');
    // _editor.focus(); // Example usage of editor instance

    // Configure JSON language defaults for schema validation
    monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'piper://mcp-config-schema.json', // A unique URI for the schema
          fileMatch: ['*'], // Apply this schema to all JSON files in this editor instance
          schema: mcpConfigJsonSchema, // The schema object defined above
        },
      ],
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Loading configuration...</p>
      </div>
    );
  }

  const isSaveDisabled = isLoading || isSaving || configText === initialContentRef.current || !!parseError || !configText.trim();

  return (
    <div className="flex flex-col h-full w-full">
      
      {/* The DialogTitle in McpServersDashboard.tsx now serves as the header */}
      {/* <h2 className="text-xl font-semibold mb-4">Raw MCP Configuration Editor (config.json)</h2> */}
      <div className="flex-grow border rounded-md overflow-hidden">
        <Editor
          height="100%"
          language="json"
          value={configText}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{ minimap: { enabled: true }, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: 'on' }}
        />
      </div>
      {parseError && (
        <div className="mt-2 text-sm text-red-600 bg-red-100 border border-red-400 p-2 rounded-md">
          {parseError}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSaveConfig} disabled={isSaveDisabled}>
          {isSaving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </div>
    </div>
  );
};

export default RawConfigEditor;
