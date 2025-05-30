import React from 'react';

export function LoadingAnimation() {
  return (
    <div className=\"inline-block p-1\">
      <div 
        className=\"w-3 h-3 bg-black rounded-full animate-pulse\"
      />
    </div>
  );
} 