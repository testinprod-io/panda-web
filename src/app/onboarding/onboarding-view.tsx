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
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import TextInputStep from "@/components/onboarding/TextInputStep";
import TraitsStepView from "@/components/onboarding/TraitsStepView";
import StreamingText from "@/components/onboarding/StreamingText";
import Locale from "@/locales";

const STEPS = ["intro", "name", "role", "traits", "knowledge"];

const getQuestion = (step: string, name: string): string => {
  switch (step) {
    case "intro":
      return Locale.Onboarding.Welcome;
    case "name":
      return Locale.Onboarding.NameTitle;
    case "role":
      return `${
        name ? `${Locale.Onboarding.RoleTitle1} ${name}.` : ""
      } ${Locale.Onboarding.RoleTitle2}`;
    case "traits":
      return Locale.Onboarding.TraitsTitle;
    case "knowledge":
      return Locale.Onboarding.ExtraInformationTitle;
    default:
      return "";
  }
};

const PLACEHOLDERS: Record<string, string> = {
  name: Locale.Onboarding.NamePlaceholder,
  role: Locale.Onboarding.RolePlaceholder,
  traits: Locale.Onboarding.TraitsPlaceholder,
  knowledge: Locale.Onboarding.ExtraInformationPlaceholder,
};

export default function OnboardingView() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    intro: "",
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
      "intro",
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
  
  const handleSkip = () => {
    router.push("/");
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
        await apiClient.app.createCustomizedPrompts(encryptedPayload)
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
      <Box
        key="container"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#FFFFFF",
          color: "#1E1E1E",
        }}
      >
        <Box
          key="content"
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100vh",
            maxWidth: "min(500px, 90%)",
            gap: "1.5rem",
          }}
        >
          <CircularProgress color="inherit" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          ></motion.div>
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
              case "intro":
                return (
                  <Box
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: "1rem",
                      width: "80%",
                      maxWidth: "min(500px, 80%)",                    
                    }}
                  >
                    <Button
                      type="submit"
                      variant="contained"
                      onClick={() => handleNext("")}
                      sx={{
                        alignSelf: "flex-start",
                        height: "48px",
                        backgroundColor: "#131A28",
                        color: "#C1FF83",
                        borderRadius: "8px",
                        textTransform: "none",
                        fontSize: "16px",
                      }}
                    >
                      {Locale.Onboarding.Continue}
                    </Button>
                    <Button
                      type="button"
                      variant="text"
                      onClick={handleSkip}
                      sx={{
                        alignSelf: "flex-start",
                        height: "48px",
                        color: "#8a8a8a",
                        borderRadius: "8px",
                        textTransform: "none",
                        fontSize: "16px",
                      }}
                    >
                      {Locale.Onboarding.Skip}
                    </Button>
                  </Box>
                );
              case "name":
                return (
                  <TextInputStep
                    placeholder={PLACEHOLDERS[currentStepKey]}
                    onNext={handleNext}
                    onSkip={() => handleNext("")}
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
                    onSkip={() => handleNext("")}
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
                    onSkip={() => handleNext("")}
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
                    onSkip={() => handleNext("")}
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
    <Box
      key="container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#FFFFFF",
        color: "#1E1E1E",
      }}
    >
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
            src="/icons/inverse-icon.svg"
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
            Panda
          </Typography>
        </Box>
        <Box
          key="content"
          style={{
            display: "flex",
            flexDirection: "column",
            width: "80%",
            maxWidth: "min(500px, 80%)",
            gap: "1.5rem",
          }}
        >
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
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: "1.5rem",
              marginBottom: "1rem",
              maxWidth: "80%",
            }}
          />
          {renderStepContent()}
        </Box>
      </Box>
    </Box>
  );
}
