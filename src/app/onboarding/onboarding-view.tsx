"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
// import { useApiClient } from "@/providers/api-client-provider";
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
import { usePandaSDK } from "@/providers/sdk-provider";
import Locale from "@/locales";
import Image from "next/image";
import { useUser } from "@/sdk/hooks";
import IntroStepView from "@/components/onboarding/IntroStepView";
import CreatePasswordStep from "@/components/onboarding/CreatePasswordStep";
import PasswordConfirmationStep from "@/components/onboarding/PasswordConfirmationStep";
import InfoStepView from "@/components/onboarding/InfoStepView";

const STEPS = [
  "intro",
  "create-password",
  "password-confirmation",
  "customization",
  "name",
  "role",
  "traits",
  "knowledge",
];

const getQuestion = (step: string, name: string): string => {
  switch (step) {
    case "intro":
      return Locale.Onboarding.Welcome;
    case "create-password":
      return Locale.Onboarding.Encryption.Title;
    case "password-confirmation":
      return Locale.Onboarding.Encryption.PasswordCreatedTitle;
    case "customization":
      return Locale.Onboarding.CustomizationTitle;
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
    "create-password": "",
    "password-confirmation": "",
    customization: "",
    name: "",
    job: "",
    traits: "",
    extra_params: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const { sdk } = usePandaSDK();
  // const apiClient = useApiClient();
  const { updateCustomizedPrompts } = useUser();
  const router = useRouter();

  const handleNext = (value: string) => {
    const keys: (keyof typeof data)[] = [
      "intro",
      "create-password",
      "password-confirmation",
      "customization",
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
      const encryptedPayload = await encryptSystemPrompt(
        payload,
        sdk.encryption.encrypt.bind(sdk.encryption),
      );
      const responseData = await decryptSystemPrompt(
        await sdk.storage.createCustomizedPrompts(encryptedPayload),
        sdk.encryption.decrypt.bind(sdk.encryption),
      );
      updateCustomizedPrompts(responseData);
      router.push("/");
    } catch (error) {
      console.error("Failed to save onboarding data:", error);
      setIsSaving(false);
      // Optional: Show an error message to the user
      router.push("/"); // For now, just navigate away
    }
  }, [sdk.storage, data, router, updateCustomizedPrompts, sdk.encryption]);

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
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
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
                  <IntroStepView
                    onNext={() => handleNext("")}
                  />
                );
              case "create-password":
                return <CreatePasswordStep onNext={() => handleNext("")} />;
              case "password-confirmation":
                return (
                  <PasswordConfirmationStep
                    onStartChat={() => router.push("/")}
                    onCustomize={() => handleNext("")}
                  />
                );
              case "customization":
                return (
                  <InfoStepView
                    text="To make our conversations more helpful, I'm going to ask a few questions to get to know you better and customize your experience."
                    onNext={() => handleNext("")}
                  />
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
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
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
          <Box
            sx={{
              display: "block",
              ".dark &": {
                display: "none",
              },
            }}
          >
            <Image
              src="/icons/inverse-icon.svg"
              alt="Panda AI Logo"
              width={40}
              height={40}
            />
          </Box>
          <Box
            sx={{
              display: "none",
              ".dark &": {
                display: "block",
              },
            }}
          >
            <Image
              src="/icons/icon-white.svg"
              alt="Panda AI Logo"
              width={40}
              height={40}
            />
          </Box>
          <Typography
            fontSize="24px"
            fontWeight="600"
            color="var(--text-primary)"
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
