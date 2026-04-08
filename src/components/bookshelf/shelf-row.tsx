'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { BookSpine } from './book-spine';
import { getSpineHeight, getSpineWidth } from '@/lib/spine-colors';
import type { Book } from '@/types/book';

interface ShelfRowProps {
  books: Book[];
  onBookClick?: (book: Book) => void;
  rowIndex?: number;
  editMode?: boolean;
  onReorder?: (orderedIds: string[]) => void;
  onCycleOrientation?: (bookId: string) => void;
}

interface StackPlacement {
  marginLeft?: string;
  marginBottom?: string;
  stackLevel: number;
}

export function ShelfRow({
  books,
  onBookClick,
  rowIndex = 0,
  editMode = false,
  onReorder,
  onCycleOrientation,
}: ShelfRowProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  const orderedIds = books.map((b) => b.id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(orderedIds, oldIndex, newIndex);
    onReorder?.(next);
  };

  const placements: StackPlacement[] = [];
  let prevVisualWidth = 0;
  let prevVisualHeight = 0;
  let prevStackLift = 0;
  let prevStackLevel = 0;

  for (let i = 0; i < books.length; i++) {
    const current = books[i];
    const orientation = current.shelfOrientation ?? 'vertical';
    const isHorizontal = orientation === 'horizontal';
    const prev = i > 0 ? books[i - 1] : null;
    const prevOrientation = prev?.shelfOrientation ?? 'vertical';
    const canStackOnPrev =
      isHorizontal && i > 0 && (prevOrientation === 'horizontal' || prevOrientation === 'vertical');

    const spineWidth = getSpineWidth(current);
    const spineHeight = getSpineHeight(current);
    const visualWidth =
      orientation === 'cover'
        ? Math.max(spineHeight * 0.66, 56)
        : isHorizontal
          ? spineHeight
          : spineWidth;
    const visualHeight = isHorizontal ? spineWidth : spineHeight;

    if (canStackOnPrev) {
      const stackLift = prevStackLift + prevVisualHeight + 6;
      const stackLevel = prevStackLevel + 1;
      placements.push({
        marginLeft: `${-(prevVisualWidth + 5)}px`,
        marginBottom: `${stackLift}px`,
        stackLevel,
      });
      prevStackLift = stackLift;
      prevStackLevel = stackLevel;
    } else {
      // Horizontal books can always be placed on the shelf board.
      placements.push({ stackLevel: 0 });
      prevStackLift = 0;
      prevStackLevel = 0;
    }

    prevVisualWidth = visualWidth;
    prevVisualHeight = visualHeight;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: rowIndex * 0.1 }}
      className="relative"
    >
      {/* Books container */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={orderedIds} strategy={horizontalListSortingStrategy}>
          <div className="flex items-end gap-[5px] px-4 pb-0 min-h-[200px]">
            {books.map((book, index) => (
              <SortableBookItem
                key={book.id}
                id={book.id}
                rowIndex={rowIndex}
                book={book}
                index={index}
                editMode={editMode}
                onClick={onBookClick}
                onCycleOrientation={onCycleOrientation}
                placement={placements[index] ?? { stackLevel: 0 }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Shelf board */}
      <div 
        className="h-3"
        style={{
          background: 'linear-gradient(180deg, #c9b896 0%, #a89070 50%, #8b7355 100%)',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.3),
            0 2px 4px rgba(0,0,0,0.2),
            0 4px 8px rgba(0,0,0,0.1)
          `,
        }}
      />

      {/* Shelf front edge */}
      <div 
        className="h-1"
        style={{
          background: 'linear-gradient(180deg, #7a6245 0%, #5c4a35 100%)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      />

      {/* Shelf shadow on wall */}
      <div
        className="h-4"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 100%)',
        }}
      />
    </motion.div>
  );
}

function SortableBookItem({
  id,
  rowIndex,
  book,
  index,
  editMode,
  onClick,
  onCycleOrientation,
  placement,
}: {
  id: string;
  rowIndex: number;
  book: Book;
  index: number;
  editMode: boolean;
  onClick?: (book: Book) => void;
  onCycleOrientation?: (bookId: string) => void;
  placement: StackPlacement;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editMode,
  });

  const stackLevel = placement.stackLevel;
  const marginLeft = placement.marginLeft;
  const marginBottom = placement.marginBottom;

  return (
    <div
      ref={setNodeRef}
      data-row={rowIndex}
      className="min-h-[1px]"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        marginLeft,
        marginBottom,
        zIndex: isDragging ? 100 : index + 10 + stackLevel,
      }}
    >
      <div
        className={editMode ? 'cursor-grab active:cursor-grabbing touch-none' : ''}
        {...(editMode ? attributes : {})}
        {...(editMode ? listeners : {})}
      >
        <BookSpine
          book={book}
          onClick={() => !editMode && onClick?.(book)}
          index={index}
          editMode={editMode}
          onCycleOrientation={() => onCycleOrientation?.(book.id)}
        />
      </div>
    </div>
  );
}
