import { UUID } from "crypto";

export interface SubmittedFile {
  url: string;
  fileId: UUID;
  type: string;
  name: string;
  size: number;
}

export type FileWithProgress = {
  file: File;
  progress: number;
  id: string;
};

export interface SessionState {
  userInput: string;
  persistedAttachedFiles: SubmittedFile[];
  enableSearch: boolean;
}
