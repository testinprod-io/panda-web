"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Switch,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import styles from "./customize-prompts-view.module.scss";
import { CustomizedPromptsResponse } from "@/sdk/client/types";
// import { useApiClient } from "@/providers/api-client-provider";
import { CustomizedPromptsData, decryptSystemPrompt, encryptSystemPrompt } from "@/types";
import { usePandaSDK } from "@/providers/sdk-provider";
import { useUser } from "@/sdk/hooks";
import Locale from "@/locales";
import PlusIcon from "@/public/icons/plus.svg";

interface Trait {
  id: string;
  label: string;
  selected: boolean;
}

const initialTraits: Trait[] = [
  { id: "chatty", label: "Chatty", selected: false },
  { id: "witty", label: "Witty", selected: false },
  { id: "straight", label: "Straight shooting", selected: false },
  { id: "encouraging", label: "Encouraging", selected: false },
  { id: "genz", label: "Gen Z", selected: false },
  { id: "skeptical", label: "Skeptical", selected: false },
  { id: "traditional", label: "Traditional", selected: false },
  { id: "forward", label: "Forward thinking", selected: false },
  { id: "poetic", label: "Poetic", selected: false },
  { id: "chill", label: "Chill", selected: false },
];

interface CustomizePromptsViewProps {
  onCloseRequest: () => void;
}

const EMPTY_PROMPTS_DATA: CustomizedPromptsResponse = {
  personal_info: { name: "", job: "" },
  prompts: { traits: "", extra_params: "" },
  created_at: "",
  updated_at: "",
  enabled: true,
};

