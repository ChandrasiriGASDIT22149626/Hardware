import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'si';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: any;
}

const translations = {
  en: {
    dashboard: "Dashboard",
    inventory: "Inventory",
    sales: "Sales & Billing",
    purchasing: "Purchasing",
    customers: "Customers",
    accounting: "Accounting",
    settings: "Settings",
    logout: "Logout",
  },
  si: {
    dashboard: "ප්‍රධාන පුවරුව",
    inventory: "ගබඩාව",
    sales: "විකුණුම් සහ බිල්පත්",
    purchasing: "ඇණවුම් කිරීම්",
    customers: "පාරිභෝගිකයන්",
    accounting: "ගිණුම්කරණය",
    settings: "සැකසුම්",
    logout: "පද්ධතියෙන් ඉවත් වන්න",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};