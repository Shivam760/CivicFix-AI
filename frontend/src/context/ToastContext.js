import { createContext, useContext } from 'react';

export const ToastContext = createContext({
  toasts: [],
  showToast: () => {},
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);
