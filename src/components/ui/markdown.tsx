import ReactMarkdown from "react-markdown";
import "katex/dist/katex.min.css";
import RemarkMath from "remark-math";
import RemarkBreaks from "remark-breaks";
import RehypeKatex from "rehype-katex";
import RemarkGfm from "remark-gfm";
import RehypeHighlight from "rehype-highlight";
import { useRef, useState, RefObject, useEffect, useMemo, useCallback } from "react";
import { copyToClipboard, useWindowSize } from "@/utils/utils";
import mermaid from "mermaid";
import Locale from "@/locales";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import {
  ArtifactsShareButton,
  HTMLPreview,
  HTMLPreviewHander,
} from "../artifacts";
import { useChatStore } from "@/store";

// import { useAppConfig } from "@/store/config";
import clsx from "clsx";
import { HTMLAttributes, ClassAttributes, ComponentProps } from 'react';

// MUI Imports for Image Dialog
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MuiIconButton from '@mui/material/IconButton'; // Renamed to avoid conflict
import CloseIcon from '@mui/icons-material/Close';

// MUI Imports for Fullscreen Button
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ReloadIcon from '@mui/icons-material/Replay'; // Replaced ReloadButtonIcon

// MUI Imports for LoopIcon
import LoopIcon from '@mui/icons-material/Loop';
import { LoadingAnimation } from "./loading-animation";

// Icon Placeholders
const IconPlaceholder = ({ name, className }: { name: string, className?: string }) => <span className={clsx("inline-block text-xs p-0.5 border rounded", className)}>[{name}]</span>;
const CloseIconPlaceholder = () => <IconPlaceholder name="X" className="w-5 h-5" />;
const FullscreenIconPlaceholder = () => <IconPlaceholder name="FS" className="w-5 h-5" />;
const FullscreenExitIconPlaceholder = () => <IconPlaceholder name="FSE" className="w-5 h-5" />;
const ReloadIconPlaceholder = () => <IconPlaceholder name="Rel" className="w-5 h-5" />;
const LoopIconPlaceholder = () => <IconPlaceholder name="Loop" className="w-5 h-5" />;

