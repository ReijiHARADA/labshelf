'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Book } from '@/types/book';
import {
  Book3DCard,
  getBookThickness,
  getBookVisualSize,
} from './book-3d-card';
import {
  getCoverAspectRatio,
  loadCoverAspectRatio,
  normalizeCoverUrl,
} from '@/lib/cover-aspect-ratio';
import { loadCoverDominantColor } from '@/lib/cover-dominant-color';

// ---------------------------------------------------------------------------
// 3D Book Wall — 中央から左右に向かい合う本の列
// ---------------------------------------------------------------------------

const VISIBLE_SLOTS = 19;
const HALF = Math.floor(VISIBLE_SLOTS / 2);

const PERSPECTIVE_PX = 1280;
const PX_PER_SLOT = 52;
const SNAP_FRACTION = 0.22;
const SNAP_COOLDOWN = 280;

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

/** 中央から左右へ奥に引く配置（円弧ではない） */
function getBookWallTransform(slotOffset: number) {
  const abs = Math.abs(slotOffset);
  const side = slotOffset < 0 ? -1 : 1;

  const x = side * (20 + abs * 54 + Math.pow(abs, 1.35) * 8);
  const z = -abs * 46;

  const rotateBase = 80;
  const rotateAdd = Math.min(abs * 1.3, 7);
  const rotateY = side < 0 ? rotateBase + rotateAdd : -rotateBase - rotateAdd;

  const scale = Math.max(0.78, 1 - abs * 0.014);
  const opacity = Math.max(0.45, 1 - Math.max(0, abs - 6) * 0.1);
  const blur = Math.max(0, abs - 7) * 0.8;

  return { x, z, rotateY, scale, opacity, blur, side };
}

function getPaintOrder(slotOffset: number): number {
  return -Math.abs(slotOffset);
}

function computeStageMetrics(viewportHeight: number) {
  const stageH = Math.min(Math.max(viewportHeight * 0.72, 460), 720);
  const bookBaseHeight = stageH * 0.86;
  return { stageH, bookBaseHeight };
}

type RatioMap = Record<string, number>;

function ratioReducer(
  state: RatioMap,
  { id, ratio }: { id: string; ratio: number }
): RatioMap {
  if (state[id] === ratio) return state;
  return { ...state, [id]: ratio };
}

interface CoverFlowBookshelfProps {
  books: Book[];
}

