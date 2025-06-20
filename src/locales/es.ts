const es = {
  Error: {
    Unauthorized: `😆 Uy, ocurrió un problema. No te preocupes`,
  },

  Chat: {
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
