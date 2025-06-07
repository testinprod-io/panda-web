import { createTheme } from "@mui/material/styles";

const theme = createTheme({
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
  palette: {
    mode: "light",
    primary: {
      main: "#1E1E1E",
    },
    background: {
      default: "#ffffff",
      paper: "#f7f7f8",
    },
    action: {
      hoverOpacity: 0,
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
});

export default theme;
