import { Platform } from "react-native";

/**
 * PDCA — Design System
 * Palette industrielle premium : bleu marine profond, neutres gris doux,
 * accents saturés pour les statuts, ombres douces, typographie Inter-like.
 */

export const theme = {
  colors: {
    // ---------- Brand ----------
    primary:      "#0B3D6E",  // bleu marine profond
    primaryLight: "#1E5A94",
    primaryDark:  "#072A4D",
    primarySoft:  "#E8EFF7",  // fond bleu très clair (badges, actives)

    // ---------- Surfaces ----------
    bg:           "#F5F7FA",  // fond général
    surface:      "#FFFFFF",
    surfaceAlt:   "#FAFBFC",
    overlay:      "rgba(11,61,110,0.45)",

    // ---------- Texte ----------
    text:         "#0F1E33",  // presque noir bleuté
    textSecondary:"#4B5C6F",
    textMuted:    "#8B98A8",
    textInverse:  "#FFFFFF",

    // ---------- Bordures ----------
    border:       "#E2E8F0",
    borderStrong: "#CBD5E1",
    divider:      "#EEF2F7",

    // ---------- Statuts ----------
    danger:       "#DC2626",
    dangerSoft:   "#FEE2E2",
    warning:      "#F59E0B",
    warningSoft:  "#FEF3C7",
    success:      "#16A34A",
    successSoft:  "#DCFCE7",
    info:         "#0284C7",
    infoSoft:     "#E0F2FE",
    neutralSoft:  "#F1F5F9",
  },

  // ---------- Rayons ----------
  radius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },

  // ---------- Espacements (multiples de 4) ----------
  spacing: (n: number) => n * 4,

  // ---------- Ombres ----------
  shadow: {
    none: {},
    sm: Platform.select({
      ios: {
        shadowColor: "#0F1E33",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
      default: {},
    }),
    md: Platform.select({
      ios: {
        shadowColor: "#0F1E33",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
    lg: Platform.select({
      ios: {
        shadowColor: "#0F1E33",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },

  // ---------- Typographie ----------
  font: {
    family: Platform.select({
      ios: "System",
      android: "sans-serif",
      default: "System",
    }),
    familyMono: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    // Tailles alignées sur une échelle
    size: {
      xs: 11,
      sm: 12,
      base: 14,
      md: 15,
      lg: 17,
      xl: 20,
      "2xl": 24,
      "3xl": 30,
      "4xl": 36,
    },
    weight: {
      regular: "400" as const,
      medium: "500" as const,
      semibold: "600" as const,
      bold: "700" as const,
      black: "800" as const,
    },
  },

  // ---------- Tailles de composants ----------
  size: {
    inputMinHeight: 48,
    buttonMinHeight: 48,
    headerHeight: 56,
    tapTarget: 44,
  },
};

export type Theme = typeof theme;
