import React from 'react';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { vscode } from '../../../lib/utils/vscode';

const McpSubmitCard: React.FC = () => {
  const handleSubmitClick = () => {
    vscode.postMessage({ type: 'openExternalUrl', url: 'https://github.com/cline/mcp-marketplace/blob/main/CONTRIBUTING.md' });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        gap: '12px',
        alignItems: 'center',
        textAlign: 'center',
        borderBottom: '1px solid var(--vscode-panel-border)',
      }}
    >
      <div className="codicon codicon-github" style={{ fontSize: '32px' }} />
      
      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
        Submit your own MCP server
      </div>
      
      <div style={{ fontSize: '13px', maxWidth: '500px' }}>
        Have you created an MCP server that you'd like to share with the community?
        Submit it to the marketplace to help others extend their AI capabilities.
      </div>
      
      <VSCodeButton onClick={handleSubmitClick}>
        <span className="codicon codicon-github" style={{ marginRight: '6px' }} />
        Submit to Marketplace
      </VSCodeButton>
    </div>
  );
};

export default McpSubmitCard;
