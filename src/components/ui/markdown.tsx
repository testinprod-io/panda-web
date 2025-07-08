import ReactMarkdown from "react-markdown";
import "katex/dist/katex.min.css";
import RemarkMath from "remark-math";
import RemarkBreaks from "remark-breaks";
import RehypeKatex from "rehype-katex";
import RemarkGfm from "remark-gfm";
import RehypeHighlight from "rehype-highlight";
import {
  useRef,
  useState,
  RefObject,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { copyToClipboard } from "@/utils/utils";
import mermaid from "mermaid";
import Locale from "@/locales";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

import clsx from "clsx";
import { HTMLAttributes } from "react";

// MUI Imports for Image Dialog
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MuiIconButton from "@mui/material/IconButton"; // Renamed to avoid conflict
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

// MUI Imports for Fullscreen Button
// import FullscreenIcon from '@mui/icons-material/Fullscreen';
// import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
// import ReloadIcon from '@mui/icons-material/Replay'; // Keep if Mermaid reload is different

// MUI Imports for LoopIcon
// import LoopIcon from '@mui/icons-material/Loop';
import { LoadingAnimation } from "./loading-animation";

export function Mermaid(props: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  // State for image dialog
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
    // Cleanup blob URL on unmount or code change
    return () => {
      if (imageUrl && imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [props.code, ref, imageUrl]); // Added imageUrl dependency for cleanup

  function viewSvgInNewWindow() {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const text = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([text], { type: "image/svg+xml" });
    const newImageUrl = URL.createObjectURL(blob);

    // Revoke previous blob URL if it exists
    if (imageUrl && imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }

    setImageUrl(newImageUrl);
    setImageModalOpen(true);
  }

  const closeImageModal = () => {
    setImageModalOpen(false);
    // Optionally revoke URL on close, or keep it until next view/unmount
    // if (imageUrl && imageUrl.startsWith('blob:')) {
    //   URL.revokeObjectURL(imageUrl);
    //   setImageUrl(null);
    // }
  };

  if (hasError) {
    return null;
  }

  return (
    <>
      <div
        className={clsx("no-dark", "mermaid")}
        style={{
          cursor: "pointer",
          overflow: "auto",
        }}
        ref={ref}
        onClick={() => viewSvgInNewWindow()}
      >
        {props.code}
      </div>
      {/* Image Dialog */}
      <Dialog
        open={imageModalOpen}
        onClose={closeImageModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>
          {Locale.Export.Image.Modal} {/* Assuming this locale exists */}
          <MuiIconButton
            aria-label="close"
            onClick={closeImageModal}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </MuiIconButton>
        </DialogTitle>
        <DialogContent
          dividers
          style={{ display: "flex", justifyContent: "center" }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Mermaid Diagram Preview"
              style={{ maxWidth: "100%", maxHeight: "80vh" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PreCodeProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
}

const PreCode = React.forwardRef<
  HTMLPreElement,
  React.HTMLAttributes<HTMLPreElement>
>(({ className, children, ...props }, forwardedRef) => {
  const innerRef = useRef<HTMLPreElement>(null);
  const ref = (forwardedRef || innerRef) as React.RefObject<HTMLPreElement>;
  const [mermaidCode, setMermaidCode] = useState("");
  const [language, setLanguage] = useState("code");

  useEffect(() => {
    if (!ref.current) return;

    const codeElement = ref.current.querySelector("code");
    if (!codeElement) return;

    const languageMatch = codeElement.className.match(/language-(\\w+)/);
    const lang = languageMatch ? languageMatch[1] : "code";
    setLanguage(lang);

    if (lang === "mermaid") {
      setMermaidCode(codeElement.innerText);
    }

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
    if (wrapLanguages.includes(lang)) {
      codeElement.style.whiteSpace = "pre-wrap";
    }
  }, [children]);

  if (language === "mermaid") {
    return <Mermaid code={mermaidCode} />;
  }

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-language">{language}</span>
        <button
          className="copy-code-button"
          onClick={() => {
            if (ref.current) {
              const codeToCopy =
                ref.current.querySelector("code")?.innerText ?? "";
              copyToClipboard(codeToCopy);
            }
          }}
        >
          <ContentCopyIcon sx={{ fontSize: "1em", marginRight: "0.5em" }} />
          Copy
        </button>
      </div>
      <pre ref={ref} className={className} {...props}>
        {children}
      </pre>
    </div>
  );
});

PreCode.displayName = "PreCode";

function CustomCode(
  props: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode },
) {
  // Removed unused chatStore, session, config, enableCodeFold variables
  const ref = useRef<HTMLElement>(null); // Changed HTMLPreElement to HTMLElement

  return (
    <code
      className={clsx(props?.className)} // props.className is already optional, so props?.className is fine
      ref={ref} // Kept ref, as ReactMarkdown might utilize it.
      {...props} // Spreads other HTML attributes like className, children
    >
      {props.children}
    </code>
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
  // try add wrap html code (fixed: html codeblock include 2 newline)
  // ignore embed codeblock
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
          const target = isInternal ? "_self" : (aProps.target ?? "_blank");
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
      className="markdown-body"
      style={{
        fontSize: `${props.fontSize ?? 16}px`,
        fontFamily: props.fontFamily || "inherit",
        fontWeight: "500",
        wordWrap: "break-word",
        color: props.fontColor || "inherit",
      }}
      ref={mdRef}
      onContextMenu={props.onContextMenu}
      onDoubleClickCapture={props.onDoubleClickCapture}
      dir="auto"
    >
      {props.loading ? (
        <LoadingAnimation />
      ) : (
        <MarkdownContent content={props.content} />
      )}
    </div>
  );
}
