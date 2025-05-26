import React from 'react';

const styles = `
.loadingDot {
  width: 12px;
  height: 12px;
  background-color: black;
  border-radius: 50%;
  display: inline-block;
  animation: roll 1s infinite linear;
  margin: 2px 5px; /* Adjust margin as needed */
}

@keyframes roll {
  0% {
    transform: translateX(-10px) rotate(0deg);
    opacity: 0.5;
  }
  50% {
    transform: translateX(0px) rotate(180deg);
    opacity: 1;
  }
  100% {
    transform: translateX(10px) rotate(360deg);
    opacity: 0.5;
  }
}
`;

export function LoadingAnimation() {
  return (
    <>
      <style>{styles}</style>
      <div className="loadingDot" />
    </>
  );
} 