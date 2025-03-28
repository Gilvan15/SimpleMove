import { useState, useRef, useEffect, ReactNode } from 'react';

interface MobileBottomSheetProps {
  children: ReactNode;
}

export default function MobileBottomSheet({ children }: MobileBottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [startY, setStartY] = useState(0);
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startY) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    
    if (deltaY > 0) { // Only allow dragging down
      e.preventDefault();
      const newHeight = Math.max(60, window.innerHeight * 0.8 - deltaY);
      setCurrentHeight(newHeight);
    }
  };
  
  const handleTouchEnd = () => {
    if (!currentHeight) return;
    
    // If dragged below 50% of max height, minimize it
    if (currentHeight < window.innerHeight * 0.4) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
    
    setCurrentHeight(null);
    setStartY(0);
  };
  
  const toggleSheet = () => {
    setIsExpanded(!isExpanded);
  };
  
  useEffect(() => {
    // Reset to expanded state when children change
    setIsExpanded(true);
  }, [children]);
  
  return (
    <div 
      ref={sheetRef}
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 transition-transform duration-300"
      style={{
        transform: isExpanded ? 'translateY(0)' : 'translateY(calc(100% - 60px))',
        height: currentHeight ? `${currentHeight}px` : isExpanded ? '80vh' : 'auto',
        maxHeight: '80vh'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="h-1 w-16 bg-gray-300 rounded-full mx-auto my-3 cursor-pointer"
        onClick={toggleSheet}
      />
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 20px)' }}>
        {children}
      </div>
    </div>
  );
}
