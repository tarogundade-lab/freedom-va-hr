import React, { createContext, useContext, useState } from 'react';

const ViewAsContext = createContext(null);

export function ViewAsProvider({ children }) {
  const [viewAsUser, setViewAsUser] = useState(null); // { id, name, email } or null

  return (
    <ViewAsContext.Provider value={{ viewAsUser, setViewAsUser }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  return useContext(ViewAsContext);
}