export default function CustomizePromptsView({
  onCloseRequest,
}: CustomizePromptsViewProps) {
  const [name, setName] = useState("");
  const [job, setJob] = useState("");
  const [traitsText, setTraitsText] = useState("");
  const [extraParams, setExtraParams] = useState("");
  const [traits, setTraits] = useState<Trait[]>(
    initialTraits.map((t) => ({ ...t, selected: false })),
  );
  const { sdk } = usePandaSDK();
  // const apiClient = useApiClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [initialData, setInitialData] =
    useState<CustomizedPromptsData | null>(null);
  const [enableForNewChats, setEnableForNewChats] = useState(true);
  const { updateCustomizedPrompts } = useUser();

  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await decryptSystemPrompt(await sdk.storage.getCustomizedPrompts(), sdk.encryption.decrypt.bind(sdk.encryption));
        setName(data.personal_info?.name || "");
        setJob(data.personal_info?.job || "");
        const currentTraitsText = data.prompts?.traits || "";
        setTraitsText(currentTraitsText);
        setExtraParams(data.prompts?.extra_params || "");
        setEnableForNewChats(data.enabled);

        const loadedTextTraits = currentTraitsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        setTraits(
          initialTraits.map((trait) => ({
            ...trait,
            selected: loadedTextTraits.includes(trait.label),
          })),
        );

        setInitialData(data);
        setIsUpdateMode(true);
      } catch (apiError: any) {
        if (
          apiError instanceof Error &&
          "status" in apiError &&
          (apiError as any).status === 404
        ) {
          setName("");
          setJob("");
          setTraitsText("");
          setExtraParams("");
          setTraits(initialTraits.map((t) => ({ ...t, selected: false })));
          setInitialData(EMPTY_PROMPTS_DATA);
          setIsUpdateMode(false);
        } else {
          setError(apiError.message || "Failed to load customized prompts.");
          setInitialData(EMPTY_PROMPTS_DATA); // Set to empty on error to allow creating new
          setIsUpdateMode(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, [sdk.storage]);

  const handleTraitToggle = (traitId: string) => {
    const traitToToggle = traits.find((t) => t.id === traitId);
    if (!traitToToggle) return;

    const currentTextTraits = traitsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    let newTextTraitsArray: string[];
    let newSelectedState: boolean;

    if (currentTextTraits.includes(traitToToggle.label)) {
      newTextTraitsArray = currentTextTraits.filter(
        (t) => t !== traitToToggle.label,
      );
      newSelectedState = false;
    } else {
      newTextTraitsArray = [...currentTextTraits, traitToToggle.label];
      newSelectedState = true;
    }
    setTraitsText(newTextTraitsArray.join(", "));

    setTraits((prevTraits) =>
      prevTraits.map((trait) =>
        trait.id === traitId ? { ...trait, selected: newSelectedState } : trait,
      ),
    );
  };

  const isFormDirty = () => {
    if (!initialData)
      return (
        name.trim() !== "" ||
        job.trim() !== "" ||
        traitsText.trim() !== "" ||
        extraParams.trim() !== ""
      );

    if (!isUpdateMode) {
      // Creating new: dirty if any relevant field has input
      return (
        name.trim() !== "" ||
        job.trim() !== "" ||
        traitsText.trim() !== "" ||
        extraParams.trim() !== "" ||
        enableForNewChats !== initialData?.enabled
      );
    }
    // Updating existing: dirty if different from initial
    return (
      name !== (initialData.personal_info?.name || "") ||
      job !== (initialData.personal_info?.job || "") ||
      traitsText !== (initialData.prompts?.traits || "") ||
      extraParams !== (initialData.prompts?.extra_params || "") ||
      enableForNewChats !== initialData.enabled
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const payload: CustomizedPromptsData = {
      personal_info: {},
      prompts: {},
      enabled: enableForNewChats,
    };

    payload.personal_info!.name = name.trim();
    payload.personal_info!.job = job.trim();
    payload.prompts!.traits = traitsText.trim();
    payload.prompts!.extra_params = extraParams.trim();
    
    try {
      const encryptedPayload = await encryptSystemPrompt(payload, sdk.encryption.encrypt.bind(sdk.encryption));
      let responseData: CustomizedPromptsData;
      if (isUpdateMode) {
        responseData = await decryptSystemPrompt(await sdk.storage.updateCustomizedPrompts(encryptedPayload), sdk.encryption.decrypt.bind(sdk.encryption));
      } else {
        responseData = await decryptSystemPrompt(await sdk.storage.createCustomizedPrompts(encryptedPayload), sdk.encryption.decrypt.bind(sdk.encryption));
      }
      updateCustomizedPrompts(responseData);
      setName(responseData.personal_info?.name || "");
      setJob(responseData.personal_info?.job || "");
      const newTraitsText = responseData.prompts?.traits || "";
      setTraitsText(newTraitsText);
      setExtraParams(responseData.prompts?.extra_params || "");
      setEnableForNewChats(responseData.enabled);

      const loadedTextTraits = newTraitsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      setTraits(
        initialTraits.map((trait) => ({
          ...trait,
          selected: loadedTextTraits.includes(trait.label),
        })),
      );

      setInitialData(responseData);
      setIsUpdateMode(true);
      // onNavigateBack(); // Optionally navigate back
    } catch (apiError: any) {
      setError(apiError.message || "Failed to save customized prompts.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onCloseRequest(); // Use the new prop name
  };

  if (isLoading) {
    return (
      <Box
        className={styles.viewContainer}
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "300px",
        }}
      >
        <CircularProgress size={24} color="inherit" />
      </Box>
    );
  }

  const canSave = !isSaving && isFormDirty();

  return (
    <Box className={styles.viewContainer}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box className={styles.header}>
        <Typography variant="h5" className={styles.title}>
          {Locale.CustomizedPrompts.Title}
        </Typography>
        <Typography className={styles.subtitle}>
          {Locale.CustomizedPrompts.Description}
        </Typography>
      </Box>

      <Divider className={styles.divider} />

      <Box className={styles.formArea}>
        <Box className={styles.formSection}>
          <Typography className={styles.label}>
            {Locale.CustomizedPrompts.NicknameDescription}
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={Locale.CustomizedPrompts.NicknamePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.textField}
            disabled={isSaving || !enableForNewChats}
          />
        </Box>

        <Box className={styles.formSection}>
          <Typography className={styles.label}>{Locale.CustomizedPrompts.JobDescription}</Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={Locale.CustomizedPrompts.JobPlaceholder}
            value={job}
            onChange={(e) => setJob(e.target.value)}
            className={styles.textField}
            disabled={isSaving || !enableForNewChats}
          />
        </Box>

        <Box className={styles.formSection}>
          <Typography className={styles.label}>
            {Locale.CustomizedPrompts.TraitsDescription}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder={Locale.CustomizedPrompts.TraitsPlaceholder}
            value={traitsText}
            onChange={(e) => setTraitsText(e.target.value)}
            className={styles.textArea}
            disabled={isSaving || !enableForNewChats}
            onBlur={() => {
              const currentTextTraits = traitsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              setTraits((prevTraits) =>
                prevTraits.map((trait) => ({
                  ...trait,
                  selected: currentTextTraits.includes(trait.label),
                })),
              );
            }}
          />
          <Box className={styles.traitsContainer}>
            {traits.map((trait) => (
              <Chip
                key={trait.id}
                icon={<PlusIcon />}
                label={trait.label}
                onClick={() => !isSaving && handleTraitToggle(trait.id)}
                className={clsx(
                  styles.traitChip,
                  trait.selected && styles.selectedTrait,
                )}
                variant={trait.selected ? "filled" : "outlined"}
                clickable={!isSaving}
                disabled={isSaving || !enableForNewChats}
              />
            ))}
          </Box>
        </Box>

        <Box className={styles.formSection}>
          <Typography className={styles.label}>
            {Locale.CustomizedPrompts.ExtraParamsDescription}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder={Locale.CustomizedPrompts.ExtraParamsPlaceholder}
            value={extraParams}
            onChange={(e) => setExtraParams(e.target.value)}
            className={styles.textArea}
            disabled={isSaving || !enableForNewChats}
          />
        </Box>
      </Box>

      <Box className={styles.actionsFooter}>
        <Box
          sx={{ display: "flex", alignItems: "center", marginRight: "auto" }}
        >
          <Switch
            checked={enableForNewChats}
            onChange={(e) => setEnableForNewChats(e.target.checked)}
            disabled={isSaving}
            className={styles.blackAndWhiteSwitch}
          />
          <Typography sx={{ fontSize: "14px", color: "var(--text-primary)" }}>
            {Locale.CustomizedPrompts.EnableForNewChats}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          disableRipple={true}
          onClick={handleCancel}
          className={styles.cancelButton}
          disabled={isSaving}
        >
          {Locale.CustomizedPrompts.Cancel}
        </Button>
        <Button
          variant="contained"
          disableRipple={true}
          onClick={handleSave}
          className={styles.saveButton}
          disabled={!canSave || isSaving}
        >
          {isSaving ? <CircularProgress size={24} color="inherit" /> : Locale.CustomizedPrompts.Save}
        </Button>
      </Box>
    </Box>
  );
}

function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
