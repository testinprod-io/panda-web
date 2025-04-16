import { useEffect, useRef, useState } from "react";
import { Path } from "../constant";
import { IconButton } from "./button";
import styles from "./new-chat.module.scss";

import LeftIcon from "../icons/left.svg";
import LightningIcon from "../icons/lightning.svg";

import { useLocation, useNavigate } from "react-router-dom";
import Locale from "../locales";
import { useAppConfig, useChatStore } from "../store";
import { useCommand } from "../command";
import { showConfirm } from "./ui-lib";
import clsx from "clsx";
import { ChatInput } from "./ChatInput";

export function NewChat() {
  const chatStore = useChatStore();
  const navigate = useNavigate();
  const config = useAppConfig();
  const { state } = useLocation();

  const startChat = (initialMessage?: string) => {
    setTimeout(() => {
      chatStore.newSession();
      
      // If there's an initial message, send it to the chat
      if (initialMessage) {
        chatStore.onUserInput(initialMessage);
      }
      
      navigate(Path.Chat);
    }, 10);
  };

  useCommand({
    mask: (id) => {
      try {
        startChat();
      } catch {
        console.error("[New Chat] failed to create chat from mask id=", id);
      }
    },
  });

  return (
    <div className={styles["new-chat"]}>
      <div className={styles["header"]}>
        <IconButton
          icon={<LeftIcon />}
          text={Locale.NewChat.Return}
          onClick={() => navigate(Path.Home)}
        ></IconButton>
        {/* {!state?.fromHome && (
          <IconButton
            text={Locale.NewChat.NotShow}
            onClick={async () => {
              if (await showConfirm(Locale.NewChat.ConfirmNoShow)) {
                startChat();
                config.update(
                  (config) => (config.dontShowMaskSplashScreen = true),
                );
              }
            }}
          ></IconButton>
        )} */}
      </div>

      <div className={styles["content"]}>
        <h2 className={styles["title"]}>{Locale.NewChat.Title}</h2>
        {/* <div className={styles["sub-title"]}>{Locale.NewChat.SubTitle}</div> */}
        
        <ChatInput 
          onSubmit={(message) => startChat(message)} 
          placeholder="Ask me anything..."
        />
        
        {/* <div className={styles["actions"]}>
          <IconButton
            text={Locale.NewChat.Skip}
            onClick={() => startChat()}
            icon={<LightningIcon />}
            type="primary"
            shadow
            className={styles["skip"]}
          />
        </div> */}
      </div>
    </div>
  );
}
