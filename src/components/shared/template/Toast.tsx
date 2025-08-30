import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export interface Toast {
  id: string;
  title: string;
  description: string;
  status: 'success' | 'error' | 'warning' | 'info';
}

interface ToastProps {
  title: string;
  description: string;
  status: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

interface ToastOptions {
  title: string;
  description: string;
  status?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  isClosable?: boolean;
}

const ToastComponent: React.FC<ToastProps> = ({ 
  title, 
  description, 
  status, 
  onClose, 
  duration = 5000 
}) => {
  const bgColor = status === 'success' ? 'bg-green-100 border-green-500' : 
                 status === 'error' ? 'bg-red-100 border-red-500' : 
                 status === 'warning' ? 'bg-yellow-100 border-yellow-500' : 'bg-blue-100 border-blue-500';
  
  const textColor = status === 'success' ? 'text-green-800' : 
                   status === 'error' ? 'text-red-800' : 
                   status === 'warning' ? 'text-yellow-800' : 'text-blue-800';

  const Icon = status === 'success' ? CheckCircle :
               status === 'error' ? AlertCircle :
               status === 'warning' ? AlertTriangle : Info;
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);
  
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded shadow-lg border-l-4 ${bgColor} ${textColor} max-w-md`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          <Icon size={20} className="mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">{title}</h3>
            <p className="mt-1">{description}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 ml-4">
          <X size={16} />
        </button>
      </div>
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
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
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

export { ToastComponent as Toast };