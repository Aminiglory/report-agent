import { useState, useCallback } from 'react';

export const useModal = () => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    confirmText: 'OK'
  });

  const showModal = useCallback((title, message, type = 'info', onConfirm = null, confirmText = 'OK') => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText
    });
  }, []);

  const showSuccess = useCallback((message, title = 'Success') => {
    showModal(title, message, 'success');
  }, [showModal]);

  const showError = useCallback((message, title = 'Error') => {
    showModal(title, message, 'error');
  }, [showModal]);

  const showWarning = useCallback((message, title = 'Warning') => {
    showModal(title, message, 'warning');
  }, [showModal]);

  const showInfo = useCallback((message, title = 'Information') => {
    showModal(title, message, 'info');
  }, [showModal]);

  const showConfirm = useCallback((message, onConfirm, title = 'Confirm', confirmText = 'Confirm') => {
    showModal(title, message, 'confirm', onConfirm, confirmText);
  }, [showModal]);

  const closeModal = useCallback(() => {
    setModal(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  return {
    modal,
    showModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    closeModal
  };
};


