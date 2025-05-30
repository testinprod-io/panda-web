import React, { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { ChatMessage, RequestMessage } from "@/types";
import { copyToClipboard } from "@/utils/utils";
import Locale from "@/locales";
import { MultimodalContent } from "@/client/api";
import { EncryptionService } from "@/services/EncryptionService";

import { ActionButton } from "@/components/ui/action-button";
import { LoadingAnimation } from "@/components/ui/loading-animation";

import { UUID } from "crypto";
import { useApiClient } from "@/providers/api-client-provider";
import { AttestationService } from "@/services/attestation-service";
import { useWallets } from "@privy-io/react-auth";

// Icon Placeholders
const IconPlaceholder = ({ name, className }: { name: string, className?: string }) => <span className={clsx("inline-block text-xs p-1 border rounded", className)}>[{name}]</span>;
const CloseIconPlaceholder = () => <IconPlaceholder name="X" />;
const ReplayRoundedIconPlaceholder = () => <IconPlaceholder name="Replay" />;
const ContentCopyRoundedIconPlaceholder = () => <IconPlaceholder name="Copy" />;
const ModeEditRoundedIconPlaceholder = () => <IconPlaceholder name="Edit" />;
const SendIconPlaceholder = () => <IconPlaceholder name="Send" />;
const CancelIconPlaceholder = () => <IconPlaceholder name="Cancel" />;
const ExpandMoreIconPlaceholder = () => <IconPlaceholder name="V" />;
const ChevronRightIconPlaceholder = () => <IconPlaceholder name=">" />;

const CircularProgressPlaceholder = ({ size = 24, color = "inherit" }: { size?: string | number, color?: string }) => (
    <div 
      style={{ width: size, height: size }}
      className={clsx(
          "animate-spin rounded-full border-2 border-t-transparent",
          color === "inherit" ? "border-current" : `border-${color}-500`
      )}
    ></div>
  );

const GenericFileIconPlaceholder = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600">
      <rect width="32" height="32" rx="5.33333" fill="currentColor" opacity="0.1"/>
      <path d="M21.3333 24H10.6666C9.92778 24 9.33325 23.4055 9.33325 22.6667V9.33333C9.33325 8.5945 9.92778 8 10.6666 8H16L22.6666 12.6667V22.6667C22.6666 23.4055 22.0721 24 21.3333 24Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22.6666 12.6667H17.3333C16.5944 12.6667 16 12.0722 16 11.3333V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

const Markdown = dynamic(async () => (await import("../ui/markdown")).Markdown, {
  loading: () => <LoadingAnimation />,
});

interface ChatMessageCellProps {
  sessionId: UUID;
  messageId: UUID;
  message: ChatMessage;
  index: number;
  isLoading: boolean;
  showActions: boolean;
  fontSize: number;
  fontFamily: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  renderMessagesLength: number;
  onResend: (messageId: UUID) => void;
  onUserStop: (messageId: UUID) => void;
  onEditSubmit: (messageId: UUID, newText: string) => void;
}

interface LoadedFile {
  id: UUID;
  name: string;
  type: string;
  url: string;
  isLoading: boolean;
  error?: string;
  originalType: string;
}

function getTextContent(
  content: string | MultimodalContent[] | null | undefined
): string {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return (
      content.find((item) => item.type === "text")?.text || "[Non-text content]"
    );
  }
  return "";
}

function getFileUrls(
  message: ChatMessage,
): string[] {
  return message.files.map((file) => file.file_id);
}

function getImageUrls(
  content: string | MultimodalContent[] | null | undefined
): string[] {
  if (content === null || content === undefined || typeof content === "string" || !Array.isArray(content)) {
    return [];
  }
  return content
    .filter((item) => item.type === "image_url" && item.image_url?.url)
    .map((item) => item.image_url!.url);
}

function getReasoningText(reasoning: string | undefined | null): string {
  return reasoning || "";
}

