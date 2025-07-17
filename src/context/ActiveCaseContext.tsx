import React, { createContext, useState, useContext, useMemo } from 'react';

interface ActiveCase {
  id: number;
  nombre: string;
}

interface ActiveCaseContextType {
  activeCases: ActiveCase[];
  addActiveCase: (caso: ActiveCase) => void;
  removeActiveCase: (casoId: number) => void;
  setActiveCase: (caso: ActiveCase | null) => void; // Mantener compatibilidad
  activeCase: ActiveCase | null; // Mantener compatibilidad - será el primer caso
  clearAllCases: () => void;
  isCaseActive: (casoId: number) => boolean;
  getActiveCaseCount: () => number;
  canAddCase: (casoId: number) => boolean;
  getCaseToRemove: (casoId: number) => ActiveCase | null;
  closeCase: (casoId: number) => void;
}

const ActiveCaseContext = createContext<ActiveCaseContextType | undefined>(undefined);

const MAX_ACTIVE_CASES = 3;

export const ActiveCaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCases, setActiveCases] = useState<ActiveCase[]>([]);

  const addActiveCase = (caso: ActiveCase) => {
    setActiveCases(prev => {
      // Si el caso ya está activo, no hacer nada
      if (prev.some(c => c.id === caso.id)) {
        return prev;
      }
      
      // Si ya hay 3 casos activos, remover el más antiguo (FIFO) sin warning
      // El warning se manejará en la interfaz de usuario si es necesario
      if (prev.length >= MAX_ACTIVE_CASES) {
        return [...prev.slice(1), caso];
      }
      
      // Añadir el nuevo caso
      return [...prev, caso];
    });
  };

  const removeActiveCase = (casoId: number) => {
    setActiveCases(prev => prev.filter(c => c.id !== casoId));
  };

  const setActiveCase = (caso: ActiveCase | null) => {
    // Mantener compatibilidad con el sistema anterior
    if (caso) {
      addActiveCase(caso);
    } else {
      setActiveCases([]);
    }
  };

  const clearAllCases = () => {
    setActiveCases([]);
  };

  const isCaseActive = (casoId: number) => {
    return activeCases.some(c => c.id === casoId);
  };

  const getActiveCaseCount = () => {
    return activeCases.length;
  };

  const canAddCase = (casoId: number) => {
    // Si el caso ya está activo, no se puede añadir
    if (isCaseActive(casoId)) {
      return false;
    }
    // Si hay menos de 3 casos activos, se puede añadir
    return activeCases.length < MAX_ACTIVE_CASES;
  };

  const getCaseToRemove = (casoId: number) => {
    // Si el caso ya está activo, no se removería ninguno
    if (isCaseActive(casoId)) {
      return null;
    }
    // Si hay 3 casos activos, se removería el más antiguo (primero en la lista)
    if (activeCases.length >= MAX_ACTIVE_CASES) {
      return activeCases[0];
    }
    // Si hay menos de 3 casos, no se removería ninguno
    return null;
  };

  const closeCase = (casoId: number) => {
    setActiveCases(prev => prev.filter(c => c.id !== casoId));
  };

  // Para compatibilidad con el sistema anterior
  const activeCase = activeCases.length > 0 ? activeCases[0] : null;

  const value = useMemo(() => ({
    activeCases,
    addActiveCase,
    removeActiveCase,
    setActiveCase,
    activeCase, // Mantener compatibilidad
    clearAllCases,
    isCaseActive,
    getActiveCaseCount,
    canAddCase,
    getCaseToRemove,
    closeCase,
  }), [activeCases]);

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