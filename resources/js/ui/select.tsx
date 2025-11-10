import React, { useState } from 'react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

interface SelectValueProps {
  placeholder?: string;
  value?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
  setIsOpen?: (open: boolean) => void;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            value, 
            onValueChange, 
            isOpen, 
            setIsOpen 
          } as any);
        }
        return child;
      })}
    </div>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ 
  children, 
  value, 
  onValueChange, 
  isOpen, 
  setIsOpen,
  className = '',
  ...props 
}) => {
  return (
    <button
      type="button"
      onClick={() => setIsOpen?.(!isOpen)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
      <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder, value }) => {
  return <span>{value || placeholder}</span>;
};

export const SelectContent: React.FC<SelectContentProps> = ({ 
  children, 
  onValueChange, 
  isOpen, 
  setIsOpen 
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            onValueChange, 
            setIsOpen 
          } as any);
        }
        return child;
      })}
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({ 
  value, 
  children, 
  onValueChange, 
  setIsOpen,
  className = '',
  ...props 
}) => {
  return (
    <button
      type="button"
      onClick={() => {
        onValueChange?.(value);
        setIsOpen?.(false);
      }}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};