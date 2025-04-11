'use client';

import { ChatInput } from './ChatInput';
import styles from './LandingPage.module.scss';

interface LandingPageProps {
  onStart: (initialMessage: string) => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>What can I help you with?</h2>
        <ChatInput onSubmit={onStart} />
      </div>
    </div>
  );
} 