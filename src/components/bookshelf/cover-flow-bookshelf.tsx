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
// Constants
// ---------------------------------------------------------------------------

/** 中心から各ステップの水平間隔 (px) */
const STEP = 130;

/** 1回のスナップに必要な最小移動量 (px) */
const SNAP_THRESHOLD = 30;

/** 連続スナップ防止クールダウン (ms) */
const SNAP_COOLDOWN = 420;

/** レンダリングする最大オフセット（中心±N冊のみ DOM に持つ） */
const RENDER_RANGE = 5;

/** perspective (px) — 小さいほど3D感が強い */
const PERSPECTIVE_PX = 900;

// ---------------------------------------------------------------------------
// Visual params per offset
// ---------------------------------------------------------------------------

// offset 0→1→2→3→4+ に対する視覚パラメータ（参考画像に近づける）
const PARAMS_TABLE = [
  { angle: 0,  z: 0,    scale: 1,    opacity: 1    },  // 0: active
  { angle: 62, z: -35,  scale: 0.92, opacity: 0.92 },  // 1
  { angle: 70, z: -90,  scale: 0.80, opacity: 0.75 },  // 2
  { angle: 74, z: -140, scale: 0.68, opacity: 0.55 },  // 3
  { angle: 76, z: -180, scale: 0.57, opacity: 0.35 },  // 4+
] as const;

function getOffsetParams(offset: number) {
  const abs = Math.min(Math.abs(offset), PARAMS_TABLE.length - 1);
  const sign = Math.sign(offset) || 1;
  const p = PARAMS_TABLE[abs]!;
  return {
    rotateY:    p.angle * sign,
    translateZ: p.z,
    scale:      p.scale,
    opacity:    p.opacity,
  };
}

// ---------------------------------------------------------------------------
// Aspect ratio store
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

  // activeIndex を books 数に追従
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

  // アスペクト比の非同期読み込み
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

  // ---------------------------------------------------------------------------
  // 各本の x 座標（固定ステップ）
  // ---------------------------------------------------------------------------

  const getX = useCallback(
    (i: number) => (i - activeIndex) * STEP,
    [activeIndex]
  );

  // ステージの translateX — 画面中央に active book を来させる
  const stageOffsetX = containerWidth / 2;

  // ---------------------------------------------------------------------------
  // Drag / pointer
  // ---------------------------------------------------------------------------

  const dragState = useRef({
    active: false,
    startX: 0,
    moved: false,
  });

  const snap = useCallback(
    (direction: 1 | -1) => {
      setActiveIndex((p) => Math.max(0, Math.min(books.length - 1, p + direction)));
    },
    [books.length]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragState.current = { active: true, startX: e.clientX, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.active) return;
    if (Math.abs(e.clientX - dragState.current.startX) > 5) {
      dragState.current.moved = true;
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current.active) return;
      const dx = e.clientX - dragState.current.startX;
      dragState.current.active = false;
      if (Math.abs(dx) < SNAP_THRESHOLD) return;
      snap(dx < 0 ? 1 : -1);
    },
    [snap]
  );

  // ドラッグ中のクリックを無効化
  const onContainerClick = useCallback((e: React.MouseEvent) => {
    if (dragState.current.moved) {
      e.stopPropagation();
      dragState.current.moved = false;
    }
  }, []);

  // touch
  const touchStartX = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
      if (Math.abs(dx) < SNAP_THRESHOLD) return;
      snap(dx < 0 ? 1 : -1);
    },
    [snap]
  );

  // ---------------------------------------------------------------------------
  // Wheel / trackpad
  // ---------------------------------------------------------------------------

  const lastSnapAt = useRef(0);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      // 縦スクロールは無視
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) * 1.5) return;
      e.preventDefault();

      const now = Date.now();
      if (now - lastSnapAt.current < SNAP_COOLDOWN) return;

      if (e.deltaX > 25) {
        snap(1);
        lastSnapAt.current = now;
      } else if (e.deltaX < -25) {
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

  // keyboard
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); snap(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); snap(1); }
      else if ((e.key === 'Enter' || e.key === ' ') && books[activeIndex]) {
        e.preventDefault();
        router.push(`/books/${books[activeIndex]!.id}`);
      }
    },
    [books, activeIndex, router, snap]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (books.length === 0) return null;

  const maxH = Math.max(...sizes.map((s) => s.height), 300);
  const stageH = maxH + 40;
  const dur = reduceMotion ? '0ms' : '400ms';
  const ease = 'cubic-bezier(0.25,0.8,0.25,1)';

  // 見えない遠方の本は DOM から除外してパフォーマンスを保つ
  const renderFrom = Math.max(0, activeIndex - RENDER_RANGE);
  const renderTo = Math.min(books.length - 1, activeIndex + RENDER_RANGE);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="書籍カバーフロー"
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
        /* perspective は必ずここ1か所のみ */
        perspective: PERSPECTIVE_PX,
        perspectiveOrigin: '50% 42%',
      }}
    >
      {/* Stage */}
      <div
        style={{
          position: 'relative',
          height: stageH,
          transformStyle: 'preserve-3d',
          transform: `translateX(${stageOffsetX}px)`,
          transition: `transform ${dur} ${ease}`,
        }}
      >
        {books.map((book, i) => {
          // 範囲外はレンダリングしない
          if (i < renderFrom || i > renderTo) return null;

          const offset = i - activeIndex;
          const { rotateY, translateZ, scale, opacity } = getOffsetParams(offset);
          const sz = sizes[i] ?? { width: 230, height: 340 };
          const x = getX(i);

          return (
            <div
              key={book.id}
              style={{
                position: 'absolute',
                top: (stageH - 40 - sz.height) / 2,
                // Book3DCard の幅は sz.width。スパインは left:-(S/2) の overflow なので
                // 配置の中心は sz.width / 2 を基準にする
                left: x - sz.width / 2,
                width: sz.width,
                height: sz.height,
                transformStyle: 'preserve-3d',
                transform: `translateZ(${translateZ}px)`,
                transition: `transform ${dur} ${ease}`,
                zIndex: 100 - Math.abs(offset),
              }}
            >
              <Book3DCard
                book={book}
                rotateY={rotateY}
                scale={scale}
                opacity={opacity}
                isActive={i === activeIndex}
                transitionMs={400}
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
          gap: 5,
          paddingTop: 14,
          paddingBottom: 2,
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        {/* 最大30個まで表示 */}
        {books.slice(0, 30).map((book, i) => (
          <button
            key={book.id}
            onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
            aria-label={`${book.title}を表示`}
            style={{
              width: i === activeIndex ? 18 : 5,
              height: 5,
              borderRadius: 3,
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              backgroundColor: i === activeIndex ? 'var(--primary)' : 'currentColor',
              opacity: i === activeIndex ? 1 : 0.2,
              transition: reduceMotion ? 'none' : `width 280ms ${ease}, opacity 200ms ease`,
              flexShrink: 0,
            }}
          />
        ))}
        {books.length > 30 && (
          <span style={{ fontSize: 10, opacity: 0.4, paddingLeft: 4 }}>
            …{books.length - 30}
          </span>
        )}
      </div>

      {/* アクティブ本のタイトル表示 */}
      <div
        aria-live="polite"
        style={{ textAlign: 'center', marginTop: 10, minHeight: 40, padding: '0 24px' }}
      >
        {books[activeIndex] && (
          <>
            <p style={{
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {books[activeIndex]!.title}
            </p>
            {books[activeIndex]!.author && (
              <p style={{
                fontSize: 12,
                opacity: 0.55,
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
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
