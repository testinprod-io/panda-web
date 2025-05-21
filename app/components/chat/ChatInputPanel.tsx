import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { isEmpty } from "lodash-es";
import { useDebouncedCallback } from "use-debounce";
import { ModelConfig } from '@/app/constant';
import { usePrivy } from "@privy-io/react-auth";

import {
  useAppConfig,
  useChatStore,
} from "@/app/store"; // Adjust paths
import { UNFINISHED_INPUT } from "@/app/constant";
import { autoGrowTextArea, isVisionModel, safeLocalStorage, useMobileScreen } from "@/app/utils";
import Locale from "@/app/locales";
import { useSubmitHandler } from "@/app/hooks/useSubmitHandler";
import { useSnackbar } from "@/app/components/SnackbarProvider";
import { ChatControllerPool } from "@/app/client/controller";

import { DeleteImageButton } from "@/app/components/chat/DeleteImageButton";
import { ChatAction } from "@/app/components/chat/ChatAction";

import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import Button from '@mui/material/Button';
import styles from "@/app/components/chat/chat.module.scss";
import { UUID } from "crypto";
import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import { useApiClient } from "@/app/context/ApiProviderContext";
// Helper component for the generic file icon
const GenericFileIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="5.33333" fill="none"/>
    <path d="M21.3333 24H10.6666C9.92778 24 9.33325 23.4055 9.33325 22.6667V9.33333C9.33325 8.5945 9.92778 8 10.6666 8H16L22.6666 12.6667V22.6667C22.6666 23.4055 22.0721 24 21.3333 24Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22.6666 12.6667H17.3333C16.5944 12.6667 16 12.0722 16 11.3333V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const localStorage = safeLocalStorage();

const getInitialInput = (sessionId?: UUID): string => {
  if (!sessionId) return "";
  const key = UNFINISHED_INPUT(sessionId.toString());
  const savedInput = localStorage.getItem(key);
  return savedInput || "";
};

const MAX_IMAGE_FILES = 10;
const MAX_PDF_AGGREGATE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

interface FileError {
  fileName: string;
  reason: "type" | "image_limit" | "pdf_size_limit" | "pdf_individual_size_limit" | "no_session_id";
}

interface AttachedClientFile {
  clientId: string;
  originalFile: File;
  previewUrl: string;
  type: string;
  name: string;
  size: number;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  fileId?: UUID;
  uploadProgress?: number;
  abortUpload?: () => void;
}

interface SubmittedFile {
  url: string;
  fileId: string;
  type: string;
  name: string;
}

const filterValidFilesForUpload = (
  incomingFiles: File[],
  currentAttachedFiles: AttachedClientFile[]
): { filesToUpload: File[]; errors: FileError[] } => {
  const filesToUpload: File[] = [];
  const errors: FileError[] = [];

  let currentImageCount = currentAttachedFiles.filter(f => f.type.startsWith("image/")).length;
  let currentPdfSize = currentAttachedFiles
    .filter(f => f.type === "application/pdf")
    .reduce((sum, f) => sum + f.size, 0);

  for (const file of incomingFiles) {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      errors.push({ fileName: file.name, reason: "type" });
      continue;
    }

    if (file.type.startsWith("image/")) {
      if (currentImageCount >= MAX_IMAGE_FILES) {
        errors.push({ fileName: file.name, reason: "image_limit" });
        continue;
      }
      filesToUpload.push(file);
      currentImageCount++;
    } else if (file.type === "application/pdf") {
      if (file.size > MAX_PDF_AGGREGATE_SIZE) {
        errors.push({ fileName: file.name, reason: "pdf_individual_size_limit"});
        continue;
      }
      if (currentPdfSize + file.size > MAX_PDF_AGGREGATE_SIZE) {
        errors.push({ fileName: file.name, reason: "pdf_size_limit" });
        continue;
      }
      filesToUpload.push(file);
      currentPdfSize += file.size;
    }
  }
  return { filesToUpload, errors };
};

