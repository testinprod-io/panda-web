import { ChatMessage } from "@/types/chat";
import { getMessageTextContent } from "@/utils/utils";

export function countMessages(msgs: ChatMessage[]): number {
  return msgs.reduce(
    (pre, cur) => pre + estimateTokenLength(getMessageTextContent(cur)),
    0
  );
}
export function estimateTokenLength(input: string): number {
  let tokenLength = 0;

  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);

    if (charCode < 128) {
      // ASCII character
      if (charCode <= 122 && charCode >= 65) {
        // a-Z
        tokenLength += 0.25;
      } else {
        tokenLength += 0.5;
      }
    } else {
      // Unicode character
      tokenLength += 1.5;
    }
  }

  return tokenLength;
}
