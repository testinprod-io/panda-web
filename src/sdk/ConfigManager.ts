import { ServerModelInfo } from './client/types';
import { EncryptionService } from './EncryptionService';
import { EventBus } from './events';
import { CustomizedPromptsData } from '@/types';
import { decryptSystemPrompt, encryptSystemPrompt } from '@/types/chat';

export interface PandaConfig {
  models: ServerModelInfo[];
  defaultModel?: ServerModelInfo;
  customizedPrompts: CustomizedPromptsData;
}

const DEFAULT_CUSTOMIZED_PROMPTS: CustomizedPromptsData = {
  enabled: false,
  personal_info: { name: "", job: "" },
  prompts: { traits: "", extra_params: "" },
};

export class ConfigManager {
  private encryptionService: EncryptionService;
  private bus: EventBus;

  private config: PandaConfig = {
    models: [],
    defaultModel: undefined,
    customizedPrompts: DEFAULT_CUSTOMIZED_PROMPTS,
  };

  constructor(bus: EventBus, encryptionService: EncryptionService) {
    this.encryptionService = encryptionService;
    this.bus = bus;

    this.bus.on("app.unlocked", async () => {
      this.config.customizedPrompts = await decryptSystemPrompt(
        this.config.customizedPrompts,
        this.encryptionService.decrypt.bind(this.encryptionService),
      );
      this.bus.emit("config.updated", { config: this.getConfig() });
    });

    this.bus.on("app.locked", async () => {
      this.config.customizedPrompts = await encryptSystemPrompt(
        this.config.customizedPrompts,
        this.encryptionService.encrypt.bind(this.encryptionService),
      );
      this.bus.emit("config.updated", { config: this.getConfig() });
    });
  }

  public setModels(models: ServerModelInfo[]) {
    this.config.models = models;
    if (models.length > 0 && (!this.config.defaultModel || !models.some(m => m.model_name === this.config.defaultModel?.model_name))) {
      this.config.defaultModel = models[0];
    }
    this.bus.emit("config.updated", { config: this.getConfig() });
  }
  
  public setCustomizedPrompts(data: CustomizedPromptsData) {
    this.config.customizedPrompts = data;
    this.bus.emit("config.updated", { config: this.getConfig() });
  }

  public setDefaultModel(model_name: string) {
    const model = this.config.models.find(m => m.model_name === model_name);
    if (model) {
        this.config.defaultModel = model;
        this.bus.emit("config.updated", { config: this.getConfig() });
    } else {
        console.warn(`[ConfigManager] Model ${model_name} not found in available models.`);
    }
  }

  public getConfig(): PandaConfig {
    return this.config;
  }
} 