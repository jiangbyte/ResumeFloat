import { theme, type ThemeConfig } from "antd";

export type ThemeMode = "dark" | "light";

const sharedToken = {
  borderRadius: 0,
  borderRadiusLG: 0,
  borderRadiusSM: 0,
  borderRadiusXS: 0,
  colorPrimary: "#3b82f6",
  fontSize: 13,
  controlHeight: 28,
};

const sharedComponents: ThemeConfig["components"] = {
  Button: { borderRadius: 0 },
  Input: { borderRadius: 0 },
  Card: { borderRadius: 0, borderRadiusLG: 0 },
  Modal: { borderRadius: 0, borderRadiusLG: 0 },
  Select: { borderRadius: 0 },
  Dropdown: { borderRadius: 0 },
  Message: { borderRadius: 0 },
};

export function buildTheme(mode: ThemeMode): ThemeConfig {
  return {
    algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: sharedToken,
    components: sharedComponents,
  };
}

const THEME_KEY = "resumefloat-theme";

export function loadThemeMode(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" ? "light" : "dark";
}

export function saveThemeMode(mode: ThemeMode): void {
  localStorage.setItem(THEME_KEY, mode);
}
