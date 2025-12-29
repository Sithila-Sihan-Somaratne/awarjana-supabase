// src/components/ui/Toast.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, description, variant = 'default', duration = 5000 }) => {
    const id = crypto.randomUUID();
    const toast = { id, title, description, variant, duration };
    
    setToasts(prev => [...prev, toast]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback((options) => {
    return addToast(options);
  }, [addToast]);

  const dismiss = useCallback((id) => {
    removeToast(id);
  }, [removeToast]);

  const value = {
    toasts,
    toast,
    dismiss,
    addToast,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <ToastItem key={toast.id} {...toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ToastItem = ({ id, title, description, variant = 'default', onDismiss }) => {
  const icons = {
    default: AlertCircle,
    success: CheckCircle,
    destructive: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = icons[variant] || icons.default;

  const variants = {
    default: 'bg-background border',
    success: 'bg-green-500 text-white border-green-600',
    destructive: 'bg-destructive text-destructive-foreground border-destructive',
    warning: 'bg-yellow-500 text-black border-yellow-600',
    info: 'bg-blue-500 text-white border-blue-600',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg min-w-[300px] max-w-md animate-slide-up',
        variants[variant] || variants.default
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 mt-0.5" />
      <div className="flex-1">
        {title && <div className="font-medium">{title}</div>}
        {description && <div className="text-sm opacity-90 mt-1">{description}</div>}
      </div>
      <button
        onClick={onDismiss}
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export function Toaster() {
  return (
    <ToastProvider>
      <ToastViewport />
    </ToastProvider>
  );
}

const ToastViewport = () => {
  const { toasts } = useToast();
  
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} {...toast} onDismiss={() => {}} />
      ))}
    </div>
  );
};

// Convenience functions
Toaster.success = (title, description, duration) => {
  return { title, description, variant: 'success', duration };
};

Toaster.error = (title, description, duration) => {
  return { title, description, variant: 'destructive', duration };
};

Toaster.warning = (title, description, duration) => {
  return { title, description, variant: 'warning', duration };
};

Toaster.info = (title, description, duration) => {
  return { title, description, variant: 'info', duration };
};

export { ToastItem };
