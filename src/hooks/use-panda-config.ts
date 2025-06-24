import { useState, useEffect } from 'react';
import { usePandaSDK } from '@/providers/sdk-provider';
import { PandaConfig } from '@/sdk/ConfigManager';

export function usePandaConfig() {
  const sdk = usePandaSDK();
  const [config, setConfig] = useState<PandaConfig>(() => sdk.config.getConfig());

  useEffect(() => {
    const handleConfigChange = ({ config: newConfig }: { config: PandaConfig }) => {
      setConfig(newConfig);
    };

    const unsubscribe = sdk.bus.on('config.updated', handleConfigChange);

    // Initial sync
    setConfig(sdk.config.getConfig());

    return () => {
      unsubscribe();
    };
  }, [sdk]);

  return config;
} 