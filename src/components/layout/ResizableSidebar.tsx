import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

interface ResizableSidebarProps {
  defaultWidth: number;
  onWidthChange: (width: number) => void;
  minWidth?: number;
  children: ReactNode;
}

export function ResizableSidebar({
  defaultWidth,
  onWidthChange,
  minWidth = 200,
  children,
}: ResizableSidebarProps): ReactElement {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const widthRef = useRef(defaultWidth);

  if (widthRef.current !== width) {
    widthRef.current = width;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      setWidth(Math.max(minWidth, startWidthRef.current + deltaX));
    },
    [minWidth],
  );

  const handleMouseUp = useCallback(() => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    setIsDragging(false);
    onWidthChange(widthRef.current);
  }, [onWidthChange]);

  useEffect(() => {
    if (!isDragging) return () => {};
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(
    () => () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    [],
  );

  return (
    <div
      className={`flex flex-col h-full bg-container px-[8px] py-[16px] gap-[16px] overflow-hidden relative flex-shrink-0 ${width < 250 ? 'compact-mode' : ''}`}
      style={{ width: `${width}px` }}
    >
      <button
        type="button"
        aria-label="拖拽调整侧边栏宽度"
        className="absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize hover:bg-brand z-10 transition-colors border-0 p-0 bg-transparent"
        onMouseDown={handleMouseDown}
      />
      {isDragging && (
        <div
          role="presentation"
          className="fixed inset-0 z-[9999] cursor-col-resize"
        />
      )}
      {children}
    </div>
  );
}
