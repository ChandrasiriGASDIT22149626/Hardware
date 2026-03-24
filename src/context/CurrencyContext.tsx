import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext<any>(null);

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrency] = useState('USD');
  // Define your exchange rate (e.g., 1 USD = 300 LKR)
  const exchangeRate = 300; 

  /**
   * Helper function to convert and format the currency value
   * @param value - The base price (usually in USD)
   */
  const formatValue = (value: number) => {
    if (currency === 'LKR') {
      const convertedValue = value * exchangeRate;
      return `Rs. ${convertedValue.toLocaleString('en-LK', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
    return `$${value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatValue, exchangeRate }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);