const ja = {
  Error: {
    Unauthorized: `😆 おっと、問題が発生しました。でもご安心ください`,
    IncorrectPassword: `パスワードが違います`,
  },

  Chat: {
    Tagline: "プライバシーを守るAI",
    SubTitle: (count: number) => `${count} 件のメッセージ`,
    EditMessage: {
      Title: "すべてのメッセージを編集",
      Topic: {
        Title: "トピック",
        SubTitle: "現在のトピックを変更",
      },
    },
    Actions: {
      ChatList: "チャット一覧へ",
      Copy: "コピー",
      Stop: "停止",
      Retry: "再試行",
      Pin: "ピン留め",
      Delete: "削除",
      Edit: "編集",
    },
    Commands: {
      new: "新しいチャットを開始",
      newm: "マスク付きで新規チャット",
      next: "次のチャット",
      prev: "前のチャット",
      clear: "コンテキストをクリア",
      fork: "チャットを複製",
      del: "チャットを削除",
    },
    InputActions: {
      Stop: "停止",
      ToBottom: "最新へスクロール",
      Theme: {
        auto: "自動",
        light: "ライトテーマ",
        dark: "ダークテーマ",
      },
      Prompt: "プロンプト",
      Masks: "マスク",
      Clear: "コンテキストをクリア",
      Settings: "設定",
      UploadImage: "画像をアップロード",
      UploadFile: "ファイルをアップロード",
    },
    Rename: "チャット名を変更",
    Typing: "入力中…",
    Search: "検索",
    Input: (_submitKey: string) => {
      const placeholders = [
        "何でも聞いてください。デフォルトで暗号化されています。",
        "プライバシー重視。お気軽にどうぞ。",
        "パンダが聞いています。ここは安全です。",
      ];
      const selectedPlaceholder =
        placeholders[Math.floor(Math.random() * placeholders.length)];
      return `🔒 ${selectedPlaceholder}`;
    },
    Send: "送信",
    StartSpeak: "読み上げ開始",
    StopSpeak: "読み上げ停止",
    Config: {
      Reset: "デフォルトに戻す",
      SaveAs: "マスクとして保存",
    },
  },

  Export: {
    Title: "メッセージをエクスポート",
    Copy: "すべてコピー",
    Download: "ダウンロード",
    MessageFromYou: "あなたのメッセージ",
    MessageFromChatGPT: "ChatGPT のメッセージ",
    Share: "ShareGPT で共有",
    Format: {
      Title: "エクスポート形式",
      SubTitle: "Markdown または PNG 画像",
    },
    IncludeContext: {
      Title: "コンテキストを含める",
      SubTitle: "マスク内のコンテキストプロンプトを含めるか",
    },
    Steps: {
      Select: "選択",
      Preview: "プレビュー",
    },
    Image: {
      Toast: "画像をキャプチャ中...",
      Modal: "長押しまたは右クリックで画像を保存",
    },
  },

  Select: {
    Search: "検索",
    All: "すべて選択",
    Latest: "最新を選択",
    Clear: "クリア",
  },

  Home: {
    NewChat: "新しいチャット",
    DeleteChat: "選択した会話を削除しますか？",
    DeleteToast: "チャットを削除しました",
    Revert: "元に戻す",
  },

  Settings: {
    Title: "設定",
    SubTitle: "すべての設定",
    ShowPassword: "パスワードを表示",
    Danger: {
      Reset: {
        Title: "すべての設定をリセット",
        SubTitle: "すべての設定を既定値に戻す",
        Action: "リセット",
        Confirm: "本当にすべての設定をリセットしますか？",
      },
      Clear: {
        Title: "すべてのデータを削除",
        SubTitle: "メッセージと設定をすべて削除",
        Action: "削除",
        Confirm: "本当にすべてのメッセージと設定を削除しますか？",
      },
    },
    Lang: {
      Name: "Language", // 新しい翻訳を追加する場合、ここは翻訳しないでください
      All: "すべての言語",
    },
    SendKey: "送信キー",
    Theme: "テーマ",
  },

  Store: {
    DefaultTopic: "新しい会話",
    BotHello: "こんにちは！どのようにお手伝いできますか？",
    Error: "問題が発生しました。後でもう一度お試しください。",
    Prompt: {
      History: (content: string) =>
        "以下はチャット履歴の概要です: " + content,
      Topic:
        "会話を要約する 4〜5 語のタイトルを生成してください。前置き、句読点、引用符、ピリオド、記号、太字、その他のテキストは含めないでください。引用符も削除してください。",
      Summarize:
        "議論内容を 200 字以内で簡潔にまとめ、将来のコンテキスト用プロンプトとして使用します。",
    },
  },
  Signup: {
    Title: "サインアップ",
    SubTitle: "始めるにはアカウントを作成してください",
    Submit: "サインアップ",
    Email: "メールアドレス",
    Placeholder: "name@email.com",
    Logout: "ログアウト",
    Continue: "続行",
    OrContinueWith: "または次で続行",
    VerificationCode: "認証コード",
    VerificationCodePlaceholder: "メールで送信されたコードを入力してください",
    DontHaveAccount: "アカウントをお持ちでないですか？",
    TermsOfService1: "私は",
    TermsOfService2: "利用規約",
    TermsOfService3: "および",
    TermsOfService4: "プライバシーポリシーに同意します",
  },
  SignIn: {
    Title: "サインイン",
    SubTitle: "アカウントにサインインして始めましょう",
    Submit: "ログイン",
    Email: "メールアドレス",
    Placeholder: "name@email.com",
    Logout: "ログアウト",
    Continue: "続行",
    OrContinueWith: "または次で続行",
    VerificationCode: "認証コード",
    VerificationCodePlaceholder: "メールで送信されたコードを入力してください",
    AlreadyHaveAccount: "すでにアカウントをお持ちですか？",
  },
  Onboarding: {
    Encryption: {
      Title: "暗号化パスワードを作成",
      Description:
        "チャットデータを保護するためにパスワードを設定してください。忘れた場合はサービスをリセットする必要があり、すべてのデータが永久に削除されます。",
      Placeholder: (min: number, max: number) => `${min}〜${max}文字を入力`,
      ConfirmPlaceholder: "パスワードを確認",
      Confirm: "確認",
      PasswordLengthMismatch: (min: number, max: number) => `パスワードは${min}〜${max}文字である必要があります。`,
      PasswordMismatch: "パスワードが一致しません。",
      PasswordCreatedTitle: "暗号化パスワードが確認されました",
      PasswordCreatedDescription:
        "素晴らしい！これから送信するすべてのデータはあなたのパスワードで暗号化されます。",
      Continue: "続行",
    },
    Continue: "続行",
    Skip: "スキップ",
    Welcome: "Panda AI へようこそ！セットアップを始めましょう。",
    CustomizationTitle: "簡単な質問をいくつか",
    NameTitle: "まず、Panda AI はあなたを何と呼べば良いですか？",
    NamePlaceholder: "例: Alex",
    RoleTitle1: "了解です、",
    RoleTitle2: "ご職業は？",
    RolePlaceholder: "例: ソフトウェアエンジニア",
    TraitsTitle: "わかりました。Panda AI にはどんな特性を持たせましょう？",
    TraitsPlaceholder: "下をクリックして特性を入力または選択",
    ExtraInformationTitle:
      "最後に、Panda AI が知っておくべきその他の情報はありますか？",
    ExtraInformationPlaceholder:
      "例: 正確でデータ重視の回答を好みます。",
    Intro: {
      Title:
        "私はプライバシーを最優先に設計された AI アシスタントです。一緒にブレインストーミングし、創造し、学びましょう。",
      Intro1Title: "あなたのデータはあなたのもの。",
      Intro1Content:
        "すべての会話は暗号化され、あなたのデバイスにのみ保存されます。クラウドには一切保存されないため、完全なプライバシーが守られます。",
      Intro2Title: "追跡できない会話。",
      Intro2Content:
        "あなたに結び付けられる情報がないため、議論は安全かつ秘密です。私はあなたのチャットを学習に使用しません。",
      Intro3Title: "コントロールはあなたに。",
      Intro3Content:
        "チャットやデータはいつでも削除できます。最終的な決定権はあなたにあります。",
    },
  },

  ChatList: {
    Today: "今日",
    Yesterday: "昨日",
    Previous7Days: "過去7日間",
    Previous30Days: "過去30日間",
    January: "1月",
    February: "2月",
    March: "3月",
    April: "4月",
    May: "5月",
    June: "6月",
    July: "7月",
    August: "8月",
    September: "9月",
    October: "10月",
    November: "11月",
    December: "12月",
    Chat: "チャット",
    Archive: "アーカイブ",
    Rename: "名前を変更",
    Delete: "削除",
    Share: "共有",
    More: "その他",
    NoConversations: "会話が見つかりません",
  },
  Sidebar: {
    Project: "プロジェクト",
    NewChat: "新しいチャット",
    Access: "アクセス",
    LockService: "パンダをロック",
    Menu: "メニュー",
    Settings: "設定",
    Logout: "ログアウト",
  },
  PasswordModal: {
    Title: "パンダを解除",
    Description:
      "プライバシーを完全に守る暗号化チャットを体験するには解除してください",
    Submit: "解除",
    Placeholder: "パスワード",
    Logout: "ログアウト",
  },
  SettingsModal: {
    Settings: "設定",
    General: "一般",
    Help: "ヘルプ & FAQ",
    Language: "言語",
    CustomInstructions: "カスタム指示",
    InactivityLockTimer: "非アクティブ時ロックタイマー",
    DeleteAllChats: "すべてのチャットを削除",
    LogoutTitle: "このデバイスからログアウト",
    Logout: "ログアウト",
    Delete: "削除",
    Cancel: "キャンセル",
    ClearChatData: "チャットデータをクリア",
    ClearChatDataDescription: "すべてのチャットが削除されます。",
    ClearChatDataDescription2:
      "メッセージは学習に使用されず、チャットデータをリセットしなくても復元できません。",
  },
  ProfileMenu: {
    Help: "ヘルプ & FAQ",
    Settings: "設定",
    Logout: "ログアウト",
  },
  ChatHeader: {
    RevealSidebar: "サイドバーを表示",
    NewChat: "新しいチャット",
  },
  ChatLayout: {
    Terms1: "Panda AI にメッセージを送信することで、",
    Terms2: "利用規約",
    Terms3: "に同意し、",
    Terms4: "プライバシーポリシーを読んだものとみなされます",
  },
  CustomizedPrompts: {
    Title: "カスタマイズパンダ",
    Description: "自己紹介して、よりパーソナライズされた回答を受け取りましょう",
    Save: "保存",
    Cancel: "キャンセル",
    Delete: "削除",
    EnableForNewChats: "新しいチャットで有効化",
    Traits: "特性",
    NicknamePlaceholder: "ニックネーム",
    NicknameDescription: "パンダはあなたを何と呼べばいいですか？",
    JobPlaceholder: "職業",
    JobDescription: "あなたの仕事は？",
    TraitsPlaceholder: "下をクリックして特性を入力・選択",
    TraitsDescription: "パンダはどんな特性を持つべきですか？",
    ExtraParamsPlaceholder: "パンダが知っておくべきその他の情報は？",
    ExtraParamsDescription: "興味、価値観、好みなどを入力してください",
  },
  Copy: {
    Success: "クリップボードにコピーしました",
    Failed: "コピーに失敗しました。クリップボードへのアクセスを許可してください",
  },

  Download: {
    Success: "内容がディレクトリにダウンロードされました。",
    Failed: "ダウンロードに失敗しました。",
  },

  SearchChat: {
    Name: "検索",
    Page: {
      Title: "チャット履歴を検索",
      Search: "検索クエリを入力してチャット履歴を検索",
      NoResult: "結果が見つかりません",
      NoData: "データなし",
      Loading: "読み込み中...",
      SubTitle: (count: number) => `${count} 件の結果`,
    },
    Item: {
      View: "表示",
    },
  },

  NewChat: {
    Return: "戻る",
    Skip: "すぐ始める",
    Title: () => {
      const titles = [
        "今日は何をお手伝いしましょう？",
        "どこから始めますか？",
        "今日の予定は？",
        "何が気になりますか？",
      ];
      return titles[Math.floor(Math.random() * titles.length)];
    },
  },

  UI: {
    Confirm: "確認",
    Cancel: "キャンセル",
    Close: "閉じる",
    Create: "作成",
    Edit: "編集",
  },
};

export default ja;