export function CoverFlowBookshelf({ books }: CoverFlowBookshelfProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [stageMetrics, setStageMetrics] = useState(() =>
    typeof window !== 'undefined'
      ? computeStageMetrics(window.innerHeight)
      : { stageH: 520, bookBaseHeight: 447 }
  );
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFraction, setDragFraction] = useState(0);

  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const draggingRef = useRef(false);
  const dragFractionRef = useRef(0);
  const wheelAccum = useRef(0);
  const lastWheelAt = useRef(0);

  const { bookBaseHeight } = stageMetrics;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    const update = () => setStageMetrics(computeStageMetrics(window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (books.length === 0) return;
    setActiveIndex((p) => wrapIndex(p, books.length));
  }, [books.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const [ratios, dispatchRatio] = useReducer(ratioReducer, {} as RatioMap);
  useEffect(() => {
    for (const book of books) {
      const url = normalizeCoverUrl(book.coverImageUrl);
      dispatchRatio({ id: book.id, ratio: getCoverAspectRatio(book) });
      if (!url) continue;
      void loadCoverAspectRatio(url).then((r) => dispatchRatio({ id: book.id, ratio: r }));
      if (!book.spineColor?.trim()) {
        void loadCoverDominantColor(url);
      }
    }
  }, [books]);

  const sizes = useMemo(
    () =>
      books.map((book) =>
        getBookVisualSize(ratios[book.id] ?? getCoverAspectRatio(book), bookBaseHeight)
      ),
    [books, ratios, bookBaseHeight]
  );

  const applyDragFraction = useCallback((raw: number) => {
    dragFractionRef.current = raw;
    setDragFraction(raw);
  }, []);

  const commitDrag = useCallback(() => {
    const steps = Math.round(dragFractionRef.current);
    if (steps !== 0 && books.length > 0) {
      setActiveIndex((p) => wrapIndex(p + steps, books.length));
    }
    dragFractionRef.current = 0;
    setDragFraction(0);
    draggingRef.current = false;
    setIsDragging(false);
  }, [books.length]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (books.length === 0) return;
      setActiveIndex((p) => wrapIndex(p + dir, books.length));
    },
    [books.length]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragMoved.current = false;
    draggingRef.current = true;
    dragFractionRef.current = 0;
    setIsDragging(true);
    setDragFraction(0);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - dragStartX.current;
      if (Math.abs(dx) > 4) dragMoved.current = true;
      applyDragFraction(-dx / PX_PER_SLOT);
    },
    [applyDragFraction]
  );

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    if (!dragMoved.current) {
      draggingRef.current = false;
      setIsDragging(false);
      return;
    }
    if (Math.abs(dragFractionRef.current) >= SNAP_FRACTION) {
      commitDrag();
    } else {
      dragFractionRef.current = 0;
      setDragFraction(0);
      draggingRef.current = false;
      setIsDragging(false);
    }
  }, [commitDrag]);

  const onPointerCancel = useCallback(() => {
    dragFractionRef.current = 0;
    draggingRef.current = false;
    setDragFraction(0);
    setIsDragging(false);
  }, []);

  const onContainerClick = useCallback((e: React.MouseEvent) => {
    if (dragMoved.current) {
      e.stopPropagation();
      dragMoved.current = false;
    }
  }, []);

  const touchStartX = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
    dragMoved.current = false;
    draggingRef.current = true;
    dragFractionRef.current = 0;
    setIsDragging(true);
    setDragFraction(0);
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = (e.touches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
      if (Math.abs(dx) > 4) dragMoved.current = true;
      applyDragFraction(-dx / PX_PER_SLOT);
    },
    [applyDragFraction]
  );

  const onTouchEnd = useCallback(() => {
    if (!draggingRef.current) return;
    if (!dragMoved.current) {
      draggingRef.current = false;
      setIsDragging(false);
      return;
    }
    if (Math.abs(dragFractionRef.current) >= SNAP_FRACTION) {
      commitDrag();
    } else {
      dragFractionRef.current = 0;
      setDragFraction(0);
      draggingRef.current = false;
      setIsDragging(false);
    }
  }, [commitDrag]);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.6 ? e.deltaX : e.deltaY;
      if (Math.abs(dx) < 2) return;
      e.preventDefault();

      wheelAccum.current += dx;
      const now = Date.now();
      if (now - lastWheelAt.current < SNAP_COOLDOWN) return;

      if (Math.abs(wheelAccum.current) >= 36) {
        step(wheelAccum.current > 0 ? 1 : -1);
        wheelAccum.current = 0;
        lastWheelAt.current = now;
      }
    },
    [step]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if ((e.key === 'Enter' || e.key === ' ') && books[activeIndex]) {
        e.preventDefault();
        router.push(`/books/${books[activeIndex]!.id}`);
      }
    },
    [books, activeIndex, router, step]
  );

  if (books.length === 0) return null;

  const maxH = bookBaseHeight;
  const maxScale = 1;
  const layoutStageH = Math.ceil(maxH * (2 * maxScale - 1)) + 48;
  const dur = reduceMotion ? '0ms' : '380ms';
  const ease = 'cubic-bezier(0.22, 0.9, 0.28, 1)';
  const centerX = containerWidth / 2;
  const transition = isDragging
    ? 'none'
    : `transform ${dur} ${ease}, opacity ${dur} ${ease}, filter ${dur} ${ease}`;

  const slots: number[] = [];
  for (let s = -HALF; s <= HALF; s++) slots.push(s);

  const slotEntries = slots
    .map((slot) => {
      const bookIndex = wrapIndex(activeIndex + slot, books.length);
      const slotOffset = slot - dragFraction;
      const { x, z, rotateY, scale, opacity, blur, side } =
        getBookWallTransform(slotOffset);

      return {
        slot,
        bookIndex,
        book: books[bookIndex]!,
        slotOffset,
        x,
        z,
        rotateY,
        scale,
        opacity,
        blur,
        side,
      };
    })
    .sort((a, b) => getPaintOrder(a.slotOffset) - getPaintOrder(b.slotOffset));

  return (
    <div
      style={{
        width: '100%',
        minHeight: layoutStageH,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <div
        ref={containerRef}
        role="region"
        aria-label="書籍3Dウォール"
        aria-roledescription="3D書籍ウォール"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onContainerClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          height: layoutStageH,
          outline: 'none',
          userSelect: 'none',
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'visible',
          clipPath: 'inset(-120px 0 -120px 0)',
          perspective: PERSPECTIVE_PX,
          perspectiveOrigin: '50% 46%',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: layoutStageH,
            transformStyle: 'preserve-3d',
          }}
        >
          {slotEntries.map(
            ({ slot, bookIndex, book, x, z, rotateY, scale, opacity, blur, side }) => {
              const sz = sizes[bookIndex] ?? getBookVisualSize(0.7, bookBaseHeight);
              const thickness = getBookThickness(sz.height);
              const visualH = sz.height * scale;

              const anchorLeft = centerX;
              const translateX = side < 0 ? x - sz.width : x;
              const transformOrigin = side < 0 ? '100% 50%' : '0% 50%';

              return (
                <div
                  key={`${slot}-${book.id}-${bookIndex}`}
                  style={{
                    position: 'absolute',
                    top: (layoutStageH - visualH) / 2,
                    left: anchorLeft,
                    width: sz.width,
                    height: sz.height,
                    transformStyle: 'preserve-3d',
                    transformOrigin,
                    transform: `translate3d(${translateX}px, 0, ${z}px) scale(${scale})`,
                    opacity,
                    filter: blur > 0 ? `blur(${blur}px)` : undefined,
                    transition,
                    overflow: 'visible',
                  }}
                >
                  <Book3DCard
                    book={book}
                    rotateY={rotateY}
                    baseHeight={bookBaseHeight}
                    thickness={thickness}
                    scale={1}
                    opacity={1}
                    transitionMs={isDragging ? 0 : 380}
                    reduceMotion={reduceMotion}
                    onClick={() => {
                      if (dragMoved.current) return;
                      router.push(`/books/${book.id}`);
                    }}
                  />
                </div>
              );
            }
          )}
        </div>

        <p className="sr-only" aria-live="polite">
          {activeIndex + 1} / {books.length} — {books[activeIndex]?.title}
        </p>
      </div>
    </div>
  );
}
