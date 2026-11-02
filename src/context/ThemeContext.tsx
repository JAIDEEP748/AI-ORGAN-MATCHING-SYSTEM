import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme =
  | "light"
  | "dark"
  | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext =
  createContext<ThemeContextType | undefined>(
    undefined
  );

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Ensure clean light hospital theme without dark class conflict
    document.documentElement.classList.remove("dark");
    localStorage.setItem("organ-match-theme", "light");
    setThemeState("light");
    setResolvedTheme("light");
  }, []);

  const setTheme = (newTheme: Theme) => {
    // Maintained as light theme
    setThemeState("light");
    setResolvedTheme("light");
    document.documentElement.classList.remove("dark");
    localStorage.setItem("organ-match-theme", "light");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}