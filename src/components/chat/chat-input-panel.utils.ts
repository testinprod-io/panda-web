import { UUID } from 'crypto';
import { SessionState } from '@/types/session';
import { UNFINISHED_INPUT } from '@/types/constant';
import { safeLocalStorage } from '@/utils/utils';

export interface FileError {
  fileName: string;
  reason: "type" | "image_limit" | "pdf_size_limit" | "pdf_individual_size_limit" | "no_session_id" | "content_mismatch";
}

export interface AttachedClientFile {
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

const localStorage = safeLocalStorage();

export const loadSessionState = (sessionId?: UUID): SessionState => {
  const defaultState: SessionState = { userInput: "", persistedAttachedFiles: [], enableSearch: false };
  if (!sessionId) return defaultState;
  const key = UNFINISHED_INPUT(sessionId.toString());
  const savedStateString = localStorage.getItem(key);
  if (savedStateString) {
    try {
      const savedState = JSON.parse(savedStateString) as Partial<SessionState>;
      return {
        userInput: savedState.userInput || "",
        persistedAttachedFiles: savedState.persistedAttachedFiles || [],
        enableSearch: savedState.enableSearch || false,
      };
    } catch (error) {
      localStorage.removeItem(key);
      return defaultState;
    }
  }
  return defaultState;
};

export const MAX_IMAGE_FILES = 10;
export const MAX_PDF_AGGREGATE_SIZE = 25 * 1024 * 1024; // 25MB
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

export const getFileHeader = (file: File, bytesToRead: number = 8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (e.target?.readyState === FileReader.DONE) {
        const arr = new Uint8Array(e.target.result as ArrayBuffer).subarray(0, bytesToRead);
        const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        resolve(header);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, bytesToRead));
  });
};

export const verifyFileContent = async (file: File): Promise<boolean> => {
  const type = file.type;
  try {
    if (type === "image/jpeg") {
      const header = await getFileHeader(file, 3);
      return header.startsWith("FFD8FF");
    } else if (type === "image/png") {
      const header = await getFileHeader(file, 8);
      return header === "89504E470D0A1A0A";
    } else if (type === "image/gif") {
      const header = await getFileHeader(file, 6);
      return header === "474946383761" || header === "474946383961";
    } else if (type === "image/webp") {
      const first4 = await getFileHeader(file, 4);
      if (first4 !== "52494646") return false;
      const webpHeader = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = (e) => {
          if (e.target?.readyState === FileReader.DONE) {
            const arr = new Uint8Array(e.target.result as ArrayBuffer).subarray(8, 12);
            resolve(Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase());
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file.slice(0,12));
      });
      return webpHeader === "57454250";
    } else if (type === "application/pdf") {
      const header = await getFileHeader(file, 5);
      return header === "255044462D";
    }
    return true;
  } catch (error) {
    return false;
  }
};

export const filterValidFilesForUpload = async (
  incomingFiles: File[],
  currentAttachedFiles: AttachedClientFile[] // Now uses locally defined AttachedClientFile
): Promise<{ filesToUpload: File[]; errors: FileError[] }> => {
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
    const isContentValid = await verifyFileContent(file);
    if (!isContentValid) {
      errors.push({ fileName: file.name, reason: "content_mismatch" });
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