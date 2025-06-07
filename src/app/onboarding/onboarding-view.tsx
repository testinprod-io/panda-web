"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/providers/api-client-provider";
import { useAppConfig } from "@/store/config";
import {
  CustomizedPromptsData,
  encryptSystemPrompt,
  decryptSystemPrompt,
} from "@/types";
import { Box, CircularProgress, Typography } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import TextInputStep from "./components/TextInputStep";
import TraitsStepView from "./components/TraitsStepView";
import StreamingText from "./components/StreamingText";
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

  const handleSave = useCallback(async () => {
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
  }, [apiClient.app, data, router, setCustomizedPrompts]);

  useEffect(() => {
    if (step === STEPS.length && !isSaving) {
      handleSave();
    }
  }, [step, isSaving, handleSave]);

  if (step === STEPS.length || isSaving) {
    return (
      <Box className={styles.container} style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}>
        <Box className={styles.content}>
          <CircularProgress color="inherit" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* <Typography sx={{ color: "black", mt: 2 }}>
              Personalizing your experience...
            </Typography> */}
          </motion.div>
        </Box>
      </Box>
    );
  }

  const currentStepKey = STEPS[step];

  const renderStepContent = () => {
    const key = currentStepKey || "loading";
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {(() => {
            switch (currentStepKey) {
              case "name":
                return (
                  <TextInputStep
                    placeholder={PLACEHOLDERS[currentStepKey]}
                    onNext={handleNext}
                    avatarInitial={
                      data.name ? data.name.charAt(0).toUpperCase() : "🐼"
                    }
                    initialValue={data.name}
                  />
                );
              case "role":
                return (
                  <TextInputStep
                    placeholder={PLACEHOLDERS[currentStepKey]}
                    onNext={handleNext}
                    avatarInitial={
                      data.name ? data.name.charAt(0).toUpperCase() : "🐼"
                    }
                    initialValue={data.job}
                  />
                );
              case "knowledge":
                return (
                  <TextInputStep
                    placeholder={PLACEHOLDERS[currentStepKey]}
                    onNext={handleNext}
                    avatarInitial={
                      data.name ? data.name.charAt(0).toUpperCase() : "🐼"
                    }
                    multiline
                    initialValue={data.extra_params}
                  />
                );
              case "traits":
                return (
                  <TraitsStepView
                    placeholder={PLACEHOLDERS.traits}
                    onNext={handleNext}
                    avatarInitial={
                      data.name ? data.name.charAt(0).toUpperCase() : "🐼"
                    }
                    initialValue={data.traits}
                  />
                );
              default:
                return null;
            }
          })()}
        </motion.div>
      </AnimatePresence>
    );
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
          // initial={{ opacity: 0, y: -20 }}
          // animate={{ opacity: 1, y: 0 }}
          // transition={{ duration: 0.5 }}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            maxWidth: "410px",
            marginRight: "auto",
            marginBottom: "80px",
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
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.2,
              ease: [0, 0.71, 0.2, 1.01],
            }}
          >
            <img src="/icons/panda.svg" alt="Panda" width={60} height={60} />
          </motion.div>
          <StreamingText
            text={getQuestion(currentStepKey, data.name)}
            className={styles.question}
          />
          {renderStepContent()}
        </Box>
      </Box>
    </Box>
  );
}