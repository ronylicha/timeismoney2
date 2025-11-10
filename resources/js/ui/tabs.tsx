import React, { useState } from 'react';

interface TabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className = '' }) => {
  const [activeTab, setActiveTab] = useState(value || '');
  
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    onValueChange?.(tabValue);
  };

  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            activeTab, 
            onTabChange: handleTabChange 
          } as any);
        }
        return child;
      })}
    </div>
  );
};

export const TabsList: React.FC<TabsListProps> = ({ children, activeTab, onTabChange, className = '' }) => {
  return (
    <div className={`flex space-x-1 border-b border-gray-200 ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            activeTab, 
            onTabChange 
          } as any);
        }
        return child;
      })}
    </div>
  );
};

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  value, 
  children, 
  activeTab, 
  onTabChange, 
  className = '' 
}) => {
  const isActive = activeTab === value;
  
  return (
    <button
      type="button"
      onClick={() => onTabChange?.(value)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      } ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<TabsContentProps> = ({ 
  value, 
  children, 
  activeTab, 
  className = '' 
}) => {
  if (activeTab !== value) return null;
  
  return (
    <div className={className}>
      {children}
    </div>
  );
};