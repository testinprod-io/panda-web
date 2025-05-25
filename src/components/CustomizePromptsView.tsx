'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import styles from './customize-prompts-view.module.scss'; // We'll create this SCSS file next

interface Trait {
  id: string;
  label: string;
  selected: boolean;
}

const initialTraits: Trait[] = [
  { id: 'chatty', label: 'Chatty', selected: false },
  { id: 'witty', label: 'Witty', selected: false },
  { id: 'straight', label: 'Straight shooting', selected: false },
  { id: 'encouraging', label: 'Encouraging', selected: false },
  { id: 'genz', label: 'Gen Z', selected: false },
  { id: 'skeptical', label: 'Skeptical', selected: false },
  { id: 'traditional', label: 'Traditional', selected: false },
  { id: 'forward', label: 'Forward thinking', selected: false },
  { id: 'poetic', label: 'Poetic', selected: false },
  { id: 'chill', label: 'Chill', selected: false },
];

interface CustomizePromptsViewProps {
  onNavigateBack: () => void; // For a potential back button inside this view
}

export default function CustomizePromptsView({ onNavigateBack }: CustomizePromptsViewProps) {
  const [nickname, setNickname] = useState('');
  const [whatYouDo, setWhatYouDo] = useState('');
  const [selectedTraitsText, setSelectedTraitsText] = useState('');
  const [anythingElse, setAnythingElse] = useState('');
  const [traits, setTraits] = useState<Trait[]>(initialTraits);

  const handleTraitToggle = (traitId: string) => {
    setTraits((prevTraits) =>
      prevTraits.map((trait) =>
        trait.id === traitId ? { ...trait, selected: !trait.selected } : trait
      )
    );
  };

  const handleSave = () => {
    console.log('Save clicked', { nickname, whatYouDo, selectedTraitsText, traits: traits.filter(t => t.selected), anythingElse });
    // Add save logic here
    // onNavigateBack(); // Optionally navigate back after save
  };

  const handleCancel = () => {
    console.log('Cancel clicked');
    onNavigateBack(); // Navigate back to the main settings view
  };

  return (
    <Box className={styles.viewContainer}>
      <Box className={styles.header}>
        <Typography variant="h5" className={styles.title}>
          Customize Panda AI
        </Typography>
        <Typography className={styles.subtitle}>
          Introduce yourself to get better, more personalized responses
        </Typography>
      </Box>
      
      <Divider className={styles.divider} />

      <Box className={styles.formArea}>
        <Box className={styles.formSection}>
          <Typography className={styles.label}>What should Panda AI call you?</Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={styles.textField}
          />
        </Box>

        <Box className={styles.formSection}>
          <Typography className={styles.label}>What do you do?</Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Product Manager"
            value={whatYouDo}
            onChange={(e) => setWhatYouDo(e.target.value)}
            className={styles.textField}
          />
        </Box>

        <Box className={styles.formSection}>
          <Typography className={styles.label}>What traits should Panda AI have?</Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder="Describe or select traits"
            value={selectedTraitsText}
            onChange={(e) => setSelectedTraitsText(e.target.value)}
            className={styles.textArea}
          />
          <Box className={styles.traitsContainer}>
            {traits.map((trait) => (
              <Chip
                key={trait.id}
                icon={<AddCircleOutlineIcon />}
                label={trait.label}
                onClick={() => handleTraitToggle(trait.id)}
                className={clsx(styles.traitChip, trait.selected && styles.selectedTrait)}
                variant={trait.selected ? 'filled' : 'outlined'}
                clickable
              />
            ))}
          </Box>
        </Box>

        <Box className={styles.formSection}>
          <Typography className={styles.label}>Anything else Panda AI should know about you?</Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder="Interests, values, or preferences to keep in mind"
            value={anythingElse}
            onChange={(e) => setAnythingElse(e.target.value)}
            className={styles.textArea}
          />
        </Box>
      </Box>

      <Box className={styles.actionsFooter}>
        <Button variant="outlined" disableRipple={true} onClick={handleCancel} className={styles.cancelButton}>
          Cancel
        </Button>
        <Button variant="contained" disableRipple={true} onClick={handleSave} className={styles.saveButton} disabled>
          Save
        </Button>
      </Box>
    </Box>
  );
}

// clsx helper (can be moved to utils if available globally)
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
} 