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
import { Book3DCard, getBookVisualSize } from './book-3d-card';
import {
  getCoverAspectRatio,
  loadCoverAspectRatio,
  normalizeCoverUrl,
} from '@/lib/cover-aspect-ratio';

// ---------------------------------------------------------------------------
// 円弧カルーセル: 常に ~11 冊を円周上に配置し、スワイプで円が回転する
// ---------------------------------------------------------------------------

/** 同時表示スロット数（参考 UI と同程度） */
const VISIBLE_SLOTS = 11;
const HALF = (VISIBLE_SLOTS - 1) / 2; // 5

/** スロット間の円周角 (deg) */
const SLOT_ANGLE = 11.5;

/** 円弧の仮想半径 (px)。大きいほど弧が緩やか */
const ARC_RADIUS = 780;

const PERSPECTIVE_PX = 1100;

/** 1 スロット分のドラッグ量 (px) */
const PX_PER_SLOT = 64;

/** スナップ閾値（スロット単位） */
const SNAP_FRACTION = 0.28;

const SNAP_COOLDOWN = 280;

/** スロット位置 → 3D 変換（円弧上 + スパイン主役の角度） */
function getCarouselTransform(slotOffset: number) {
  const angleDeg = slotOffset * SLOT_ANGLE;
  const angleRad = (angleDeg * Math.PI) / 180;
  const abs = Math.abs(slotOffset);

  // 円弧上の XZ 配置（中央 = 手前 z=0、端 = 奥）
  const x = ARC_RADIUS * Math.sin(angleRad);
  const z = ARC_RADIUS * (Math.cos(angleRad) - 1);

  // スパイン主役: 左 +角度 / 右 -角度（0° 正面なし）
  const spineBase = Math.max(78 - abs * 1.2, 72);
  const rotateY =
    slotOffset <= 0
      ? spineBase + angleDeg * 0.18
      : -(spineBase - angleDeg * 0.18);

  const scale = Math.max(1.06 - abs * 0.011, 0.93);
  const opacity = Math.max(1 - abs * 0.05, 0.62);

  return { x, z, rotateY, scale, opacity };
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
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  /** ドラッグ中の fractional offset（+ = 次の本へ回転） */
  const [dragFraction, setDragFraction] = useState(0);

  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const draggingRef = useRef(false);
  const dragFractionRef = useRef(0);
  const wheelAccum = useRef(0);
  const lastWheelAt = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    if (books.length === 0) return;
    setActiveIndex((p) => Math.min(p, books.length - 1));
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
      loadCoverAspectRatio(url).then((r) => dispatchRatio({ id: book.id, ratio: r }));
    }
  }, [books]);

  const sizes = useMemo(
    () =>
      books.map((book) =>
        getBookVisualSize(ratios[book.id] ?? getCoverAspectRatio(book))
      ),
    [books, ratios]
  );

  const clampIndex = useCallback(
    (i: number) => Math.max(0, Math.min(books.length - 1, i)),
    [books.length]
  );

  const applyDragFraction = useCallback(
    (raw: number) => {
      let f = raw;
      // 端でラバーバンド
      if (activeIndex <= 0 && f > 0) f *= 0.22;
      if (activeIndex >= books.length - 1 && f < 0) f *= 0.22;
      dragFractionRef.current = f;
      setDragFraction(f);
    },
    [activeIndex, books.length]
  );

  const commitDrag = useCallback(() => {
    const steps = Math.round(dragFractionRef.current);
    if (steps !== 0) {
      setActiveIndex((p) => clampIndex(p + steps));
    }
    dragFractionRef.current = 0;
    setDragFraction(0);
    draggingRef.current = false;
    setIsDragging(false);
  }, [clampIndex]);

  const step = useCallback(
    (dir: 1 | -1) => {
      setActiveIndex((p) => clampIndex(p + dir));
    },
    [clampIndex]
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

  const maxH = Math.max(...sizes.map((s) => s.height), 260);
  const stageH = maxH + 40;
  const dur = reduceMotion ? '0ms' : '360ms';
  const ease = 'cubic-bezier(0.22, 0.9, 0.28, 1)';
  const centerX = containerWidth / 2;
  const transition = isDragging ? 'none' : `transform ${dur} ${ease}, left ${dur} ${ease}`;

  // 常に VISIBLE_SLOTS 分のスロットを描画
  const slots: number[] = [];
  for (let s = -HALF; s <= HALF; s++) slots.push(s);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="書籍カルーセル"
      aria-roledescription="3D書籍カルーセル"
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
        width: '100%',
        outline: 'none',
        userSelect: 'none',
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        overflow: 'hidden',
        perspective: PERSPECTIVE_PX,
        perspectiveOrigin: '50% 40%',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: stageH,
          transformStyle: 'preserve-3d',
        }}
      >
        {slots.map((slot) => {
          const bookIndex = activeIndex + slot;
          if (bookIndex < 0 || bookIndex >= books.length) return null;

          const book = books[bookIndex]!;
          const slotOffset = slot - dragFraction;
          const { x, z, rotateY, scale, opacity } = getCarouselTransform(slotOffset);
          const sz = sizes[bookIndex] ?? { width: 180, height: 268 };

          const isCenter = Math.abs(slotOffset) < 0.5;

          return (
            <div
              key={book.id}
              style={{
                position: 'absolute',
                top: (stageH - sz.height) / 2,
                left: centerX + x - sz.width / 2,
                width: sz.width,
                height: sz.height,
                transformStyle: 'preserve-3d',
                transform: `translateZ(${z}px)`,
                transition,
                zIndex: Math.round(100 - Math.abs(slotOffset) * 10),
                overflow: 'visible',
              }}
            >
              <Book3DCard
                book={book}
                rotateY={rotateY}
                scale={scale}
                opacity={opacity}
                transitionMs={isDragging ? 0 : 360}
                reduceMotion={reduceMotion}
                onClick={() => {
                  if (dragMoved.current) return;
                  if (isCenter) {
                    router.push(`/books/${book.id}`);
                  } else {
                    setActiveIndex(bookIndex);
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {activeIndex + 1} / {books.length} — {books[activeIndex]?.title}
      </p>
    </div>
  );
}
