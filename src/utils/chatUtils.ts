import {
  DEFAULT_INPUT_TEMPLATE,
  DEFAULT_MODELS,
  DEFAULT_SYSTEM_TEMPLATE,
  KnowledgeCutOffDate,
  ServiceProvider,
  StoreKey,
  DEFAULT_PANDA_MODEL_NAME,
} from "@/types/constant";
import Locale, { getLang } from "@/locales";
import { ModelConfig } from '@/types/constant';
import { ModelType, useAppConfig } from "@/store/config";
import { collectModelsWithDefaultModel } from "./model";
import { estimateTokenLength } from "./token";
import { ChatMessage, MessageRole } from "@/types/chat";
import { getMessageTextContent, trimTopic } from "@/utils/utils";

export { trimTopic } from "@/utils/utils";

export function getSummarizeModel(
  currentModel: string,
  providerName: string,
): string[] {
  // if (currentModel.startsWith("gpt") || currentModel.startsWith("chatgpt")) {
  //   const configStore = useAppConfig.getState();
  //   const accessStore = useAccessStore.getState();
  //   const allModel = collectModelsWithDefaultModel(
  //     configStore.models,
  //     [configStore.customModels, accessStore.customModels].join(","),
  //     accessStore.defaultModel,
  //   );
  //   const summarizeModel = allModel.find(
  //     (m) => m.name === SUMMARIZE_MODEL && m.available,
  //   );
  //   if (summarizeModel) {
  //     return [
  //       summarizeModel.name,
  //       summarizeModel.provider?.providerName as string,
  //     ];
  //   }
  // }
  return [currentModel, providerName];
}

export function countMessages(msgs: ChatMessage[]): number {
  return msgs.reduce(
    (pre, cur) => pre + estimateTokenLength(getMessageTextContent(cur)),
    0,
  );
}

export function fillTemplateWith(input: string, modelConfig: ModelConfig): string {
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