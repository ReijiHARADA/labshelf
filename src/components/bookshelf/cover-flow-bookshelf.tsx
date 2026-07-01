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
import { loadCoverDominantColor } from '@/lib/cover-dominant-color';

// ---------------------------------------------------------------------------
// 円弧カルーセル: 常に ~11 冊を円周上に配置し、スワイプで円が回転する
// ---------------------------------------------------------------------------

/** 同時表示スロット数（参考 UI と同程度） */
const VISIBLE_SLOTS = 11;
const HALF = (VISIBLE_SLOTS - 1) / 2; // 5

/** 隣接スロット間の X ピッチ (px) — スパイン幅より狭く、隣同士が重なる */
const X_PITCH = 22;

/** 奥行きカーブ用の角度 (deg) */
const DEPTH_ANGLE = 10.5;

/** 外側スロットを画面端まで広げる係数 */
const EDGE_SPREAD = 14;

/** スロット位置 → 3D 変換（円弧上 + スパイン主役の角度） */
function getCarouselTransform(slotOffset: number) {
  const abs = Math.abs(slotOffset);
  const sign = slotOffset === 0 ? 1 : Math.sign(slotOffset);
  const depthRad = (slotOffset * DEPTH_ANGLE * Math.PI) / 180;

  // 横位置: 密ピッチで重なり + 外側ほど追加広げ（見切れ維持）
  const tightX = slotOffset * X_PITCH * LAYOUT_SCALE;
  const edgeX = sign * abs * abs * EDGE_SPREAD * LAYOUT_SCALE;
  const x = tightX + edgeX;

  const z = ARC_RADIUS * (Math.cos(depthRad) - 1) * LAYOUT_SCALE;

  // 表紙/背面の切替は 90° 付近ギリギリまで遅らせる（スパイン主役）
  // 中央〜内側: 88–89° / 外側端のみ 86° で表紙 or 背面が少し見える
  let magnitude: number;
  if (abs < 0.6) {
    magnitude = 89;
  } else if (abs < 2.5) {
    magnitude = 88;
  } else if (abs < 4) {
    magnitude = 87;
  } else {
    magnitude = 86;
  }

  // 中央を跨いだ瞬間に向き反転（± で表紙↔背面が切り替わる）
  const rotateY = slotOffset <= 0 ? magnitude : -magnitude;

  const scale = Math.max(1.06 - abs * 0.009, 0.94) * LAYOUT_SCALE;
  const opacity = Math.max(1 - abs * 0.028, 0.82);

  return { x, z, rotateY, scale, opacity };
}

/** 参考 UI: 中央に近い本ほど手前に被さる描画順 */
function getPaintOrder(slot: number): number {
  if (slot === 0) return 10000;
  if (slot < 0) return 5000 + slot; // -5 → 4995, -1 → 4999
  return 5000 - slot; // +5 → 4995, +1 → 4999
}

/** 円弧の仮想半径 (px) */
const ARC_RADIUS = 820;

/** 全体スケール（本サイズ・弧幅） */
const LAYOUT_SCALE = 1.22;

const PERSPECTIVE_PX = 1050;

/** 1 スロット分のドラッグ量 (px) */
const PX_PER_SLOT = 58;

/** スナップ閾値（スロット単位） */
const SNAP_FRACTION = 0.28;

const SNAP_COOLDOWN = 280;

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
      void loadCoverAspectRatio(url).then((r) => dispatchRatio({ id: book.id, ratio: r }));
      if (!book.spineColor?.trim()) {
        void loadCoverDominantColor(url);
      }
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

  const maxH = Math.max(...sizes.map((s) => s.height), 300);
  const maxScale = 1.06 * LAYOUT_SCALE;
  // scale() はレイアウト枠からはみ出すため 2*scale-1 分の高さが必要
  const stageH = Math.ceil(maxH * (2 * maxScale - 1)) + 48;
  const dur = reduceMotion ? '0ms' : '360ms';
  const ease = 'cubic-bezier(0.22, 0.9, 0.28, 1)';
  const centerX = containerWidth / 2;
  const transition = isDragging
    ? 'none'
    : `transform ${dur} ${ease}, left ${dur} ${ease}, opacity ${dur} ${ease}`;

  const slots: number[] = [];
  for (let s = -HALF; s <= HALF; s++) slots.push(s);

  // 外側 → 内側 → 中央の順で描画（中央付近が手前に被さる）
  const slotEntries = slots
    .map((slot) => {
      const bookIndex = activeIndex + slot;
      if (bookIndex < 0 || bookIndex >= books.length) return null;
      const slotOffset = slot - dragFraction;
      const { x, z, rotateY, scale, opacity } = getCarouselTransform(slotOffset);
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
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => getPaintOrder(a.slot) - getPaintOrder(b.slot));

  return (
    <div
      style={{
        width: '100%',
        minHeight: stageH,
        position: 'relative',
        overflow: 'visible',
      }}
    >
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
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          height: stageH,
          outline: 'none',
          userSelect: 'none',
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'visible',
          // 左右のみ見切れ。上下は negative inset でクリップ範囲を広げる
          clipPath: 'inset(-120px 0 -120px 0)',
          perspective: PERSPECTIVE_PX,
          perspectiveOrigin: '50% 50%',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: stageH,
            transformStyle: 'preserve-3d',
          }}
        >
          {slotEntries.map(({ slot, bookIndex, book, slotOffset, x, z, rotateY, scale, opacity }) => {
            const sz = sizes[bookIndex] ?? { width: 180, height: 268 };
            const isCenter = Math.abs(slotOffset) < 0.5;
            const visualH = sz.height * scale;
            const visualW = sz.width * scale;

            return (
              <div
                key={book.id}
                style={{
                  position: 'absolute',
                  top: (stageH - visualH) / 2,
                  left: centerX + x - visualW / 2,
                  width: sz.width,
                  height: sz.height,
                  transformStyle: 'preserve-3d',
                  transform: `translate3d(0,0,${z}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  opacity,
                  transition: `${transition}, opacity ${dur} ${ease}`,
                  overflow: 'visible',
                }}
              >
                <Book3DCard
                  book={book}
                  rotateY={rotateY}
                  scale={1}
                  opacity={1}
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
    </div>
  );
}
