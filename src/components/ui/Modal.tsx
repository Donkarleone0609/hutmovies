import React from 'react';
import { XIcon } from 'lucide-react';
type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};
export function Modal({
  isOpen,
  onClose,
  title,
  children
}: ModalProps) {
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-lg w-full max-w-md p-6 animate-scale-in shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors duration-300">
            <XIcon size={24} />
          </button>
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          {children}
        </div>
      </div>
    </div>;
}