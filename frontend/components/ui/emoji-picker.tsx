import { useState } from 'react';
import { Button } from './button';
import { Smile } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './popover';

const COMMON_EMOJIS = ['👍', '❤️', '😄', '🎉', '🤔', '👀', '🚀', '💯'];

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    function handleSelect(emoji: string) {
        onEmojiSelect(emoji);
        setIsOpen(false);
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                >
                    <Smile className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-2" align="start">
                <div className="grid grid-cols-4 gap-2">
                    {COMMON_EMOJIS.map(emoji => (
                        <Button
                            key={emoji}
                            variant="ghost"
                            size="sm"
                            className="text-lg"
                            onClick={() => handleSelect(emoji)}
                        >
                            {emoji}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
} 