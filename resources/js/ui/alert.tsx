import React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
  children: React.ReactNode;
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ 
  variant = 'default', 
  children, 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'p-4 rounded-md border';
  
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div
      role="alert"
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`text-sm ${className}`} {...props}>
      {children}
    </div>
  );
};