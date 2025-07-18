import { useState, useEffect, useMemo, useRef } from "react";
import { UUID } from "crypto";
import { FileInfo } from "@/sdk/client/types";
import { usePandaSDK } from "@/providers/sdk-provider";

export interface LoadedFile {
  id: UUID;
  name: string;
  type: "image" | "pdf" | "other";
  url: string;
  isLoading: boolean;
  error?: string;
  originalType: string;
}

export function useLoadedFiles(
  messageFiles: FileInfo[],
  sessionId: UUID,
  isLocked: boolean
): LoadedFile[] {
  const { sdk } = usePandaSDK();
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);

  // Create a stable dependency based on the content of messageFiles
  const filesDep = useMemo(
    () =>
      JSON.stringify(
        (messageFiles || [])
          .map((f) => ({ id: f.file_id, name: f.file_name }))
          .sort((a, b) => (a.id && b.id ? a.id.localeCompare(b.id) : 0)) // Sort by ID to ensure canonical string
      ),
    [messageFiles]
  );

  // Extract the specific function to be used in the effect's dependency array
  // This helps if apiClient object reference changes but apiClient.app.getFile function reference is stable.
  const getFileFunction = sdk.storage.getFile;

  // Ref to store previous dependencies for logging
  const prevDepsRef = useRef<{
    filesDep?: string;
    sessionId?: UUID;
    getFileFunction?: any;
    isLocked?: boolean;
  }>({});

  useEffect(() => {
    prevDepsRef.current = { filesDep, sessionId, getFileFunction, isLocked };

    let didCancel = false;
    const currentBlobUrls = new Set<string>();

    const currentMessageFiles = messageFiles || [];

    if (currentMessageFiles.length === 0) {
      setLoadedFiles([]);
      return;
    }

    const initialLoadingStates = currentMessageFiles.map((file) => ({
      id: file.file_id as UUID,
      name: file.file_name,
      type: file.file_type as "image" | "pdf" | "other",
      url: "",
      isLoading: true,
      error: undefined,
      originalType: file.file_type,
    }));
    if (!didCancel) {
      setLoadedFiles(initialLoadingStates);
    }

    if (isLocked) {
      if (!didCancel) {
        setLoadedFiles(
          currentMessageFiles.map((file) => ({
            id: file.file_id as UUID,
            name: file.file_name,
            type: "other",
            url: "",
            isLoading: false,
            error: "Cannot decrypt file: App is locked",
            originalType: file.file_type,
          }))
        );
      }
      return;
    }

    const fetchAndProcessSingleFile = async (
      fileInfo: FileInfo
    ): Promise<LoadedFile> => {
      try {
        // Use the extracted getFileFunction here
        const response = await sdk.storage.getFile(
          sessionId,
          fileInfo.file_id as UUID
        );
        if (!response) {
          throw new Error("File response is undefined");
        }

        let fileToProcess = response;
        let decryptedFileName = response.name;

        if (!sdk.auth.getState().isLocked) {
          try {
            fileToProcess = await sdk.encryption.decryptFile(fileToProcess);
            decryptedFileName = fileInfo.file_name;
          } catch (decryptionError) {
            return {
              id: fileInfo.file_id as UUID,
              name: decryptedFileName,
              type: "other",
              url: "",
              isLoading: false,
              error: "Decryption failed",
              originalType: fileInfo.file_type,
            };
          }
        }

        const url = URL.createObjectURL(fileToProcess);
        if (!didCancel) currentBlobUrls.add(url);

        return {
          id: fileInfo.file_id as UUID,
          name: decryptedFileName,
          type: fileInfo.file_type as "image" | "pdf" | "other",
          url: url,
          isLoading: false,
          originalType: fileInfo.file_type,
        };
      } catch (error) {
        return {
          id: fileInfo.file_id as UUID,
          name: fileInfo.file_name,
          type: fileInfo.file_type as "image" | "pdf" | "other",
          url: "",
          isLoading: false,
          error: (error as Error).message || "Unknown error while loading file",
          originalType: fileInfo.file_type,
        };
      }
    };

    const processAllFiles = async () => {
      const results = await Promise.all(
        currentMessageFiles.map(fetchAndProcessSingleFile)
      );
      if (!didCancel) {
        setLoadedFiles(results);
      }
    };

    if (!didCancel) {
      processAllFiles();
    }

    return () => {
      didCancel = true;
      currentBlobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filesDep, sessionId, getFileFunction, isLocked]);

  return loadedFiles;
}
