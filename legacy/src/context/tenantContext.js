import { createContext, useContext } from 'react';

export const TenantContext = createContext(null);

export const TenantProvider = TenantContext.Provider;

export const useTenant = () => {
  return useContext(TenantContext);
};
