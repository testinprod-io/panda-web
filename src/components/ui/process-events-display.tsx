import React from "react";
import { ProcessEvent } from "@/types";
import { Box, Typography, Chip, Link } from "@mui/material";
import { SearchOutlined, PictureAsPdfOutlined } from "@mui/icons-material";

interface ProcessEventsDisplayProps {
  events: ProcessEvent[];
  fontSize: number;
  fontFamily: string;
}

export const ProcessEventsDisplay: React.FC<ProcessEventsDisplayProps> = ({
  events,
  fontSize,
  fontFamily,
}) => {
  if (!events || events.length === 0) {
    return null;
  }

  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.type]) {
      acc[event.type] = [];
    }
    acc[event.type].push(event);
    return acc;
  }, {} as Record<string, ProcessEvent[]>);

  const renderSearchEvents = (searchEvents: ProcessEvent[]) => {
    const queries = searchEvents
      .filter(event => event.data.query)
      .map(event => event.data.query);
    
    const urls = searchEvents
      .filter(event => event.data.urls)
      .flatMap(event => event.data.urls || []);
    
    const statusMessages = searchEvents
      .filter(event => event.message && !event.data.query && !event.data.urls)
      .map(event => event.message);

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <SearchOutlined sx={{ fontSize: "16px", color: "#666" }} />
          <Typography
            variant="body2"
            sx={{
              fontSize: `${fontSize}px`,
              fontFamily: fontFamily,
              color: "#666",
              fontWeight: 500,
            }}
          >
            Web Search
          </Typography>
        </Box>
        
        {queries.length > 0 && (
          <Box sx={{ ml: "24px", mb: "4px" }}>
            <Typography
              variant="body2"
              sx={{
                fontSize: `${fontSize - 1}px`,
                fontFamily: fontFamily,
                color: "#888",
              }}
            >
              Search queries:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px", mt: "4px" }}>
              {queries.map((query, index) => (
                <Chip
                  key={index}
                  label={query}
                  size="small"
                  sx={{
                    fontSize: `${fontSize - 2}px`,
                    fontFamily: fontFamily,
                    backgroundColor: "#f0f0f0",
                    color: "#555",
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
        
        {urls.length > 0 && (
          <Box sx={{ ml: "24px", mb: "4px" }}>
            <Typography
              variant="body2"
              sx={{
                fontSize: `${fontSize - 1}px`,
                fontFamily: fontFamily,
                color: "#888",
              }}
            >
              Sources:
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "2px", mt: "4px" }}>
              {urls.slice(0, 5).map((url, index) => (
                <Link
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontSize: `${fontSize - 2}px`,
                    fontFamily: fontFamily,
                    color: "#0066cc",
                    textDecoration: "none",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                    display: "block",
                    maxWidth: "400px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {url}
                </Link>
              ))}
              {urls.length > 5 && (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: `${fontSize - 2}px`,
                    fontFamily: fontFamily,
                    color: "#888",
                  }}
                >
                  +{urls.length - 5} more sources
                </Typography>
              )}
            </Box>
          </Box>
        )}
        
        {statusMessages.length > 0 && (
          <Box sx={{ ml: "24px" }}>
            {statusMessages.map((message, index) => (
              <Typography
                key={index}
                variant="body2"
                sx={{
                  fontSize: `${fontSize - 1}px`,
                  fontFamily: fontFamily,
                  color: "#888",
                  fontStyle: "italic",
                }}
              >
                {message}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderPdfEvents = (pdfEvents: ProcessEvent[]) => {
    const statusMessages = pdfEvents
      .filter(event => event.message)
      .map(event => event.message);

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <PictureAsPdfOutlined sx={{ fontSize: "16px", color: "#666" }} />
          <Typography
            variant="body2"
            sx={{
              fontSize: `${fontSize}px`,
              fontFamily: fontFamily,
              color: "#666",
              fontWeight: 500,
            }}
          >
            PDF Processing
          </Typography>
        </Box>
        
        {statusMessages.length > 0 && (
          <Box sx={{ ml: "24px" }}>
            {statusMessages.map((message, index) => (
              <Typography
                key={index}
                variant="body2"
                sx={{
                  fontSize: `${fontSize - 1}px`,
                  fontFamily: fontFamily,
                  color: "#888",
                  fontStyle: "italic",
                }}
              >
                {message}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        backgroundColor: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "8px",
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {groupedEvents.search && renderSearchEvents(groupedEvents.search)}
        {groupedEvents.pdf && renderPdfEvents(groupedEvents.pdf)}
      </Box>
    </Box>
  );
};