export function Mermaid(props: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (props.code && ref.current) {
      mermaid
        .run({
          nodes: [ref.current],
          suppressErrors: true,
        })
        .catch((e) => {
          setHasError(true);
          console.error("[Mermaid] ", e.message);
        });
    }
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [props.code, ref, imageUrl]);

  function viewSvgInNewWindow() {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const text = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([text], { type: "image/svg+xml" });
    const newImageUrl = URL.createObjectURL(blob);
    
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }

    setImageUrl(newImageUrl);
    setImageModalOpen(true);
  }

  const closeImageModal = () => {
    setImageModalOpen(false);
  };

  if (hasError) {
    return null;
  }

  return (
    <>
      <div
        className={clsx("no-dark mermaid cursor-pointer overflow-auto p-2 border border-gray-200 rounded")}
        ref={ref}
        onClick={viewSvgInNewWindow}
        title="View diagram in modal"
      >
        {props.code}
      </div>
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={closeImageModal}>
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">{Locale.Export.Image.Modal || "Diagram Preview"}</h2>
              <button 
                onClick={closeImageModal} 
                aria-label="close" 
                className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <CloseIconPlaceholder />
              </button>
            </div>
            <div className="p-4 overflow-auto flex justify-center items-center flex-grow">
              {imageUrl && (
                <img 
                  src={imageUrl} 
                  alt="Mermaid Diagram Preview" 
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface PreCodeProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
}

const PreCode = React.forwardRef<HTMLPreElement, React.HTMLAttributes<HTMLPreElement>>(
  ({ className, children, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLPreElement>(null);
    const ref = (forwardedRef || innerRef) as React.RefObject<HTMLPreElement>;
    const previewRef = useRef<HTMLPreviewHander>(null);
    const [mermaidCode, setMermaidCode] = useState("");
    const [htmlCode, setHtmlCode] = useState("");
    const { height } = useWindowSize();
    const chatStore = useChatStore();
    const session = chatStore.currentSession();
    const enableArtifacts = false;

    const [isFullScreen, setIsFullScreen] = useState(false);
    const fullScreenRef = useRef<HTMLDivElement>(null);

    const renderArtifacts = useDebouncedCallback(() => {
      if (!ref.current) return;
      const mermaidDom = ref.current.querySelector("code.language-mermaid");
      if (mermaidDom) {
        setMermaidCode((mermaidDom as HTMLElement).innerText);
      }
      const htmlDom = ref.current.querySelector("code.language-html");
      const refText = ref.current.querySelector("code")?.innerText;
      if (htmlDom) {
        setHtmlCode((htmlDom as HTMLElement).innerText);
      } else if (
        refText?.startsWith("<!DOCTYPE") ||
        refText?.startsWith("<svg") ||
        refText?.startsWith("<?xml")
      ) {
        setHtmlCode(refText);
      }
    }, 600);

    useEffect(() => {
      if (ref.current) {
        const codeElements = ref.current.querySelectorAll(
          "code",
        ) as NodeListOf<HTMLElement>;
        const wrapLanguages = [
          "",
          "md",
          "markdown",
          "text",
          "txt",
          "plaintext",
          "tex",
          "latex",
        ];
        codeElements.forEach((codeElement) => {
          let languageClass = codeElement.className.match(/language-(\w+)/);
          let name = languageClass ? languageClass[1] : "";
          if (wrapLanguages.includes(name)) {
            codeElement.style.whiteSpace = "pre-wrap";
          }
        });
        setTimeout(renderArtifacts, 1);
      }
    }, [ref, renderArtifacts]);

    const toggleFullScreen = useCallback(() => {
      if (!fullScreenRef.current) return;
      if (!document.fullscreenElement) {
        fullScreenRef.current.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }, []);

    useEffect(() => {
      const handleScreenChange = () => {
        setIsFullScreen(!!document.fullscreenElement);
      };
      document.addEventListener("fullscreenchange", handleScreenChange);
      return () => {
        document.removeEventListener("fullscreenchange", handleScreenChange);
      };
    }, []);

    return (
      <>
        <pre ref={ref} className={clsx(className, "relative group")} {...props}>
          <button
            className="absolute top-2 right-2 p-1.5 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200"
            onClick={() => {
              if (ref.current) {
                copyToClipboard(
                  ref.current.querySelector("code")?.innerText ?? "",
                );
              }
            }}
            title="Copy code"
          >
            Copy
          </button>
          {children}
        </pre>
        {mermaidCode && <Mermaid code={mermaidCode} />}
        {htmlCode && enableArtifacts && (
          <div ref={fullScreenRef} className={clsx("no-dark html relative bg-white border border-gray-200 rounded my-2", isFullScreen && "fixed inset-0 z-50 overflow-auto p-4")}>
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <ArtifactsShareButton getCode={() => htmlCode} />
              <button
                className="p-1.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-gray-700"
                aria-label="Reload Preview"
                onClick={() => previewRef.current?.reload()}
                title="Reload Preview"
              >
                <ReloadIconPlaceholder />
              </button>
              <button
                className="p-1.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-gray-700"
                aria-label={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                onClick={toggleFullScreen}
                title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullScreen ? <FullscreenExitIconPlaceholder /> : <FullscreenIconPlaceholder />}
              </button>
            </div>
            <HTMLPreview
              ref={previewRef}
              code={htmlCode}
              autoHeight={!isFullScreen}
              height={isFullScreen ? height : 600}
            />
          </div>
        )}
      </>
    );
  }
);

PreCode.displayName = "PreCode";

function CustomCode(props: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const chatStore = useChatStore();
  const enableCodeFold = false;

  const ref = useRef<HTMLPreElement>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showToggle, setShowToggle] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const codeHeight = ref.current.scrollHeight;
      setShowToggle(codeHeight > 400);
    }
  }, [props.children]);

  const toggleCollapsed = () => {
    setCollapsed((currentCollapsed) => !currentCollapsed);
  };

  const renderShowMoreButton = () => {
    if (showToggle && enableCodeFold && collapsed) {
      return (
        <div
          className={clsx(
            "text-center py-1",
          )}
        >
          <button 
            onClick={toggleCollapsed}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none"
          >
            {Locale.NewChat.More}
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <code
        className={clsx(props?.className, "block whitespace-pre")}
        ref={ref}
        style={{
          maxHeight: enableCodeFold && collapsed ? "400px" : "none",
          overflowY: enableCodeFold && collapsed ? "hidden" : "auto",
        }}
        {...props}
      >
        {props.children}
      </code>
      {renderShowMoreButton()}
    </>
  );
}

function escapeBrackets(text: string) {
  const pattern =
    /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
  return text.replace(
    pattern,
    (match, codeBlock, squareBracket, roundBracket) => {
      if (codeBlock) {
        return codeBlock;
      } else if (squareBracket) {
        return `$$${squareBracket}$$`;
      } else if (roundBracket) {
        return `$${roundBracket}$`;
      }
      return match;
    },
  );
}

function tryWrapHtmlCode(text: string) {
  if (text.includes("```")) {
    return text;
  }
  return text
    .replace(
      /([`]*?)(\w*?)([\n\r]*?)(<!DOCTYPE html>)/g,
      (match, quoteStart, lang, newLine, doctype) => {
        return !quoteStart ? "\n```html\n" + doctype : match;
      },
    )
    .replace(
      /(<\/body>)([\r\n\s]*?)(<\/html>)([\n\r]*)([`]*)([\n\r]*?)/g,
      (match, bodyEnd, space, htmlEnd, newLine, quoteEnd) => {
        return !quoteEnd ? bodyEnd + space + htmlEnd + "\n```\n" : match;
      },
    );
}

function MarkDownContent(props: { content: string }) {
  const escapedContent = useMemo(() => {
    return tryWrapHtmlCode(escapeBrackets(props.content));
  }, [props.content]);

  return (
    <ReactMarkdown
      remarkPlugins={[RemarkMath, RemarkGfm, RemarkBreaks]}
      rehypePlugins={[
        RehypeKatex,
        [
          RehypeHighlight,
          {
            detect: false,
            ignoreMissing: true,
          },
        ],
      ]}
      components={{
        pre: PreCode,
        code: CustomCode,
        p: (pProps) => <p {...pProps} dir="auto" />,
        a: (aProps) => {
          const href = aProps.href || "";
          if (/\.(aac|mp3|opus|wav)$/.test(href)) {
            return (
              <figure>
                <audio controls src={href}></audio>
              </figure>
            );
          }
          if (/\.(3gp|3g2|webm|ogv|mpeg|mp4|avi)$/.test(href)) {
            return (
              <video controls width="99.9%">
                <source src={href} />
              </video>
            );
          }
          const isInternal = /^\/#/i.test(href);
          const target = isInternal ? "_self" : aProps.target ?? "_blank";
          return <a {...aProps} target={target} />;
        },
      }}
    >
      {escapedContent}
    </ReactMarkdown>
  );
}

export const MarkdownContent = React.memo(MarkDownContent);

export function Markdown(
  props: {
    content: string;
    loading?: boolean;
    fontSize?: number;
    fontFamily?: string;
    fontColor?: string;
    parentRef?: RefObject<HTMLDivElement>;
    defaultShow?: boolean;
  } & React.DOMAttributes<HTMLDivElement>,
) {
  const mdRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={clsx(
        "markdown-body",
        "font-medium break-words"
      )}
      style={{
        fontSize: props.fontSize ? `${props.fontSize}px` : undefined,
        fontFamily: props.fontFamily || undefined,
        color: props.fontColor || undefined,
      }}
      ref={mdRef}
      onContextMenu={props.onContextMenu}
      onDoubleClickCapture={props.onDoubleClickCapture}
      dir="auto"
    >
      {props.loading ? (
        <div className="flex justify-center items-center p-4">
          <LoadingAnimation />
        </div>
      ) : (
        <MarkdownContent content={props.content} />
      )}
    </div>
  );
}
