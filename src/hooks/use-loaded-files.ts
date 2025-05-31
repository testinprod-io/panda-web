import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!messageFiles || messageFiles.length === 0) {
      setLoadedFiles([]);
      return;
    }

    // Reset loadedFiles when messageFiles change, to handle message updates
    setLoadedFiles([]); 

    if (isLocked) {
      const newLockedFiles: LoadedFile[] = messageFiles.map((file) => ({
        id: file.file_id as UUID,
        name: file.file_name,
        type: "other",
        url: "",
        isLoading: false,
        error: "Cannot decrypt file: App is locked",
        originalType: file.file_type,
      }));
      setLoadedFiles(newLockedFiles);
      return;
    }

    const fetchAndProcessFiles = async () => {
      // Initialize files with loading state based on input messageFiles
      setLoadedFiles(
        messageFiles.map((file) => ({
          id: file.file_id as UUID,
          name: file.file_name,
          type: file.file_type as "image" | "pdf" | "other", // Cast for now, or improve type from ChatMessageFileInfo
          url: "",
          isLoading: true,
          originalType: file.file_type, // Store original type from message
        }))
      );

      const processedFiles: LoadedFile[] = [];

      for (const fileInfo of messageFiles) {
        try {
          const response = await apiClient.app.getFile(sessionId, fileInfo.file_id as UUID);
          if (!response) {
            throw new Error("File response is undefined");
          }

          const contentType = response.headers.get("Content-Type") || "application/octet-stream";
          const contentDisposition = response.headers.get("Content-Disposition");
          let fileName = fileInfo.file_name; // Default filename from message

          if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^\"]+)"?/i);
            if (match && match[1]) {
              fileName = match[1]; // Use filename from header if available
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
              // Ensure filename from content disposition (if used) is also decrypted if it was encrypted
              // Assuming the fileInfo.file_name was the one potentially encrypted
              decryptedFileName = EncryptionService.decrypt(fileInfo.file_name);
            } catch (decryptionError) {
              console.error("Error decrypting file:", fileInfo.file_id, decryptionError);
              processedFiles.push({
                id: fileInfo.file_id as UUID,
                name: fileName, // Use potentially non-decrypted name from header or original
                type: "other", 
                url: "",
                isLoading: false,
                error: "Decryption failed",
                originalType: contentType, 
              });
              continue; 
            }
          }

          const url = URL.createObjectURL(fileToProcess);
          const fileTypeForDisplay = fileInfo.file_type as "image" | "pdf" | "other";

          processedFiles.push({
            id: fileInfo.file_id as UUID,
            name: decryptedFileName, // Use decrypted name
            type: fileTypeForDisplay,
            url: url,
            isLoading: false,
            originalType: contentType, // Actual MIME type from response header
          });
        } catch (error) {
          console.error("Error fetching or processing file:", fileInfo.file_id, error);
          processedFiles.push({
            id: fileInfo.file_id as UUID,
            name: fileInfo.file_name, // Use original name in case of error
            type: fileInfo.file_type as "image" | "pdf" | "other",
            url: "",
            isLoading: false,
            error: (error as Error).message || "Unknown error while loading file",
            originalType: fileInfo.file_type,
          });
        }
      }
      setLoadedFiles(processedFiles);
    };

    fetchAndProcessFiles();

    // Cleanup function
    return () => {
      setLoadedFiles(prevFiles => {
        prevFiles.forEach((file: LoadedFile) => { // Added type for file
          if (file.url && file.url.startsWith("blob:")) {
            URL.revokeObjectURL(file.url);
          }
        });
        return []; // Clearing files on unmount/dependency change
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageFiles, sessionId, apiClient, isLocked]);

  return loadedFiles;
}