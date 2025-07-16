import { Box, Button, Typography } from "@mui/material";
import { motion } from "framer-motion";
import StreamingText from "@/components/onboarding/StreamingText";
import { useState, useCallback } from "react";
import Locale from "@/locales";

interface IntroStepViewProps {
  onNext: () => void;
}

const bulletPoints = [
  {
    title: Locale.Onboarding.Intro.Intro1Title,
    content: Locale.Onboarding.Intro.Intro1Content,
  },
  {
    title: Locale.Onboarding.Intro.Intro2Title,
    content: Locale.Onboarding.Intro.Intro2Content,
  },
  {
    title: Locale.Onboarding.Intro.Intro3Title,
    content: Locale.Onboarding.Intro.Intro3Content,
  },
];

export default function IntroStepView({ onNext }: IntroStepViewProps) {
  const [completedAnimations, setCompletedAnimations] = useState(0);

  const handleAnimationComplete = useCallback(() => {
    setCompletedAnimations((c) => c + 1);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          width: "100%",
        }}
      >
        <StreamingText
          text={Locale.Onboarding.Intro.Title}
          style={{
            fontFamily: "Inter",
            fontSize: "1.125rem",
          }}
          streamSpeed={10}
          onComplete={handleAnimationComplete}
        />
        <Box
          component="div"
          sx={{
            m: 0,
            p: 0,
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            opacity: completedAnimations > 0 ? 1 : 0,
            transition: "opacity 0.3s",
            fontFamily: "Inter",
          }}
        >
          {bulletPoints.map((item, index) => {
            const animationIndex = index + 1;
            if (completedAnimations < animationIndex) return null;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                onAnimationComplete={() => {
                  if (completedAnimations === animationIndex) {
                    handleAnimationComplete();
                  }
                }}
              >
                <Typography fontWeight="600">{item.title}</Typography>
                <Typography>{item.content}</Typography>
              </motion.div>
            );
          })}
        </Box>
        <Box
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            gap: "1rem",
            width: "80%",
            maxWidth: "min(500px, 80%)",
            opacity: completedAnimations > bulletPoints.length ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        >
          <Button
            type="submit"
            variant="contained"
            onClick={onNext}
            sx={{
              alignSelf: "flex-start",
              height: "48px",
              backgroundColor: "#131A28",
              color: "#C1FF83",
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "16px",
              px: "20px",
            }}
          >
            {Locale.Onboarding.IUnderstand}
          </Button>
        </Box>
      </Box>
    </motion.div>
  );
}
