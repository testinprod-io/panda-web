import { Language, Password } from "@mui/icons-material";

const en = {
  Error: {
    Unauthorized: `😆 Oops, there's an issue. No worries`,
  },
  Chat: {
    SubTitle: (count: number) => `${count} messages`,
    EditMessage: {
      Title: "Edit All Messages",
      Topic: {
        Title: "Topic",
        SubTitle: "Change the current topic",
      },
    },
    Actions: {
      ChatList: "Go To Chat List",
      Copy: "Copy",
      Stop: "Stop",
      Retry: "Retry",
      Pin: "Pin",
      Delete: "Delete",
      Edit: "Edit",
    },
    Commands: {
      new: "Start a new chat",
      newm: "Start a new chat with mask",
      next: "Next Chat",
      prev: "Previous Chat",
      clear: "Clear Context",
      fork: "Copy Chat",
      del: "Delete Chat",
    },
    InputActions: {
      Stop: "Stop",
      ToBottom: "To Latest",
      Theme: {
        auto: "Auto",
        light: "Light Theme",
        dark: "Dark Theme",
      },
      Prompt: "Prompts",
      Masks: "Masks",
      Clear: "Clear Context",
      Settings: "Settings",
      UploadImage: "Upload Images",
      UploadFile: "Upload Files",
    },
    Rename: "Rename Chat",
    Typing: "Typing…",
    Search: "Search",
    Input: (submitKey: string) => {
      const placeholders = [
        "Ask me anything. Encrypted by default.",
        "Private by design. Ask anything.",
        "Panda's listening. You are safe here",
      ];
      const selectedPlaceholder =
        placeholders[Math.floor(Math.random() * placeholders.length)];

      return `🔒 ${selectedPlaceholder}`;
    },
    Send: "Send",
    StartSpeak: "Start Speak",
    StopSpeak: "Stop Speak",
    Config: {
      Reset: "Reset to Default",
      SaveAs: "Save as Mask",
    },
  },
  Export: {
    Title: "Export Messages",
    Copy: "Copy All",
    Download: "Download",
    MessageFromYou: "Message From You",
    MessageFromChatGPT: "Message From ChatGPT",
    Share: "Share to ShareGPT",
    Format: {
      Title: "Export Format",
      SubTitle: "Markdown or PNG Image",
    },
    IncludeContext: {
      Title: "Including Context",
      SubTitle: "Export context prompts in mask or not",
    },
    Steps: {
      Select: "Select",
      Preview: "Preview",
    },
    Image: {
      Toast: "Capturing Image...",
      Modal: "Long press or right click to save image",
    },
  },
  Select: {
    Search: "Search",
    All: "Select All",
    Latest: "Select Latest",
    Clear: "Clear",
  },
  Home: {
    NewChat: "New Chat",
    DeleteChat: "Confirm to delete the selected conversation?",
    DeleteToast: "Chat Deleted",
    Revert: "Revert",
  },
  Settings: {
    Title: "Settings",
    SubTitle: "All Settings",
    ShowPassword: "ShowPassword",
    Danger: {
      Reset: {
        Title: "Reset All Settings",
        SubTitle: "Reset all setting items to default",
        Action: "Reset",
        Confirm: "Confirm to reset all settings to default?",
      },
      Clear: {
        Title: "Clear All Data",
        SubTitle: "Clear all messages and settings",
        Action: "Clear",
        Confirm: "Confirm to clear all messages and settings?",
      },
    },
    Lang: {
      Name: "Language", // ATTENTION: if you wanna add a new translation, please do not translate this value, leave it as `Language`
      All: "All Languages",
    },
    SendKey: "Send Key",
    Theme: "Theme",
  },
  Store: {
    DefaultTopic: "New Conversation",
    BotHello: "Hello! How can I assist you today?",
    Error: "Something went wrong, please try again later.",
    Prompt: {
      History: (content: string) =>
        "This is a summary of the chat history as a recap: " + content,
      Topic:
        "Please generate a four to five word title summarizing our conversation without any lead-in, punctuation, quotation marks, periods, symbols, bold text, or additional text. Remove enclosing quotation marks.",
      Summarize:
        "Summarize the discussion briefly in 200 words or less to use as a prompt for future context.",
    },
  },
  ChatList: {
    Today: "Today",
    Yesterday: "Yesterday",
    Previous7Days: "Previous 7 Days",
    Previous30Days: "Previous 30 Days",
    January: "January",
    February: "February",
    March: "March",
    April: "April",
    May: "May",
    June: "June",
    July: "July",
    August: "August",
    September: "September",
    October: "October",
    November: "November",
    December: "December",
    Chat: "Chat",
    Archive: "Archive",
    Rename: "Rename",
    Delete: "Delete",
    Share: "Share",
    More: "More",
  },
  Sidebar: {
    Project: "Project",
    NewChat: "New Chat",
    Access: "Access",
    LockService: "Lock Panda",
    Menu: "Menu",
    Settings: "Settings",
    Logout: "Log out",
  },
  PasswordModal: {
    Title: "Unlock Panda",
    Description: "Unlock and experience encrypted chat that fully protects your privacy",
    Submit: "Unlock",
    Placeholder: "Password",
    Logout: "Log out",
  },
  SettingsModal: {
    Settings: "Settings",
    General: "General",
    Help: "Help & FAQ",
    Language: "Language",
    CustomInstructions: "Custom Instructions",
    InactivityLockTimer: "Inactivity Lock Timer",
    DeleteAllChats: "Delete All Chats",
    LogoutTitle: "Log out on this device",
    Logout: "Log out",
    Delete: "Delete",
    Cancel: "Cancel",
    ClearChatData: "Clear chat data",
    ClearChatDataDescription: "This will delete all Chat. ",
    ClearChatDataDescription2: "Your messages are not used for training purposes and cannot be recovered, even if you choose not to reset your chat data.",
  },
  ProfileMenu: {
    Help: "Help & FAQ",
    Settings: "Settings",
    Logout: "Log out",
  },
  ChatHeader: {
    RevealSidebar: "Reveal Sidebar",
    NewChat: "New Chat",
  },
  ChatLayout: {
    Terms1: "By messaging Panda AI, you agree to ",
    Terms2: "our Terms",
    Terms3: " and have read ",
    Terms4: "our Privacy Policy",
  },
  CustomizedPrompts: { 
    Title: "Customized Panda",
    Description: "Introduce yourself to get better, more personalized responses",
    Save: "Save",
    Cancel: "Cancel",
    Delete: "Delete",
    EnableForNewChats: "Enable for new chats",
    Traits: "Traits",
    NicknamePlaceholder: "Nickname",
    NicknameDescription: "What should Panda call you?",
    JobPlaceholder: "Job",
    JobDescription: "What do you do?",
    TraitsPlaceholder: "Describe or select traits by clicking below",
    TraitsDescription: "What traits should Panda have?",
    ExtraParamsPlaceholder: "Anything else Panda should know about you?",
    ExtraParamsDescription: "Interests, values, or preferences to keep in mind",
  },
  Copy: {
    Success: "Copied to clipboard",
    Failed: "Copy failed, please grant permission to access clipboard",
  },
  Download: {
    Success: "Content downloaded to your directory.",
    Failed: "Download failed.",
  },
  SearchChat: {
    Name: "Search",
    Page: {
      Title: "Search Chat History",
      Search: "Enter search query to search chat history",
      NoResult: "No results found",
      NoData: "No data",
      Loading: "Loading...",
      SubTitle: (count: number) => `Found ${count} results`,
    },
    Item: {
      View: "View",
    },
  },
  NewChat: {
    Return: "Return",
    Skip: "Just Start",
    Title: () => {
       const titles = [
        "How can I help you today?",
        "Where should we begin?",
        "What's on the agenda today?",
        "What's on your mind today?",
      ];
      const selectedTitle =
        titles[Math.floor(Math.random() * titles.length)];

      return selectedTitle;
    },
  },

  UI: {
    Confirm: "Confirm",
    Cancel: "Cancel",
    Close: "Close",
    Create: "Create",
    Edit: "Edit",
  },
};

export default en;
