import React, { useState } from 'react';
import { VSCodeButton, VSCodeDivider, VSCodeBadge } from '@vscode/webview-ui-toolkit/react';
import { McpMarketplaceItem, McpServer } from '../../../../shared-mcp';
import { vscode } from '../../../lib/utils/vscode';

interface McpMarketplaceCardProps {
  item: McpMarketplaceItem;
  installedServers: McpServer[];
}

const McpMarketplaceCard: React.FC<McpMarketplaceCardProps> = ({ item, installedServers }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isInstalled = installedServers.some(server => server.name === item.mcpId);
  
  const handleDownload = () => {
    setIsDownloading(true);
    vscode.postMessage({
      type: 'downloadMcp',
      mcpId: item.mcpId
    });
    
    // Add a timeout to reset the downloading state if no response
    setTimeout(() => {
      setIsDownloading(false);
    }, 10000);
  };
  
  const handleViewDetails = () => {
    vscode.postMessage({
      type: 'viewMcpDetails',
      mcpId: item.mcpId
    });
  };
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        borderBottom: '1px solid var(--vscode-panel-border)',
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Icon/Logo */}
        <div
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'var(--vscode-badge-background)',
            borderRadius: '6px',
            flexShrink: 0,
          }}
        >
          {item.logoUrl ? (
            <img
              src={item.logoUrl}
              alt={item.name}
              style={{ width: '32px', height: '32px', objectFit: 'contain' }}
            />
          ) : (
            <div className={`codicon codicon-${item.codiconIcon || 'extensions'}`} style={{ fontSize: '24px' }} />
          )}
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.name}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {item.isRecommended && (
                <VSCodeBadge>Recommended</VSCodeBadge>
              )}
              <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                {item.downloadCount.toLocaleString()} downloads
              </div>
            </div>
          </div>
          
          <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
            by {item.author}
          </div>
          
          <div style={{ fontSize: '13px', marginTop: '4px' }}>{item.description}</div>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
              <span className="codicon codicon-star-full" style={{ fontSize: '12px', marginRight: '4px' }} />
              {item.githubStars}
            </div>
            
            <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
              <span className="codicon codicon-tag" style={{ fontSize: '12px', marginRight: '4px' }} />
              {item.category}
            </div>
            
            {item.requiresApiKey && (
              <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                <span className="codicon codicon-key" style={{ fontSize: '12px', marginRight: '4px' }} />
                Requires API Key
              </div>
            )}
          </div>
          
          {isExpanded && (
            <>
              <VSCodeDivider style={{ margin: '12px 0' }} />
              
              {item.readmeContent && (
                <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>README</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{item.readmeContent}</div>
                </div>
              )}
              
              {item.llmsInstallationContent && (
                <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Installation</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{item.llmsInstallationContent}</div>
                </div>
              )}
              
              <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Tags</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {item.tags.map(tag => (
                    <VSCodeBadge key={tag}>{tag}</VSCodeBadge>
                  ))}
                </div>
              </div>
            </>
          )}
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {isInstalled ? (
              <VSCodeButton disabled>Installed</VSCodeButton>
            ) : (
              <VSCodeButton
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? 'Downloading...' : 'Download'}
              </VSCodeButton>
            )}
            
            <VSCodeButton appearance="secondary" onClick={handleViewDetails}>
              Details
            </VSCodeButton>
            
            <VSCodeButton
              appearance="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Show less' : 'Show more'}
            >
              <span className={`codicon codicon-chevron-${isExpanded ? 'up' : 'down'}`} />
            </VSCodeButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default McpMarketplaceCard;
