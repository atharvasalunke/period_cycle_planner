import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface BrainDumpPanelProps {
  text: string;
  onTextChange: (text: string) => void;
  onOrganize: () => void;
  isLoading: boolean;
}

export function BrainDumpPanel({
  text,
  onTextChange,
  onOrganize,
  isLoading,
}: BrainDumpPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden flex flex-col min-h-[600px]">
      {/* Minimal header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Brain Dump</h2>
        <p className="text-xs text-gray-500 mt-1">Dump everything on your mind</p>
      </div>

      {/* Spacious textarea area */}
      <div className="flex-1 flex flex-col p-6 gap-4">
        <Textarea
          placeholder="Tasks, reminders, feelings, half-thoughts... just write it all down."
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="flex-1 min-h-[400px] resize-none text-sm border-0 focus-visible:ring-0 bg-transparent p-0 placeholder:text-gray-400"
          disabled={isLoading}
        />

        {/* Bottom action bar */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {text.length > 0 ? `${text.length} characters` : 'Start typing...'}
          </p>
          <Button
            onClick={onOrganize}
            disabled={!text.trim() || isLoading}
            className="gap-2 bg-primary hover:bg-primary/90"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Organizing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Organize with AI
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

