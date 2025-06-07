"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/providers/api-client-provider";
import { useAppConfig } from "@/store/config";
import {
  CustomizedPromptsData,
  encryptSystemPrompt,
  decryptSystemPrompt,
} from "@/types";
import { Box, CircularProgress, Typography } from "@mui/material";
import OnboardingStepView from "./components/OnboardingStepView";
import styles from "./onboarding.module.scss";

const STEPS = ["name", "role", "traits", "knowledge"];

const QUESTIONS: Record<string, string> = {
  name: "First, what should Panda AI call you?",
  role: "Great. What's your role or profession?",
  traits: "Got it. What traits should Panda AI have?",
  knowledge: "Finally, is there anything else Panda AI should know about you?",
};

const PLACEHOLDERS: Record<string, string> = {
  name: "e.g. Alex",
  role: "e.g. Software Engineer",
  traits: "e.g. Witty, Encouraging, Straight shooting",
  knowledge: "e.g. I prefer concise, data-driven responses.",
};

export default function OnboardingView() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: "",
    job: "",
    traits: "",
    extra_params: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const apiClient = useApiClient();
  const { setCustomizedPrompts } = useAppConfig();
  const router = useRouter();

  const handleNext = (value: string) => {
    const keys: (keyof typeof data)[] = [
      "name",
      "job",
      "traits",
      "extra_params",
    ];
    const keyToUpdate = keys[step];
    setData((d: typeof data) => ({ ...d, [keyToUpdate]: value }));

    if (step < STEPS.length) {
      setStep((s: number) => s + 1);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload: CustomizedPromptsData = {
      personal_info: {},
      prompts: {},
      enabled: true,
    };

    if (data.name.trim()) payload.personal_info!.name = data.name.trim();
    if (data.job.trim()) payload.personal_info!.job = data.job.trim();
    if (data.traits.trim()) payload.prompts!.traits = data.traits.trim();
    if (data.extra_params.trim())
      payload.prompts!.extra_params = data.extra_params.trim();

    if (Object.keys(payload.personal_info!).length === 0)
      delete payload.personal_info;
    if (Object.keys(payload.prompts!).length === 0) delete payload.prompts;

    try {
      const encryptedPayload = encryptSystemPrompt(payload);
      const responseData = decryptSystemPrompt(
        await apiClient.app.createCustomizedPrompts(encryptedPayload),
      );
      setCustomizedPrompts(responseData);
      router.push("/");
    } catch (error) {
      console.error("Failed to save onboarding data:", error);
      setIsSaving(false);
      // Optional: Show an error message to the user
      router.push("/"); // For now, just navigate away
    }
  };

  useEffect(() => {
    if (step === STEPS.length && !isSaving) {
      handleSave();
    }
  }, [step, isSaving]);

  if (step === STEPS.length || isSaving) {
    return (
      <Box className={styles.container}>
        <Box className={styles.content}>
          <CircularProgress color="inherit" />
          <Typography sx={{ color: "white", mt: 2 }}>
            Personalizing your experience...
          </Typography>
        </Box>
      </Box>
    );
  }

  const currentStepKey = STEPS[step];

  return (
    <Box className={styles.container}>
      <OnboardingStepView
        question={QUESTIONS[currentStepKey]}
        placeholder={PLACEHOLDERS[currentStepKey]}
        onNext={handleNext}
        avatarInitial={data.name ? data.name.charAt(0).toUpperCase() : "🐼"}
      />
    </Box>
  );
}