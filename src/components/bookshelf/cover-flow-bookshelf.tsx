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
// 参考 UI 再現: スパイン主役の 3D レール
// ・全本 rotateY ≈ ±74〜82°（0° 正面なし）
// ・画面中央より左 → +角度 / 右 → -角度（折りたたみ扇）
// ・ピッチ 36px で密に配置
// ---------------------------------------------------------------------------

const PITCH = 36;
const PERSPECTIVE_PX = 1100;
const SNAP_THRESHOLD = 24;
const SNAP_COOLDOWN = 360;
const LEFT_PADDING = 48;

function getRailParams(screenOffsetFromCenter: number) {
  const units = screenOffsetFromCenter / PITCH;
  const abs = Math.abs(units);

  const angle = Math.min(74 + abs * 2.4, 82);
  // 左側は +角度、右側は -角度
  const rotateY = screenOffsetFromCenter <= 0 ? angle : -angle;

  const translateZ = Math.max(52 - abs * 13, -32);
  const scale = Math.max(1.04 - abs * 0.014, 0.95);
  const opacity = Math.max(1 - abs * 0.035, 0.74);

  return { rotateY, translateZ, scale, opacity };
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

  const visibleHalf = Math.ceil(containerWidth / PITCH / 2) + 4;

  const drag = useRef({ active: false, startX: 0, moved: false });
  const lastSnapAt = useRef(0);

  const snap = useCallback(
    (dir: 1 | -1) => {
      setActiveIndex((p) => Math.max(0, Math.min(books.length - 1, p + dir)));
    },
    [books.length]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    drag.current = { active: true, startX: e.clientX, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active) return;
    if (Math.abs(e.clientX - drag.current.startX) > 5) drag.current.moved = true;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      drag.current.active = false;
      if (Math.abs(dx) >= SNAP_THRESHOLD) snap(dx < 0 ? 1 : -1);
    },
    [snap]
  );

  const onContainerClick = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.stopPropagation();
      drag.current.moved = false;
    }
  }, []);

  const touchStartX = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx =
        (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
      if (Math.abs(dx) >= SNAP_THRESHOLD) snap(dx < 0 ? 1 : -1);
    },
    [snap]
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(dx) < 8) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastSnapAt.current < SNAP_COOLDOWN) return;
      if (dx > 0) {
        snap(1);
        lastSnapAt.current = now;
      } else {
        snap(-1);
        lastSnapAt.current = now;
      }
    },
    [snap]
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
        snap(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        snap(1);
      } else if ((e.key === 'Enter' || e.key === ' ') && books[activeIndex]) {
        e.preventDefault();
        router.push(`/books/${books[activeIndex]!.id}`);
      }
    },
    [books, activeIndex, router, snap]
  );

  if (books.length === 0) return null;

  const maxH = Math.max(...sizes.map((s) => s.height), 260);
  const stageH = maxH + 32;
  const dur = reduceMotion ? '0ms' : '340ms';
  const ease = 'cubic-bezier(0.22, 0.9, 0.28, 1)';

  const renderFrom = Math.max(0, activeIndex - visibleHalf);
  const renderTo = Math.min(books.length - 1, activeIndex + visibleHalf);

  // active が左端付近のときは左から詰める。それ以外は active を中央へ
  const anchorX =
    activeIndex < visibleHalf
      ? LEFT_PADDING + activeIndex * PITCH
      : containerWidth / 2;

  const viewportCenter = containerWidth / 2;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="書籍レール"
      aria-roledescription="3D書籍レール"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onContainerClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        width: '100%',
        outline: 'none',
        userSelect: 'none',
        touchAction: 'pan-y',
        cursor: 'grab',
        overflow: 'hidden',
        perspective: PERSPECTIVE_PX,
        perspectiveOrigin: '50% 42%',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: stageH,
          transformStyle: 'preserve-3d',
        }}
      >
        {books.map((book, i) => {
          if (i < renderFrom || i > renderTo) return null;

          const sz = sizes[i] ?? { width: 180, height: 268 };
          const bookCenterX = anchorX + (i - activeIndex) * PITCH;
          const x = bookCenterX - sz.width / 2;

          const screenOffsetFromCenter = bookCenterX - viewportCenter;
          const { rotateY, translateZ, scale, opacity } =
            getRailParams(screenOffsetFromCenter);

          return (
            <div
              key={book.id}
              style={{
                position: 'absolute',
                top: (stageH - sz.height) / 2,
                left: x,
                width: sz.width,
                height: sz.height,
                transformStyle: 'preserve-3d',
                transform: `translateZ(${translateZ}px)`,
                transition: reduceMotion
                  ? 'none'
                  : `transform ${dur} ${ease}, left ${dur} ${ease}`,
                zIndex: 200 - Math.abs(i - activeIndex),
                overflow: 'visible',
              }}
            >
              <Book3DCard
                book={book}
                rotateY={rotateY}
                scale={scale}
                opacity={opacity}
                transitionMs={340}
                reduceMotion={reduceMotion}
                onClick={() => {
                  if (drag.current.moved) return;
                  if (i === activeIndex) {
                    router.push(`/books/${book.id}`);
                  } else {
                    setActiveIndex(i);
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
