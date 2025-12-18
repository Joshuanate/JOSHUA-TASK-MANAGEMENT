import React, { createContext, useContext, useState } from 'react';

type SearchContextType = {
  isOpen: boolean;
  openSearch: (context?: string) => void;
  closeSearch: () => void;
  searchContext: string;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchContext, setSearchContext] = useState('global');

  const openSearch = (ctx: string = 'global') => {
    setSearchContext(ctx);
    setIsOpen(true);
  };

  const closeSearch = () => setIsOpen(false);

  return (
    <SearchContext.Provider value={{ isOpen, openSearch, closeSearch, searchContext }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used within SearchProvider');
  return context;
};