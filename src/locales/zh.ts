const zh = {
  Error: {
    Unauthorized: `😆 哎呀，出了点问题，不过不用担心`,
    IncorrectPassword: `密码错误`,
  },

  Chat: {
    Tagline: "守护隐私的 AI",
    SubTitle: (count: number) => `${count} 条消息`,
    EditMessage: {
      Title: "编辑全部消息",
      Topic: {
        Title: "主题",
        SubTitle: "更改当前主题",
      },
    },
    Actions: {
      ChatList: "返回聊天列表",
      Copy: "复制",
      Stop: "停止",
      Retry: "重试",
      Pin: "置顶",
      Delete: "删除",
      Edit: "编辑",
    },
    Commands: {
      new: "开始新的聊天",
      newm: "使用面具开始新的聊天",
      next: "下一条聊天",
      prev: "上一条聊天",
      clear: "清除上下文",
      fork: "复制聊天",
      del: "删除聊天",
    },
    InputActions: {
      Stop: "停止",
      ToBottom: "滚至最新",
      Theme: {
        auto: "自动",
        light: "浅色主题",
        dark: "深色主题",
      },
      Prompt: "提示",
      Masks: "面具",
      Clear: "清除上下文",
      Settings: "设置",
      UploadImage: "上传图片",
      UploadFile: "上传文件",
    },
    Rename: "重命名聊天",
    Typing: "正在输入…",
    Search: "搜索",
    Input: (_submitKey: string) => {
      const placeholders = [
        "随便问我任何问题，默认加密。",
        "天生私密，尽管提问。",
        "熊猫在听，你很安全。",
      ];
      const selectedPlaceholder =
        placeholders[Math.floor(Math.random() * placeholders.length)];
      return `🔒 ${selectedPlaceholder}`;
    },
    Send: "发送",
    StartSpeak: "开始朗读",
    StopSpeak: "停止朗读",
    Config: {
      Reset: "恢复默认",
      SaveAs: "保存为面具",
    },
  },

  Export: {
    Title: "导出消息",
    Copy: "全部复制",
    Download: "下载",
    MessageFromYou: "来自你的消息",
    MessageFromChatGPT: "来自 ChatGPT 的消息",
    Share: "分享到 ShareGPT",
    Format: {
      Title: "导出格式",
      SubTitle: "Markdown 或 PNG 图像",
    },
    IncludeContext: {
      Title: "包含上下文",
      SubTitle: "是否导出面具中的上下文提示",
    },
    Steps: {
      Select: "选择",
      Preview: "预览",
    },
    Image: {
      Toast: "正在捕获图像...",
      Modal: "长按或右键点击以保存图像",
    },
  },

  Select: {
    Search: "搜索",
    All: "全选",
    Latest: "选择最新",
    Clear: "清除",
  },

  Home: {
    NewChat: "新的聊天",
    DeleteChat: "确认删除选中的会话？",
    DeleteToast: "聊天已删除",
    Revert: "撤销",
  },

  Settings: {
    Title: "设置",
    SubTitle: "全部设置",
    ShowPassword: "显示密码",
    Danger: {
      Reset: {
        Title: "重置所有设置",
        SubTitle: "将所有设置项重置为默认",
        Action: "重置",
        Confirm: "确认将所有设置重置为默认？",
      },
      Clear: {
        Title: "清除所有数据",
        SubTitle: "清除所有消息和设置",
        Action: "清除",
        Confirm: "确认清除所有消息和设置？",
      },
    },
    Lang: {
      Name: "Language", // 请勿翻译此处
      All: "所有语言",
    },
    SendKey: "发送键",
    Theme: "主题",
  },

  Store: {
    DefaultTopic: "新的对话",
    BotHello: "你好！有什么可以帮助你？",
    Error: "出了点问题，请稍后再试。",
    Prompt: {
      History: (content: string) =>
        "以下是对话历史的摘要以供回顾：" + content,
      Topic:
        "请生成一个四到五个词的标题总结我们的对话，不要任何前导词、标点、引号、句号、符号、加粗文本或额外文字。移除包围的引号。",
      Summarize:
        "请将讨论内容简要概括在 200 字以内，以便作为未来上下文的提示。",
    },
  },
  Signup: {
    Title: "注册",
    SubTitle: "创建账户开始使用",
    Submit: "注册",
    Email: "邮箱地址",
    Placeholder: "name@email.com",
    Logout: "退出登录",
    Continue: "继续",
    OrContinueWith: "或继续使用",
    VerificationCode: "验证码",
    VerificationCodePlaceholder: "输入发送到邮箱的验证码",
    DontHaveAccount: "还没有账户？",
    TermsOfService1: "我同意",
    TermsOfService2: "服务条款",
    TermsOfService3: "和",
    TermsOfService4: "隐私政策",
  },
  SignIn: {
    Title: "登录",
    SubTitle: "登录账户开始使用",
    Submit: "登录",
    Email: "邮箱地址",
    Placeholder: "name@email.com",
    Logout: "退出登录",
    Continue: "继续",
    OrContinueWith: "或继续使用",
    VerificationCode: "验证码",
    VerificationCodePlaceholder: "输入发送到邮箱的验证码",
    AlreadyHaveAccount: "已有账户？",
  },
  Onboarding: {
    Encryption: {
      Title: "创建加密密码",
      Description:
        "为保护你的聊天数据，请设置密码。如果忘记，需要重置服务，所有数据将被永久删除。",
      Placeholder: (min: number, max: number) => `输入${min}–${max}个字符`,
      ConfirmPlaceholder: "确认密码",
      Confirm: "确认",
      PasswordLengthMismatch: (min: number, max: number) => `密码长度必须为${min}–${max}个字符。`,
      PasswordMismatch: "两次输入的密码不一致。",
      PasswordCreatedTitle: "已确认加密密码",
      PasswordCreatedDescription:
        "太棒了！从现在开始，你提交的所有数据都会使用该密码加密。",
      Continue: "继续",
    },
    Continue: "继续",
    Skip: "跳过",
    Welcome: "欢迎使用 Panda AI！让我们为你进行设置。",
    CustomizationTitle: "几个简单问题",
    NameTitle: "首先，Panda AI 应该怎么称呼你？",
    NamePlaceholder: "例如：Alex",
    RoleTitle1: "好的，",
    RoleTitle2: "你是做什么的？",
    RolePlaceholder: "例如：软件工程师",
    TraitsTitle: "知道了。Panda AI 应该具备哪些特性？",
    TraitsPlaceholder: "点击下方描述或选择特性",
    ExtraInformationTitle: "最后，还有什么 Panda AI 需要了解你的吗？",
    ExtraInformationPlaceholder:
      "例如：我更喜欢精准、数据驱动的回答。",
    Intro: {
      Title:
        "我是以隐私为先原则打造的 AI 助手。让我们一起头脑风暴、创作并学习。",
      Intro1Title: "数据只属于你。",
      Intro1Content:
        "每次对话都经过加密，仅存储在你的设备上。云端不保留任何内容，完全保护隐私。",
      Intro2Title: "无法追溯的对话。",
      Intro2Content:
        "由于无法追溯到你，本次讨论安全且保密。我不会用你的聊天记录进行训练。",
      Intro3Title: "一切尽在掌控。",
      Intro3Content:
        "你随时可以删除聊天和数据。一切由你说了算。",
    },
  },
  ChatList: {
    Today: "今天",
    Yesterday: "昨天",
    Previous7Days: "最近 7 天",
    Previous30Days: "最近 30 天",
    January: "一月",
    February: "二月",
    March: "三月",
    April: "四月",
    May: "五月",
    June: "六月",
    July: "七月",
    August: "八月",
    September: "九月",
    October: "十月",
    November: "十一月",
    December: "十二月",
    Chat: "聊天",
    Archive: "归档",
    Rename: "重命名",
    Delete: "删除",
    Share: "分享",
    More: "更多",
    NoConversations: "未找到会话",
  },
  Sidebar: {
    Project: "项目",
    NewChat: "新建聊天",
    Access: "访问",
    LockService: "锁定 Panda",
    Menu: "菜单",
    Settings: "设置",
    Logout: "退出登录",
  },
  PasswordModal: {
    Title: "解锁 Panda",
    Description: "解锁并体验完全保护隐私的加密聊天",
    Submit: "解锁",
    Placeholder: "密码",
    Logout: "退出登录",
  },
  SettingsModal: {
    Settings: "设置",
    General: "常规",
    Help: "帮助 & FAQ",
    Language: "语言",
    CustomInstructions: "自定义指令",
    InactivityLockTimer: "闲置锁定计时器",
    DeleteAllChats: "删除所有聊天",
    LogoutTitle: "在此设备上退出登录",
    Logout: "退出登录",
    Delete: "删除",
    Cancel: "取消",
    ClearChatData: "清除聊天数据",
    ClearChatDataDescription: "这将删除所有聊天记录。",
    ClearChatDataDescription2:
      "您的消息不会用于训练用途，即使不重置聊天数据也无法恢复。",
  },
  ProfileMenu: {
    Help: "帮助 & FAQ",
    Settings: "设置",
    Logout: "退出登录",
  },
  ChatHeader: {
    RevealSidebar: "显示侧边栏",
    NewChat: "新建聊天",
  },
  ChatLayout: {
    Terms1: "向 Panda AI 发送消息即表示您同意 ",
    Terms2: "我们的服务条款",
    Terms3: " 并已阅读 ",
    Terms4: "我们的隐私政策",
  },
  CustomizedPrompts: {
    Title: "定制 Panda",
    Description: "介绍自己，以获得更好、更个性化的回复",
    Save: "保存",
    Cancel: "取消",
    Delete: "删除",
    EnableForNewChats: "对新聊天启用",
    Traits: "特性",
    NicknamePlaceholder: "昵称",
    NicknameDescription: "Panda 应该如何称呼你？",
    JobPlaceholder: "职业",
    JobDescription: "你是做什么的？",
    TraitsPlaceholder: "点击下方输入或选择特性",
    TraitsDescription: "Panda 应该具备哪些特性？",
    ExtraParamsPlaceholder: "还有什么 Panda 需要了解你的吗？",
    ExtraParamsDescription: "兴趣、价值观或偏好",
  },

  Copy: {
    Success: "已复制到剪贴板",
    Failed: "复制失败，请授予剪贴板访问权限",
  },

  Download: {
    Success: "内容已下载到你的目录。",
    Failed: "下载失败。",
  },

  SearchChat: {
    Name: "搜索",
    Page: {
      Title: "搜索聊天记录",
      Search: "输入搜索词以搜索聊天记录",
      NoResult: "未找到结果",
      NoData: "无数据",
      Loading: "加载中...",
      SubTitle: (count: number) => `找到 ${count} 个结果`,
    },
    Item: {
      View: "查看",
    },
  },

  NewChat: {
    Return: "返回",
    Skip: "直接开始",
    Title: () => {
      const titles = [
        "今天我能帮你什么？",
        "我们从哪里开始？",
        "今天有什么安排？",
        "你在想什么？",
      ];
      return titles[Math.floor(Math.random() * titles.length)];
    },
  },

  UI: {
    Confirm: "确认",
    Cancel: "取消",
    Close: "关闭",
    Create: "创建",
    Edit: "编辑",
  },
};

export default zh;
