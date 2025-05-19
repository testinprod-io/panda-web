import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { isEmpty } from "lodash-es";
import { useDebouncedCallback } from "use-debounce";
import { ModelConfig } from '@/app/constant';

import {
  useAppConfig,
  useChatStore,
} from "@/app/store"; // Adjust paths
import { UNFINISHED_INPUT } from "@/app/constant";
import { autoGrowTextArea, isVisionModel, safeLocalStorage, useMobileScreen } from "@/app/utils";
import { uploadFile as uploadFileRemote } from "@/app/utils/chat"; // Corrected import
import Locale from "@/app/locales";
import { useSubmitHandler } from "@/app/hooks/useSubmitHandler";
import { useSnackbar } from "@/app/components/SnackbarProvider"; // Added Snackbar hook
import { ChatControllerPool } from "@/app/client/controller"; // Import ChatControllerPool

import { DeleteImageButton } from "@/app/components/chat/DeleteImageButton";
import { ChatAction } from "@/app/components/chat/ChatAction"; // Import ChatAction for ScrollToBottom

import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import Button from '@mui/material/Button'; // Added MUI Button
import styles from "@/app/components/chat/chat.module.scss";
import { UUID } from "crypto";
import CloseIcon from '@mui/icons-material/Close'; // For the new 'x' delete button

// Helper component for the generic file icon
const GenericFileIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="5.33333" fill="none"/> {/* Adjusted to rx for rounded corners based on parent */}
    <path d="M21.3333 24H10.6666C9.92778 24 9.33325 23.4055 9.33325 22.6667V9.33333C9.33325 8.5945 9.92778 8 10.6666 8H16L22.6666 12.6667V22.6667C22.6666 23.4055 22.0721 24 21.3333 24Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22.6666 12.6667H17.3333C16.5944 12.6667 16 12.0722 16 11.3333V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const localStorage = safeLocalStorage();

// Modified getInitialInput: Does NOT remove from localStorage
const getInitialInput = (sessionId?: UUID): string => {
  if (!sessionId) return "";
  const key = UNFINISHED_INPUT(sessionId.toString());
  const savedInput = localStorage.getItem(key);
  return savedInput || ""; // Return saved input or empty string
};

interface ChatInputPanelProps {
  sessionId: UUID | undefined;
  modelConfig?: ModelConfig;
  isLoading: boolean;
  hitBottom: boolean;
  onSubmit: (input: string, files: {url: string, type: string, name: string}[]) => Promise<void>;
  scrollToBottom: () => void;
  setShowPromptModal: () => void;
  setShowShortcutKeyModal: () => void;
}

