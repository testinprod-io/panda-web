'use client'

import React, { useState, useCallback, useEffect } from 'react';
import clsx from "clsx";

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 20;

const MODAL_CONFIG = {
  create: {
    iconSrc: "/icons/lock.svg",
    iconAlt: "Lock Icon",
    iconBackgroundColor: '#C1FF83',
    iconFilter: 'invert(0%) sepia(0%) saturate(23%) hue-rotate(67deg) brightness(104%) contrast(103%)',
    title: 'Create Encryption Password',
    description: 'To protect your chat data, set a password. If you forget it, you\'ll need to reset the service, which will permanently delete all data',
    submitButtonText: 'Confirm',
    textFieldPlaceholder: `Enter ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`,
    getDynamicError: (password: string) => {
      if (password && (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH)) {
        return `*Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`;
      }
      return '';
    },
    validateSubmit: (password: string) => {
      if (!password) return 'Password cannot be empty.';
      if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
        return `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`;
      }
      return null;
    },
    isSubmitDisabled: (password: string, error: string) => {
        return !password || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH || !!error;
    }
  },
  unlock: {
    iconSrc: "/icons/lock.svg",
    iconAlt: "Lock Icon",
    iconBackgroundColor: '#F33D4F',
    iconFilter: 'invert(100%) sepia(0%) saturate(7500%) hue-rotate(137deg) brightness(118%) contrast(91%)',
    title: 'Unlock Panda',
    description: 'Please enter your password to decrypt your chat data.',
    submitButtonText: 'Unlock',
    textFieldPlaceholder: 'Password',
    getDynamicError: (_password: string) => '', 
    validateSubmit: (password: string) => {
      if (!password) {
        return 'Password cannot be empty.';
      }
      return null;
    },
    isSubmitDisabled: (password: string, _error: string) => {
        return !password;
    }
  },
};

interface PasswordModalProps {
  open: boolean;
  modalType: 'create' | 'unlock';
  onUnlockSubmit?: (password: string) => Promise<boolean>;
  onCreateSubmit?: (password: string) => void;
  onClose?: () => void; 
  initialPassword?: string;
  enableKeydownDebugToggle?: boolean;
}

export function PasswordModal({
  open,
  modalType,
  onUnlockSubmit,
  onCreateSubmit,
  onClose,
  initialPassword = '',
  enableKeydownDebugToggle,
}: PasswordModalProps) {
  const [password, setPassword] = useState(initialPassword);
  const [error, setError] = useState('');
  const [debugMode, setDebugMode] = useState(false);

  const currentConfig = MODAL_CONFIG[modalType];
  
  const actualEnableKeydownDebugToggle = enableKeydownDebugToggle ?? (modalType === 'unlock');

  useEffect(() => {
    if (open) {
      setPassword(initialPassword);
      setError(currentConfig.getDynamicError(initialPassword));
    }
  }, [open, modalType, initialPassword, currentConfig]);


  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value;
    setPassword(newPassword);
    const dynamicError = currentConfig.getDynamicError(newPassword);
    setError(dynamicError); // Set error if dynamic error exists, clear if not
  };

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationError = currentConfig.validateSubmit(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');

    try {
      if (modalType === 'unlock') {
        if (!onUnlockSubmit) {
          setError("Configuration error: Unlock callback missing.");
          return;
        }
        const success = await onUnlockSubmit(password);
        if (success) {
          setPassword(''); 
          setError('');   
        } else {
          setError('*Incorrect password');
        }
      } else if (modalType === 'create') {
        if (!onCreateSubmit) {
          setError("Configuration error: Create callback missing.");
          return;
        }
        onCreateSubmit(password);
      }
    } catch (err: any) {
      setError(`Error: ${err.message || 'Failed to process password'}`);
    }
  }, [password, modalType, onUnlockSubmit, onCreateSubmit, currentConfig]);

  useEffect(() => {
    if (actualEnableKeydownDebugToggle) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.shiftKey && e.altKey && e.key === 'D') {
          setDebugMode(prev => !prev);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [actualEnableKeydownDebugToggle]);

  useEffect(() => {
    if (!open) {
      setPassword(initialPassword); // Reset password when modal closes
      setError(''); // Clear errors when modal closes
    }
  }, [open, initialPassword]);


  const isSubmitButtonDisabled = currentConfig.isSubmitDisabled(password, error);
  // For 'create' mode, we want to show dynamic error during typing OR the submit validation error.
  // For 'unlock' mode, we just show the error (which is usually '*Incorrect password').
  const displayedError = modalType === 'create' ? (currentConfig.getDynamicError(password) || error) : error;

  if (!open) return null;

  return (
    <div 
      className={clsx(
        "fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300",
        open ? "opacity-100 visible bg-black bg-opacity-60 backdrop-blur-sm" : "opacity-0 invisible"
      )}
      onClick={onClose}
    >
      <div 
        className={clsx(
          "bg-white rounded-lg shadow-xl flex flex-col items-center",
          "p-10 md:px-[86px] md:py-[40px] w-[372px] box-border"
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby={`password-modal-title-${modalType}`}
        aria-describedby={`password-modal-description-${modalType}`}
      >
        <div className="w-full flex flex-col items-center gap-6 mb-6">
          <div 
            className={clsx("w-12 h-12 rounded-full flex items-center justify-center p-1")}
            style={{ backgroundColor: currentConfig.iconBackgroundColor }}
          >
            <img 
              src={currentConfig.iconSrc} 
              alt={currentConfig.iconAlt}
              className="w-6 h-[30px] mt-[2px]"
              style={{ filter: currentConfig.iconFilter}} 
            />
          </div>
          <h2 id={`password-modal-title-${modalType}`} className="text-center text-2xl font-semibold text-gray-800 font-inter break-words">
            {currentConfig.title}
          </h2>
          <p id={`password-modal-description-${modalType}`} className="text-center text-base text-gray-800 font-inter break-words">
            {currentConfig.description}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
          {displayedError && (
            <p className="font-inter text-base font-normal text-red-500 text-left w-full">
              {displayedError}
            </p>
          )}

          <input
            autoFocus
            required
            id={`${modalType}-password`}
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder={currentConfig.textFieldPlaceholder}
            className={clsx(
              "w-full h-14 px-3.5 py-0 rounded-lg border bg-white text-base font-inter text-gray-800 placeholder-gray-400",
              "focus:outline-none focus:ring-1",
              displayedError 
                ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                : "border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500"
            )}
            aria-invalid={!!displayedError}
            aria-describedby={displayedError ? `password-error-${modalType}` : undefined}
          />
          {displayedError && <p id={`password-error-${modalType}`} className="sr-only">{displayedError}</p>}

          <div className="w-full pt-2">
            <button 
              type="submit" 
              disabled={isSubmitButtonDisabled}
              className={clsx(
                "w-full h-12 rounded-3xl px-2.5 text-base font-inter font-semibold shadow-none transition-colors duration-150",
                "focus:outline-none focus:ring-2 focus:ring-offset-2",
                !isSubmitButtonDisabled 
                  ? "bg-gray-800 text-lime-300 hover:bg-gray-700 focus:ring-gray-500" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {currentConfig.submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 