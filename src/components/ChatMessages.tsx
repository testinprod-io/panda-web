import { Box, Typography } from '@mui/material';

export default function ChatMessages() {
  return (
    <Box
      sx={{
        flexGrow: 1,
        overflow: 'auto',
        p: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: 800,
          mx: 'auto',
        }}
      >
        {/* Messages will be rendered here */}
        <Typography variant="body1" color="text.secondary" align="center">
          Start a new conversation
        </Typography>
      </Box>
    </Box>
  );
} 