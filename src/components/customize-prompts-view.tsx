'use client';

import { useState, useEffect } from 'react';
// MUI components and icons are removed or replaced
// import styles from \'./customize-prompts-view.module.scss\'; // SCSS import removed
import { CustomizedPromptsData, CustomizedPromptsResponse } from '../client/client'; // ApiClient removed from here as it's from useApiClient
import { useApiClient } from '@/providers/api-client-provider';

// Placeholder for icons - replace with actual SVGs or a library
const IconPlaceholder = ({ name, className }: { name: string, className?: string }) => {
  // Using a simpler span construction to avoid issues with backticks in edit_file
  const baseClass = "text-sm";
  const finalClassName = className ? `${baseClass} ${className}` : baseClass;
  return <span className={finalClassName}>[{name}]</span>;
};
const AddCircleOutlineIcon = () => <IconPlaceholder name="+" />;

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
  onCloseRequest: () => void;
}

const EMPTY_PROMPTS_DATA: CustomizedPromptsResponse = {
  personal_info: { name: '', job: '' },
  prompts: { traits: '', extra_params: '' },
  created_at: '',
  updated_at: '',
};

// clsx helper (can be moved to utils if available globally)
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function CustomizePromptsView({ onCloseRequest }: CustomizePromptsViewProps) {
  const [name, setName] = useState('');
  const [job, setJob] = useState('');
  const [traitsText, setTraitsText] = useState('');
  const [extraParams, setExtraParams] = useState('');
  const [traits, setTraits] = useState<Trait[]>(initialTraits.map(t => ({ ...t, selected: false })));
  const apiClient = useApiClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [initialData, setInitialData] = useState<CustomizedPromptsResponse | null>(null);

  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.app.getCustomizedPrompts();
        setName(data.personal_info?.name || '');
        setJob(data.personal_info?.job || '');
        const currentTraitsText = data.prompts?.traits || '';
        setTraitsText(currentTraitsText);
        setExtraParams(data.prompts?.extra_params || '');
        
        const loadedTextTraits = currentTraitsText.split(',').map(s => s.trim()).filter(Boolean);
        setTraits(initialTraits.map(trait => ({
          ...trait,
          selected: loadedTextTraits.includes(trait.label)
        })));

        setInitialData(data);
        setIsUpdateMode(true);
      } catch (apiError: any) {
        if (apiError instanceof Error && 'status' in apiError && (apiError as any).status === 404) {
          setName('');
          setJob('');
          setTraitsText('');
          setExtraParams('');
          setTraits(initialTraits.map(t => ({ ...t, selected: false })));
          setInitialData(EMPTY_PROMPTS_DATA);
          setIsUpdateMode(false);
        } else {
          setError(apiError.message || 'Failed to load customized prompts.');
          setInitialData(EMPTY_PROMPTS_DATA);
          setIsUpdateMode(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, [apiClient]);

  const handleTraitToggle = (traitId: string) => {
    const traitToToggle = traits.find(t => t.id === traitId);
    if (!traitToToggle) return;

    const currentTextTraits = traitsText.split(',').map(s => s.trim()).filter(Boolean);
    let newTextTraitsArray: string[];
    let newSelectedState: boolean;

    if (currentTextTraits.includes(traitToToggle.label)) {
      newTextTraitsArray = currentTextTraits.filter(t => t !== traitToToggle.label);
      newSelectedState = false;
    } else {
      newTextTraitsArray = [...currentTextTraits, traitToToggle.label];
      newSelectedState = true;
    }
    setTraitsText(newTextTraitsArray.join(', '));

    setTraits(prevTraits =>
      prevTraits.map(trait =>
        trait.id === traitId ? { ...trait, selected: newSelectedState } : trait
      )
    );
  };
  
  const isFormDirty = () => {
    if (!initialData) return name.trim() !== '' || job.trim() !== '' || traitsText.trim() !== '' || extraParams.trim() !== '';

    if (!isUpdateMode) {
      return name.trim() !== '' || job.trim() !== '' || traitsText.trim() !== '' || extraParams.trim() !== '';
    }
    return name !== (initialData.personal_info?.name || '') ||
           job !== (initialData.personal_info?.job || '') ||
           traitsText !== (initialData.prompts?.traits || '') ||
           extraParams !== (initialData.prompts?.extra_params || '');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const payload: CustomizedPromptsData = { personal_info: {}, prompts: {} };
    if (name.trim()) payload.personal_info!.name = name.trim();
    if (job.trim()) payload.personal_info!.job = job.trim();
    if (traitsText.trim()) payload.prompts!.traits = traitsText.trim();
    if (extraParams.trim()) payload.prompts!.extra_params = extraParams.trim();
    if (Object.keys(payload.personal_info!).length === 0) delete payload.personal_info;
    if (Object.keys(payload.prompts!).length === 0) delete payload.prompts;

    try {
      let responseData: CustomizedPromptsResponse;
      if (isUpdateMode) {
        responseData = await apiClient.app.updateCustomizedPrompts(payload);
      } else {
        responseData = await apiClient.app.createCustomizedPrompts(payload);
      }
      setName(responseData.personal_info?.name || '');
      setJob(responseData.personal_info?.job || '');
      const newTraitsText = responseData.prompts?.traits || '';
      setTraitsText(newTraitsText);
      setExtraParams(responseData.prompts?.extra_params || '');
      const loadedTextTraits = newTraitsText.split(',').map(s => s.trim()).filter(Boolean);
      setTraits(initialTraits.map(trait => ({ ...trait, selected: loadedTextTraits.includes(trait.label) })));
      setInitialData(responseData);
      setIsUpdateMode(true);
    } catch (apiError: any) {
      setError(apiError.message || 'Failed to save customized prompts.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onCloseRequest();
  };

  if (isLoading) {
    return (
      <div className=\"flex flex-col flex-grow min-h-0 overflow-hidden bg-white items-center justify-center p-4 min-h-[300px]\"> {/* Replaces viewContainer and CircularProgress wrapper */}
        {/* Basic CSS Spinner as CircularProgress replacement */}
        <div className=\"animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500\"></div>
      </div>
    );
  }
  
  const canSave = !isSaving && isFormDirty();

  return (
    <div className=\"flex flex-col flex-grow min-h-0 overflow-hidden bg-white p-4\"> {/* Replaces viewContainer */}
      {error && (
        <div className=\"mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md\" role=\"alert\"> {/* Replaces Alert */}
          {error}
        </div>
      )}
      <div className=\"pt-8 pb-[18px] px-0 md:px-4 gap-2\"> {/* Replaces header styles */}
        <h1 className=\"px-4 py-0 text-xl md:text-2xl font-semibold text-gray-800 leading-8\"> {/* Replaces title Typography h5 */}
          Customize Panda AI
        </h1>
        <p className=\"px-4 pb-[6px] pt-0 text-base font-medium text-gray-600 leading-8\"> {/* Replaces subtitle Typography */}
          Introduce yourself to get better, more personalized responses
        </p>
      </div>
      
      <hr className=\"border-gray-300\" /> {/* Replaces Divider */}

      <div className=\"flex-grow overflow-y-auto p-4 md:px-4 space-y-5\"> {/* Replaces formArea */}
        <div className=\"flex flex-col gap-2 rounded-md\"> {/* Replaces formSection, adjusted gap */}
          <label className=\"text-sm font-medium text-gray-700\">What should Panda AI call you?</label> {/* Replaces label Typography */}
          <input
            type=\"text\"
            fullWidth // This prop is not standard HTML, width is handled by Tailwind full-width class below
            variant=\"outlined\" // Not standard HTML, styling done by Tailwind
            placeholder=\"Nickname\"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className=\"w-full p-2.5 text-base text-gray-800 bg-white border border-gray-300 rounded-md placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed\" // Replaces textField styles
            disabled={isSaving}
          />
        </div>

        <div className=\"flex flex-col gap-2 rounded-md\"> {/* Replaces formSection */}
          <label className=\"text-sm font-medium text-gray-700\">What do you do?</label>
          <input
            type=\"text\"
            fullWidth
            variant=\"outlined\"
            placeholder=\"Product Manager\"
            value={job}
            onChange={(e) => setJob(e.target.value)}
            className=\"w-full p-2.5 text-base text-gray-800 bg-white border border-gray-300 rounded-md placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed\"
            disabled={isSaving}
          />
        </div>

        <div className=\"flex flex-col gap-2 rounded-md\"> {/* Replaces formSection */}
          <label className=\"text-sm font-medium text-gray-700\">What traits should Panda AI have?</label>
          <textarea
            fullWidth
            rows={4}
            variant=\"outlined\"
            placeholder=\"Describe or select traits by clicking below\"
            value={traitsText}
            onChange={(e) => setTraitsText(e.target.value)}
            className=\"w-full p-2.5 text-base text-gray-800 bg-white border border-gray-300 rounded-md placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 min-h-[100px] disabled:bg-gray-100 disabled:cursor-not-allowed\" // Replaces textArea styles, added min-h for height
            disabled={isSaving}
            onBlur={() => {
              const currentTextTraits = traitsText.split(',').map(s => s.trim()).filter(Boolean);
              setTraits(prevTraits => prevTraits.map(trait => ({
                ...trait,
                selected: currentTextTraits.includes(trait.label)
              })));
            }}
          />
          <div className=\"flex flex-wrap gap-2 mt-2\"> {/* Replaces traitsContainer */}
            {traits.map((trait) => (
              <button // Using button for Chip for better accessibility and click handling
                key={trait.id}
                onClick={() => !isSaving && handleTraitToggle(trait.id)}
                className={clsx(
                  "inline-flex items-center px-2 py-1 rounded-full text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed", // Base chip styles
                  trait.selected 
                    ? "bg-blue-100 border-blue-500 text-blue-700 hover:bg-blue-200 focus:ring-blue-500" // Selected styles
                    : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-400" // Default styles
                )}
                disabled={isSaving}
              >
                <AddCircleOutlineIcon /> {/* Corrected usage */}
                <span className="ml-1.5">{trait.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className=\"flex flex-col gap-2 rounded-md\"> {/* Replaces formSection */}
          <label className=\"text-sm font-medium text-gray-700\">Anything else Panda AI should know about you?</label>
          <textarea
            fullWidth
            rows={4}
            variant=\"outlined\"
            placeholder=\"Interests, values, or preferences to keep in mind\"
            value={extraParams}
            onChange={(e) => setExtraParams(e.target.value)}
            className=\"w-full p-2.5 text-base text-gray-800 bg-white border border-gray-300 rounded-md placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 min-h-[100px] disabled:bg-gray-100 disabled:cursor-not-allowed\"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className=\"flex justify-end items-center gap-4 pt-6 mt-auto\"> {/* Replaces actionsFooter */}
        <button 
          onClick={handleCancel} 
          className=\"px-4 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed\" // Replaces cancelButton
          disabled={isSaving}
        >
          Cancel
        </button>
        <button 
          onClick={handleSave} 
          className={clsx(
            \"px-4 py-2 text-sm font-medium rounded-full text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed\", // Base save button
            !canSave || isSaving 
              ? \"bg-gray-300 text-gray-500 border border-gray-300 cursor-not-allowed\" // Disabled styles
              : \"bg-gray-800 hover:bg-gray-900 focus:ring-gray-700 border border-gray-800\" // Enabled styles
          )}
          disabled={!canSave || isSaving}
        >
          {isSaving 
            ? <IconPlaceholder name=\"Saving...\" className=\"animate-spin\" /> 
            : 'Save'}
        </button>
      </div>
    </div>
  );
}

// clsx helper is already defined above

// clsx helper (can be moved to utils if available globally)
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
} 