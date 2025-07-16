# Panda AI - Privacy-First AI Assistant

<div align="center">
  <img src="public/icons/panda.svg" alt="Panda AI Logo" width="120" height="120">
  
  **Your private AI assistant that never watches back**
  
  [![Next.js](https://img.shields.io/badge/Next.js-15.3.1-black?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
</div>

## 🌟 Overview

Panda AI is a privacy-first AI assistant that ensures your conversations remain completely private and secure. Built with end-to-end encryption, all your data is encrypted locally and never stored in the cloud in readable form, and verifiably secure with TEE technology.

### 🔐 Key Privacy Features

- **End-to-End Encryption**: Every conversation is encrypted with your personal password
- **TEE-Powered Backend**: All AI processing runs in Trusted Execution Environments for verifiable security
- **Cryptographic Attestation**: Every LLM communication can be verified through attestation proofs
- **Local-First Storage**: Data stored locally on your device with optional encrypted server sync
- **Vault-Based Security**: Isolated cryptographic operations in sandboxed iframe
- **Untraceable Conversations**: No tracking, no training on your data

## ✨ Features

### 🎯 Core Functionality
- **Private AI Chat**: Secure conversations with AI that can't be traced back to you
- **File Upload & Encryption**: Upload and encrypt files with automatic processing
- **Multi-Language Support**: Available in English, Spanish, Japanese, Korean, and Chinese
- **Customizable Prompts**: Personalize AI responses with custom instructions
- **Real-time Messaging**: Seamless chat experience with streaming responses

### 🛡️ Security & Privacy
- **Password-Protected**: Create encrypted passwords for data protection
- **Inactivity Locking**: Automatic lock after configurable idle time
- **Secure Authentication**: Multiple auth methods via Privy (email, Google, GitHub, wallet)
- **Data Portability**: Export and delete your data anytime

### 🔐 Vault System
- **Sandboxed iframe** for secure cryptographic operations
- **PBKDF2-SHA-256** key derivation with 310,000 iterations
- **AES-256-GCM** encryption for files
- **AES-256-CBC** encryption for text data
- **Zero-knowledge** password validation

### 🛡️ TEE & Attestation
- **Trusted Execution Environment**: All AI model inference runs in hardware-protected enclaves
- **Attestation Proofs**: Every LLM response includes cryptographic proof of execution integrity
- **Verifiable Security**: Users can independently verify that their data was processed securely
- **Hardware-Level Protection**: TEE ensures even system administrators cannot access conversation data

### System Overview

```
┌─────────────────┐    ┌────────────────┐    ┌─────────────────┐
│   Next.js App   │    │  Vault Service │    │    Panda API    │
│   (Frontend)    │◄──►│  (Encryption)  │◄──►│    (Backend)    │
└─────────────────┘    └────────────────┘    └─────────────────┘
                               │                        │
                               ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │    Sandboxed    │    │  TEE-Protected  │
                       │   Cryptography  │    │  LLM Processing │
                       └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   Attestation   │
                                              │     Proofs      │
                                              └─────────────────┘
```

## 📁 Project Structure

```
panda-web/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── (chat)/            # Chat-related pages
│   │   ├── login/             # Authentication pages
│   │   └── onboarding/        # First-time user flow
│   ├── components/            # React components
│   │   ├── chat/             # Chat interface
│   │   ├── login/            # Authentication forms
│   │   ├── modal/            # Modal dialogs
│   │   ├── onboarding/       # Onboarding steps
│   │   └── ui/               # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── providers/            # Context providers
│   ├── sdk/                  # Core SDK implementation
│   │   ├── auth/             # Authentication management
│   │   ├── client/           # API clients
│   │   ├── storage/          # Storage backends
│   │   └── vault/            # Vault integration
│   ├── services/             # External services
│   ├── types/                # TypeScript definitions
│   └── utils/                # Utility functions
├── vault/                    # Cryptographic vault service
│   ├── api/                  # Vault API endpoints
│   ├── crypto.ts            # Encryption implementation
│   ├── password.ts          # Password management
│   └── vault.ts             # Main vault service
├── public/                   # Static assets
└── styles/                   # Global styles
```

## 🔗 Links

- [Panda AI Website](https://panda.chat)
- [Documentation]()
- [Privacy Policy]()
- [Terms of Service]()
