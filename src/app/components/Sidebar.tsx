// 'use client';

// import { PlusIcon } from '@heroicons/react/24/solid';

// interface SidebarProps {
//   chats: { id: string; title: string }[];
//   activeChat: string | null;
//   onChatSelect: (id: string) => void;
//   onNewChat: () => void;
// }

// export default function Sidebar({ chats, activeChat, onChatSelect, onNewChat }: SidebarProps) {
//   return (
//     <div className="w-64 bg-gray-900 h-screen flex flex-col">
//       {/* New Chat Button */}
//       <div className="p-4">
//         <button
//           onClick={onNewChat}
//           className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 transition-colors"
//         >
//           <PlusIcon className="h-5 w-5" />
//           <span>New Chat</span>
//         </button>
//       </div>

//       {/* Chat List */}
//       <div className="flex-1 overflow-y-auto">
//         {chats.map((chat) => (
//           <button
//             key={chat.id}
//             onClick={() => onChatSelect(chat.id)}
//             className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors ${
//               activeChat === chat.id ? 'bg-gray-800 text-white' : 'text-gray-300'
//             }`}
//           >
//             <p className="truncate text-sm">{chat.title}</p>
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// } 