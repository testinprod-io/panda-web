import React, {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import { isEmpty } from "lodash-es";
import { useDebouncedCallback } from "use-debounce";
import { ModelConfig } from "@/types/constant";
import { usePrivy } from "@privy-io/react-auth";

import { useChatStore } from "@/store";
import { UNFINISHED_INPUT } from "@/types/constant";
import {
  autoGrowTextArea,
  isVisionModel,
  useMobileScreen,
} from "@/utils/utils";
import Locale from "@/locales";
import { useSubmitHandler } from "@/hooks/use-submit-handler";
import { useSnackbar } from "@/providers/snackbar-provider";
import { ChatControllerPool } from "@/client/controller";

import { ActionButton } from "@/components/ui/action-button";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import Button from "@mui/material/Button";
import styles from "@/components/chat/chat.module.scss";
import { UUID } from "crypto";
import CloseIcon from "@mui/icons-material/Close";
import { useApiClient } from "@/providers/api-client-provider";
import { useChatActions } from "@/hooks/use-chat-actions";
import { SessionState, SubmittedFile } from "@/types/session";
import { EncryptionService } from "@/services/encryption-service";
import { FileCircularProgress } from "../ui/file-circular-progress";
import {
  loadSessionState,
  filterValidFilesForUpload,
  MAX_IMAGE_FILES,
  MAX_PDF_AGGREGATE_SIZE,
  ALLOWED_FILE_TYPES,
  AttachedClientFile,
} from "./chat-input-panel.utils";
import { CustomizedPromptsData } from "@/types";

interface ChatInputPanelProps {
  sessionId: UUID | undefined;
  modelConfig?: ModelConfig;
  customizedPrompts?: CustomizedPromptsData;
  isLoading: boolean;
  onSubmit: (
    sessionId: UUID | undefined,
    SessionState: SessionState,
  ) => Promise<void>;
  scrollToBottom: () => void;
  setShowPromptModal: () => void;
  setShowShortcutKeyModal: () => void;
}

export const ChatInputPanel = forwardRef<HTMLDivElement, ChatInputPanelProps>(
  (props, ref) => {
    const {
      sessionId: propSessionId,
      modelConfig,
      customizedPrompts,
      isLoading,
      onSubmit,
      scrollToBottom,
    } = props;

    const chatStore = useChatStore();
    const chatActions = useChatActions();

    const [activeSessionId, setActiveSessionId] = useState<UUID | undefined>(
      propSessionId,
    );
    const provisionalSessionIdRef = useRef<UUID | null>(null);
    const isProvisionalSessionCommittedRef = useRef<boolean>(false);

    const { authenticated, getAccessToken } = usePrivy();
    const apiClient = useApiClient();
    const { newSession } = useChatActions();
    const isMobileScreen = useMobileScreen();
    const { submitKey, shouldSubmit } = useSubmitHandler();
    const { showSnackbar } = useSnackbar();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [userInput, setUserInput] = useState<string>("");
    const [attachedFiles, setAttachedFiles] = useState<AttachedClientFile[]>(
      [],
    );
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const [inputRows, setInputRows] = useState(1);
    const [enableSearch, setEnableSearch] = useState(false);
    const [placeholder] = useState(() => Locale.Chat.Input(submitKey));
    const autoFocus = !isMobileScreen;
    const activeUploadsRef = useRef<Map<string, () => void>>(new Map());

    useEffect(() => {
      const currentlyUploading = attachedFiles.some(
        (file) => file.uploadStatus === "uploading",
      );
      setIsUploadingFiles(currentlyUploading);
    }, [attachedFiles]);

    useEffect(() => {
      if (propSessionId !== activeSessionId) {
        if (
          activeSessionId === provisionalSessionIdRef.current &&
          propSessionId === undefined &&
          provisionalSessionIdRef.current !== null &&
          !isProvisionalSessionCommittedRef.current
        ) {
        } else {
          if (
            provisionalSessionIdRef.current &&
            !isProvisionalSessionCommittedRef.current &&
            provisionalSessionIdRef.current !== propSessionId
          ) {
            chatActions
              .deleteSession(provisionalSessionIdRef.current)
              .catch(() => {
                // console.error("Error deleting provisional session:", err);
              });
            provisionalSessionIdRef.current = null;
          }
          isProvisionalSessionCommittedRef.current = false;
          setActiveSessionId(propSessionId);
        }
      }
    }, [propSessionId, activeSessionId, chatActions]);

    useEffect(() => {
      if (activeSessionId) {
        const initialState = loadSessionState(activeSessionId);
        setUserInput(initialState.userInput);
        setEnableSearch(initialState.enableSearch);

        const restoredAttachedFiles: AttachedClientFile[] =
          initialState.persistedAttachedFiles.map(
            (persistedFile): AttachedClientFile => ({
              clientId:
                typeof window !== "undefined" && window.crypto?.randomUUID
                  ? window.crypto.randomUUID()
                  : Date.now().toString() + Math.random().toString(),
              previewUrl: persistedFile.url,
              type: persistedFile.type,
              name: persistedFile.name,
              size: persistedFile.size,
              uploadStatus: "success",
              fileId: persistedFile.fileId as UUID,
              uploadProgress: 100,
              abortUpload: undefined,
            }),
          );
        setAttachedFiles(restoredAttachedFiles);
      } else {
        setUserInput("");
        setAttachedFiles([]);
        setEnableSearch(false);
        if (
          provisionalSessionIdRef.current &&
          !isProvisionalSessionCommittedRef.current
        ) {
          chatActions
            .deleteSession(provisionalSessionIdRef.current)
            .catch(() => {});
        }
        provisionalSessionIdRef.current = null;
        isProvisionalSessionCommittedRef.current = false;
      }
    }, [activeSessionId]);

    const debouncedSaveInput = useDebouncedCallback(
      (
        currentActiveSessionId?: UUID,
        currentInput?: string,
        currentAttachedFiles?: AttachedClientFile[],
        currentEnableSearch?: boolean,
      ) => {
        if (currentActiveSessionId) {
          const key = UNFINISHED_INPUT(currentActiveSessionId.toString());
          const filesToPersist: SubmittedFile[] = (currentAttachedFiles || [])
            .filter((f) => f.uploadStatus === "success" && f.fileId)
            .map((f) => ({
              url: f.previewUrl,
              fileId: f.fileId!,
              type: f.type,
              name: f.name,
              size: f.size,
            }));

          if (
            (currentInput || "").trim() === "" &&
            filesToPersist.length === 0 &&
            !(currentEnableSearch || false)
          ) {
            localStorage.removeItem(key);
          } else {
            const stateToSave: SessionState = {
              userInput: currentInput || "",
              persistedAttachedFiles: filesToPersist,
              enableSearch: currentEnableSearch || false,
            };
            localStorage.setItem(key, JSON.stringify(stateToSave));
          }
        }
      },
      500,
    );

    useEffect(() => {
      // Debounce saving the entire session state
      debouncedSaveInput(
        activeSessionId,
        userInput,
        attachedFiles,
        enableSearch,
      );
    }, [
      userInput,
      attachedFiles,
      enableSearch,
      activeSessionId,
      debouncedSaveInput,
    ]);

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

    const executeFileUploads = useCallback(
      async (candidateFiles: File[]) => {
        let currentSessionIdToUse = activeSessionId;

        if (!currentSessionIdToUse) {
          console.log(
            "DEBUG [executeFileUploads] No current session ID, creating a new session",
          );
          if (
            provisionalSessionIdRef.current &&
            !isProvisionalSessionCommittedRef.current
          ) {
            await chatActions
              .deleteSession(provisionalSessionIdRef.current)
              .catch(() => {});
            provisionalSessionIdRef.current = null;
            console.log(
              "DEBUG [executeFileUploads] Deleted provisional session",
            );
          }

          const session = await chatActions.newSession(
            modelConfig,
            customizedPrompts,
          );
          if (session) {
            console.log(
              "DEBUG [executeFileUploads] Created new session",
              session.id,
            );
            currentSessionIdToUse = session.id;
            provisionalSessionIdRef.current = session.id;
            isProvisionalSessionCommittedRef.current = false;
            setActiveSessionId(session.id);
            console.log(
              "DEBUG [executeFileUploads] Set active session ID to",
              currentSessionIdToUse,
            );
          } else {
            showSnackbar(
              "Failed to create a session for file upload.",
              "error",
            );
            return;
          }
        }

        if (!modelConfig || !isVisionModel(modelConfig)) {
          showSnackbar(
            "Cannot upload files with the current model.",
            "warning",
          );
          return;
        }

        if (!currentSessionIdToUse) {
          showSnackbar("Cannot attach files, session ID is missing.", "error");
          return;
        }

        const { filesToUpload, errors: filterErrors } =
          await filterValidFilesForUpload(candidateFiles, attachedFiles);

        if (filterErrors.length > 0) {
          const errorMessages = filterErrors.map((err) => {
            switch (err.reason) {
              case "type":
                return `File type not supported: ${err.fileName}`;
              case "image_limit":
                return `Image limit (${MAX_IMAGE_FILES}) reached. Could not add: ${err.fileName}`;
              case "pdf_individual_size_limit":
                return `PDF file too large (max ${MAX_PDF_AGGREGATE_SIZE / (1024 * 1024)}MB): ${err.fileName}`;
              case "pdf_size_limit":
                return `Total PDF size limit (${MAX_PDF_AGGREGATE_SIZE / (1024 * 1024)}MB) reached. Could not add: ${err.fileName}`;
              case "content_mismatch":
                return `File content does not match its type: ${err.fileName}`;
              default:
                return `Unknown error for file: ${err.fileName}`;
            }
          });
          showSnackbar(errorMessages.join("\n"), "error");
        }

        if (filesToUpload.length === 0) return;

        const newClientFilesPromises = filesToUpload.map(async (file) => {
          const clientId =
            typeof window !== "undefined" && window.crypto?.randomUUID
              ? window.crypto.randomUUID()
              : Date.now().toString() + Math.random().toString();
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
            uploadStatus: "pending" as const,
            uploadProgress: 0,
          };
        });

        const newClientFiles = await Promise.all(newClientFilesPromises);
        setAttachedFiles((prev) => [...prev, ...newClientFiles]);

        for (const clientFile of newClientFiles) {
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.clientId === clientFile.clientId
                ? { ...f, uploadStatus: "uploading" as const }
                : f,
            ),
          );
          console.log(
            "DEBUG [executeFileUploads] Uploading file with session ID",
            currentSessionIdToUse,
          );
          const uploadPromise = apiClient.app.uploadFile(
            currentSessionIdToUse!,
            await EncryptionService.encryptFile(clientFile.originalFile),
            EncryptionService.encrypt(clientFile.name),
            clientFile.size,
            (progress) => {
              setAttachedFiles((prev) =>
                prev.map((f) =>
                  f.clientId === clientFile.clientId
                    ? { ...f, uploadProgress: progress }
                    : f,
                ),
              );
            },
          );

          uploadPromise
            .then((uploadResponse) => {
              activeUploadsRef.current.set(
                clientFile.clientId,
                uploadResponse.abort,
              );

              if (
                !uploadResponse ||
                !uploadResponse.fileResponse ||
                !uploadResponse.fileResponse.file_id
              ) {
              }

              setAttachedFiles((prev) =>
                prev.map((f) =>
                  f.clientId === clientFile.clientId
                    ? {
                        ...f,
                        uploadStatus: "success" as const,
                        fileId: uploadResponse.fileResponse.file_id as UUID,
                        fileType: uploadResponse.fileResponse.type,
                        uploadProgress: 100,
                        abortUpload: uploadResponse.abort,
                      }
                    : f,
                ),
              );
            })
            .catch((error) => {
              activeUploadsRef.current.delete(clientFile.clientId);
              let errorMessage = `Upload failed for ${clientFile.name}`;
              if (error && error.message) {
                errorMessage += `: ${error.message}`;
              } else if (error && error.statusText) {
                errorMessage += `: ${error.statusText}`;
              } else if (typeof error === "string") {
                errorMessage += `: ${error}`;
              } else {
                errorMessage += ": Unknown error";
              }

              setAttachedFiles((prev) =>
                prev.map((f) =>
                  f.clientId === clientFile.clientId
                    ? { ...f, uploadStatus: "error" as const }
                    : f,
                ),
              );
              showSnackbar(errorMessage, "error");
            });
        }
      },
      [
        apiClient,
        attachedFiles,
        modelConfig,
        showSnackbar,
        activeSessionId,
        getAccessToken,
        chatActions,
        newSession,
      ],
    );

    const doSubmit = () => {
      console.log(
        "[doSubmit] Called. isLoading:",
        isLoading,
        "isUploadingFiles:",
        isUploadingFiles,
        "activeSessionId:",
        activeSessionId,
      );
      console.log("[doSubmit] userInput:", `"${userInput}"`);
      console.log(
        "[doSubmit] attachedFiles at start of doSubmit:",
        JSON.stringify(
          attachedFiles.map((f) => ({
            clientId: f.clientId,
            name: f.name,
            status: f.uploadStatus,
            fileId: f.fileId,
            type: f.type,
            size: f.size,
          })),
          null,
          2,
        ),
      );

      const successfullyUploadedFiles = attachedFiles.filter(
        (f) => f.uploadStatus === "success" && f.fileId,
      );
      console.log(
        "[doSubmit] successfullyUploadedFiles (after filter):",
        JSON.stringify(
          successfullyUploadedFiles.map((f) => ({
            clientId: f.clientId,
            name: f.name,
            status: f.uploadStatus,
            fileId: f.fileId,
            type: f.type,
            size: f.size,
          })),
          null,
          2,
        ),
      );

      if (
        isLoading ||
        isUploadingFiles ||
        (userInput.trim() === "" && isEmpty(successfullyUploadedFiles))
      ) {
        return;
      }

      if (
        activeSessionId &&
        provisionalSessionIdRef.current === activeSessionId
      ) {
        isProvisionalSessionCommittedRef.current = true;
        provisionalSessionIdRef.current = null;
      } else if (
        provisionalSessionIdRef.current &&
        !isProvisionalSessionCommittedRef.current &&
        provisionalSessionIdRef.current !== activeSessionId
      ) {
        chatActions
          .deleteSession(provisionalSessionIdRef.current)
          .catch(() => {});
        provisionalSessionIdRef.current = null;
        isProvisionalSessionCommittedRef.current = false;
      }

      const filesForSubmission: SubmittedFile[] = successfullyUploadedFiles.map(
        ({ previewUrl, fileId, type, name, size }) => ({
          url: previewUrl,
          fileId: fileId!,
          type,
          name,
          size,
        }),
      );

      onSubmit(activeSessionId, {
        userInput,
        persistedAttachedFiles: filesForSubmission,
        enableSearch,
      });

      const currentSessionIdForClear = activeSessionId;
      setUserInput("");
      setAttachedFiles([]);

      if (currentSessionIdForClear) {
        debouncedSaveInput.cancel();
        localStorage.removeItem(
          UNFINISHED_INPUT(currentSessionIdForClear.toString()),
        );
      }

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    };

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

    const handlePaste = useCallback(
      async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (!modelConfig || !isVisionModel(modelConfig)) return;
        if (!activeSessionId && !provisionalSessionIdRef.current) {
        } else if (!activeSessionId && provisionalSessionIdRef.current) {
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
      [modelConfig, activeSessionId, executeFileUploads],
    );

    const uploadFile = useCallback(async () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.multiple = true;
      fileInput.accept = ALLOWED_FILE_TYPES.join(",");
      fileInput.onchange = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const files = target.files as FileList | null;
        if (!files || files.length === 0) return;
        await executeFileUploads(Array.from(files));
      };
      fileInput.click();
    }, [executeFileUploads]);

    const handleRemoveFile = useCallback(
      async (file: AttachedClientFile) => {
        const abortUpload = activeUploadsRef.current.get(file.clientId);
        if (abortUpload) {
          abortUpload();
          activeUploadsRef.current.delete(file.clientId);
        }

        if (activeSessionId && file.fileId) {
          apiClient.app.deleteFile(activeSessionId, file.fileId);
        }

        setAttachedFiles((prev) =>
          prev.filter((f) => f.clientId !== file.clientId),
        );
      },
      [activeSessionId, apiClient],
    );

    return (
      <div className={styles["chat-input-panel"]} ref={ref}>
        {attachedFiles.length > 0 && (
          <div className={styles["attach-files-preview"]}>
            {attachedFiles.map((file) => {
              const isImage = file.type.startsWith("image/");
              const fileTypeDisplay =
                file.type.split("/")[1]?.toUpperCase() || "File";

              return (
                <div
                  key={file.clientId}
                  className={clsx(
                    styles["attach-file-item"],
                    isImage
                      ? styles["attach-file-item-image"]
                      : styles["attach-file-item-doc"],
                  )}
                  style={
                    isImage
                      ? { backgroundImage: `url(${file.previewUrl})` }
                      : {}
                  }
                >
                  {file.uploadStatus === "uploading" && (
                    <div className={styles["file-status-overlay"]}>
                      <FileCircularProgress
                        progress={file.uploadProgress || 0}
                      />
                    </div>
                  )}
                  {file.uploadStatus === "error" && (
                    <div className={styles["file-status-overlay"]}>
                      Error {/* Simple error text, can be an icon too */}
                    </div>
                  )}

                  {isImage ? (
                    <div className={styles["attach-file-mask-image"]}>
                      <ActionButton
                        icon={
                          <img
                            src="/icons/delete.svg"
                            className={styles.deleteAttachmentIcon}
                            alt="Delete attached image"
                          />
                        }
                        onClick={() => handleRemoveFile(file)}
                        className={styles.deleteImageActionButton}
                        ariaLabel="Delete attached image"
                        title="Delete image"
                      />
                    </div>
                  ) : (
                    <>
                      <div className={styles["doc-file-icon-bg"]}>
                        <img src="/icons/file.svg" alt="File" style={{ width: "21px", height: "26px" }} />
                      </div>
                      <div className={styles["doc-file-info"]}>
                        <div className={styles["doc-file-name"]}>
                          {file.name}
                        </div>
                        <div className={styles["doc-file-type"]}>
                          {fileTypeDisplay}
                        </div>
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
          <label htmlFor="chat-input" className={styles["chat-input-label"]}>
            <textarea
              id="chat-input"
              ref={inputRef}
              className={styles["chat-input"]}
              placeholder={
                authenticated
                  ? placeholder
                  : "Please login to chat"
              }
              onInput={(e) => setUserInput(e.currentTarget.value)}
              value={userInput}
              onKeyDown={onInputKeyDown}
              onFocus={scrollToBottom}
              onClick={scrollToBottom}
              onPaste={handlePaste}
              rows={inputRows}
              autoFocus={autoFocus}
              disabled={!authenticated}
              aria-label={authenticated ? placeholder : "Please login to chat"}
            />
          </label>
        </div>

        <div className={styles["chat-input-controls-row"]}>
          <div className={styles["chat-input-controls-left"]}>
            <button
              onClick={uploadFile}
              disabled={!isVisionModel(modelConfig)}
              className={styles["chat-input-action-plus"]}
              aria-label={Locale.Chat.InputActions.UploadFile}
            >
              <img
                src="/icons/plus.svg"
                alt={Locale.Chat.InputActions.UploadFile}
                style={{filter: "invert(51%) sepia(0%) saturate(0%) hue-rotate(189deg) brightness(90%) contrast(89%)" }}
                className={styles.inputActionIcon}
              />
            </button>
            <button
              onClick={uploadFile}
              disabled={!isVisionModel(modelConfig)}
              className={styles["chat-input-action-plus"]}
              aria-label={Locale.Chat.InputActions.UploadImage}
            >
              <img
                src="/icons/photo.svg"
                alt={Locale.Chat.InputActions.UploadImage}
                style={{filter: "invert(51%) sepia(0%) saturate(0%) hue-rotate(189deg) brightness(90%) contrast(89%)" }}
                className={styles.inputActionIcon}
              />
            </button>
            <button
              onClick={() => setEnableSearch(!enableSearch)}
              className={clsx(styles["chat-input-action-search"], {
                [styles.active]: enableSearch,
              })}
              disabled={!authenticated || isUploadingFiles}
              aria-pressed={enableSearch}
              aria-label={
                enableSearch ? "Disable web search" : "Enable web search"
              }
            >
              <span className={styles["search-button-icon"]}>
                <img
                  src="/icons/search.svg"
                  alt="Search"
                  style={{filter: "invert(51%) sepia(0%) saturate(0%) hue-rotate(189deg) brightness(90%) contrast(89%)" }}
                  className={styles.inputActionIcon}
                />
              </span>
              <span className={styles["search-button-text"]}>Search</span>
            </button>
          </div>
          <div className={styles["chat-input-controls-right"]}>
            <Button
              className={styles["chat-input-send"]}
              variant="contained"
              onClick={isLoading ? stopGeneration : doSubmit}
              disabled={!authenticated || isUploadingFiles}
              aria-label={
                isLoading ? Locale.Chat.InputActions.Stop : Locale.Chat.Send
              }
            >
              {isLoading ? <StopRoundedIcon /> : <ArrowUpwardRoundedIcon />}
            </Button>
          </div>
        </div>
      </div>
    );
  },
);

ChatInputPanel.displayName = "ChatInputPanel";
