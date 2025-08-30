import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface Toast {
  id: string;
  title: string;
  description: string;
  status: 'success' | 'error' | 'warning' | 'info';
}

export interface ToastOptions {
  title: string;
  description: string;
  status?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  isClosable?: boolean;
}

interface ToastProps {
  title: string;
  description: string;
  status: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

// Custom Toast notification component
const ToastComponent: React.FC<ToastProps> = ({ title, description, status, onClose }) => {
  const bgColor = status === 'success' ? 'bg-green-100 border-green-500' : 
                 status === 'error' ? 'bg-red-100 border-red-500' : 
                 status === 'warning' ? 'bg-yellow-100 border-yellow-500' : 'bg-blue-100 border-blue-500';
  
  const textColor = status === 'success' ? 'text-green-800' : 
                   status === 'error' ? 'text-red-800' : 
                   status === 'warning' ? 'text-yellow-800' : 'text-blue-800';
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded shadow-lg border-l-4 ${bgColor} ${textColor} max-w-md`}>
      <div className="flex justify-between items-center">
        <h3 className="font-bold">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={16} />
        </button>
      </div>
      <p className="mt-1">{description}</p>
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const toast = (options: ToastOptions) => {
    const { title, description, status = 'info', duration = 5000 } = options;
    const id = Math.random().toString(36).substring(2, 11);
    const newToast: Toast = { id, title, description, status };
    
    setToasts((prev) => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };
  
  const closeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  
  const ToastContainer: React.FC = () => (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastComponent
          key={t.id}
          title={t.title}
          description={t.description}
          status={t.status}
          onClose={() => closeToast(t.id)}
        />
      ))}
    </div>
  );
  
  return { toast, ToastContainer };
}; 