export const ChatMessageCell = React.memo(function ChatMessageCell(
  props: ChatMessageCellProps
) {
  const {
    sessionId,
    messageId,
    message,
    index,
    isLoading: isChatLoading,
    showActions,
    fontSize,
    fontFamily,
    scrollRef,
    renderMessagesLength,
    onResend,
    onUserStop,
    onEditSubmit,
  } = props;

  const { role, streaming, isError, isReasoning, files, visibleContent: content, visibleReasoning: reasoning } =
    message;
  const { wallets } = useWallets();

  const handleResend = useCallback(
    async () => { 
      await AttestationService.getAttestation(wallets, sessionId); 
      // onResend(messageId); // Original onResend call commented
    },
    [onResend, messageId, wallets, sessionId]
  );

  const handleUserStop = useCallback(
    () => onUserStop(messageId),
    [onUserStop, messageId]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(true);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);

  const isUser = role === "user";
  const apiClient = useApiClient();

  useEffect(() => {
    if (!files || files.length === 0) {
      setLoadedFiles([]);
      return;
    }
    const fetchFiles = async () => {
      setLoadedFiles(
        files.map((file) => ({
          id: file.file_id as UUID,
          name: file.file_name,
          type: file.file_type as "image" | "pdf" | "other",
          url: "",
          isLoading: true,
          originalType: "",
        }))
      );
      const newLoadedFiles: LoadedFile[] = [];
      for (const file of files) {
        try {
          const response = await apiClient.app.getFile(sessionId, file.file_id as UUID);
          if (!response) throw new Error("File response is undefined");
          const contentType = response.headers.get("Content-Type") || "application/octet-stream";
          const contentDisposition = response.headers.get("Content-Disposition");
          let fileName = file.file_name;
          if (contentDisposition) {
            const match = contentDisposition.match(/filename=\"?([^\"]+)\"?/i);
            if (match && match[1]) fileName = match[1];
          }
          const reader = response.body?.getReader();
          if (!reader) throw new Error("ReadableStream not available");
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
          let blob = new Blob(chunks, { type: contentType });
          let fileToProcess = new File([blob], fileName, { type: contentType });
          if (EncryptionService.isKeySet()) {
            try {
              fileToProcess = await EncryptionService.decryptFile(fileToProcess);
              blob = new Blob([fileToProcess], { type: fileToProcess.type || contentType });
            } catch (decryptionError) {
              console.error("Error decrypting file:", file.file_id, decryptionError);
              newLoadedFiles.push({ id: file.file_id as UUID, name: fileName, type: "other", url: "", isLoading: false, error: "Decryption failed", originalType: contentType });
              continue;
            }
          }
          const url = URL.createObjectURL(blob);
          newLoadedFiles.push({ id: file.file_id as UUID, name: fileName, type: file.file_type as "image" | "pdf" | "other", url: url, isLoading: false, originalType: contentType });
        } catch (error) {
          console.error("Error fetching file:", file.file_id, error);
          newLoadedFiles.push({ id: file.file_id as UUID, name: "Error loading file", type: "other", url: "", isLoading: false, error: (error as Error).message || "Unknown error", originalType: "" });
        }
      }
      setLoadedFiles(newLoadedFiles);
    };
    fetchFiles();
    return () => {
      setLoadedFiles(currentLoadedFiles => {
        currentLoadedFiles.forEach((file) => { if (file.url && file.url.startsWith("blob:")) URL.revokeObjectURL(file.url); });
        return []; 
      });
    };
  }, [files, sessionId, apiClient]);

  const prevIsReasoningRef = React.useRef(message.isReasoning);
  useEffect(() => {
    if (isEditing) setEditedText(getTextContent(content));
  }, [content, isEditing]);

  useEffect(() => {
    if (message.isReasoning && !prevIsReasoningRef.current) setIsReasoningCollapsed(false);
    else if (!message.isReasoning && prevIsReasoningRef.current) setIsReasoningCollapsed(true);
    prevIsReasoningRef.current = message.isReasoning;
  }, [message.isReasoning]);

  const handleEditClick = useCallback(() => { setEditedText(getTextContent(content)); setIsEditing(true); }, [content]);
  const handleCancelClick = useCallback(() => { setIsEditing(false); }, []);
  const handleSendClick = useCallback(() => {
    const currentTextContent = getTextContent(content);
    if (editedText.trim() === currentTextContent.trim()) { setIsEditing(false); return; }
    onEditSubmit(messageId, editedText);
    setIsEditing(false);
  }, [messageId, editedText, content, onEditSubmit]);
  const toggleReasoningCollapse = useCallback(() => setIsReasoningCollapsed((prev) => !prev), []);
  
  if (isError) {
    return (
      <div className={clsx(
        "w-[70%] mx-auto my-2.5 flex flex-row",
        "max-lg:w-[80%] max-md:w-[95%]"
      )}>
        <div className="w-full flex flex-col items-start gap-1.5 md:gap-2.5">
          <div className="flex items-center h-8">
            <button
              onClick={handleResend}
              title="Resend message"
              disabled={isChatLoading}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50"
              aria-label="Resend message"
            >
              <ReplayRoundedIconPlaceholder />
            </button>
          </div>
          <div 
            className="bg-red-50 border border-red-400 text-red-600 px-4 py-3 rounded-lg shadow-md text-sm md:text-base font-medium leading-normal max-w-full"
          >
            <div>
              <span className="font-semibold">Something went wrong.</span> <br />
              If this issue persists please contact us at
              <span className="font-bold text-red-700"> help.panda.com.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showReasoning = !isUser && (reasoning || isReasoning);

  return (
    <div
      className={clsx(
        "w-[70%] mx-auto my-2.5 flex flex-row",
        "max-lg:w-[80%] max-md:w-[95%]",
        isUser ? "flex-row-reverse" : "",
        (streaming || isReasoning) && "opacity-90"
      )}
    >
      <div 
        className={clsx(
            "w-full flex flex-col gap-1.5 md:gap-2.5",
            isUser ? "items-end" : "items-start"
        )}
      >
        <div className={clsx(
            "flex items-center gap-2 md:gap-4",
            isUser ? "flex-row-reverse" : "flex-row"
        )}>
          {!isUser && (
            <div className="w-8 h-8 shrink-0">
              <img
                src="/icons/panda.svg"
                alt="Panda Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          )}
          {showActions && !isEditing && (
            <div className={clsx(
                "flex items-center h-8 gap-1",
                isUser ? "justify-end" : "justify-start"
            )}>
              {!(streaming || isReasoning) && (
                <>
                  {!isUser && (
                    <>
                      <button
                        onClick={() => copyToClipboard(getTextContent(content) + (reasoning ? `\n\n[Reasoning]:\n${getReasoningText(reasoning)}` : ""))}
                        title="Copy message and reasoning"
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                        aria-label="Copy message content and reasoning"
                        disabled={isChatLoading}
                      >
                        <ContentCopyRoundedIconPlaceholder />
                      </button>
                      <button
                        onClick={handleResend}
                        title="Resend message" 
                        disabled={isChatLoading}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                        aria-label="Resend message"
                      >
                        <ReplayRoundedIconPlaceholder />
                      </button>
                    </>
                  )}
                  {isUser && (
                    <>
                      <button
                        onClick={() => copyToClipboard(getTextContent(content))}
                        title="Copy message"
                        disabled={isChatLoading}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                        aria-label="Copy message"
                      >
                        <ContentCopyRoundedIconPlaceholder />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {/* File attachments */}
        {loadedFiles.length > 0 && (
            <div className={clsx(
                "flex flex-col gap-2.5 mt-2",
                isUser ? "items-end" : "items-start", 
                "w-full max-w-xs sm:max-w-sm md:max-w-md"
            )}>
                {loadedFiles.map((file) => {
                  if (file.isLoading) {
                    return (
                      <div 
                        key={file.id} 
                        className="flex items-center justify-center w-40 h-40 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
                      >
                         <CircularProgressPlaceholder size={24} />
                      </div>
                    );
                  }
                  if (file.error) {
                    return (
                      <div key={file.id} className="flex items-center gap-2 p-2 bg-red-50 border border-red-300 rounded-lg text-red-700 text-xs">
                        <GenericFileIconPlaceholder /> 
                        <span>Error: {file.name} ({file.error})</span>
                      </div>
                    );
                  }
                  if (file.type === "image") {
                    return (
                      <a 
                        key={`${file.id}-anchor`}
                        href={file.url} 
                        download={file.name} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Image
                          key={file.id}
                          src={file.url}
                          alt={file.name || `attached image ${file.id}`}
                          width={160} 
                          height={160} 
                          className="rounded-lg border border-gray-300 object-cover block"
                        />
                      </a>
                    );
                  }
                  // Fallback for PDF and other file types
                  return (
                    <a 
                      key={`${file.id}-anchor`}
                      href={file.url} 
                      download={file.name} 
                      target={file.type === "pdf" ? "_blank" : undefined}
                      rel={file.type === "pdf" ? "noopener noreferrer" : undefined}
                      className="block text-decoration-none"
                    >
                      <div
                        key={file.id}
                        className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer max-w-full"
                      >
                        <GenericFileIconPlaceholder />
                        <div className="overflow-hidden flex-grow">
                          <p className="text-sm font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {file.type === "pdf" ? "PDF Document" : (file.originalType || "File")}
                          </p>
                        </div>
                      </div>
                    </a>
                  );
                })}
            </div>
        )}
        <div 
            className={clsx(
                "box-border max-w-full rounded-[2rem] px-5 py-3 md:px-6 md:py-4 text-sm md:text-base break-words border relative transition-all duration-300 ease-in-out overflow-x-auto",
                isUser 
                    ? "bg-gray-100 text-gray-800 border-gray-200"
                    : "bg-white text-gray-800 border-gray-200 shadow-sm",
                !isUser && role === "system" && "p-0 pl-12 rounded-none bg-transparent border-none shadow-none"
            )}
            style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily }} 
        >
          {/* Reasoning Display */}
          {showReasoning && (
            <div className="mb-2 p-2 border border-gray-200 rounded-md bg-gray-50/50">
              <div
                className="flex items-center cursor-pointer group"
                onClick={toggleReasoningCollapse}
              >
                <button 
                  className="p-0.5 mr-1 rounded-full hover:bg-gray-200 text-gray-500" 
                  aria-label={isReasoningCollapsed ? "Expand reasoning" : "Collapse reasoning"}
                >
                  {isReasoningCollapsed ? 
                    <ChevronRightIconPlaceholder /> : 
                    <ExpandMoreIconPlaceholder />
                  }
                </button>
                <span className="text-xs font-medium text-gray-600 group-hover:text-gray-800">
                  {isReasoning
                    ? "Thinking..."
                    : message.reasoningTime && message.reasoningTime > 0
                    ? `Thought for ${(message.reasoningTime / 1000).toFixed(1)} seconds`
                    : "Processing complete"}
                </span>
                {isReasoning && !reasoning && (
                  <div className="ml-2">
                    <LoadingAnimation />
                  </div>
                )}
              </div>
              {!isReasoningCollapsed && reasoning && (
                <div className="mt-1.5 pl-3 ml-1 border-l-2 border-gray-200 text-gray-500 text-xs">
                  <Markdown
                    content={reasoning}
                    fontSize={fontSize * 0.85}
                    fontFamily={fontFamily}
                    parentRef={scrollRef as React.RefObject<HTMLDivElement>}
                  />
                </div>
              )}
            </div>
          )}

          {/* Editing UI & Markdown Content */}
          {isEditing ? (
            <div className="w-full">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendClick();
                  }
                  if (e.key === "Escape") {
                    handleCancelClick();
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleCancelClick}
                  className="px-3 py-1.5 text-xs md:text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                >
                  <CancelIconPlaceholder /> {Locale.UI.Cancel}
                </button>
                <button
                  onClick={handleSendClick}
                  disabled={editedText.trim() === "" || isChatLoading}
                  className="px-3 py-1.5 text-xs md:text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-1"
                >
                  <SendIconPlaceholder /> {Locale.UI.Confirm}
                </button>
              </div>
            </div>
          ) : (
            <>
              {(getTextContent(content) || getImageUrls(content).length > 0 || (streaming && !isUser && !showReasoning)) && (
                <Markdown
                  key={`${messageId}-${streaming ? "streaming" : "done"}-${isReasoning ? "reasoning" : "content"}`}
                  content={getTextContent(content) || (streaming ? " " : "")}
                  loading={streaming && !isUser && getTextContent(content).length === 0 && !isReasoning}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  parentRef={scrollRef as React.RefObject<HTMLDivElement>}
                  defaultShow={index >= renderMessagesLength - 6}
                />
              )}
            </>
          )}
        </div>
        {!isEditing && message.timestamp && (
            <div className={clsx("text-xs opacity-60 whitespace-nowrap pt-0.5 w-full box-border",
                isUser ? "text-right pr-1" : "text-left pl-12 md:pl-16")}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        )}
      </div>
    </div>
  );
});
