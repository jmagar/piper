import type { ChangeEvent, KeyboardEvent } from 'react';

import { Loader2, Send } from 'lucide-react';

import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface MessageInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    isSending: boolean;
    disabled?: boolean;
}

export function MessageInput({
    value,
    onChange,
    onSend,
    isSending,
    disabled
}: MessageInputProps) {
    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    return (
        <div className="border-t p-4">
            <div className="flex gap-2">
                <Textarea
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="min-h-[60px] resize-none"
                    disabled={disabled || isSending}
                />
                <Button
                    onClick={onSend}
                    disabled={!value.trim() || isSending || disabled}
                    className="h-[60px] w-[60px]"
                >
                    {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}