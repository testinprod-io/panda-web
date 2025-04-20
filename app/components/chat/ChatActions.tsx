import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconButton, CircularProgress } from '@mui/material';
import MuiSettingsIcon from '@mui/icons-material/Settings';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import MuiImageIcon from '@mui/icons-material/Image';
import KeyboardIcon from '@mui/icons-material/Keyboard';

import { ChatAction } from "./ChatAction";
import { ChatSession } from "@/app/types";
import { useAppConfig, ChatConfig } from "@/app/store";
import { useChatStore } from "@/app/store";
import { ServiceProvider, Path } from "@/app/constant";
import { isVisionModel, useMobileScreen } from "@/app/utils";
import Locale from "@/app/locales";

import styles from "./chat.module.scss";

export function ChatActions(props: {
  session?: ChatSession;
  uploadImage: () => void;
  setAttachImages: (images: string[]) => void;
  setUploading: (uploading: boolean) => void;
  uploading: boolean;
  // setShowShortcutKeyModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const config = useAppConfig();
  const chatStore = useChatStore();
  const router = useRouter();
  const isMobileScreen = useMobileScreen();

  const [showUploadImage, setShowUploadImage] = useState(false);

  const prevPropsAndStateRef = useRef<any>(null);

  useEffect(() => {
    const currentPropsAndState = {
      uploading: props.uploading,
      showUploadImage,
      sessionId: props.session?.id,
      model: props.session?.modelConfig.model,
      // Add other props/state if needed
    };

    if (prevPropsAndStateRef.current) {
      const changes: Record<string, { prev: any; current: any }> = {};
      for (const key in currentPropsAndState) {
        if (
          currentPropsAndState.hasOwnProperty(key) &&
          prevPropsAndStateRef.current.hasOwnProperty(key)
        ) {
          const prevValue = prevPropsAndStateRef.current[key];
          const currentValue = (currentPropsAndState as any)[key];
          let changed = false;

          // Handle array comparison specifically (compare length for this debugging log)
          if (Array.isArray(prevValue) && Array.isArray(currentValue)) {
            if (prevValue.length !== currentValue.length) {
              // Or use JSON.stringify for a simple deep compare if needed:
              // if (JSON.stringify(prevValue) !== JSON.stringify(currentValue)) {
              changed = true;
            }
          } else if (prevValue !== currentValue) {
            changed = true;
          }

          if (changed) {
            changes[key] = {
              prev: prevValue,
              current: currentValue,
            };
          }
        }
      }
      if (Object.keys(changes).length > 0) {
        console.log("[ChatActions] Re-render triggered by changes:", changes);
      }
    }

    prevPropsAndStateRef.current = currentPropsAndState;
  });

  const currentModel = props.session?.modelConfig.model;

  useEffect(() => {
    // Show upload image only if session exists and model is vision capable
    // Check props.session exists before accessing its properties
    const show = !!props.session && isVisionModel(props.session.modelConfig.model);
    setShowUploadImage(show);
    if (!show) {
      props.setAttachImages([]);
      props.setUploading(false);
    }
    // Depend only on session existence and setters (model is derived from session)
  }, [props.session, props.setAttachImages, props.setUploading]);

  return (
    <div className={styles["chat-input-actions"]}>
      <>
        {showUploadImage && (
          <ChatAction
            onClick={props.uploadImage}
            text={Locale.Chat.InputActions.UploadImage}
            icon={props.uploading ? <CircularProgress size={20} /> : <MuiImageIcon />}
          />
        )}
      </>
    </div>
  );
} 