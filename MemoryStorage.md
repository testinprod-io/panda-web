# Memory Storage Implementation

## Overview

The `MemoryStorage` class is a new storage implementation that stores all data in JavaScript memory (RAM) rather than persisting to a server or local IndexedDB. This provides a temporary storage solution that's perfect for testing, development, and scenarios where you don't want data persistence.

## Key Characteristics

- **Temporary**: All data is lost when the page is refreshed or the application is closed
- **Fast**: Operations are performed directly in memory without network calls or database transactions
- **Consistent Interface**: Implements the same `IStorage` interface as `ServerStorage` and `LocalStorage`
- **Encryption Support**: Uses the same encryption service for data consistency
- **Pagination Support**: Implements proper pagination for conversations and messages

## Use Cases

1. **Development & Testing**: Perfect for testing without cluttering real data
2. **Demo Mode**: Great for demonstrations where you want to show functionality without persistence
3. **Temporary Sessions**: Ideal for guest users or temporary chat sessions
4. **Offline Development**: Works completely offline without any server dependencies

## Data Structures

The implementation uses JavaScript Maps and objects to store data in memory:

- **Conversations**: `Map<string, Conversation>`
- **Messages**: `Map<string, StoredMessage[]>` (keyed by conversation ID)
- **Summaries**: `Map<string, Summary[]>` (keyed by conversation ID)  
- **Files**: `Map<string, Map<string, File>>` (conversation ID → file ID → File)
- **Customized Prompts**: `CustomizedPromptsData` object
- **Models**: `ServerModelInfo[]` array

## Usage Example

```typescript
import { MemoryStorage } from '@/sdk/storage';
import { EventBus } from '@/sdk/events';
import { EncryptionService } from '@/sdk/EncryptionService';

// Create an instance
const eventBus = new EventBus();
const encryptionService = new EncryptionService();
const memoryStorage = new MemoryStorage(eventBus, encryptionService);

// Use exactly like other storage implementations
const conversation = await memoryStorage.createChat('Test Chat');
const messages = await memoryStorage.listMessages(conversation.conversation_id);
```

## Integration with Existing Code

The `MemoryStorage` can be used as a drop-in replacement for `ServerStorage` or `LocalStorage` since they all implement the same `IStorage` interface. Simply swap the storage instance in your dependency injection or configuration.

## Limitations

- **No Persistence**: Data is lost on page refresh/reload
- **Memory Usage**: Large amounts of data may consume significant RAM
- **Single Session**: Data is not shared between browser tabs/windows
- **No Backup**: No recovery mechanism if data is accidentally cleared

## Performance Characteristics

- **Create Operations**: Very fast (in-memory object creation)
- **Read Operations**: Very fast (direct memory access)
- **Update Operations**: Very fast (in-memory updates)
- **Delete Operations**: Very fast (array/map manipulation)
- **Pagination**: Efficient using array slicing and sorting

## Encryption Behavior

The `MemoryStorage` maintains the same encryption patterns as other storage implementations:
- Content is encrypted before storage using the `EncryptionService`
- Decryption happens when retrieving data for display
- File encryption is handled consistently with other storage types

## Thread Safety

Since JavaScript is single-threaded, the `MemoryStorage` is inherently thread-safe within the JavaScript execution context. However, it's not suitable for multi-tab scenarios where data sharing is needed.