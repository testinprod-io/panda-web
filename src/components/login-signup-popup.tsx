"use client";

import React from 'react';
// import { Box, Button, Typography, Modal } from '@mui/material'; // Removed MUI imports
// import styles from './login-signup-popup.module.scss'; // Removed SCSS import

interface LoginSignupPopupProps {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

const LoginSignupPopup: React.FC<LoginSignupPopupProps> = ({ open, onClose, onLogin, onSignup }) => {
  if (!open) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" // Replaces Modal backdrop and styles.modalBackdrop
      onClick={onClose} // Handle closing when clicking on backdrop
    >
      <div 
        className="bg-white rounded-lg border border-gray-300 p-8 flex flex-col justify-center items-center gap-6 w-[376px] max-w-[90vw] shadow-lg outline-none" // Replaces styles.popupContainer
        onClick={(e) => e.stopPropagation()} // Prevent click inside popup from closing it
      >
        <div className="w-[202px] flex flex-col justify-center items-center gap-4"> {/* Replaces styles.contentWrapper */}
          <h1 className="self-stretch text-center text-gray-800 text-2xl font-semibold"> {/* Replaces styles.title and Typography h1 */}
            Welcome 👋
          </h1>
          <p className="self-stretch text-center text-gray-800 text-base font-normal leading-normal"> {/* Replaces styles.description and Typography body1 */}
            Log in or sign up to access exclusive features and enjoy secure, private conversations.
          </p>
        </div>
        <div className="w-[312px] flex flex-col gap-2"> {/* Replaces styles.buttonContainer */}
          <button
            onClick={() => {
              onLogin();
              onClose(); 
            }}
            className="h-12 bg-gray-800 rounded-3xl text-white text-base font-normal hover:bg-gray-700" // Replaces styles.loginButton and Button variant="contained"
          >
            Log in
          </button>
          <button
            onClick={() => {
              onSignup();
              onClose();
            }}
            className="h-12 bg-white rounded-3xl border border-gray-400 text-gray-800 text-base font-normal hover:bg-gray-100 hover:border-gray-500" // Replaces styles.signupButton and Button variant="outlined"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginSignupPopup; 