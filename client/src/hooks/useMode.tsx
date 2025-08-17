import { createContext, useContext, useState, ReactNode } from 'react';

interface ModeContextType {
  isProMode: boolean;
  setIsProMode: (mode: boolean) => void;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [isProMode, setIsProMode] = useState(false);

  const toggleMode = () => {
    setIsProMode(!isProMode);
  };

  return (
    <ModeContext.Provider value={{ isProMode, setIsProMode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
