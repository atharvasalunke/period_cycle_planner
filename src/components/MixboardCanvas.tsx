import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, Image as ImageIcon, FileText, GripVertical, Calendar, Trash2, Plus, Link2, Unlink, Sparkles, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrganizeTask, chatWithTasks } from '@/lib/api';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface CanvasItem {
  id: string;
  type: 'task' | 'image' | 'note';
  x: number;
  y: number;
  width?: number;
  height?: number;
  data: OrganizeTask | { url: string; file: File } | { text: string };
}

interface MixboardCanvasProps {
  tasks: OrganizeTask[];
  onUpdateTask: (index: number, task: Partial<OrganizeTask>) => void;
  onDeleteTask: (index: number) => void;
  onAddTasks?: (tasks: OrganizeTask[]) => void;
  onAddNote?: (text: string) => void;
  onOrganizeText?: (text: string) => void;
  uploadedImages?: File[];
}

export function MixboardCanvas({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onAddTasks,
  onAddNote,
  onOrganizeText,
  uploadedImages = [],
}: MixboardCanvasProps) {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [connections, setConnections] = useState<Array<{ from: string; to: string }>>([]);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showInputBar, setShowInputBar] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [chatMode, setChatMode] = useState<'create' | 'chat'>('create');
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track task positions by a stable identifier (using task title + index as fallback)
  const taskPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Convert uploaded images to canvas items
  React.useEffect(() => {
    if (uploadedImages.length === 0) return;

    setItems((prev) => {
      // Get existing image items (by file name)
      const existingImageItems = new Map<string, CanvasItem>();
      prev.forEach((item) => {
        if (item.type === 'image') {
          const imageData = item.data as { url: string; file: File };
          existingImageItems.set(imageData.file.name, item);
        }
      });

      // Create image items for uploaded images
      const imageItems = uploadedImages.map((file, index) => {
        const existingItem = existingImageItems.get(file.name);
        if (existingItem) {
          return existingItem; // Preserve existing position
        }

        // Create new image item
        const url = URL.createObjectURL(file);
        return {
          id: `image-${Date.now()}-${index}`,
          type: 'image' as const,
          x: 200 + (index % 4) * 280,
          y: 200 + Math.floor(index / 4) * 280,
          width: 250,
          height: 250,
          data: { url, file },
        };
      });

      // Keep existing non-image, non-task items, add new images
      const otherItems = prev.filter((item) => item.type !== 'image' && item.type !== 'task');
      return [...otherItems, ...imageItems];
    });
  }, [uploadedImages]);

  // Track task items by a stable ID based on task index
  const taskItemIdsRef = useRef<Map<number, string>>(new Map());

  // Convert tasks to canvas items when they change
  React.useEffect(() => {
    setItems((prev) => {
      // Create a map of existing task items by their stored index
      const existingTaskItems = new Map<string, CanvasItem>();
      prev.forEach((item) => {
        if (item.type === 'task') {
          // Find which task index this item corresponds to
          for (const [taskIndex, itemId] of taskItemIdsRef.current.entries()) {
            if (itemId === item.id && taskIndex < tasks.length) {
              existingTaskItems.set(itemId, item);
              break;
            }
          }
        }
      });

      // Create task items for ALL tasks, ensuring every task is displayed
      const taskItems = tasks.map((task, index) => {
        // Get or create a stable ID for this task index
        let itemId = taskItemIdsRef.current.get(index);
        if (!itemId) {
          itemId = `task-${index}-${Date.now()}`;
          taskItemIdsRef.current.set(index, itemId);
        }

        // Try to find existing item with this ID
        const existingItem = existingTaskItems.get(itemId);
        
        if (existingItem && existingItem.type === 'task') {
          // Preserve position and update task data
          return {
            ...existingItem,
            data: task, // Update task data
          };
        }
        
        // New task - check if we have a saved position by task title
        const identifier = task.title || `task-${index}`;
        const savedPos = taskPositionsRef.current.get(identifier);
        const x = savedPos?.x ?? 100 + (index % 4) * 300;
        const y = savedPos?.y ?? 100 + Math.floor(index / 4) * 220;
        
        return {
          id: itemId,
          type: 'task' as const,
          x,
          y,
          width: 280,
          data: task,
        };
      });

      // Clean up task IDs for tasks that no longer exist
      const currentTaskIndices = new Set(Array.from({ length: tasks.length }, (_, i) => i));
      for (const [taskIndex] of taskItemIdsRef.current.entries()) {
        if (!currentTaskIndices.has(taskIndex)) {
          taskItemIdsRef.current.delete(taskIndex);
        }
      }

      // Keep existing images and notes, replace all tasks
      const nonTaskItems = prev.filter((item) => item.type !== 'task');
      return [...nonTaskItems, ...taskItems];
    });
  }, [tasks]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const newItem: CanvasItem = {
          id: `image-${Date.now()}-${Math.random()}`,
          type: 'image',
          x: 200 + Math.random() * 400,
          y: 200 + Math.random() * 300,
          width: 250,
          height: 250,
          data: { url, file },
        };
        setItems((prev) => [...prev, newItem]);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleItemClick = (e: React.MouseEvent, itemId: string) => {
    // Handle selection
    if (connectingFrom) {
      // Connecting mode: create connection
      if (connectingFrom !== itemId) {
        const connectionExists = connections.some(
          (conn) => 
            (conn.from === connectingFrom && conn.to === itemId) ||
            (conn.from === itemId && conn.to === connectingFrom)
        );
        if (!connectionExists) {
          setConnections((prev) => [...prev, { from: connectingFrom, to: itemId }]);
        }
      }
      setConnectingFrom(null);
      return;
    }

    // Normal selection (Ctrl/Cmd for multi-select)
    if (e.ctrlKey || e.metaKey) {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    } else {
      setSelectedItems(new Set([itemId]));
    }
  };

  const handleMouseDown = (e: React.MouseEvent, itemId: string) => {
    // Don't start drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input') || target.closest('button')) {
      return;
    }

    // Right-click for context menu (we'll use it for connecting)
    if (e.button === 2) {
      e.preventDefault();
      setConnectingFrom(itemId);
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const item = items.find((i) => i.id === itemId);
    if (!item || !canvasRef.current) return;

    const itemElement = e.currentTarget as HTMLElement;
    const itemRect = itemElement.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();

    // Calculate offset from mouse position to item's top-left corner
    const offsetX = e.clientX - itemRect.left;
    const offsetY = e.clientY - itemRect.top;

    setDraggedItem(itemId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!canvasRef.current) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      // Calculate new position based on mouse position minus the offset
      const newX = moveEvent.clientX - canvasRect.left - offsetX;
      const newY = moveEvent.clientY - canvasRect.top - offsetY;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const updatedItem = { 
              ...item, 
              x: Math.max(0, newX), 
              y: Math.max(0, newY) 
            };
            // Save position for tasks
            if (item.type === 'task') {
              const task = item.data as OrganizeTask;
              const identifier = task.title || item.id;
              taskPositionsRef.current.set(identifier, { x: updatedItem.x, y: updatedItem.y });
            }
            return updatedItem;
          }
          return item;
        })
      );
    };

    const handleMouseUp = () => {
      setDraggedItem(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleConnectSelected = () => {
    if (selectedItems.size < 2) return;
    
    const itemsArray = Array.from(selectedItems);
    const newConnections: Array<{ from: string; to: string }> = [];
    
    // Connect all selected items in a chain
    for (let i = 0; i < itemsArray.length - 1; i++) {
      const from = itemsArray[i];
      const to = itemsArray[i + 1];
      const connectionExists = connections.some(
        (conn) => 
          (conn.from === from && conn.to === to) ||
          (conn.from === to && conn.to === from)
      );
      if (!connectionExists) {
        newConnections.push({ from, to });
      }
    }
    
    if (newConnections.length > 0) {
      setConnections((prev) => [...prev, ...newConnections]);
    }
  };

  const handleDisconnectSelected = () => {
    setConnections((prev) => 
      prev.filter((conn) => 
        !selectedItems.has(conn.from) && !selectedItems.has(conn.to)
      )
    );
  };

  // Calculate arrow positions for connections
  const connectionArrows = useMemo(() => {
    return connections.map((conn) => {
      const fromItem = items.find((i) => i.id === conn.from);
      const toItem = items.find((i) => i.id === conn.to);
      
      if (!fromItem || !toItem) return null;
      
      // Calculate center points
      const fromWidth = fromItem.width || 280;
      const fromHeight = fromItem.height || (fromItem.type === 'image' ? 250 : 100);
      const toWidth = toItem.width || 280;
      const toHeight = toItem.height || (toItem.type === 'image' ? 250 : 100);
      
      const fromX = fromItem.x + fromWidth / 2;
      const fromY = fromItem.y + fromHeight / 2;
      const toX = toItem.x + toWidth / 2;
      const toY = toItem.y + toHeight / 2;
      
      // Calculate direction vector
      const dx = toX - fromX;
      const dy = toY - fromY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance === 0) return null;
      
      // Calculate edge points (where arrow should start/end on item edges)
      const fromRadius = Math.max(fromWidth, fromHeight) / 2;
      const toRadius = Math.max(toWidth, toHeight) / 2;
      
      const unitX = dx / distance;
      const unitY = dy / distance;
      
      const edgeFromX = fromX + unitX * fromRadius;
      const edgeFromY = fromY + unitY * fromRadius;
      const edgeToX = toX - unitX * toRadius;
      const edgeToY = toY - unitY * toRadius;
      
      return {
        from: { x: edgeFromX, y: edgeFromY },
        to: { x: edgeToX, y: edgeToY },
        id: `${conn.from}-${conn.to}`,
      };
    }).filter(Boolean) as Array<{ from: { x: number; y: number }; to: { x: number; y: number }; id: string }>;
  }, [connections, items]);

  const handleDeleteItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item?.type === 'task') {
      // Find task index by matching the item ID
      let taskIndex = -1;
      for (const [index, storedItemId] of taskItemIdsRef.current.entries()) {
        if (storedItemId === itemId) {
          taskIndex = index;
          break;
        }
      }
      
      // If not found by ID, try to match by task data
      if (taskIndex === -1) {
        const task = item.data as OrganizeTask;
        taskIndex = tasks.findIndex((t) => 
          t.title === task.title && 
          t.dueDateISO === task.dueDateISO
        );
      }
      
      if (taskIndex !== -1) {
        onDeleteTask(taskIndex);
        // Remove saved position
        const task = item.data as OrganizeTask;
        const identifier = task.title || itemId;
        taskPositionsRef.current.delete(identifier);
        // Clean up task ID reference
        taskItemIdsRef.current.delete(taskIndex);
      }
    } else {
      setItems((prev) => {
        const filtered = prev.filter((i) => i.id !== itemId);
        // Clean up object URL if it's an image
        if (item?.type === 'image' && 'url' in item.data) {
          URL.revokeObjectURL(item.data.url);
        }
        return filtered;
      });
    }
    
    // Clean up connections involving this item
    setConnections((prev) => 
      prev.filter((conn) => conn.from !== itemId && conn.to !== itemId)
    );
    
    // Remove from selection
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const handleInputSubmit = async () => {
    if (!inputText.trim()) return;

    if (chatMode === 'chat' && tasks.length > 0) {
      // Chat mode: talk to Gemini about existing tasks
      setIsChatting(true);
      try {
        const todayISO = format(new Date(), 'yyyy-MM-dd');
        const response = await chatWithTasks(inputText, tasks, todayISO);
        
        // Show Gemini's response
        toast({
          title: 'Gemini Response',
          description: response.response,
          duration: 5000,
        });
        
        // If Gemini created new tasks, add them directly
        if (response.newTasks && response.newTasks.length > 0) {
          if (onAddTasks) {
            onAddTasks(response.newTasks);
            toast({
              title: 'Tasks Added',
              description: `Added ${response.newTasks.length} new task(s) from Gemini`,
            });
          } else if (onOrganizeText) {
            // Fallback: convert to text and organize
            const tasksText = response.newTasks.map(t => t.title).join(', ');
            await onOrganizeText(`Add these tasks: ${tasksText}`);
          }
        }
        
        // If Gemini updated tasks, apply updates
        if (response.updatedTasks) {
          response.updatedTasks.forEach(({ index, updates }) => {
            if (index >= 0 && index < tasks.length) {
              onUpdateTask(index, updates);
            }
          });
        }
        
        setInputText('');
        setShowInputBar(false);
      } catch (error) {
        console.error('Error chatting with Gemini:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to chat with Gemini',
          variant: 'destructive',
        });
      } finally {
        setIsChatting(false);
      }
    } else if (onOrganizeText) {
      // Create mode: organize text into tasks
      setIsOrganizing(true);
      try {
        await onOrganizeText(inputText);
        setInputText('');
        setShowInputBar(false);
      } catch (error) {
        console.error('Error organizing text:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to organize text',
          variant: 'destructive',
        });
      } finally {
        setIsOrganizing(false);
      }
    } else if (onAddNote) {
      // Add as note card
      const newItem: CanvasItem = {
        id: `note-${Date.now()}`,
        type: 'note',
        x: 300 + Math.random() * 400,
        y: 300 + Math.random() * 300,
        width: 250,
        data: { text: inputText },
      };
      setItems((prev) => [...prev, newItem]);
      setInputText('');
      setShowInputBar(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full h-full overflow-auto bg-[#f5f5f5]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e0e0e0 1px, transparent 1px),
            linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Connection Arrows - Curved/Flowy */}
        <svg className="absolute inset-0 pointer-events-none z-10" style={{ width: '100%', height: '100%' }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="#6366f1"
              />
            </marker>
          </defs>
          {connectionArrows.map((arrow) => {
            // Calculate control points for a smooth, flowy curve
            const dx = arrow.to.x - arrow.from.x;
            const dy = arrow.to.y - arrow.from.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance === 0) return null;
            
            // Create a wavy/flowy curve using cubic Bezier
            // Control points create a smooth S-curve with organic flow
            const curvature = Math.min(distance * 0.4, 200); // Adaptive curvature based on distance
            
            // Perpendicular direction for curve offset (creates the wave)
            const perpX = -dy / distance;
            const perpY = dx / distance;
            
            // Add some variation to make it more organic
            const wave1 = Math.sin(distance * 0.01) * 20; // Subtle wave variation
            const wave2 = Math.cos(distance * 0.01) * 20;
            
            // Control points create a smooth, flowy S-curve path
            // First control point - curves away from start
            const cp1x = arrow.from.x + dx * 0.25 + perpX * (curvature * 0.6 + wave1);
            const cp1y = arrow.from.y + dy * 0.25 + perpY * (curvature * 0.6 + wave1);
            
            // Second control point - curves back toward end
            const cp2x = arrow.from.x + dx * 0.75 - perpX * (curvature * 0.6 + wave2);
            const cp2y = arrow.from.y + dy * 0.75 - perpY * (curvature * 0.6 + wave2);
            
            return (
              <path
                key={arrow.id}
                d={`M ${arrow.from.x} ${arrow.from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${arrow.to.x} ${arrow.to.y}`}
                stroke="#6366f1"
                strokeWidth="2.5"
                fill="none"
                markerEnd="url(#arrowhead)"
                style={{
                  filter: 'drop-shadow(0 1px 2px rgba(99, 102, 241, 0.2))',
                  strokeLinecap: 'round',
                }}
              />
            );
          })}
        </svg>

        {/* Canvas Items */}
        {items.map((item) => {
          if (item.type === 'task') {
            const task = item.data as OrganizeTask;
            // Find task index by matching the item ID
            let taskIndex = -1;
            for (const [index, itemId] of taskItemIdsRef.current.entries()) {
              if (itemId === item.id) {
                taskIndex = index;
                break;
              }
            }
            
            // If not found by ID, try to match by task data
            if (taskIndex === -1) {
              taskIndex = tasks.findIndex((t) => 
                t.title === task.title && 
                t.dueDateISO === task.dueDateISO
              );
            }
            
            // Always render the task, even if index is invalid (it will be cleaned up on next update)
            const isValidIndex = taskIndex >= 0 && taskIndex < tasks.length;
            
            return (
              <div
                key={item.id}
                className={cn(
                  'absolute bg-white rounded-lg border-2 shadow-md p-4 cursor-grab active:cursor-grabbing hover:shadow-lg z-20',
                  draggedItem === item.id 
                    ? 'opacity-75 scale-95 z-50' 
                    : 'transition-all',
                  selectedItems.has(item.id) && 'border-primary ring-2 ring-primary/20',
                  connectingFrom === item.id && 'border-blue-500 ring-2 ring-blue-500/30',
                  !selectedItems.has(item.id) && connectingFrom !== item.id && 'border-gray-200'
                )}
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${item.width}px`,
                }}
                onClick={(e) => handleItemClick(e, item.id)}
                onMouseDown={(e) => handleMouseDown(e, item.id)}
              >
                <div className="flex items-start gap-2 mb-2">
                  <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <Input
                    value={task.title}
                    onChange={(e) => {
                      if (isValidIndex) {
                        onUpdateTask(taskIndex, { title: e.target.value });
                      }
                    }}
                    className="flex-1 text-sm border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                    placeholder="Task title"
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
                {task.dueDateISO && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                    <Calendar className="h-3 w-3" />
                    <Input
                      type="date"
                      value={task.dueDateISO || ''}
                      onChange={(e) => {
                        if (isValidIndex) {
                          onUpdateTask(taskIndex, {
                            dueDateISO: e.target.value || null,
                          });
                        }
                      }}
                      className="text-xs h-7 border-gray-200 bg-white"
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                {task.category && (
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {task.category}
                  </span>
                )}
              </div>
            );
          }

          if (item.type === 'image') {
            const imageData = item.data as { url: string; file: File };
            return (
              <div
                key={item.id}
                className={cn(
                  'absolute rounded-lg border-2 shadow-md overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-lg group z-20',
                  draggedItem === item.id 
                    ? 'opacity-75 scale-95 z-50' 
                    : 'transition-all',
                  selectedItems.has(item.id) && 'border-primary ring-2 ring-primary/20',
                  connectingFrom === item.id && 'border-blue-500 ring-2 ring-blue-500/30',
                  !selectedItems.has(item.id) && connectingFrom !== item.id && 'border-gray-300'
                )}
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${item.width}px`,
                  height: `${item.height}px`,
                }}
                onClick={(e) => handleItemClick(e, item.id)}
                onMouseDown={(e) => handleMouseDown(e, item.id)}
              >
                <img
                  src={imageData.url}
                  alt="Uploaded"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-black/50 hover:bg-black/70 rounded transition-opacity"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            );
          }

          if (item.type === 'note') {
            const noteData = item.data as { text: string };
            return (
              <div
                key={item.id}
                className={cn(
                  'absolute bg-yellow-50 rounded-lg border-2 shadow-md p-3 cursor-grab active:cursor-grabbing hover:shadow-lg group z-20',
                  draggedItem === item.id 
                    ? 'opacity-75 scale-95 z-50' 
                    : 'transition-all',
                  selectedItems.has(item.id) && 'border-primary ring-2 ring-primary/20',
                  connectingFrom === item.id && 'border-blue-500 ring-2 ring-blue-500/30',
                  !selectedItems.has(item.id) && connectingFrom !== item.id && 'border-yellow-200'
                )}
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${item.width}px`,
                }}
                onClick={(e) => handleItemClick(e, item.id)}
                onMouseDown={(e) => handleMouseDown(e, item.id)}
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 flex-1">{noteData.text}</p>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Connection Toolbar */}
      {selectedItems.size > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2">
            <span className="text-xs text-gray-600 mr-2">
              {selectedItems.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectSelected}
              disabled={selectedItems.size < 2}
              className="h-8 gap-1.5"
            >
              <Link2 className="h-3.5 w-3.5" />
              Connect
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnectSelected}
              className="h-8 gap-1.5"
            >
              <Unlink className="h-3.5 w-3.5" />
              Disconnect
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItems(new Set())}
              className="h-8"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Connecting Mode Indicator */}
      {connectingFrom && (
        <div className="absolute top-4 right-4 z-50 bg-blue-500 text-white rounded-lg shadow-lg px-4 py-2">
          <p className="text-sm font-medium">Click a task to connect</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConnectingFrom(null)}
            className="h-6 w-6 p-0 mt-1 text-white hover:bg-white/20"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Floating Action Bar */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 min-w-[500px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 p-0"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex-1">
            {showInputBar ? (
              <div className="flex items-center gap-2">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={chatMode === 'chat' ? 'Ask about your tasks...' : 'What do you want to create?'}
                  className="min-h-[40px] max-h-[120px] resize-none border-0 focus-visible:ring-0 bg-transparent flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleInputSubmit();
                    }
                    if (e.key === 'Escape') {
                      setShowInputBar(false);
                      setInputText('');
                    }
                  }}
                  autoFocus
                />
                {/* Mode toggle icons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setChatMode('create')}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      chatMode === 'create' 
                        ? "bg-primary/10 text-primary" 
                        : "text-gray-400 hover:text-gray-600"
                    )}
                    title="Create new tasks"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </button>
                  {tasks.length > 0 && (
                    <button
                      onClick={() => setChatMode('chat')}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        chatMode === 'chat' 
                          ? "bg-teal-500/10 text-teal-600" 
                          : "text-gray-400 hover:text-gray-600"
                      )}
                      title="Chat with Gemini about your tasks"
                    >
                      {/* Gemini 'G' icon */}
                      <div className={cn(
                        "h-4 w-4 rounded flex items-center justify-center text-[10px] font-bold",
                        chatMode === 'chat' ? "bg-teal-500 text-white" : "bg-gray-200 text-gray-500"
                      )}>
                        G
                      </div>
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleInputSubmit}
                  disabled={!inputText.trim() || isOrganizing || isChatting}
                  className="h-8 w-8 p-0 bg-primary hover:bg-primary/90"
                >
                  {(isOrganizing || isChatting) ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowInputBar(true)}
                className="w-full text-left text-sm text-gray-400 hover:text-gray-600 py-2 flex items-center gap-2"
              >
                <span>What do you want to create?</span>
                {tasks.length > 0 && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Lightbulb className="h-3.5 w-3.5 text-teal-500" />
                    <div className="h-3.5 w-3.5 rounded bg-teal-500 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">G</span>
                    </div>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