// Use forwardRef to accept a ref from the parent
export const ChatInputPanel = forwardRef<HTMLDivElement, ChatInputPanelProps>((
  props,
  ref // The forwarded ref
) => {
  const {
    sessionId,
    modelConfig,
    isLoading,
    hitBottom,
    onSubmit,
    scrollToBottom,
  } = props;

  const chatStore = useChatStore();
  const config = useAppConfig();
  const router = useRouter();
  // const promptStore = usePromptStore();
  const isMobileScreen = useMobileScreen();
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const { showSnackbar } = useSnackbar(); // Use Snackbar hook
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Initialize userInput directly using the helper function
  const initialUserInput = React.useMemo(() => getInitialInput(sessionId), [sessionId]);
  const [userInput, setUserInput] = useState<string>("");
  const [attachedFiles, setAttachedFiles] = useState<{url: string, type: string, name: string}[]>([]);
  const [uploading, setUploading] = useState(false);
  // Initialize with default rows
  const [inputRows, setInputRows] = useState(1);

  const autoFocus = !isMobileScreen;

  // Effect 1: Load unfinished input when sessionId changes
  useEffect(() => {
    const initialInput = getInitialInput(sessionId);
    setUserInput(initialInput);
    // After loading, if it was for a new chat (sessionId undefined previously) 
    // and now we have a sessionId, we might want to clear a generic "new chat" input 
    // if we were storing one.
    // For now, getInitialInput handles undefined sessionId by returning "".
  }, [sessionId]);

  // Debounced save function
  const debouncedSaveInput = useDebouncedCallback((currentSessionId?: UUID, currentInput?: string) => {
    if (currentSessionId && typeof currentInput === 'string') { // Ensure input is a string, even if empty
      const key = UNFINISHED_INPUT(currentSessionId.toString());
      if (currentInput.trim() === "") {
        localStorage.removeItem(key); // Remove if input is effectively empty
      } else {
        localStorage.setItem(key, currentInput);
      }
    } else if (currentSessionId) {
      // If input is undefined but sessionID exists, means we should clear it.
      const key = UNFINISHED_INPUT(currentSessionId.toString());
      localStorage.removeItem(key);
    }
    // If no sessionId, we don't save (transient input for /chat page)
  }, 500); // Debounce period: 500ms

  // Effect 2: Save unfinished input when userInput or sessionId changes (debounced)
  useEffect(() => {
    debouncedSaveInput(sessionId, userInput);
  }, [userInput, sessionId, debouncedSaveInput]);

  // Function to stop generation
  const stopGeneration = () => {
    ChatControllerPool.stopAll();
  };

  // Debounced measure for textarea auto-grow
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const currentInputRows = Math.min(
        20,
        Math.max(1, rows),
      );
      setInputRows(currentInputRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    },
  );

  useEffect(measure, [userInput, isMobileScreen, measure]);

  // Calculate initial rows synchronously before paint
  useLayoutEffect(() => {
    if (userInput && inputRef.current) {
      const rows = autoGrowTextArea(inputRef.current);
      const initialCalculatedRows = Math.min(
        20,
        Math.max(1, rows)
      );
      // Set the state only if it differs from the default initial state
      if (initialCalculatedRows !== inputRows) {
        setInputRows(initialCalculatedRows);
      }
    }
    // Run only once on mount, potentially recalculate if mobile screen status changes
    // Though initialUserInput dependency ensures it runs if session changes causing input load
  }, [userInput, isMobileScreen, inputRows]);
  
  // Handle text input changes
  const SEARCH_TEXT_LIMIT = 30;
  const onInput = (text: string) => {
    setUserInput(text);
  };

  // doSubmit in ChatInputPanel is NOT async. It triggers the async onSubmit prop.
  const doSubmit = () => {
    // Button is disabled if isLoading, so this check is an additional safeguard
    if (isLoading || (userInput.trim() === "" && isEmpty(attachedFiles))) return;

    onSubmit(userInput, attachedFiles); // Trigger the async submission process in ChatLayout
    
    // Clear UI immediately
    const currentSessionIdForClear = sessionId; // Capture current sessionId before clearing
    setUserInput("");
    setAttachedFiles([]);
    // Explicitly clear storage for the submitted session ID if input becomes empty
    if (currentSessionIdForClear) {
        debouncedSaveInput.cancel(); // Cancel any pending save for old input
        localStorage.removeItem(UNFINISHED_INPUT(currentSessionIdForClear.toString()));
    }
    
    // Attempt to re-focus the input field immediately after clearing.
    // setTimeout helps queue this after any immediate synchronous state updates.
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Handle keydown for submission or history
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "ArrowUp" &&
      userInput.length <= 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey)
    ) {
      setUserInput(chatStore.lastInput ?? "");
      e.preventDefault();
      return;
    }
    if (shouldSubmit(e)) {
      doSubmit(); 
      e.preventDefault();
    }
  };

  // Handle file pasting
  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!modelConfig || !isVisionModel(modelConfig)) return;
      const items = event.clipboardData?.items;
      if (!items) return;

      const filesToProcess: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // For now, only allow pasting images, can be expanded later
        if (item.kind === "file" && item.type.startsWith("image/")) { 
          const file = item.getAsFile();
          if (file) filesToProcess.push(file);
        }
      }

      if (filesToProcess.length > 0) {
        event.preventDefault();
        setUploading(true);
        try {
          // Allow up to 3 files total for now
          const filesToUpload = filesToProcess.slice(0, 3 - attachedFiles.length);
          const uploadPromises = filesToUpload.map(file => 
            uploadFileRemote(file).then((url: string) => ({ url, type: file.type, name: file.name }))
          );
          const newFiles = await Promise.all(uploadPromises);
          setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 3));
        } catch (e) {
          console.error("[Chat] File paste upload failed:", e);
          showSnackbar("File upload failed", 'error');
        } finally {
          setUploading(false);
        }
      }
    },
    [modelConfig?.name, attachedFiles.length, showSnackbar],
  );

  // Handle file uploading via button click
  const uploadFile = useCallback(async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.onchange = async (event: any) => {
      const files = event.target.files as FileList | null;
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
        const filesToUploadArray = Array.from(files).slice(0, 3 - attachedFiles.length);
        if (filesToUploadArray.length === 0) {
          showSnackbar("File upload limit reached", 'warning');
          setUploading(false);
          return;
        }
        const uploadPromises = filesToUploadArray.map(file => 
          uploadFileRemote(file).then((url: string) => ({ url, type: file.type, name: file.name }))
        );
        const newFiles = await Promise.all(uploadPromises);
        setAttachedFiles(prev => [...prev, ...newFiles].slice(0, 3));
      } catch (e) {
        console.error("[Chat] File upload failed:", e);
        showSnackbar("File upload failed", 'error');
      } finally {
        setUploading(false);
      }
    };
    fileInput.click();
  }, [attachedFiles.length, showSnackbar]);

  return (
    <div className={styles["chat-input-panel"]} ref={ref}> {/* Attach the ref here */}
      {/* Attached files preview - remains at the top */}
      {attachedFiles.length > 0 && (
        <div className={styles["attach-files-preview"]}>
          {attachedFiles.map((file, index) => {
            const isImage = file.type.startsWith("image/");
            const fileTypeDisplay = file.type.split('/')[1]?.toUpperCase() || 'File';

            return (
              <div
                key={index}
                className={clsx(
                  styles["attach-file-item"],
                  isImage ? styles["attach-file-item-image"] : styles["attach-file-item-doc"]
                )}
                style={isImage ? { backgroundImage: `url(${file.url})` } : {}}
              >
                {isImage ? (
                  // Mask and delete button for images (as per Figma photo design)
                  <div className={styles["attach-file-mask-image"]}>
                    <DeleteImageButton
                      deleteImage={() => {
                        setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
                      }}
                    />
                  </div>
                ) : (
                  // Structure for non-image files (documents, PDFs, etc.)
                  <>
                    <div className={styles["doc-file-icon-bg"]}>
                      <GenericFileIcon />
                    </div>
                    <div className={styles["doc-file-info"]}>
                      <div className={styles["doc-file-name"]}>{file.name}</div>
                      <div className={styles["doc-file-type"]}>{fileTypeDisplay}</div>
                    </div>
                    <button
                      className={styles["doc-file-delete-button"]}
                      onClick={() => {
                        setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
                      }}
                      aria-label="Remove file"
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main area for the text input */}
      <div className={styles["chat-input-main-area"]}>
        <label
          htmlFor="chat-input"
          className={styles["chat-input-label"]} // New or adjusted class if needed
        >
          <textarea
            id="chat-input"
            ref={inputRef}
            className={styles["chat-input"]}
            placeholder={Locale.Chat.Input(submitKey)} // Reverted to existing Locale string
            onInput={(e) => setUserInput(e.currentTarget.value)}
            value={userInput}
            onKeyDown={onInputKeyDown}
            onFocus={scrollToBottom}
            onClick={scrollToBottom}
            onPaste={handlePaste}
            rows={inputRows}
            autoFocus={autoFocus}
            aria-label={Locale.Chat.Input(submitKey)} // Reverted to existing Locale string
          />
        </label>
      </div>

      {/* Controls row for buttons */}
      <div className={styles["chat-input-controls-row"]}>
        <div className={styles["chat-input-controls-left"]}>
          {isVisionModel(modelConfig) && (
            <ChatAction
              onClick={uploadFile}
              icon={<img src="/icons/plus.svg" alt={Locale.Chat.InputActions.UploadImage} style={{ width: '16px', height: '16px' }} />} //{uploading ? <CircularProgress size={16} /> :} // Use custom SVG icon
              text={null}
              className={styles["chat-input-action-plus-new"]} // New class for specific styling
            />
          )}
        </div>
        <div className={styles["chat-input-controls-right"]}>
          <Button
            className={styles["chat-input-send-new"]} // New class for specific styling
            variant="contained" // Keep variant, but styles will override
            onClick={isLoading ? () => ChatControllerPool.stopAll() : doSubmit}
            disabled={uploading || (!isLoading && (userInput ?? "").trim() === "" && attachedFiles.length === 0)}
            aria-label={isLoading ? Locale.Chat.InputActions.Stop : Locale.Chat.Send}
          >
            {isLoading ? <StopRoundedIcon /> : <ArrowUpwardRoundedIcon />}
          </Button>
        </div>
      </div>
    </div>
  );
});

ChatInputPanel.displayName = "ChatInputPanel"; // Add display name for DevTools 