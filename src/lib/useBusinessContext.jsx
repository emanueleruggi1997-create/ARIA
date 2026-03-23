import { useState, useEffect, createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';
import { applyTheme, loadFont } from '@/lib/useTheme';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    const user = await base44.auth.me();
    const businesses = await base44.entities.Business.filter({ created_by: user.email });
    if (businesses.length > 0) {
      const biz = businesses[0];
      setBusiness(biz);
      // Apply saved theme immediately
      if (biz.theme_accent || biz.theme_bg) {
        applyTheme({ accent: biz.theme_accent, bg: biz.theme_bg, font: biz.font_family, density: biz.density });
      }
      if (biz.font_family) loadFont(biz.font_family);
    }
    setLoading(false);
  };

  const refreshBusiness = async () => {
    const user = await base44.auth.me();
    const businesses = await base44.entities.Business.filter({ created_by: user.email });
    if (businesses.length > 0) {
      setBusiness(businesses[0]);
    }
  };

  return (
    <BusinessContext.Provider value={{ business, loading, setBusiness, refreshBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}