import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useTheme } from 'next-themes';

export interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
}

/**
 * A component that renders an emoji picker using emoji-mart
 * @param onEmojiSelect - Callback when an emoji is selected
 */
export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
    const { theme } = useTheme();

    return (
        <Picker
            data={data}
            onEmojiSelect={(emoji: { native: string }) => onEmojiSelect(emoji.native)}
            theme={theme === 'dark' ? 'dark' : 'light'}
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={2}
        />
    );
} 