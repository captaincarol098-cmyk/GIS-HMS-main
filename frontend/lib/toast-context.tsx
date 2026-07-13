import { createContext, useContext, ReactNode } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'alert' | 'log' | 'success' | 'error';
}

interface ToastContextType {
  addToast: (message: string, type: 'alert' | 'log' | 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children, addToast }: { children: ReactNode; addToast: (message: string, type: 'alert' | 'log' | 'success' | 'error') => void }) {
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
    </ToastContext.Provider>
  );
}
