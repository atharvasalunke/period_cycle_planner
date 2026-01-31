import React from 'react';
import { Header } from '@/components/Header';
import { BrainDumpMixboard } from '@/components/BrainDumpMixboard';
import { useTasks } from '@/hooks/useTasks';

export default function BrainDump() {
  const { addTask } = useTasks();

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Header
        showCyclePhases={false}
        onToggleCyclePhases={() => {}}
      />

      {/* Mixboard-style canvas with grid background */}
      <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        {/* Grid background pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e0e0e0 1px, transparent 1px),
              linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 p-8">
          <BrainDumpMixboard onAddTasks={addTask} />
        </div>
      </div>
    </div>
  );
}

