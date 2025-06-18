const es = {
  Error: {
    Unauthorized: `😆 Uy, ocurrió un problema. No te preocupes`,
    IncorrectPassword: `Contraseña incorrecta`,
  },

  Chat: {
    Tagline: "IA que protege tu privacidad",
    SubTitle: (count: number) => `${count} mensajes`,
    EditMessage: {
      Title: "Editar todos los mensajes",
      Topic: {
        Title: "Tema",
        SubTitle: "Cambiar el tema actual",
      },
    },
    Actions: {
      ChatList: "Ir a la lista de chats",
      Copy: "Copiar",
      Stop: "Detener",
      Retry: "Reintentar",
      Pin: "Fijar",
      Delete: "Eliminar",
      Edit: "Editar",
    },
    Commands: {
      new: "Iniciar un nuevo chat",
      newm: "Iniciar nuevo chat con máscara",
      next: "Chat siguiente",
      prev: "Chat anterior",
      clear: "Borrar contexto",
      fork: "Copiar chat",
      del: "Eliminar chat",
    },
    InputActions: {
      Stop: "Detener",
      ToBottom: "Ir al último",
      Theme: {
        auto: "Auto",
        light: "Tema claro",
        dark: "Tema oscuro",
      },
      Prompt: "Prompts",
      Masks: "Máscaras",
      Clear: "Borrar contexto",
      Settings: "Configuración",
      UploadImage: "Subir imágenes",
      UploadFile: "Subir archivos",
    },
    Rename: "Renombrar chat",
    Typing: "Escribiendo…",
    Search: "Buscar",
    Input: (_submitKey: string) => {
      const placeholders = [
        "Pregunta lo que quieras. Cifrado por defecto.",
        "Privado por diseño. Pregunta cualquier cosa.",
        "El panda escucha. Estás seguro aquí.",
      ];
      const selectedPlaceholder =
        placeholders[Math.floor(Math.random() * placeholders.length)];
      return `🔒 ${selectedPlaceholder}`;
    },
    Send: "Enviar",
    StartSpeak: "Iniciar lectura",
    StopSpeak: "Detener lectura",
    Config: {
      Reset: "Restablecer a predeterminado",
      SaveAs: "Guardar como máscara",
    },
  },

  Export: {
    Title: "Exportar mensajes",
    Copy: "Copiar todo",
    Download: "Descargar",
    MessageFromYou: "Mensaje tuyo",
    MessageFromChatGPT: "Mensaje de ChatGPT",
    Share: "Compartir en ShareGPT",
    Format: {
      Title: "Formato de exportación",
      SubTitle: "Markdown o imagen PNG",
    },
    IncludeContext: {
      Title: "Incluir contexto",
      SubTitle: "Exportar prompts de contexto en la máscara o no",
    },
    Steps: {
      Select: "Seleccionar",
      Preview: "Previsualizar",
    },
    Image: {
      Toast: "Capturando imagen...",
      Modal: "Mantén pulsado o clic derecho para guardar la imagen",
    },
  },

  Select: {
    Search: "Buscar",
    All: "Seleccionar todo",
    Latest: "Seleccionar reciente",
    Clear: "Limpiar",
  },

  Home: {
    NewChat: "Nuevo chat",
    DeleteChat: "¿Confirmar eliminación de la conversación seleccionada?",
    DeleteToast: "Chat eliminado",
    Revert: "Deshacer",
  },

  Settings: {
    Title: "Configuración",
    SubTitle: "Todas las configuraciones",
    ShowPassword: "Mostrar contraseña",
    Danger: {
      Reset: {
        Title: "Restablecer todas las configuraciones",
        SubTitle: "Restablecer todos los elementos a predeterminado",
        Action: "Restablecer",
        Confirm: "¿Confirmar restablecer todas las configuraciones?",
      },
      Clear: {
        Title: "Borrar todos los datos",
        SubTitle: "Borrar todos los mensajes y configuraciones",
        Action: "Borrar",
        Confirm: "¿Confirmar borrar todos los mensajes y configuraciones?",
      },
    },
    Lang: {
      Name: "Language", // ATENCIÓN: no traducir este valor
      All: "Todos los idiomas",
    },
    SendKey: "Tecla de envío",
    Theme: "Tema",
  },

  Store: {
    DefaultTopic: "Nueva conversación",
    BotHello: "¡Hola! ¿En qué puedo ayudarte hoy?",
    Error: "Algo salió mal, inténtalo de nuevo más tarde.",
    Prompt: {
      History: (content: string) =>
        "Este es un resumen del historial de chat: " + content,
      Topic:
        "Genera un título de cuatro a cinco palabras que resuma nuestra conversación, sin palabras iniciales, puntuación, comillas, puntos, símbolos, texto en negrita ni texto adicional. Elimina las comillas que lo encierran.",
      Summarize:
        "Resume la discusión en 200 palabras o menos para usarla como prompt de contexto futuro.",
    },
  },
  Signup: {
    Title: "Registrarse",
    SubTitle: "Crea una cuenta para empezar",
    Submit: "Registrarse",
    Email: "Correo electrónico",
    Placeholder: "name@email.com",
    Logout: "Cerrar sesión",
    Continue: "Continuar",
    OrContinueWith: "O continúa con",
    VerificationCode: "Código de verificación",
    VerificationCodePlaceholder: "Introduce el código enviado a tu correo",
    DontHaveAccount: "¿No tienes una cuenta?",
    TermsOfService1: "Acepto los",
    TermsOfService2: "Términos de servicio",
    TermsOfService3: "y la",
    TermsOfService4: "Política de privacidad",
  },
  SignIn: {
    Title: "Iniciar sesión",
    SubTitle: "Inicia sesión en tu cuenta para empezar",
    Submit: "Iniciar sesión",
    Email: "Correo electrónico",
    Placeholder: "name@email.com",
    Logout: "Cerrar sesión",
    Continue: "Continuar",
    OrContinueWith: "O continúa con",
    VerificationCode: "Código de verificación",
    VerificationCodePlaceholder: "Introduce el código enviado a tu correo",
    AlreadyHaveAccount: "¿Ya tienes una cuenta?",
  },
  Onboarding: {
    Encryption: {
      Title: "Crear contraseña de cifrado",
      Description:
        "Para proteger tus datos de chat, establece una contraseña. Si la olvidas, tendrás que restablecer el servicio y se eliminarán todos los datos de forma permanente.",
      Placeholder: (min: number, max: number) => `Introduce ${min}–${max} caracteres`,
      ConfirmPlaceholder: "Confirmar contraseña",
      Confirm: "Confirmar",
      PasswordLengthMismatch: (min: number, max: number) => `La contraseña debe tener entre ${min} y ${max} caracteres.`,
      PasswordMismatch: "Las contraseñas no coinciden.",
      PasswordCreatedTitle: "Contraseña de cifrado confirmada",
      PasswordCreatedDescription:
        "Genial. A partir de ahora, todos los datos que envíes se cifrarán con tu contraseña.",
      Continue: "Continuar",
    },
    Continue: "Continuar",
    Skip: "Omitir",
    Welcome: "¡Bienvenido a Panda AI! Vamos a configurarte.",
    NameTitle: "Primero, ¿cómo debería llamarte Panda AI?",
    NamePlaceholder: "p. ej. Alex",
    RoleTitle1: "Genial, ",
    RoleTitle2: "¿A qué te dedicas?",
    RolePlaceholder: "p. ej. Ingeniero de software",
    TraitsTitle: "Entendido. ¿Qué rasgos debería tener Panda AI?",
    TraitsPlaceholder:
      "Describe o selecciona rasgos haciendo clic abajo",
    ExtraInformationTitle:
      "Por último, ¿hay algo más que Panda AI deba saber sobre ti?",
    ExtraInformationPlaceholder:
      "p. ej. Prefiero respuestas precisas basadas en datos.",
    Intro: {
      Title:
        "Soy tu asistente de IA, creado con un principio de privacidad ante todo. Pensemos, creemos y aprendamos juntos.",
      Intro1Title: "Tus datos son tuyos.",
      Intro1Content:
        "Cada conversación está cifrada y se almacena solo en tu dispositivo. Nada se guarda en la nube, garantizando total privacidad.",
      Intro2Title: "Conversaciones sin rastro.",
      Intro2Content:
        "Como nada puede vincularse a ti, tus charlas son seguras y confidenciales. No entreno con tus conversaciones.",
      Intro3Title: "Tú tienes el control.",
      Intro3Content:
        "Puedes borrar tus chats y datos en cualquier momento. La última palabra la tienes tú.",
    },
    
  },

  ChatList: {
    Today: "Hoy",
    Yesterday: "Ayer",
    Previous7Days: "Últimos 7 días",
    Previous30Days: "Últimos 30 días",
    January: "Enero",
    February: "Febrero",
    March: "Marzo",
    April: "Abril",
    May: "Mayo",
    June: "Junio",
    July: "Julio",
    August: "Agosto",
    September: "Septiembre",
    October: "Octubre",
    November: "Noviembre",
    December: "Diciembre",
    Chat: "Chat",
    Archive: "Archivo",
    Rename: "Renombrar",
    Delete: "Eliminar",
    Share: "Compartir",
    More: "Más",
    NoConversations: "No se encontraron conversaciones",
  },
  Sidebar: {
    Project: "Proyecto",
    NewChat: "Nuevo chat",
    Access: "Acceso",
    LockService: "Bloquear Panda",
    Menu: "Menú",
    Settings: "Configuración",
    Logout: "Cerrar sesión",
  },
  PasswordModal: {
    Title: "Desbloquear Panda",
    Description:
      "Desbloquea y experimenta un chat cifrado que protege totalmente tu privacidad",
    Submit: "Desbloquear",
    Placeholder: "Contraseña",
    Logout: "Cerrar sesión",
  },
  SettingsModal: {
    Settings: "Configuración",
    General: "General",
    Help: "Ayuda y FAQ",
    Language: "Idioma",
    CustomInstructions: "Instrucciones personalizadas",
    InactivityLockTimer: "Temporizador de bloqueo por inactividad",
    DeleteAllChats: "Eliminar todos los chats",
    LogoutTitle: "Cerrar sesión en este dispositivo",
    Logout: "Cerrar sesión",
    Delete: "Eliminar",
    Cancel: "Cancelar",
    ClearChatData: "Borrar datos de chat",
    ClearChatDataDescription: "Esto eliminará todos los chats.",
    ClearChatDataDescription2:
      "Tus mensajes no se utilizan para entrenamiento y no pueden recuperarse, incluso si eliges no restablecer tus datos de chat.",
  },
  ProfileMenu: {
    Help: "Ayuda y FAQ",
    Settings: "Configuración",
    Logout: "Cerrar sesión",
  },
  ChatHeader: {
    RevealSidebar: "Mostrar barra lateral",
    NewChat: "Nuevo chat",
  },
  ChatLayout: {
    Terms1: "Al enviar mensajes a Panda AI, aceptas ",
    Terms2: "nuestros Términos",
    Terms3: " y has leído ",
    Terms4: "nuestra Política de privacidad",
  },
  CustomizedPrompts: {
    Title: "Panda personalizado",
    Description:
      "Preséntate para obtener respuestas mejores y más personalizadas",
    Save: "Guardar",
    Cancel: "Cancelar",
    Delete: "Eliminar",
    EnableForNewChats: "Habilitar para nuevos chats",
    Traits: "Rasgos",
    NicknamePlaceholder: "Apodo",
    NicknameDescription: "¿Cómo debería llamarte Panda?",
    JobPlaceholder: "Trabajo",
    JobDescription: "¿A qué te dedicas?",
    TraitsPlaceholder:
      "Describe o selecciona rasgos haciendo clic abajo",
    TraitsDescription: "¿Qué rasgos debería tener Panda?",
    ExtraParamsPlaceholder:
      "¿Algo más que Panda deba saber sobre ti?",
    ExtraParamsDescription:
      "Intereses, valores o preferencias a tener en cuenta",
  },

  Copy: {
    Success: "Copiado al portapapeles",
    Failed: "Error al copiar, concede permiso al portapapeles",
  },

  Download: {
    Success: "Contenido descargado en tu directorio.",
    Failed: "Error al descargar.",
  },

  SearchChat: {
    Name: "Buscar",
    Page: {
      Title: "Buscar historial de chat",
      Search: "Introduce la búsqueda para buscar en el historial",
      NoResult: "Sin resultados",
      NoData: "Sin datos",
      Loading: "Cargando...",
      SubTitle: (count: number) => `Se encontraron ${count} resultados`,
    },
    Item: {
      View: "Ver",
    },
  },

  NewChat: {
    Return: "Volver",
    Skip: "Comenzar",
    Title: () => {
      const titles = [
        "¿Cómo puedo ayudarte hoy?",
        "¿Por dónde empezamos?",
        "¿Qué hay en la agenda hoy?",
        "¿Qué tienes en mente?",
      ];
      return titles[Math.floor(Math.random() * titles.length)];
    },
  },

  UI: {
    Confirm: "Confirmar",
    Cancel: "Cancelar",
    Close: "Cerrar",
    Create: "Crear",
    Edit: "Editar",
  },
};

export default es;
