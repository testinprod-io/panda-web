import { createTheme, ThemeOptions } from "@mui/material/styles";
import { lightColors, darkColors } from "./theme/colors";

const base: ThemeOptions = {
  transitions: {
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    },
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 200,
      leavingScreen: 100,
    },
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#131A28",
          color: "#F3F3F3",
          border: "1px solid #dadde9",
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...base,
  palette: {
    mode: "light",
    primary: { main: lightColors.primary },
    background: {
      default: lightColors.bgPrimary,
      paper: lightColors.bgSecondary,
    },
    text: {
      primary: lightColors.textPrimary,
      secondary: lightColors.textSecondary,
      disabled: lightColors.textDisabled,
    },
    action: {
      hoverOpacity: 0,
    },
  },
});

export const darkTheme = createTheme({
  ...base,
  palette: {
    mode: "dark",
    primary: { main: darkColors.primary },
    background: {
      default: darkColors.bgPrimary,
      paper: darkColors.bgSecondary,
    },
    text: {
      primary: darkColors.textPrimary,
      secondary: darkColors.textSecondary,
      disabled: darkColors.textDisabled,
    },
    action: {
      hoverOpacity: 0,
    },
  },
});
export default lightTheme;
