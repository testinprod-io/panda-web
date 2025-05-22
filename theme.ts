import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#10a37f',
    },
    background: {
      default: '#ffffff',
      paper: '#f7f7f8',
    },
    action: {
      hoverOpacity: 0,
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
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
          backgroundColor: '#131A28',
          color: '#F3F3F3',
          border: '1px solid #dadde9',
        },
      },
    },
  },
});

export default theme; 