import React, { createContext, useState, useContext, useMemo } from 'react';

interface ActiveCase {
  id: number;
  nombre: string;
}

interface ActiveCaseContextType {
  activeCase: ActiveCase | null;
  setActiveCase: (caso: ActiveCase | null) => void;
}

const ActiveCaseContext = createContext<ActiveCaseContextType | undefined>(undefined);

export const ActiveCaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCase, setActiveCase] = useState<ActiveCase | null>(null);

  const value = useMemo(() => ({
    activeCase,
    setActiveCase,
  }), [activeCase]);

  return (
    <ActiveCaseContext.Provider value={value}>
      {children}
    </ActiveCaseContext.Provider>
  );
};

export const useActiveCase = () => {
  const context = useContext(ActiveCaseContext);
  if (context === undefined) {
    throw new Error('useActiveCase must be used within an ActiveCaseProvider');
  }
  return context;
}; 