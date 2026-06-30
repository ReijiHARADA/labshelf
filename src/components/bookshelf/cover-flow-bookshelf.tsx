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
// Design: 全書籍が68〜80度の急角度で密集する「3Dレール」
//
// ・中央の本も正面表示しない（ Cover Flow 的な0度表示なし）
// ・左グループ: rotateY 負 (右面/小口が見える方向)
// ・右グループ: rotateY 正 (左面/スパインが見える方向)
// ・active 本はわずかに小さい角度（68deg）でほんの少し「開いて」いる
// ・scale 差は最大 1.0〜1.06 程度
// ---------------------------------------------------------------------------

/** 本と本のピッチ (px)。急角度で見かけ幅が小さいため密に詰める */
const PITCH = 110;

/** レンダリングする最大オフセット数（±N冊のみ DOM に持つ） */
const RENDER_RANGE = 7;

/** perspective (px) */
const PERSPECTIVE_PX = 1000;

/** スナップに必要な最小移動量 (px) */
const SNAP_THRESHOLD = 28;

/** 連続スナップ防止クールダウン (ms) */
const SNAP_COOLDOWN = 400;

// ---------------------------------------------------------------------------
// Offset → 視覚パラメータ
// ---------------------------------------------------------------------------

/**
 * 全書籍を急角度で並べる設計:
 *  - active (0):  rotateY = 68  (スパイン側が少し見える)
 *  - left  (負):  rotateY = -(70〜80)  (左側書籍は逆向き)
 *  - right (正):  rotateY = +(70〜80)
 *  - scale/opacity の変化を最小限に抑え、遠近感はperspectiveと translateZ に任せる
 */
function getOffsetParams(offset: number) {
  const abs = Math.abs(offset);
  const sign = Math.sign(offset) === 0 ? 1 : Math.sign(offset);

  // 角度テーブル: offset 0→1→2→3→4+
  const ANGLES  = [68, 72, 75, 78, 80] as const;
  const DEPTHS  = [30, 10, -10, -25, -40] as const; // translateZ (px)
  const SCALES  = [1.06, 1.01, 0.98, 0.96, 0.94] as const;
  const OPACITY = [1,  0.88, 0.72, 0.56, 0.4] as const;

  const idx = Math.min(abs, ANGLES.length - 1) as 0 | 1 | 2 | 3 | 4;

  return {
    rotateY:    ANGLES[idx] * sign,
    translateZ: DEPTHS[idx],
    scale:      SCALES[idx],
    opacity:    OPACITY[idx],
  };
}

// ---------------------------------------------------------------------------
// Aspect ratio store
// ---------------------------------------------------------------------------

type RatioMap = Record<string, number>;

function ratioReducer(
  state: RatioMap,
  { id, ratio }: { id: string; ratio: number }
): RatioMap {
  if (state[id] === ratio) return state;
  return { ...state, [id]: ratio };
}

// ---------------------------------------------------------------------------
// CoverFlowBookshelf（実態は SpineRail / 3D Book Rail）
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

  // コンテナ幅
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // アスペクト比
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
  // Stage offset
  // ステージ全体を translateX して activeBook の中心を画面中央に合わせる
  // ---------------------------------------------------------------------------

  const stageOffsetX = containerWidth / 2;

  // ---------------------------------------------------------------------------
  // Drag / pointer
  // ---------------------------------------------------------------------------

  const drag = useRef({ active: false, startX: 0, moved: false });

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
    if (Math.abs(e.clientX - drag.current.startX) > 6) drag.current.moved = true;
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

  // ドラッグ後の誤クリックを防ぐ
  const onContainerClick = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.stopPropagation();
      drag.current.moved = false;
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
      if (Math.abs(dx) >= SNAP_THRESHOLD) snap(dx < 0 ? 1 : -1);
    },
    [snap]
  );

  // wheel / trackpad
  const lastSnapAt = useRef(0);
  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) * 1.2) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastSnapAt.current < SNAP_COOLDOWN) return;
      if (e.deltaX > 20) { snap(1); lastSnapAt.current = now; }
      else if (e.deltaX < -20) { snap(-1); lastSnapAt.current = now; }
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

  const maxH = Math.max(...sizes.map((s) => s.height), 280);
  const stageH = maxH + 20;
  const dur = reduceMotion ? '0ms' : '380ms';
  const ease = 'cubic-bezier(0.25,0.8,0.25,1)';

  const renderFrom = Math.max(0, activeIndex - RENDER_RANGE);
  const renderTo   = Math.min(books.length - 1, activeIndex + RENDER_RANGE);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="書籍レール"
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
        // perspective は必ずここ1か所
        perspective: PERSPECTIVE_PX,
        perspectiveOrigin: '50% 48%',
      }}
    >
      {/* Stage: 全本の絶対配置コンテナ */}
      <div
        style={{
          position: 'relative',
          height: stageH,
          transformStyle: 'preserve-3d',
          // activeBook の中心を画面中央へ
          transform: `translateX(${stageOffsetX}px)`,
          transition: `transform ${dur} ${ease}`,
        }}
      >
        {books.map((book, i) => {
          if (i < renderFrom || i > renderTo) return null;

          const offset = i - activeIndex;
          const { rotateY, translateZ, scale, opacity } = getOffsetParams(offset);
          const sz = sizes[i] ?? { width: 220, height: 320 };

          // x 座標: 固定ピッチで activeIndex=0 を基準に累積
          // ただし各本の見かけ幅は急角度のため実際の幅より狭い
          // ここでは PITCH (固定) を使い、本の幅差は書籍内部の3D回転で吸収する
          const x = offset * PITCH;

          return (
            <div
              key={book.id}
              style={{
                position: 'absolute',
                top: (stageH - sz.height) / 2,
                // Book3DCard の名目上の幅は sz.width
                // スパインは left:-(S/2) のはみ出しなので sz.width/2 だけずらす
                left: x - sz.width / 2,
                width: sz.width,
                height: sz.height,
                transformStyle: 'preserve-3d',
                transform: `translateZ(${translateZ}px)`,
                transition: reduceMotion
                  ? 'none'
                  : `transform ${dur} ${ease}`,
                zIndex: 100 - Math.abs(offset),
                // スパインのはみ出し（±SPINE_WIDTH/2）を隠さない
                overflow: 'visible',
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
                    // 非アクティブ本をクリック→そちらをアクティブに
                    setActiveIndex(i);
                  } else {
                    // アクティブ本をクリック→詳細ページへ
                    router.push(`/books/${book.id}`);
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ──── 極小インジケーター（本数のみ、目立たせない）────
           ページネーションドットは省略。代わりに現在位置を小さく表示する */}
      <div
        aria-live="polite"
        style={{
          textAlign: 'center',
          marginTop: 10,
          minHeight: 28,
          opacity: 0.5,
        }}
      >
        <p style={{ fontSize: 11 }}>
          {activeIndex + 1} / {books.length}
          {books[activeIndex] && (
            <span style={{ marginLeft: 8, fontWeight: 500 }}>
              {books[activeIndex]!.title.length > 28
                ? books[activeIndex]!.title.slice(0, 27) + '…'
                : books[activeIndex]!.title}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
