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
import { Book3DCard, getBookVisualSize, SPINE_WIDTH } from './book-3d-card';
import {
  getCoverAspectRatio,
  loadCoverAspectRatio,
  normalizeCoverUrl,
} from '@/lib/cover-aspect-ratio';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ブック間の隙間 (px) */
const GAP = 20;

/** 舞台全体のパースペクティブ (px) – 1か所だけで設定 */
const PERSPECTIVE = 1200;

/** offset に応じた視覚パラメータ */
function getOffsetParams(offset: number) {
  const abs = Math.abs(offset);

  // 中央から offset 離れるほど傾き・奥行き・縮小
  const rotateY = Math.min(68, abs * 36) * Math.sign(offset);
  const translateZ = -Math.min(180, abs * 70); // px
  const scale = Math.max(0.68, 1 - abs * 0.12);
  const opacity = Math.max(0.3, 1 - abs * 0.22);

  return { rotateY, translateZ, scale, opacity };
}

// ---------------------------------------------------------------------------
// Aspect ratio reducer
// ---------------------------------------------------------------------------

type RatioMap = Record<string, number>;

function ratioReducer(state: RatioMap, { id, ratio }: { id: string; ratio: number }): RatioMap {
  if (state[id] === ratio) return state;
  return { ...state, [id]: ratio };
}

// ---------------------------------------------------------------------------
// CoverFlowBookshelf
// ---------------------------------------------------------------------------

interface CoverFlowBookshelfProps {
  books: Book[];
}

