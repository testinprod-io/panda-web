"use client";

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert, { AlertColor } from "@mui/material/Alert";

interface SnackbarContextProps {
  showSnackbar: (
    message: string,
    severity?: AlertColor,
    duration?: number | null,
  ) => void;
}

const SnackbarContext = createContext<SnackbarContextProps | undefined>(
  undefined,
);

// Define a global type for the snackbar function
declare global {
  interface Window {
    showSnackbar?: (
      message: string,
      severity?: AlertColor,
      duration?: number | null,
    ) => void;
  }
}

interface SnackbarProviderProps {
  children: ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertColor>("info"); // Default severity
  const [autoHideDuration, setAutoHideDuration] = useState<number | null>(2000); // Default duration

  const showSnackbar = useCallback(
    (
      newMessage: string,
      newSeverity: AlertColor = "info",
      duration: number | null = 2000,
    ) => {
      setMessage(newMessage);
      setSeverity(newSeverity);
      setAutoHideDuration(duration);
      setOpen(true);
    },
    [],
  );

  // Expose the showSnackbar function globally
  useEffect(() => {
    window.showSnackbar = showSnackbar;
    // Cleanup function to remove the global function when the component unmounts
    return () => {
      // Assign undefined instead of using delete
      if (window.showSnackbar === showSnackbar) {
        window.showSnackbar = undefined;
      }
    };
  }, [showSnackbar]); // Dependency array ensures this runs only when showSnackbar changes

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={autoHideDuration}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }} // Position can be adjusted
      >
        <Alert onClose={handleClose} severity={severity} sx={{ width: "100%", borderRadius: "12px" }}>
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = (): SnackbarContextProps => {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
};
