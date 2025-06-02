import {
  DEFAULT_INPUT_TEMPLATE,
  DEFAULT_MODELS,
  KnowledgeCutOffDate,
} from "@/types/constant";
import { getLang } from "@/locales";
import { ModelConfig } from "@/types/constant";
import { ChatMessage } from "@/types/chat";
import { getMessageTextContent } from "@/utils/utils";

export function countMessages(msgs: ChatMessage[]): number {
  return msgs.reduce(
    (pre, cur) => pre + estimateTokenLength(getMessageTextContent(cur)),
    0,
  );
}

export function fillTemplateWith(
  input: string,
  modelConfig: ModelConfig,
): string {
  const cutoff =
    KnowledgeCutOffDate[modelConfig.name] ?? KnowledgeCutOffDate.default;
  const modelInfo = DEFAULT_MODELS.find((m) => m.name === modelConfig.name);
  let serviceProvider = "OpenAI";
  if (modelInfo) {
    serviceProvider = modelInfo.provider.providerName;
  }
  const vars = {
    ServiceProvider: serviceProvider,
    cutoff,
    model: modelConfig.name,
    time: new Date().toString(),
    lang: getLang(),
    input: input,
  };
  let output = modelConfig.template ?? DEFAULT_INPUT_TEMPLATE;

  // Ensure input is appended if not explicitly in the template
  const inputVar = "{{input}}";
  if (!output.includes(inputVar)) {
    // Append input cleanly, possibly based on template structure
    // For now, simple append with newline, consider if this is always right
    output += "\n" + inputVar;
  }

  Object.entries(vars).forEach(([name, value]) => {
    const regex = new RegExp(`{{${name}}}`, "g");
    output = output.replace(regex, String(value));
  });

  // Handle the case where the input itself might contain template placeholders
  // This prevents replacing placeholders within the user's actual input content
  // If the original template didn't have {{input}}, we added it. Now replace it.
  // If it did, this replaces it.
  output = output.replace(inputVar, input);

  return output;
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
