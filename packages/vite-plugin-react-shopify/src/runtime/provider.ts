import { createContext } from "react";

export const LiquidDataContext = createContext<Record<string, any>>({});
export const LiquidDataProvider = LiquidDataContext.Provider;
