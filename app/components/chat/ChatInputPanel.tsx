import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { isEmpty, once } from "lodash-es";
import { useDebouncedCallback } from "use-debounce";

import {
  useAppConfig,
  useChatStore,
  useAccessStore,
  SubmitKey,
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

const localStorage = safeLocalStorage();

// Helper function to get initial input
const getInitialInput = (sessionId?: string): string => {
  if (!sessionId) return "";
  const key = UNFINISHED_INPUT(sessionId);
  const savedInput = localStorage.getItem(key);
  if (savedInput) {
    // Clear the saved input after reading it
    localStorage.removeItem(key);
    return savedInput;
  }
  return "";
};

interface ChatInputPanelProps {
  session?: ChatSession;
  isLoading: boolean;
  hitBottom: boolean;
  onSubmit: (input: string, images: string[]) => void;
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
    session,
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
  const initialUserInput = React.useMemo(() => getInitialInput(session?.id), [session?.id]);
  const [userInput, setUserInput] = useState(initialUserInput);
  const [attachImages, setAttachImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  // Initialize with default rows
  const [inputRows, setInputRows] = useState(2);

  const autoFocus = !isMobileScreen;

  // Function to stop generation
  const stopGeneration = () => {
    ChatControllerPool.stopAll();
  };

  // Debounced measure for textarea auto-grow
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = Math.min(
        20,
        Math.max(2, rows),
      );
      setInputRows(inputRows);
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
    if (initialUserInput && inputRef.current) {
      const rows = autoGrowTextArea(inputRef.current);
      const initialCalculatedRows = Math.min(
        20,
        Math.max(2, rows)
      );
      // Set the state only if it differs from the default initial state
      if (initialCalculatedRows !== 2) { // Check against the default useState value
        setInputRows(initialCalculatedRows);
      }
    }
    // Run only once on mount, potentially recalculate if mobile screen status changes
    // Though initialUserInput dependency ensures it runs if session changes causing input load
  }, [initialUserInput, isMobileScreen]);

  // Chat commands specific to input handling
  const chatCommands = useChatCommand({
    new: () => newSession(),
    newm: () => router.push("/new-chat"),
    // prev: () => nextSession(-1),
    // next: () => nextSession(1),
    ...(session && {
      clear: () =>
        chatStore.updateTargetSession(session, (s) => {
          if (s.clearContextIndex !== s.messages.length) {
            s.clearContextIndex = s.messages.length;
            s.memoryPrompt = "";
          } else {
            s.clearContextIndex = undefined;
          }
        }),
      // fork: () => forkSession(),
      del: () => deleteSession(chatStore.currentSessionIndex),
    }),
  });
  
  // Handle text input changes
  const SEARCH_TEXT_LIMIT = 30;
  const onInput = (text: string) => {
    setUserInput(text);
  };

  // Prepare submission
  const doSubmit = () => {
    if (isLoading || (userInput.trim() === "" && isEmpty(attachImages))) return;

    const matchCommand = chatCommands.match(userInput);
    if (matchCommand.matched) {
      setUserInput("");
      setAttachImages([]); // Also clear images on command match
      matchCommand.invoke();
      return;
    }

    onSubmit(userInput, attachImages);
    // Clear input state after passing to parent
    setUserInput("");
    setAttachImages([]);
    if (!isMobileScreen) inputRef.current?.focus();
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
      if (!session || !isVisionModel(session.modelConfig.model)) return;
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
    [session, attachImages.length, showSnackbar],
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

  // Effect purely for saving unfinished input on cleanup (unmount or session change)
  useEffect(() => {
    // DO NOT set input here. useState initializer handles the initial load.
    // The primary purpose of this effect is now the cleanup function.

    const currentInputRef = inputRef.current; // Capture ref value
    const sessionId = session?.id; // Capture session ID

    // Cleanup function: Save input on unmount or before the effect runs for a *new* session ID
    return () => {
      const currentVal = currentInputRef?.value;
      if (sessionId && currentVal && currentVal.trim() !== "") {
        // Save non-empty input
        const key = UNFINISHED_INPUT(sessionId);
        localStorage.setItem(key, currentVal);
      } else if (sessionId) {
        // If input is empty upon cleanup, remove any potentially stale saved item
        const key = UNFINISHED_INPUT(sessionId);
        localStorage.removeItem(key);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]); // Rerun effect (and cleanup) only when session ID changes

  // Effect to update input state if the external session.id changes *after* initial mount
  // This is slightly redundant with the cleanup/setup in the above effect, but ensures reactivity
  // if the component itself doesn't remount but the session prop changes.
  // Consider if the above effect's dependency on session?.id is sufficient.
  // useEffect(() => {
  //   setUserInput(getInitialInput(session?.id));
  // }, [session?.id]);

  return (
    <div className={styles["chat-input-panel"]} ref={ref}> {/* Attach the ref here */}
      <ChatActions
        session={session}
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
            disabled={isLoading} // Disable textarea when loading
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
          onClick={isLoading ? stopGeneration : doSubmit}
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