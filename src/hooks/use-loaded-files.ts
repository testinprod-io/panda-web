import { useState, useEffect, useMemo, useRef } from 'react';
import { UUID } from 'crypto';
import { FileInfo } from '@/client/types'; // Corrected type for messageFiles elements
import { ClientApi } from '@/client/api'; // Corrected: apiClient is of type ClientApi
import { EncryptionService } from '@/services/encryption-service';

export interface LoadedFile {
  id: UUID;
  name: string;
  type: "image" | "pdf" | "other"; // More specific than just string
  url: string;
  isLoading: boolean;
  error?: string;
  originalType: string; // The original MIME type from the server
}

export function useLoadedFiles(
  messageFiles: FileInfo[], // Updated type
  sessionId: UUID,
  apiClient: ClientApi,    // Updated type to ClientApi
  isLocked: boolean
): LoadedFile[] {
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);

  // Create a stable dependency based on the content of messageFiles
  const filesDep = useMemo(() => 
    JSON.stringify(
      (messageFiles || [])
        .map(f => ({ id: f.file_id, name: f.file_name }))
        .sort((a, b) => (a.id && b.id ? a.id.localeCompare(b.id) : 0)) // Sort by ID to ensure canonical string
    ),
  [messageFiles]);

  // Extract the specific function to be used in the effect's dependency array
  // This helps if apiClient object reference changes but apiClient.app.getFile function reference is stable.
  const getFileFunction = apiClient.app.getFile;

  // Ref to store previous dependencies for logging
  const prevDepsRef = useRef<{ filesDep?: string, sessionId?: UUID, getFileFunction?: any, isLocked?: boolean }>({});

  useEffect(() => {
    // Log if dependencies have changed since the last run
    if (prevDepsRef.current.filesDep !== undefined) { // Avoid logging on the very first run
      let changed = false;
      if (prevDepsRef.current.filesDep !== filesDep) {
        // console.warn("[useLoadedFiles] Dependency changed: filesDep");
        changed = true;
      }
      if (prevDepsRef.current.sessionId !== sessionId) {
        // console.warn("[useLoadedFiles] Dependency changed: sessionId");
        changed = true;
      }
      if (prevDepsRef.current.getFileFunction !== getFileFunction) {
        // console.warn("[useLoadedFiles] Dependency changed: getFileFunction");
        changed = true;
      }
      if (prevDepsRef.current.isLocked !== isLocked) {
        // console.warn("[useLoadedFiles] Dependency changed: isLocked");
        changed = true;
      }
      if (changed) {
        // console.warn("[useLoadedFiles] useEffect is re-running due to dependency changes.");
      }
    }
    // Update previous dependencies ref
    prevDepsRef.current = { filesDep, sessionId, getFileFunction, isLocked };

    let didCancel = false;
    const currentBlobUrls = new Set<string>();

    // Parse back messageFiles from filesDep for use in this effect run, 
    // or better, rely on the messageFiles prop directly as it's what filesDep is derived from.
    // The key is that the effect *runs* based on filesDep changing.
    const currentMessageFiles = messageFiles || []; // Use the prop directly inside the effect

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
        setLoadedFiles(currentMessageFiles.map((file) => ({
            id: file.file_id as UUID,
            name: file.file_name,
            type: "other",
            url: "",
            isLoading: false,
            error: "Cannot decrypt file: App is locked",
            originalType: file.file_type,
        })));
      }
      return; 
    }

    const fetchAndProcessSingleFile = async (fileInfo: FileInfo): Promise<LoadedFile> => {
      try {
        // Use the extracted getFileFunction here
        const response = await getFileFunction(sessionId, fileInfo.file_id as UUID);
        if (!response) {
          throw new Error("File response is undefined");
        }

        const contentType = response.headers.get("Content-Type") || "application/octet-stream";
        const contentDisposition = response.headers.get("Content-Disposition");
        let fileName = fileInfo.file_name;

        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^\"]+)"?/i);
          if (match && match[1]) {
            fileName = match[1];
          }
        }
        
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("ReadableStream not available");
        }

        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
          }
        }
        const blob = new Blob(chunks, { type: contentType });
        let fileToProcess = new File([blob], fileName, { type: contentType });
        let decryptedFileName = fileName;

        if (EncryptionService.isKeySet()) {
          try {
            fileToProcess = await EncryptionService.decryptFile(fileToProcess);
            decryptedFileName = EncryptionService.decrypt(fileInfo.file_name);
          } catch (decryptionError) {
            // console.error("Error decrypting file:", fileInfo.file_id, decryptionError); // Keep console for debug if needed
            return { 
              id: fileInfo.file_id as UUID, name: fileName, type: "other", url: "", 
              isLoading: false, error: "Decryption failed", originalType: contentType 
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
          originalType: contentType,
        };
      } catch (error) {
        // console.error("Error fetching or processing file:", fileInfo.file_id, error); // Keep console for debug if needed
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
      const results = await Promise.all(currentMessageFiles.map(fetchAndProcessSingleFile));
      if (!didCancel) {
        setLoadedFiles(results);
      }
    };

    if (!didCancel) { // Check didCancel before starting async operation
        processAllFiles();
    }

    return () => {
      didCancel = true;
      currentBlobUrls.forEach(url => URL.revokeObjectURL(url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesDep, sessionId, getFileFunction, isLocked]);

  return loadedFiles;
}