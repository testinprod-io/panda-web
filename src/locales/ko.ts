import type { PartialLocaleType } from "./index";

const ko: PartialLocaleType = {
  Error: {
    Unauthorized: `😆 문제가 발생했습니다. 괜찮아요`,
    IncorrectPassword: `비밀번호가 틀렸습니다`,
  },
  Chat: {
    Tagline: "프라이버시를 지켜주는 AI",
    SubTitle: (count: number) => `${count}개의 메시지`,
    EditMessage: {
      Title: "모든 메시지 수정",
      Topic: {
        Title: "주제",
        SubTitle: "현재 주제 변경",
      },
    },
    Actions: {
      ChatList: "채팅 목록으로 가기",
      Copy: "복사",
      Stop: "정지",
      Retry: "재시도",
      Pin: "고정",
      Delete: "삭제",
      Edit: "수정",
    },
    Commands: {
      new: "새로운 채팅 시작",
      newm: "마스크와 함께 새로운 채팅 시작",
      next: "다음 채팅",
      prev: "이전 채팅",
      clear: "대화 내용 지우기",
      fork: "채팅 복사",
      del: "채팅 삭제",
    },
    InputActions: {
      Stop: "정지",
      ToBottom: "최신으로",
      Theme: {
        auto: "자동",
        light: "라이트 테마",
        dark: "다크 테마",
      },
      Prompt: "프롬프트",
      Masks: "마스크",
      Clear: "대화 내용 지우기",
      Settings: "설정",
      UploadImage: "이미지 업로드",
      UploadFile: "파일 업로드",
    },
    Rename: "채팅 이름 바꾸기",
    Typing: "입력 중…",
    Search: "검색",
    Input: (submitKey: string) => {
      const placeholders = [
        "무엇이든 물어보세요. 기본적으로 암호화됩니다.",
        "개인 정보 보호를 최우선으로 설계되었습니다. 무엇이든 물어보세요.",
        "판다가 듣고 있어요. 여기는 안전합니다.",
      ];
      const selectedPlaceholder =
        placeholders[Math.floor(Math.random() * placeholders.length)];

      return `🔒 ${selectedPlaceholder}`;
    },
    Send: "전송",
    StartSpeak: "음성 입력 시작",
    StopSpeak: "음성 입력 중지",
    Config: {
      Reset: "기본값으로 재설정",
      SaveAs: "마스크로 저장",
    },
  },
  Export: {
    Title: "메시지 내보내기",
    Copy: "모두 복사",
    Download: "다운로드",
    MessageFromYou: "사용자 메시지",
    MessageFromChatGPT: "ChatGPT 메시지",
    Share: "ShareGPT에 공유",
    Format: {
      Title: "내보내기 형식",
      SubTitle: "마크다운 또는 PNG 이미지",
    },
    IncludeContext: {
      Title: "컨텍스트 포함",
      SubTitle: "마스크의 컨텍스트 프롬프트를 내보낼지 여부",
    },
    Steps: {
      Select: "선택",
      Preview: "미리보기",
    },
    Image: {
      Toast: "이미지 캡처 중...",
      Modal: "이미지를 저장하려면 길게 누르거나 마우스 오른쪽 버튼을 클릭하세요",
    },
  },
  Select: {
    Search: "검색",
    All: "모두 선택",
    Latest: "최신 선택",
    Clear: "선택 해제",
  },
  Home: {
    NewChat: "새로운 채팅",
    DeleteChat: "선택한 대화를 삭제하시겠습니까?",
    DeleteToast: "채팅이 삭제되었습니다",
    Revert: "되돌리기",
  },
  Settings: {
    Title: "설정",
    SubTitle: "모든 설정",
    ShowPassword: "비밀번호 표시",
    Danger: {
      Reset: {
        Title: "모든 설정 재설정",
        SubTitle: "모든 설정 항목을 기본값으로 재설정",
        Action: "재설정",
        Confirm: "모든 설정을 기본값으로 재설정하시겠습니까?",
      },
      Clear: {
        Title: "모든 데이터 지우기",
        SubTitle: "모든 메시지와 설정 지우기",
        Action: "지우기",
        Confirm: "모든 메시지와 설정을 지우시겠습니까?",
      },
    },
    Lang: {
      Name: "Language", // ATTENTION: if you wanna add a new translation, please do not translate this value, leave it as `Language`
      All: "모든 언어",
    },
    SendKey: "전송 키",
    Theme: "테마",
  },
  Store: {
    DefaultTopic: "새 대화",
    BotHello: "안녕하세요! 무엇을 도와드릴까요?",
    Error: "문제가 발생했습니다. 나중에 다시 시도해주세요.",
    Prompt: {
      History: (content: string) =>
        "다음은 채팅 기록 요약입니다: " + content,
      Topic:
        "따옴표, 마침표, 기호, 굵은 텍스트 또는 추가 텍스트 없이 대화를 요약하는 4~5단어 제목을 생성해 주세요. 바깥 따옴표는 제거해 주세요.",
      Summarize:
        "향후 컨텍스트에 사용할 프롬프트로 토론을 200단어 이하로 간략하게 요약하세요.",
    },
  }, 
  Signup: {
    Title: "가입하기",
    SubTitle: "시작하려면 계정을 생성하세요",
    Submit: "가입하기",
    Email: "이메일 주소",
    Placeholder: "name@email.com",
    Logout: "로그아웃",
    Continue: "계속",
    OrContinueWith: "또는 다음으로 계속",
    VerificationCode: "인증 코드",
    VerificationCodePlaceholder: "이메일로 전송된 코드를 입력하세요",
    DontHaveAccount: "계정이 없으신가요?",
    TermsOfService1: "다음에 동의합니다:",
    TermsOfService2: "서비스 이용약관",
    TermsOfService3: "및",
    TermsOfService4: "개인정보처리방침",
  },
  SignIn: {
    Title: "로그인",
    SubTitle: "계정에 로그인하여 시작하세요",
    Submit: "로그인",
    Email: "이메일 주소",
    Placeholder: "name@email.com",
    Logout: "로그아웃",
    Continue: "계속",
    OrContinueWith: "또는 다음으로 계속",
    VerificationCode: "인증 코드",
    VerificationCodePlaceholder: "이메일로 전송된 코드를 입력하세요",
    AlreadyHaveAccount: "이미 계정이 있으신가요?",
  },
  Onboarding: {
    Encryption: {
      Title: "암호화 비밀번호 생성",
      Description:
        "채팅 데이터를 보호하려면 비밀번호를 설정하세요. 잊어버릴 경우 서비스를 초기화해야 하며, 모든 데이터가 영구적으로 삭제됩니다.",
      Placeholder: (min: number, max: number) => `${min}–${max}자 입력`,
      ConfirmPlaceholder: "비밀번호 확인",
      Confirm: "확인",
      PasswordLengthMismatch: (min: number, max: number) => `비밀번호는 ${min}–${max}자여야 합니다.`,
      PasswordMismatch: "비밀번호가 일치하지 않습니다.",
      PasswordCreatedTitle: "암호화 비밀번호 설정 완료",
      PasswordCreatedDescription:
        "좋습니다! 이제부터 입력하시는 모든 데이터는 해당 비밀번호로 암호화됩니다.",
      Continue: "계속",
    },
    Continue: "계속",
    Skip: "건너뛰기",
    Welcome: "Panda AI에 오신 것을 환영합니다! 설정을 시작해 볼까요?",
    NameTitle: "먼저, Panda AI가 어떻게 불러야 할까요?",
    NamePlaceholder: "예: Alex",
    RoleTitle1: "좋아요, ",
    RoleTitle2: "무슨 일을 하시나요?",
    RolePlaceholder: "예: 소프트웨어 엔지니어",
    TraitsTitle: "알겠습니다. Panda AI가 어떤 특성을 가지면 좋을까요?",
    TraitsPlaceholder: "아래를 클릭하여 특성을 입력하거나 선택하세요",
    ExtraInformationTitle:
      "마지막으로, Panda AI가 알아야 할 다른 정보가 있을까요?",
    ExtraInformationPlaceholder:
      "예: 정확하고 데이터 기반의 답변을 선호합니다.",
  },
  ChatList: {
    Today: "오늘",
    Yesterday: "어제",
    Previous7Days: "지난 7일",
    Previous30Days: "지난 30일",
    January: "1월",
    February: "2월",
    March: "3월",
    April: "4월",
    May: "5월",
    June: "6월",
    July: "7월",
    August: "8월",
    September: "9월",
    October: "10월",
    November: "11월",
    December: "12월",
    Chat: "채팅",
    Archive: "보관함",
    Rename: "이름 변경",
    Delete: "삭제",
    Share: "공유",
    More: "더보기",
    NoConversations: "대화를 찾을 수 없습니다",
  },
  Sidebar: {
    Project: "프로젝트",
    NewChat: "새 채팅",
    Access: "액세스",
    LockService: "판다 잠그기",
    Menu: "메뉴",
    Settings: "설정",
    Logout: "로그아웃",
  },
  PasswordModal: {
    Title: "판다 잠금 해제",
    Description:
      "완전한 개인 정보 보호를 위한 암호화 채팅을 경험하려면 잠금을 해제하세요",
    Submit: "잠금 해제",
    Placeholder: "비밀번호",
    Logout: "로그아웃",
  },
  SettingsModal: {
    Settings: "설정",
    General: "일반",
    Help: "도움말 & FAQ",
    Language: "언어",
    CustomInstructions: "사용자 지침",
    InactivityLockTimer: "비활성 잠금 타이머",
    DeleteAllChats: "모든 채팅 삭제",
    LogoutTitle: "이 기기에서 로그아웃",
    Logout: "로그아웃",
    Delete: "삭제",
    Cancel: "취소",
    ClearChatData: "채팅 데이터 삭제",
    ClearChatDataDescription: "모든 채팅이 삭제됩니다.",
    ClearChatDataDescription2:
      "메시지는 학습에 사용되지 않으며, 채팅 데이터를 재설정하지 않더라도 복구할 수 없습니다.",
  },
  ProfileMenu: {
    Help: "도움말 & FAQ",
    Settings: "설정",
    Logout: "로그아웃",
  },
  ChatHeader: {
    RevealSidebar: "사이드바 열기",
    NewChat: "새 채팅",
  },
  ChatLayout: {
    Terms1: "Panda AI와 메시지를 주고받으면 ",
    Terms2: "이용약관",
    Terms3: "에 동의하며 ",
    Terms4: "개인정보 처리방침을 읽은 것으로 간주됩니다",
  },
  CustomizedPrompts: {
    Title: "맞춤형 판다",
    Description: "자기소개를 통해 더 개인화된 응답을 받아보세요",
    Save: "저장",
    Cancel: "취소",
    Delete: "삭제",
    EnableForNewChats: "새 채팅에 사용",
    Traits: "특성",
    NicknamePlaceholder: "닉네임",
    NicknameDescription: "판다가 어떻게 부르면 좋을까요?",
    JobPlaceholder: "직업",
    JobDescription: "무슨 일을 하시나요?",
    TraitsPlaceholder: "아래를 클릭해 특성을 입력하거나 선택하세요",
    TraitsDescription: "판다가 가져야 할 특성은 무엇인가요?",
    ExtraParamsPlaceholder: "판다가 더 알아야 할 사항이 있나요?",
    ExtraParamsDescription: "관심사, 가치관, 선호도를 알려주세요",
  },
  Copy: {
    Success: "클립보드에 복사되었습니다",
    Failed: "복사에 실패했습니다. 클립보드 접근 권한을 허용해주세요",
  },
  Download: {
    Success: "콘텐츠가 디렉토리에 다운로드되었습니다.",
    Failed: "다운로드에 실패했습니다.",
  },
  SearchChat: {
    Name: "검색",
    Page: {
      Title: "채팅 기록 검색",
      Search: "채팅 기록을 검색하려면 검색어를 입력하세요",
      NoResult: "결과를 찾을 수 없습니다",
      NoData: "데이터 없음",
      Loading: "불러오는 중...",
      SubTitle: (count: number) => `${count}개의 결과를 찾았습니다`,
    },
    Item: {
      View: "보기",
    },
  },
  NewChat: {
    Return: "돌아가기",
    Skip: "바로 시작",
    Title: () => {
       const titles = [
        "오늘 무엇을 도와드릴까요?",
        "어디서부터 시작할까요?",
        "오늘의 안건은 무엇인가요?",
        "오늘 무슨 생각을 하고 있나요?",
      ];
      const selectedTitle =
        titles[Math.floor(Math.random() * titles.length)];

      return selectedTitle;
    },
  },

  UI: {
    Confirm: "확인",
    Cancel: "취소",
    Close: "닫기",
    Create: "생성",
    Edit: "수정",
  },
};

export default ko;
