import { useState, useCallback } from 'react';
import { MCPServerConfigFromUI, ModalState } from '../utils/serverTypes';

export interface UseModalStateReturn {
  modalState: ModalState;
  openAddModal: () => void;
  openEditModal: (server: MCPServerConfigFromUI) => void;
  openDeleteModal: (server: MCPServerConfigFromUI) => void;
  closeAllModals: () => void;
  closeAddModal: () => void;
  closeEditModal: () => void;
  closeDeleteModal: () => void;
}

const initialModalState: ModalState = {
  isAddModalOpen: false,
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  editingServer: null,
  deletingServer: null,
};

/**
 * Custom hook for managing modal states
 */
export const useModalState = (): UseModalStateReturn => {
  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  const openAddModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isAddModalOpen: true,
    }));
  }, []);

  const openEditModal = useCallback((server: MCPServerConfigFromUI) => {
    setModalState(prev => ({
      ...prev,
      isEditModalOpen: true,
      editingServer: server,
    }));
  }, []);

  const openDeleteModal = useCallback((server: MCPServerConfigFromUI) => {
    setModalState(prev => ({
      ...prev,
      isDeleteModalOpen: true,
      deletingServer: server,
    }));
  }, []);

  const closeAddModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isAddModalOpen: false,
    }));
  }, []);

  const closeEditModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isEditModalOpen: false,
      editingServer: null,
    }));
  }, []);

  const closeDeleteModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isDeleteModalOpen: false,
      deletingServer: null,
    }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModalState(initialModalState);
  }, []);

  return {
    modalState,
    openAddModal,
    openEditModal,
    openDeleteModal,
    closeAllModals,
    closeAddModal,
    closeEditModal,
    closeDeleteModal,
  };
}; 