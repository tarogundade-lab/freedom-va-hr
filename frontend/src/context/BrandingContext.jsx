import React, { createContext, useContext, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const BrandingContext = createContext({ orgName: 'My Freedom VA' });

export function BrandingProvider({ children }) {
  const [orgName, setOrgName] = useState('My Freedom VA');

  useEffect(() => {
    fetch(`${API_URL}/public/info`)
      .then((r) => r.json())
      .then((d) => { if (d.org) setOrgName(d.org); })
      .catch(() => {}); // fall back to default silently
  }, []);

  return <BrandingContext.Provider value={{ orgName }}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