interface ChatInputPanelProps {
  sessionId: UUID | undefined;
  modelConfig?: ModelConfig;
  isLoading: boolean;
  hitBottom: boolean;
  onSubmit: (input: string, files: SubmittedFile[], enableSearch: boolean) => Promise<void>;
  scrollToBottom: () => void;
  setShowPromptModal: () => void;
  setShowShortcutKeyModal: () => void;
}

export const ChatInputPanel = forwardRef<HTMLDivElement, ChatInputPanelProps>((
  props,
  ref
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

  const { authenticated, getAccessToken } = usePrivy();
  const apiClient = useApiClient();
  const config = useAppConfig();
  const router = useRouter();
  const isMobileScreen = useMobileScreen();
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const { showSnackbar } = useSnackbar();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialUserInput = React.useMemo(() => getInitialInput(sessionId), [sessionId]);
  const [userInput, setUserInput] = useState<string>("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedClientFile[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [inputRows, setInputRows] = useState(1);
  const [enableSearch, setEnableSearch] = useState(false);
  const autoFocus = !isMobileScreen;
  const activeUploadsRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    const currentlyUploading = attachedFiles.some(file => file.uploadStatus === 'uploading');
    setIsUploadingFiles(currentlyUploading);
  }, [attachedFiles]);

  useEffect(() => {
    const initialInput = getInitialInput(sessionId);
    setUserInput(initialInput);
  }, [sessionId]);

  useEffect(() => {
    console.log('[EFFECT:attachedFiles changed]', JSON.stringify(attachedFiles.map(f => ({ clientId: f.clientId, name: f.name, status: f.uploadStatus, fileId: f.fileId, progress: f.uploadProgress, type: f.type, size: f.size })), null, 2));
  }, [attachedFiles]);

  const debouncedSaveInput = useDebouncedCallback((currentSessionId?: UUID, currentInput?: string) => {
    if (currentSessionId && typeof currentInput === 'string') {
      const key = UNFINISHED_INPUT(currentSessionId.toString());
      if (currentInput.trim() === "") {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, currentInput);
      }
    } else if (currentSessionId) {
      const key = UNFINISHED_INPUT(currentSessionId.toString());
      localStorage.removeItem(key);
    }
  }, 500);

  useEffect(() => {
    debouncedSaveInput(sessionId, userInput);
  }, [userInput, sessionId, debouncedSaveInput]);

  const stopGeneration = () => {
    ChatControllerPool.stopAll();
  };

  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const currentInputRows = Math.min(20, Math.max(1, rows));
      setInputRows(currentInputRows);
    },
    100,
    { leading: true, trailing: true },
  );

  useEffect(measure, [userInput, isMobileScreen, measure]);

  useLayoutEffect(() => {
    if (userInput && inputRef.current) {
      const rows = autoGrowTextArea(inputRef.current);
      const initialCalculatedRows = Math.min(20, Math.max(1, rows));
      if (initialCalculatedRows !== inputRows) {
        setInputRows(initialCalculatedRows);
      }
    }
  }, [userInput, isMobileScreen, inputRows]);
  
  const onInput = (text: string) => {
    setUserInput(text);
  };

  const executeFileUploads = useCallback(async (candidateFiles: File[]) => {
    if (!modelConfig || !isVisionModel(modelConfig)) {
      showSnackbar("Cannot upload files with the current model.", 'warning');
      return;
    }

    if (!sessionId) {
      showSnackbar("Cannot attach files to a new chat. Please send a message first to establish the session.", 'error');
      return;
    }
    
    const { filesToUpload, errors: filterErrors } = filterValidFilesForUpload(
      candidateFiles,
      attachedFiles
    );

    if (filterErrors.length > 0) {
      const errorMessages = filterErrors.map(err => {
        switch (err.reason) {
          case "type": return `File type not supported: ${err.fileName}`;
          case "image_limit": return `Image limit (${MAX_IMAGE_FILES}) reached. Could not add: ${err.fileName}`;
          case "pdf_individual_size_limit": return `PDF file too large (max ${MAX_PDF_AGGREGATE_SIZE / (1024*1024)}MB): ${err.fileName}`;
          case "pdf_size_limit": return `Total PDF size limit (${MAX_PDF_AGGREGATE_SIZE / (1024*1024)}MB) reached. Could not add: ${err.fileName}`;
          default: return `Unknown error for file: ${err.fileName}`;
        }
      });
      showSnackbar(errorMessages.join('\n'), 'error');
    }

    console.log(`[executeFileUploads] filesToUpload:`, filesToUpload);

    if (filesToUpload.length === 0) return;

    const newClientFilesPromises = filesToUpload.map(async (file) => {
      const clientId = typeof window !== "undefined" && window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString() + Math.random().toString();
      const previewUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return {
        clientId,
        originalFile: file,
        previewUrl,
        type: file.type,
        name: file.name,
        size: file.size,
        uploadStatus: 'pending' as const,
        uploadProgress: 0,
      };
    });
    
    const newClientFiles = await Promise.all(newClientFilesPromises);
    console.log(`[executeFileUploads] newClientFiles:`, newClientFiles);
    setAttachedFiles(prev => [...prev, ...newClientFiles]);

    for (const clientFile of newClientFiles) {
      setAttachedFiles(prev => prev.map(f => f.clientId === clientFile.clientId ? { ...f, uploadStatus: 'uploading' as const } : f));
      
      const uploadPromise = apiClient.app.uploadFile(
        sessionId!,
        clientFile.originalFile,
        (progress) => {
          console.log(`[Upload Progress] ClientID: ${clientFile.clientId}, Progress: ${progress}%`);
          setAttachedFiles(prev =>
            prev.map(f =>
              f.clientId === clientFile.clientId ? { ...f, uploadProgress: progress } : f
            )
          );
        }
      );

      uploadPromise.then(uploadResponse => {
        activeUploadsRef.current.set(clientFile.clientId, uploadResponse.abort); // Store abort right away
        console.log(`[Upload Success] ClientID: ${clientFile.clientId}, Response:`, JSON.stringify(uploadResponse, null, 2));

        if (!uploadResponse || !uploadResponse.fileResponse || !uploadResponse.fileResponse.file_id) {
          console.error(`[Upload Success Error] ClientID: ${clientFile.clientId}, Missing fileId in response! Response:`, JSON.stringify(uploadResponse, null, 2));
        }
        
        setAttachedFiles(prev =>
          prev.map(f =>
            f.clientId === clientFile.clientId ? { ...f, uploadStatus: 'success' as const, fileId: uploadResponse.fileResponse.file_id as UUID, uploadProgress: 100, abortUpload: uploadResponse.abort } : f
          )
        );
      }).catch(error => {
        // Ensure abort controller is removed if it was set before error
        activeUploadsRef.current.delete(clientFile.clientId);
        console.error(`[Chat] File upload failed for ${clientFile.name}:`, error);
        let errorMessage = `Upload failed for ${clientFile.name}`;
        if (error && error.message) {
          errorMessage += `: ${error.message}`;
        } else if (error && error.statusText) {
          errorMessage += `: ${error.statusText}`;
        } else if (typeof error === 'string') {
          errorMessage += `: ${error}`;
        } else {
          errorMessage += ": Unknown error";
        }
        
        setAttachedFiles(prev =>
          prev.map(f =>
            f.clientId === clientFile.clientId ? { ...f, uploadStatus: 'error' as const } : f
          )
        );
        showSnackbar(errorMessage, 'error');
        // If the error indicates an abort, we might not want to show a generic snackbar
        // or handle it differently, e.g. if (error.message === "Upload aborted by user") {}
      });
    }
  }, [apiClient, attachedFiles, modelConfig, showSnackbar, sessionId, getAccessToken]);

  const doSubmit = () => {
    console.log('[doSubmit] Called. isLoading:', isLoading, 'isUploadingFiles:', isUploadingFiles);
    console.log('[doSubmit] userInput:', `"${userInput}"`);
    console.log('[doSubmit] attachedFiles at start of doSubmit:', JSON.stringify(attachedFiles.map(f => ({ clientId: f.clientId, name: f.name, status: f.uploadStatus, fileId: f.fileId, type: f.type, size: f.size })), null, 2));

    const successfullyUploadedFiles = attachedFiles.filter(f => f.uploadStatus === 'success' && f.fileId);
    console.log('[doSubmit] successfullyUploadedFiles (after filter):', JSON.stringify(successfullyUploadedFiles.map(f => ({ clientId: f.clientId, name: f.name, status: f.uploadStatus, fileId: f.fileId, type: f.type, size: f.size })), null, 2));
    
    if (isLoading || isUploadingFiles || (userInput.trim() === "" && isEmpty(successfullyUploadedFiles))) {
      console.log('[doSubmit] Submission criteria not met. Exiting.');
      if (isLoading) console.log('[doSubmit] Reason: isLoading is true.');
      if (isUploadingFiles) console.log('[doSubmit] Reason: isUploadingFiles is true.');
      if (userInput.trim() === "" && isEmpty(successfullyUploadedFiles)) console.log('[doSubmit] Reason: userInput is empty AND no successfully uploaded files.');
      return;
    }

    const filesForSubmission: SubmittedFile[] = successfullyUploadedFiles
      .map(({ previewUrl, fileId, type, name }) => ({ url: previewUrl, fileId: fileId!, type, name }));

    console.log(`[doSubmit] filesForSubmission (to be sent):`, JSON.stringify(filesForSubmission, null, 2));

    onSubmit(userInput, filesForSubmission, enableSearch); 
    
    const currentSessionIdForClear = sessionId;
    setUserInput("");
    setAttachedFiles([]); 
    if (currentSessionIdForClear) {
        debouncedSaveInput.cancel();
        localStorage.removeItem(UNFINISHED_INPUT(currentSessionIdForClear.toString()));
    }
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "ArrowUp" && userInput.length <= 0 && !(e.metaKey || e.altKey || e.ctrlKey)) {
      setUserInput(chatStore.lastInput ?? "");
      e.preventDefault();
      return;
    }
    if (shouldSubmit(e)) {
      doSubmit(); 
      e.preventDefault();
    }
  };

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!modelConfig || !isVisionModel(modelConfig)) return;
      if (!sessionId) {
        showSnackbar("Cannot paste files into a new chat. Please send a message first.", 'warning');
        return;
      }
      const items = event.clipboardData?.items;
      if (!items) return;

      const candidateFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && ALLOWED_FILE_TYPES.includes(file.type)) { 
            candidateFiles.push(file);
          }
        }
      }
      if (candidateFiles.length > 0) {
        event.preventDefault();
        await executeFileUploads(candidateFiles);
      }
    },
    [modelConfig, attachedFiles, showSnackbar, sessionId, executeFileUploads],
  );

  const uploadFile = useCallback(async () => {
    if (!sessionId) {
      showSnackbar("Cannot upload files to a new chat. Please send a message first.", 'warning');
      return;
    }
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = ALLOWED_FILE_TYPES.join(',');
    fileInput.onchange = async (event: any) => {
      const files = event.target.files as FileList | null;
      if (!files || files.length === 0) return;
      await executeFileUploads(Array.from(files));
    };
    fileInput.click();
  }, [attachedFiles, showSnackbar, sessionId, executeFileUploads]);

  const handleRemoveFile = useCallback(async (file: AttachedClientFile) => {
    const abortUpload = activeUploadsRef.current.get(file.clientId);
    if (abortUpload) {
      abortUpload(); // Call the abort function
      activeUploadsRef.current.delete(file.clientId);
    }
    
    if (sessionId && file.fileId) {
      apiClient.app.deleteFile(sessionId, file.fileId);
    }

    setAttachedFiles((prev) => prev.filter((f) => f.clientId !== file.clientId));
  }, [attachedFiles, sessionId, apiClient]);
  console.log("model config: ", modelConfig?.name);
  return (
    <div className={styles["chat-input-panel"]} ref={ref}>
      {attachedFiles.length > 0 && (
        <div className={styles["attach-files-preview"]}>
          {attachedFiles.map((file) => {
            const isImage = file.type.startsWith("image/");
            const fileTypeDisplay = file.type.split('/')[1]?.toUpperCase() || 'File';
            console.log(`[Render SVG] ClientID: ${file.clientId}, Progress: ${file.uploadProgress}`);

            return (
              <div
                key={file.clientId}
                className={clsx(
                  styles["attach-file-item"],
                  isImage ? styles["attach-file-item-image"] : styles["attach-file-item-doc"]
                )}
                style={isImage ? { backgroundImage: `url(${file.previewUrl})` } : {}}
              >
                {file.uploadStatus === 'uploading' && (
                  <div className={styles["file-status-overlay"]}>
                    <svg viewBox="0 0 36 36" className={styles.circularProgressSvg}>
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.325)"
                        strokeWidth="2.5"
                      />
                      <path
                        strokeDasharray="100"
                        style={{
                          strokeDashoffset: 100 * (1 - (file.uploadProgress || 0) / 100),
                          transform: 'rotate(-90deg)',
                          transformOrigin: 'center',
                        }}
                        stroke="#ffffff"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
                {file.uploadStatus === 'error' && (
                  <div className={styles["file-status-overlay"]}>
                    Error {/* Simple error text, can be an icon too */}
                  </div>
                )}
                
                {isImage ? (
                  <div className={styles["attach-file-mask-image"]}>
                    <DeleteImageButton deleteImage={() => handleRemoveFile(file)} />
                  </div>
                ) : (
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
                      onClick={() => handleRemoveFile(file)}
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

      <div className={styles["chat-input-main-area"]}>
        <label
          htmlFor="chat-input"
          className={styles["chat-input-label"]}
        >
          <textarea
            id="chat-input"
            ref={inputRef}
            className={styles["chat-input"]}
            placeholder={authenticated ? Locale.Chat.Input(submitKey) : "Please login to chat"}
            onInput={(e) => setUserInput(e.currentTarget.value)}
            value={userInput}
            onKeyDown={onInputKeyDown}
            onFocus={scrollToBottom}
            onClick={scrollToBottom}
            onPaste={handlePaste}
            rows={inputRows}
            autoFocus={autoFocus}
            disabled={!authenticated}
            aria-label={Locale.Chat.Input(submitKey)}
          />
        </label>
      </div>

      <div className={styles["chat-input-controls-row"]}>
        <div className={styles["chat-input-controls-left"]}>
          <button
            onClick={uploadFile}
            disabled={!isVisionModel(modelConfig)}
            className={styles["chat-input-action-plus-new"]}
            aria-label={Locale.Chat.InputActions.UploadImage}
          >
            <img 
              src="/icons/plus.svg" 
              alt={Locale.Chat.InputActions.UploadImage} 
              style={{ width: '16px', height: '16px' }} 
            />
          </button>
          <button
            onClick={() => setEnableSearch(!enableSearch)}
            className={clsx(
              styles["chat-input-action-search-new"],
              { [styles.active]: enableSearch }
            )}
            disabled={isLoading || isUploadingFiles}
            aria-pressed={enableSearch}
            aria-label={enableSearch ? "Disable web search" : "Enable web search"}
          >
            <span className={styles['search-button-icon']}>
              <img src="/icons/search.svg" alt="Search" style={{ width: '16px', height: '16px' }} />
            </span>
            <span className={styles['search-button-text']}>Search</span>
          </button>
        </div>
        <div className={styles["chat-input-controls-right"]}>
          <Button
            className={styles["chat-input-send-new"]}
            variant="contained"
            onClick={isLoading ? stopGeneration : doSubmit}
            disabled={!authenticated|| isUploadingFiles || isLoading || (userInput.trim() === "" && attachedFiles.filter(f => f.uploadStatus === 'success').length === 0)}
            aria-label={isLoading ? Locale.Chat.InputActions.Stop : Locale.Chat.Send}
          >
            {isLoading ? <StopRoundedIcon /> : <ArrowUpwardRoundedIcon />}
          </Button>
        </div>
      </div>
    </div>
  );
});

ChatInputPanel.displayName = "ChatInputPanel";