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
import TextInputStep from "./components/TextInputStep";
import TraitsStepView from "./components/TraitsStepView";
import styles from "./onboarding.module.scss";

const STEPS = ["name", "role", "traits", "knowledge"];

const getQuestion = (step: string, name: string): string => {
  switch (step) {
    case "name":
      return "First, what should Panda AI call you?";
    case "role":
      return `Great, ${name}. What's your role or profession?`;
    case "traits":
      return "Got it. What traits should Panda AI have?";
    case "knowledge":
      return `Finally, is there anything else Panda AI should know about you, ${name}?`;
    default:
      return "";
  }
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

  const renderStepContent = () => {
    switch (currentStepKey) {
      case "name":
        return (
          <TextInputStep
            placeholder={PLACEHOLDERS[currentStepKey]}
            onNext={handleNext}
            avatarInitial={data.name ? data.name.charAt(0).toUpperCase() : "🐼"}
            initialValue={data.name}
          />
        );
      case "role":
        return (
          <TextInputStep
            placeholder={PLACEHOLDERS[currentStepKey]}
            onNext={handleNext}
            avatarInitial={data.name ? data.name.charAt(0).toUpperCase() : "🐼"}
            initialValue={data.job}
          />
        );
      case "knowledge":
        return (
          <TextInputStep
            placeholder={PLACEHOLDERS[currentStepKey]}
            onNext={handleNext}
            avatarInitial={data.name ? data.name.charAt(0).toUpperCase() : "🐼"}
            multiline
            initialValue={data.extra_params}
          />
        );
      case "traits":
        return (
          <TraitsStepView
            placeholder={PLACEHOLDERS.traits}
            onNext={handleNext}
            avatarInitial={data.name ? data.name.charAt(0).toUpperCase() : "🐼"}
            initialValue={data.traits}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box className={styles.container}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          minHeight: "100vh",
          width: "100%",
          py: 4,
          px: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            maxWidth: "410px",
            marginRight: "auto",
            mb: 10,
          }}
        >
          <img
            src="/icons/inverse-icon.png"
            alt="Panda AI Logo"
            width={40}
            height={40}
          />
          <Typography
            fontSize="24px"
            fontWeight="600"
            color="#131A28"
            marginLeft="12px"
          >
            Panda AI
          </Typography>
        </Box>
        <Box className={styles.content}>
          <img src="/icons/panda.svg" alt="Panda" width={60} height={60} />
          <Typography variant="h6" align="left" className={styles.question}>
            {getQuestion(currentStepKey, data.name)}
          </Typography>
          {renderStepContent()}
        </Box>
      </Box>
    </Box>
  );
}