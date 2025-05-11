import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { isEmpty } from "lodash-es";
import { useDebouncedCallback } from "use-debounce";

import {
  useAppConfig,
  useChatStore,
  useAccessStore,
  SubmitKey,
  ModelConfig,
} from "@/app/store"; // Adjust paths
import { ChatSession, ChatMessage } from "@/app/types";
// import { usePromptStore } from "@/app/store/prompt";
import { ChatCommandPrefix, useChatCommand } from "@/app/command";
import { UNFINISHED_INPUT } from "@/app/constant";
import { autoGrowTextArea, isVisionModel, safeLocalStorage, useMobileScreen } from "@/app/utils";
import { uploadImage as uploadImageRemote } from "@/app/utils/chat";
import Locale from "@/app/locales";
import { useSubmitHandler } from "@/app/hooks/useSubmitHandler";
import { useSnackbar } from "@/app/components/SnackbarProvider"; // Added Snackbar hook
import { ChatControllerPool } from "@/app/client/controller"; // Import ChatControllerPool

import { ChatActions } from "@/app/components/chat/ChatActions";
import { DeleteImageButton } from "@/app/components/chat/DeleteImageButton";
import { ChatAction } from "@/app/components/chat/ChatAction"; // Import ChatAction for ScrollToBottom

import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import Button from '@mui/material/Button'; // Added MUI Button
import { useApiClient } from "@/app/context/ApiProviderContext";
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'; // Import Scroll Down Icon
import { useChatActions } from "@/app/hooks/useChatActions";
import styles from "@/app/components/chat/chat.module.scss";
import { UUID } from "crypto";

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
  onSubmit: (input: string, images: string[]) => Promise<void>;
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
    setShowPromptModal,
    setShowShortcutKeyModal,
  } = props;

  const apiClient = useApiClient();
  const chatStore = useChatStore();
  const config = useAppConfig();
  const router = useRouter();
  // const promptStore = usePromptStore();
  const isMobileScreen = useMobileScreen();
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const { showSnackbar } = useSnackbar(); // Use Snackbar hook
  const { newSession, deleteSession } = useChatActions();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Initialize userInput directly using the helper function
  const initialUserInput = React.useMemo(() => getInitialInput(sessionId), [sessionId]);
  const [userInput, setUserInput] = useState<string>("");
  const [attachImages, setAttachImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  // Initialize with default rows
  const [inputRows, setInputRows] = useState(2);

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
        Math.max(2, rows),
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
        Math.max(2, rows)
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
    if (isLoading || (userInput.trim() === "" && isEmpty(attachImages))) return;

    onSubmit(userInput, attachImages); // Trigger the async submission process in ChatLayout
    
    // Clear UI immediately
    const currentSessionIdForClear = sessionId; // Capture current sessionId before clearing
    setUserInput("");
    setAttachImages([]);
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

  // Handle image pasting
  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!modelConfig || !isVisionModel(modelConfig.model)) return;
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        event.preventDefault();
        setUploading(true);
        try {
          const filesToUpload = imageFiles.slice(0, 3 - attachImages.length);
          const uploadPromises = filesToUpload.map(file => uploadImageRemote(file));
          const dataUrls = await Promise.all(uploadPromises);
          setAttachImages(prev => [...prev, ...dataUrls].slice(0, 3));
        } catch (e) {
          console.error("[Chat] Image paste upload failed:", e);
          showSnackbar("Locale.Chat.ImageUploadFailed", 'error'); // Use Snackbar hook
        } finally {
          setUploading(false);
        }
      }
    },
    [modelConfig?.model, attachImages.length, showSnackbar],
  );

  // Handle image uploading via button click
  const uploadImage = useCallback(async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png, image/jpeg, image/webp, image/heic, image/heif";
    fileInput.multiple = true;
    fileInput.onchange = async (event: any) => {
      const files = event.target.files as FileList | null;
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
        const filesToUpload = Array.from(files).slice(0, 3 - attachImages.length);
        if (filesToUpload.length === 0) {
          showSnackbar("Locale.Chat.ImageUploadLimit", 'warning'); // Use Snackbar hook
          setUploading(false);
          return;
        }
        const uploadPromises = filesToUpload.map(file => uploadImageRemote(file));
        const dataUrls = await Promise.all(uploadPromises);
        setAttachImages(prev => [...prev, ...dataUrls].slice(0, 3));
      } catch (e) {
        console.error("[Chat] Image upload failed:", e);
        showSnackbar("Locale.Chat.ImageUploadFailed", 'error'); // Use Snackbar hook
      } finally {
        setUploading(false);
      }
    };
    fileInput.click();
  }, [attachImages.length, showSnackbar]); // Added showSnackbar dependency

  return (
    <div className={styles["chat-input-panel"]} ref={ref}> {/* Attach the ref here */}
      <ChatActions
        sessionId={sessionId}
        modelConfig={modelConfig}
        uploadImage={uploadImage}
        setAttachImages={setAttachImages} // Pass state setter if needed by actions, though uploadImage handles it
        setUploading={setUploading} // Pass state setter if needed by actions
        uploading={uploading}
      />
      <div className={styles["chat-input-panel-inner-container"]}> {/* Wrapper for textarea and buttons */}
        <label
          htmlFor="chat-input"
          className={clsx(styles["chat-input-panel-inner"], {
            [styles["chat-input-panel-inner-attach"]]: attachImages.length > 0,
          })}
        >
          <textarea
            id="chat-input"
            ref={inputRef}
            className={styles["chat-input"]}
            placeholder={Locale.Chat.Input(submitKey)}
            onInput={(e) => setUserInput(e.currentTarget.value)}
            value={userInput}
            onKeyDown={onInputKeyDown}
            onFocus={scrollToBottom} // Scroll to bottom on focus might be handled by parent now
            onClick={scrollToBottom} // Scroll to bottom on click might be handled by parent now
            onPaste={handlePaste}
            rows={inputRows}
            autoFocus={autoFocus}
            aria-label={Locale.Chat.Input(submitKey)}
          />
          {attachImages.length > 0 && (
            <div className={styles["attach-images"]}>
              {attachImages.map((image, index) => (
                <div
                  key={index}
                  className={styles["attach-image"]}
                  style={{ backgroundImage: `url(\"${image}\")` }}
                >
                  <div className={styles["attach-image-mask"]}>
                    <DeleteImageButton
                      deleteImage={() => {
                        setAttachImages((prev) => prev.filter((_, i) => i !== index));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </label>
      </div>
      <Button
          className={styles["chat-input-send"]}
          variant="contained"
          onClick={isLoading ? () => ChatControllerPool.stopAll() : doSubmit}
          disabled={uploading || (!isLoading && (userInput ?? "").trim() === "" && attachImages.length === 0)}
          aria-label={isLoading ? Locale.Chat.InputActions.Stop : Locale.Chat.Send}
          sx={{ ml: 1 }}
        >
          {isLoading ? <StopRoundedIcon /> : <ArrowUpwardRoundedIcon />}
        </Button>
    </div>
  );
});

ChatInputPanel.displayName = "ChatInputPanel"; // Add display name for DevTools 