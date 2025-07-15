import React from "react";
import { ProcessEvent } from "@/types";
import { Box, Typography, Chip } from "@mui/material";
import {
  SearchOutlined,
  Language,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

interface ProcessEventsDisplayProps {
  events: ProcessEvent[];
  fontSize: number;
  fontFamily: string;
  eventComplete?: boolean; // Whether the last event is complete
}

export const ProcessEventsDisplay: React.FC<ProcessEventsDisplayProps> = ({
  events,
  fontSize,
  fontFamily,
  eventComplete,
}) => {
  if (!events || events.length === 0) {
    return null;
  }

  // Determine if an event is currently being processed
  const isEventProcessing = (index: number) => {
    return !eventComplete && index === events.length - 1;
  };

  const renderEvent = (event: ProcessEvent, index: number) => {
    // Filter out events that don't have meaningful content
    if (
      !event.message &&
      !event.data.query &&
      (!event.data.urls || event.data.urls.length === 0)
    ) {
      return null;
    }

    const eventContent = (() => {
      if (event.type === "search") {
        return renderSearchEvent(event, index);
      } else if (event.type === "pdf") {
        return renderPdfEvent(event, index);
      }
      return null;
    })();

    if (!eventContent) return null;

    const isProcessing = isEventProcessing(index);

    return (
      <motion.div
        key={`${event.type}-${index}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.4,
          delay: index * 0.1,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <style jsx>{`
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
        {eventContent}
      </motion.div>
    );
  };

  // Helper function to get shimmer styles
  const getShimmerStyles = (isProcessing: boolean) => {
    if (!isProcessing) return {};

    return {
      background:
        "linear-gradient(90deg, #666 0%, #666 40%, #C1FF83 50%, #666 60%, #666 100%)",
      backgroundSize: "200% 100%",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      animation: "shimmer 2s linear infinite",
    };
  };

  const renderSearchEvent = (event: ProcessEvent, index: number) => {
    const queries = Array.from(
      new Set(event.data.query?.split("\n").filter((q) => q.trim()))
    );
    const hasQuery = queries && queries.length > 0;
    const hasUrls = event.data.urls && event.data.urls.length > 0;
    const hasMessage = event.message && !hasQuery && !hasUrls;
    const isProcessing = isEventProcessing(index);

    return (
      <Box sx={{ marginBottom: "12px" }}>
        {hasMessage && (
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              mb: "8px",
            }}
          >
            <Box
              sx={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: "#666",
                marginTop: "8px",
                flexShrink: 0,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily,
                color: isProcessing ? "transparent" : "var(--text-primary)",
                lineHeight: "1.5",
                ...getShimmerStyles(isProcessing),
              }}
            >
              {event.message}
            </Typography>
          </Box>
        )}

        {hasQuery && (
          <Box sx={{ mb: "8px" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                mb: "8px",
              }}
            >
              <Language
                sx={{ fontSize: "16px", color: "#var(--text-primary)" }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily,
                  color: isProcessing ? "transparent" : "#var(--text-primary)",
                  fontWeight: 400,
                  ...getShimmerStyles(isProcessing),
                }}
              >
                Searched the web
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                ml: "24px",
                maxWidth: "100%",
              }}
            >
              {queries.map((query, queryIndex) => (
                <Chip
                  key={queryIndex}
                  label={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <SearchOutlined
                        sx={{ fontSize: "14px", color: "var(--text-primary)" }}
                      />
                      <span>{query}</span>
                    </Box>
                  }
                  size="small"
                  clickable={false}
                  sx={{
                    fontSize: `${fontSize - 2}px`,
                    fontFamily: fontFamily,
                    backgroundColor: "var(--background-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-primary)",
                    maxWidth: "200px",
                    "& .MuiChip-label": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {hasUrls && event.data.urls && (
          <Box sx={{ mb: "8px" }}>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                ml: "24px",
                maxWidth: "100%",
              }}
            >
              {event.data.urls.slice(0, 5).map((url, urlIndex) => {
                let domain;
                let favicon;
                try {
                  domain = new URL(url).hostname;
                  favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
                } catch {
                  domain = url;
                  favicon = null;
                }

                return (
                  <Chip
                    key={urlIndex}
                    label={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {favicon && (
                          <img
                            src={favicon}
                            alt=""
                            style={{ width: "14px", height: "14px" }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <span>{domain}</span>
                      </Box>
                    }
                    size="small"
                    onClick={() =>
                      window.open(url, "_blank", "noopener,noreferrer")
                    }
                    sx={{
                      fontSize: `${fontSize - 2}px`,
                      fontFamily: fontFamily,
                      backgroundColor: "var(--background-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-primary)",
                      maxWidth: "200px",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "var(--border-primary)",
                      },
                      "& .MuiChip-label": {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        padding: "0 8px",
                      },
                    }}
                  />
                );
              })}
              {event.data.urls.length > 5 && (
                <Chip
                  label={`+${event.data.urls.length - 5} more`}
                  size="small"
                  sx={{
                    fontSize: `${fontSize - 2}px`,
                    fontFamily: fontFamily,
                    backgroundColor: "#f5f5f5",
                    color: "#888",
                    border: "1px solid #e0e0e0",
                  }}
                />
              )}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const renderPdfEvent = (event: ProcessEvent, index: number) => {
    if (!event.message) return null;
    const isProcessing = isEventProcessing(index);

    return (
      <Box sx={{ marginBottom: "12px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            mb: "8px",
          }}
        >
          <Box
            sx={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: "#666",
              marginTop: "8px",
              flexShrink: 0,
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontSize: `${fontSize}px`,
              fontFamily: fontFamily,
              color: isProcessing ? "transparent" : "#666",
              lineHeight: "1.5",
              ...getShimmerStyles(isProcessing),
            }}
          >
            {event.message}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        marginBottom: "16px",
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily,
      }}
    >
      <AnimatePresence>
        {events.map((event, index) => renderEvent(event, index))}
      </AnimatePresence>
    </Box>
  );
};