export function CoverFlowBookshelf({ books }: CoverFlowBookshelfProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(800);
  const [reduceMotion, setReduceMotion] = useState(false);

  // prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // books 数変化時に index を clamp
  useEffect(() => {
    if (books.length === 0) return;
    setActiveIndex((p) => Math.min(p, books.length - 1));
  }, [books.length]);

  // コンテナ幅を追跡
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // 各本のアスペクト比を非同期読み込み
  const [ratios, dispatchRatio] = useReducer(ratioReducer, {} as RatioMap);

  useEffect(() => {
    for (const book of books) {
      const url = normalizeCoverUrl(book.coverImageUrl);
      dispatchRatio({ id: book.id, ratio: getCoverAspectRatio(book) });
      if (!url) continue;
      loadCoverAspectRatio(url).then((r) => dispatchRatio({ id: book.id, ratio: r }));
    }
  }, [books]);

  // 各本のサイズ
  const sizes = useMemo(
    () =>
      books.map((book) => {
        const ratio = ratios[book.id] ?? getCoverAspectRatio(book);
        return getBookVisualSize(ratio);
      }),
    [books, ratios]
  );

  // ---------------------------------------------------------------------------
  // X座標の累積計算（各本の frontW を使う）
  // ---------------------------------------------------------------------------

  const xPositions = useMemo(() => {
    if (books.length === 0) return [] as number[];
    const pos = new Array<number>(books.length).fill(0);
    pos[activeIndex] = 0; // 中央を 0 とする

    // 右側
    for (let i = activeIndex + 1; i < books.length; i++) {
      const prevW = sizes[i - 1]?.width ?? 260;
      const curW = sizes[i]?.width ?? 260;
      pos[i] = pos[i - 1] + prevW / 2 + curW / 2 + GAP;
    }
    // 左側
    for (let i = activeIndex - 1; i >= 0; i--) {
      const prevW = sizes[i + 1]?.width ?? 260;
      const curW = sizes[i]?.width ?? 260;
      pos[i] = pos[i + 1] - prevW / 2 - curW / 2 - GAP;
    }

    return pos;
  }, [books.length, activeIndex, sizes]);

  /**
   * ステージ全体を右に translateX する量。
   * xPositions[activeIndex] = 0 が画面中心に来るように、
   * containerWidth / 2 だけオフセットする。
   */
  const stageOffsetX = containerWidth / 2;

  // ---------------------------------------------------------------------------
  // Drag / swipe / wheel / keyboard
  // ---------------------------------------------------------------------------

  const dragRef = useRef({ startX: 0, isDragging: false });

  const snapBy = useCallback(
    (deltaX: number) => {
      const threshold = 35;
      if (deltaX > threshold) setActiveIndex((p) => Math.max(0, p - 1));
      else if (deltaX < -threshold) setActiveIndex((p) => Math.min(books.length - 1, p + 1));
    },
    [books.length]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, isDragging: true };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current.isDragging) return;
      dragRef.current.isDragging = false;
      snapBy(e.clientX - dragRef.current.startX);
    },
    [snapBy]
  );

  // touch
  const touchStartX = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      snapBy((e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current);
    },
    [snapBy]
  );

  // wheel
  const wheelAccum = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && Math.abs(e.deltaX) < 8) return;
      e.preventDefault();
      wheelAccum.current += e.deltaX;
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        snapBy(-wheelAccum.current);
        wheelAccum.current = 0;
      }, 80);
    },
    [snapBy]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  // keyboard
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIndex((p) => Math.min(books.length - 1, p + 1));
      } else if ((e.key === 'Enter' || e.key === ' ') && books[activeIndex]) {
        e.preventDefault();
        router.push(`/books/${books[activeIndex]!.id}`);
      }
    },
    [books, activeIndex, router]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (books.length === 0) return null;

  const stageHeight = Math.max(...sizes.map((s) => s.height), 300) + 40;
  const stageT = reduceMotion ? 'none' : 'transform 380ms cubic-bezier(0.25,0.8,0.25,1)';

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="書籍カバーフロー"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        width: '100%',
        outline: 'none',
        userSelect: 'none',
        touchAction: 'pan-y',
        /* ── perspective は必ずここ1か所だけ ── */
        perspective: PERSPECTIVE,
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* Stage: 全本を絶対配置するコンテナ */}
      <div
        style={{
          position: 'relative',
          height: stageHeight,
          transformStyle: 'preserve-3d',
          transform: `translateX(${stageOffsetX}px)`,
          transition: stageT,
        }}
      >
        {books.map((book, i) => {
          const { rotateY, translateZ, scale, opacity } = getOffsetParams(i - activeIndex);
          const size = sizes[i] ?? { width: 230, height: 340 };
          const x = xPositions[i] ?? 0;

          return (
            <div
              key={book.id}
              style={{
                position: 'absolute',
                top: (stageHeight - 40 - size.height) / 2,
                /*
                 * 各本の「中心」を x に合わせる:
                 * left = x - width/2
                 */
                left: x - size.width / 2,
                width: size.width,
                height: size.height,
                transformStyle: 'preserve-3d',
                transform: `translateZ(${translateZ}px)`,
                transition: reduceMotion
                  ? 'none'
                  : 'transform 380ms cubic-bezier(0.25,0.8,0.25,1)',
                zIndex: 100 - Math.abs(i - activeIndex),
              }}
            >
              <Book3DCard
                book={book}
                rotateY={rotateY}
                scale={scale}
                opacity={opacity}
                isActive={i === activeIndex}
                transitionMs={380}
                reduceMotion={reduceMotion}
                onClick={() => {
                  if (i !== activeIndex) {
                    setActiveIndex(i);
                  } else {
                    router.push(`/books/${book.id}`);
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ドットインジケーター */}
      <div
        aria-hidden
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          paddingTop: 14,
          paddingBottom: 2,
        }}
      >
        {books.map((book, i) => (
          <button
            key={book.id}
            onClick={() => setActiveIndex(i)}
            aria-label={`${book.title}を表示`}
            style={{
              width: i === activeIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              backgroundColor: i === activeIndex ? 'var(--primary)' : 'currentColor',
              opacity: i === activeIndex ? 1 : 0.22,
              transition: reduceMotion ? 'none' : 'width 280ms ease, opacity 200ms ease',
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* アクティブ本のタイトル */}
      <div
        aria-live="polite"
        style={{ textAlign: 'center', marginTop: 10, minHeight: 42, padding: '0 20px' }}
      >
        {books[activeIndex] && (
          <>
            <p style={{
              fontWeight: 600, fontSize: 14, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {books[activeIndex]!.title}
            </p>
            {books[activeIndex]!.author && (
              <p style={{
                fontSize: 12, opacity: 0.55, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {books[activeIndex]!.author}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
