import React from "react";

// Define a type for the props if you plan to customize it later (e.g., size, color)
interface GenericFileIconProps {
  // Add any props here, e.g., size?: number; className?: string;
}

export const GenericFileIcon: React.FC<GenericFileIconProps> = (props) => {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Changed fill="white" to fill="none" for the background rect if it's just for viewBox definition */}
      {/* The original had fill="none" for rect, which is fine */}
      <rect width="32" height="32" rx="5.33333" fill="none" />
      <path
        d="M21.3333 24H10.6666C9.92778 24 9.33325 23.4055 9.33325 22.6667V9.33333C9.33325 8.5945 9.92778 8 10.6666 8H16L22.6666 12.6667V22.6667C22.6666 23.4055 22.0721 24 21.3333 24Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.6666 12.6667H17.3333C16.5944 12.6667 16 12.0722 16 11.3333V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
