'use client';

import React, { useMemo, useState } from 'react';
import { 
  useServerStatus,
  useServerConfig, 
  useAutoRefresh,
  useServerFilters,
  useModalState,
  useServerActions,
  MergedServerData,
  MCPServerConfigFromUI, // Added this import
} from './modules';

import {
  DashboardHeader,
  ServerFilters,
  ServerGrid,
} from './modules/components';

import { AddServerModal } from './modules/components/AddServerModal';
import { EditServerModal } from './modules/components/EditServerModal';
import { DeleteServerModal } from './modules/components/DeleteServerModal';
import RawConfigEditor from './modules/components/RawConfigEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from '@/components/ui/dialog';

export function McpServersDashboard() {
  // Custom hooks for data management
  const { servers, isLoading, error, fetchServerStatus } = useServerStatus();
  const { 
    configServers, 
    isDirty, 
    isSaving, 
    saveConfiguration, 
    addServer, 
    toggleServerEnabled,
    updateServer,
    removeServer // Added for DeleteServerModal
  } = useServerConfig();

  // Auto-refresh functionality
  const { 
    isRefreshing, 
    autoRefresh, 
    lastUpdated, 
    isClient, 
    toggleAutoRefresh, 
    manualRefresh 
  } = useAutoRefresh({
    refreshFn: async () => {
      await Promise.all([fetchServerStatus()]);
    },
    intervalMs: 30000,
    enabled: true,
  });

  // Merge server status and config data
  const mergedServerData: MergedServerData[] = useMemo(() => {
    return servers.map(statusServer => {
      const configServer = configServers.find(config => config.name === statusServer.key);
      return {
        ...statusServer,
        configData: configServer,
        enabled: configServer?.enabled ?? true
      };
    });
  }, [servers, configServers]);

  // Filtering and search
  const {
    filters,
    filteredAndSortedServers,
    hasActiveFilters,
    setSearchQuery,
    setStatusFilter,
    setTransportFilter,
    setEnabledFilter,
    clearAllFilters,
  } = useServerFilters(mergedServerData);

  // Modal state management
  const {
    modalState,
    openAddModal,
    openEditModal,
    openDeleteModal,
    closeAddModal,
    closeEditModal,
    closeDeleteModal, // Now used
  } = useModalState();

  // Server actions
  const { 
    copyServerConfiguration, 
    duplicateServer, 
    testConnection 
  } = useServerActions();

  // State for Raw Config Editor Modal
  const [isRawEditorModalOpen, setIsRawEditorModalOpen] = useState(false);

  const openRawEditorModal = () => setIsRawEditorModalOpen(true);

  // Event handlers
  const handleToggleEnabled = (serverId: string) => {
    toggleServerEnabled(serverId);
  };

  const handleCopyConfig = (server: MergedServerData) => {
    if (server.configData) {
      copyServerConfiguration(server.configData);
    }
  };

  const handleDuplicate = (server: MergedServerData) => {
    if (server.configData) {
      duplicateServer(server.configData, addServer);
    }
  };

  const handleTestConnection = (server: MergedServerData) => {
    if (server.configData) {
      testConnection(server.configData);
    }
  };

  const handleEdit = (server: MergedServerData) => {
    if (server.configData) {
      openEditModal(server.configData);
    }
  };

  const handleDelete = (server: MergedServerData) => {
    if (server.configData) {
      openDeleteModal(server.configData);
    }
  };

  const handleAddServer = () => {
    openAddModal();
  };

  const handleAddServerSubmit = (newServer: MCPServerConfigFromUI) => {
    addServer(newServer);
    closeAddModal();
  };

  const handleUpdateServerSubmit = (updatedServer: MCPServerConfigFromUI) => {
    if (updatedServer.id) { // Ensure ID exists for update
      updateServer(updatedServer.id, updatedServer);
    }
    closeEditModal();
  };

  const handleDeleteServerConfirm = (serverId: string) => {
    removeServer(serverId);
    closeDeleteModal();
  };

  // Error state
  if (error) {
    return <p className="text-center text-red-500">Error: {error}</p>;
  }

  return (
    <div className="flex flex-col h-full p-1">
      {/* Header Controls */}
      <div className="space-y-4">
        <DashboardHeader
          servers={mergedServerData}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          autoRefresh={autoRefresh}
          isDirty={isDirty}
          isSaving={isSaving}
          onRefresh={manualRefresh}
          onToggleAutoRefresh={toggleAutoRefresh}
          onAddServer={handleAddServer}
          onSave={saveConfiguration}
          onOpenRawEditor={openRawEditorModal}
        />

        {/* Search and Filter Controls */}
        <ServerFilters
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onTransportFilterChange={setTransportFilter}
          onEnabledFilterChange={setEnabledFilter}
          onClearFilters={clearAllFilters}
        />
      </div>

      {/* Server Grid */}
      <ServerGrid
        servers={filteredAndSortedServers}
        isClient={isClient}
        isLoading={isLoading}
        totalServersCount={mergedServerData.length}
        onToggleEnabled={handleToggleEnabled}
        onCopyConfig={handleCopyConfig}
        onDuplicate={handleDuplicate}
        onTestConnection={handleTestConnection}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modals */}
      {modalState.isAddModalOpen && (
        <AddServerModal 
          isOpen={modalState.isAddModalOpen}
          onClose={closeAddModal}
          onSubmit={handleAddServerSubmit}
          existingServers={configServers}
        />
      )}
      
      {modalState.isEditModalOpen && modalState.editingServer && (
        <EditServerModal
          isOpen={modalState.isEditModalOpen}
          serverToEdit={modalState.editingServer}
          onClose={closeEditModal}
          onSubmit={handleUpdateServerSubmit}
          existingServers={configServers}
        />
      )}
      
      {modalState.isDeleteModalOpen && modalState.deletingServer && (
        <DeleteServerModal
          isOpen={modalState.isDeleteModalOpen}
          serverToDelete={modalState.deletingServer}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteServerConfirm}
        />
      )}

      {/* Raw Config Editor Modal */}
      {isRawEditorModalOpen && (
        <Dialog open={isRawEditorModalOpen} onOpenChange={setIsRawEditorModalOpen}>
          <DialogPortal>
            <DialogOverlay />
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
              <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
                <DialogTitle>Raw MCP Configuration Editor</DialogTitle>
              </DialogHeader>
              <div className="flex-grow overflow-auto p-4 pt-2 sm:p-6 sm:pt-2">
                <RawConfigEditor />
              </div>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      )}
    </div>
  );
} 