import React, { useEffect } from 'react';
import { Header } from '@/components/Header';
import { BrainDumpMindMap } from '@/components/BrainDumpMindMap';
import { useTasks } from '@/hooks/useTasks';

export default function BrainDump() {
  const { addTask } = useTasks();

  // Suppress browser extension errors (webext-bridge, CSP violations, message channel, etc.)
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Ignore webext-bridge errors from browser extensions
      const reason = event.reason?.message || event.reason?.toString() || '';
      if (
        reason.includes('webext-bridge') ||
        reason.includes('add-tab-media') ||
        reason.includes('Content Security Policy') ||
        reason.includes('CSP') ||
        reason.includes('message channel closed') ||
        reason.includes('asynchronous response') ||
        reason.includes('chrome-extension://')
      ) {
        event.preventDefault();
        // Silently ignore - these are browser extension conflicts
        return;
      }
    };

    const handleError = (event: ErrorEvent) => {
      // Suppress CSP violations and message channel errors from browser extensions
      const errorMessage = event.message || String(event.error || '');
      if (
        errorMessage.includes('Content Security Policy') ||
        errorMessage.includes('CSP') ||
        errorMessage.includes('chrome-extension://') ||
        errorMessage.includes('message channel')
      ) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Header
        showCyclePhases={false}
        onToggleCyclePhases={() => {}}
      />

      {/* Mind Map-style canvas with grid background */}
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
          <BrainDumpMindMap onAddTasks={addTask} />
        </div>
      </div>
    </div>
  );
}

