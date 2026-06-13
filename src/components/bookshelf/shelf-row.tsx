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
import type { Book } from '@/types/book';

interface ShelfRowProps {
  books: Book[];
  onBookClick?: (book: Book) => void;
  rowIndex?: number;
  editMode?: boolean;
  onReorder?: (orderedIds: string[]) => void;
  onColorChange?: (bookId: string, color: string) => void;
}

export function ShelfRow({
  books,
  onBookClick,
  rowIndex = 0,
  editMode = false,
  onReorder,
  onColorChange,
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: rowIndex * 0.1 }}
      className="relative"
    >
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
                onColorChange={onColorChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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

      <div
        className="h-1"
        style={{
          background: 'linear-gradient(180deg, #7a6245 0%, #5c4a35 100%)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      />

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
  onColorChange,
}: {
  id: string;
  rowIndex: number;
  book: Book;
  index: number;
  editMode: boolean;
  onClick?: (book: Book) => void;
  onColorChange?: (bookId: string, color: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editMode,
  });

  return (
    <div
      ref={setNodeRef}
      data-row={rowIndex}
      className="min-h-[1px]"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : index + 10,
        opacity: isDragging ? 0.85 : 1,
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
          onColorChange={(color) => onColorChange?.(book.id, color)}
        />
      </div>
    </div>
  );
}
