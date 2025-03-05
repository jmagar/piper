# MCP Configuration Editor

## Component Overview

The MCP Configuration Editor is a specialized component for editing the Model Context Protocol (MCP) configuration file (`llm_mcp_config.json5`). It provides a modern, reactive code editor with JSON5 syntax highlighting, formatting tools, and validation.

### Purpose and Functionality

This component allows users to:
- Edit the MCP configuration file with proper syntax highlighting
- Format JSON5 content for better readability
- Validate JSON5 syntax before saving
- View documentation and help about the configuration format
- Save changes to the configuration file
- Reset changes to the last saved state

### Use Cases

- Configuring which MCP servers are available to the application
- Setting up environment variables for MCP servers
- Configuring LLM model settings
- Defining example queries for the UI

## Component Interface

### MCPConfigEditor

The main editor component that provides the UI for editing the configuration.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialConfig` | `string` | `''` | Initial configuration content |
| `onSave` | `(config: string) => Promise<void>` | `undefined` | Callback for when config is saved |
| `className` | `string` | `''` | Additional CSS class names |

#### Events

- `onSave`: Triggered when the user clicks the Save button and the configuration is valid

### MCPConfigProvider

A context provider that handles loading and saving the configuration.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | Required | React children |

#### Context Values

| Value | Type | Description |
|-------|------|-------------|
| `config` | `string` | Current configuration content |
| `isLoading` | `boolean` | Whether the configuration is currently loading |
| `error` | `string \| null` | Error message if loading or saving failed |
| `saveConfig` | `(newConfig: string) => Promise<void>` | Function to save the configuration |
| `reloadConfig` | `() => Promise<void>` | Function to reload the configuration |

### JSON5Editor

A specialized editor for JSON5 files.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | Required | Current content value |
| `onChange` | `(value: string) => void` | Required | Callback for content changes |
| `showToolbar` | `boolean` | `true` | Whether to show the JSON5 toolbar |
| `height` | `string` | `'400px'` | Height of the editor |
| `theme` | `'light' \| 'dark'` | `'light'` | Theme name |

### JSON5Toolbar

A toolbar component for JSON5 editing with formatting buttons.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onAction` | `(type: string, customText?: string) => void` | Required | Callback for formatting actions |
| `className` | `string` | `undefined` | Optional CSS classes |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Toolbar orientation |

## Implementation Details

### Component Structure

The MCP Configuration Editor is composed of several components:

1. **MCPConfigEditor**: The main component that provides the UI for editing the configuration
2. **MCPConfigProvider**: A context provider that handles loading and saving the configuration
3. **JSON5Editor**: A specialized editor for JSON5 files
4. **JSON5Toolbar**: A toolbar component for JSON5 editing with formatting buttons

### State Management

The component uses React's useState and useEffect hooks for local state management:

- **config**: The current configuration content
- **originalConfig**: The last saved configuration content
- **isSaving**: Whether the configuration is currently being saved
- **error**: Error message if saving failed
- **activeTab**: The currently active tab (editor or help)

The MCPConfigProvider uses React's Context API to provide the configuration state to all child components.

### API Integration

The component integrates with the following API endpoints:

- **GET /api/mcp/config**: Retrieves the current configuration
- **POST /api/mcp/config**: Updates the configuration

## Usage Examples

### Basic Usage

```tsx
import { MCPConfigProvider } from "@/components/mcp/config/mcp-config-provider";
import { MCPConfigEditor } from "@/components/mcp/config/mcp-config-editor";

export function ConfigPage() {
  return (
    <MCPConfigProvider>
      <MCPConfigEditor />
    </MCPConfigProvider>
  );
}
```

### With Custom Save Handler

```tsx
import { MCPConfigEditor } from "@/components/mcp/config/mcp-config-editor";

export function CustomConfigEditor() {
  const [config, setConfig] = useState<string>('');
  
  const handleSave = async (newConfig: string) => {
    // Custom save logic
    await saveToCustomLocation(newConfig);
  };
  
  return (
    <MCPConfigEditor 
      initialConfig={config} 
      onSave={handleSave} 
    />
  );
}
```

## Styling and Variants

The component uses Tailwind CSS for styling and integrates with the project's color system using CSS variables with HSL values.

### Theme Support

The editor supports both light and dark themes, which can be set via the `theme` prop:

```tsx
<JSON5Editor 
  value={config} 
  onChange={setConfig} 
  theme="dark" 
/>
```

### Responsive Design

The component is fully responsive and adapts to different viewport sizes:

- On mobile devices, the editor takes up the full width
- The toolbar buttons are properly sized for touch interactions
- The editor height can be customized via the `height` prop

## Accessibility Features

The component implements the following accessibility features:

- Proper ARIA labels for all interactive elements
- Keyboard navigation for all buttons and tabs
- High contrast colors for better visibility
- Error messages are announced to screen readers
- Focus management for interactive elements

## Integration Points

### Backend Integration

The component integrates with the backend through the following API endpoints:

- **GET /api/mcp/config**: Retrieves the current configuration
- **POST /api/mcp/config**: Updates the configuration

These endpoints are implemented in `/frontend/app/api/mcp/config/route.ts`.

### Frontend Integration

The component is integrated into the MCP configuration page at `/frontend/app/mcp/config/page.tsx` and `/frontend/app/mcp/config/client.tsx`.

## Technical Considerations

### Performance Optimization

- The editor uses CodeMirror for efficient text editing
- State updates are batched to minimize re-renders
- The component only saves changes when the configuration has been modified

### Edge Cases and Limitations

- The component performs basic JSON5 syntax validation before saving
- Large configuration files may cause performance issues
- The component does not provide schema validation for the configuration

### Security Considerations

- The component does not expose sensitive information
- API endpoints should be properly secured with authentication
- Environment variables in the configuration are interpolated at runtime

## Maintenance and Future Enhancements

### Potential Improvements

- Add schema validation for the configuration
- Implement a more robust JSON5 formatter
- Add support for auto-completion of MCP server names and commands
- Implement a visual editor for MCP server configuration

### Known Issues

- The JSON5 syntax highlighting is based on JSON syntax highlighting, which may not highlight all JSON5 features correctly
- The component does not provide a way to restart MCP servers after configuration changes
