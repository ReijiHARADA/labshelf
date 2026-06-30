'use client';

import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { Book } from '@/types/book';
import { getBookSpineColor } from '@/lib/spine-colors';
import {
  getCoverAspectRatio,
  loadCoverAspectRatio,
  normalizeCoverUrl,
} from '@/lib/cover-aspect-ratio';

// ---------------------------------------------------------------------------
// Visual sizing (aspect ratio を維持したまま高さ基準で幅を計算)
// ---------------------------------------------------------------------------

export function getBookVisualSize(aspectRatio: number): { width: number; height: number } {
  const safeRatio = Math.min(Math.max(aspectRatio, 0.42), 1.15);
  let height = 320;
  if (safeRatio > 0.9) height = 280;
  else if (safeRatio < 0.52) height = 350;
  return { width: Math.round(height * safeRatio), height };
}

/** 本の厚み (px) = 3D ボックスの深さ */
export const SPINE_WIDTH = 48;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Book3DCardProps {
  book: Book;
  /** rotateY (deg). 正=左面(スパイン)が向こう、負=右面が向こう */
  rotateY: number;
  onClick: () => void;
  isActive?: boolean;
  transitionMs?: number;
  scale?: number;
  opacity?: number;
  reduceMotion?: boolean;
}

// ---------------------------------------------------------------------------
// Book3DCard
// ---------------------------------------------------------------------------

/**
 * 表紙 / 背面 / 左スパイン / 右小口 の4面を持つ3Dボックス。
 *
 * 座標系（中心 = 表紙の中心）:
 *   front: translateZ(+S/2)
 *   back:  rotateY(180deg) translateZ(+S/2)
 *   left:  left=-(S/2)  rotateY(-90deg)  ← 背表紙（スパイン）
 *   right: left=W-(S/2) rotateY(90deg)   ← 小口
 *
 * perspective は親ステージに1箇所のみ設定。このコンポーネント内には perspective を持たない。
 */
export function Book3DCard({
  book,
  rotateY,
  onClick,
  isActive = false,
  transitionMs = 380,
  scale = 1,
  opacity = 1,
  reduceMotion = false,
}: Book3DCardProps) {
  const spineColor = getBookSpineColor(book);
  const coverSrc = normalizeCoverUrl(book.coverImageUrl);

  const [aspectRatio, setAspectRatio] = useState(() => getCoverAspectRatio(book));
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    setAspectRatio(getCoverAspectRatio(book));
    if (!coverSrc) return;
    void loadCoverAspectRatio(coverSrc).then(setAspectRatio);
  }, [book.id, book.coverImageUrl, coverSrc]);

  const { width: W, height: H } = getBookVisualSize(aspectRatio);
  const S = SPINE_WIDTH;

  const dur = reduceMotion ? '0ms' : `${transitionMs}ms`;
  const ease = 'cubic-bezier(0.25,0.8,0.25,1)';
  const hasCover = !!coverSrc && !imageError;

  const titleText = book.title.length > 18 ? book.title.slice(0, 17) + '…' : book.title;
  const authorText = book.author.length > 12 ? book.author.slice(0, 11) + '…' : book.author;

  const imgBase: React.CSSProperties = {
    width: W,
    height: H,
    objectFit: 'contain',
    objectPosition: 'center top',
    display: 'block',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${book.title}（${book.author}）`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        width: W,
        height: H,
        position: 'relative',
        cursor: 'pointer',
        outline: 'none',
        transform: `scale(${scale})`,
        opacity,
        transition: `transform ${dur} ${ease}, opacity ${dur} ease`,
        flexShrink: 0,
      }}
    >
      {/* 3D inner: rotateY はここに集約 */}
      <div
        style={{
          width: W,
          height: H,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotateY}deg)`,
          transition: reduceMotion ? 'none' : `transform ${dur} ${ease}`,
        }}
      >

        {/* ── 表紙 (front) ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translateZ(${S / 2}px)`,
            backfaceVisibility: 'hidden',
            overflow: 'hidden',
            boxShadow: '2px 6px 28px rgba(0,0,0,0.4)',
          }}
        >
          {hasCover ? (
            <img
              src={coverSrc!}
              alt=""
              style={imgBase}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
          ) : (
            <FallbackFace w={W} h={H} color={spineColor} title={book.title} />
          )}
          {book.borrowedBy && (
            <span style={{
              position: 'absolute', top: 5, left: 5,
              background: 'rgba(220,38,38,0.9)', color: '#fff',
              fontSize: 9, padding: '2px 5px', borderRadius: 3, fontWeight: 600,
            }}>
              貸出中
            </span>
          )}
        </div>

        {/* ── 背面 (back) — 表紙流用・暗め加工 ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `rotateY(180deg) translateZ(${S / 2}px)`,
            backfaceVisibility: 'hidden',
            overflow: 'hidden',
            boxShadow: '2px 6px 28px rgba(0,0,0,0.4)',
          }}
        >
          {hasCover ? (
            <img
              src={coverSrc!}
              alt=""
              style={{ ...imgBase, filter: 'saturate(0.5) brightness(0.62)' }}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <FallbackFace w={W} h={H} color={spineColor} title="" dimmed />
          )}
          {/* 裏面感を強調するグラデーションオーバーレイ */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(140deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.06) 55%, rgba(255,255,255,0.04) 100%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* ── 左面（背表紙 / スパイン）── */}
        {/*
         * center: left: -(S/2) → 中心が x=0 = 表紙の左端
         * transform: rotateY(-90deg) → 左向きに折り曲げ
         */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: -(S / 2),
            width: S,
            height: H,
            transform: 'rotateY(-90deg)',
            backfaceVisibility: 'hidden',
            backgroundColor: spineColor,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
            overflow: 'hidden',
            // 内側に影を入れて深み感
            boxShadow: 'inset -4px 0 12px rgba(0,0,0,0.28), inset 4px 0 4px rgba(255,255,255,0.08)',
          }}
        >
          {/* タイトル縦書き */}
          <span style={{
            flex: 1,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            color: 'rgba(255,255,255,0.96)',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: '0.06em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxHeight: H - 48,
          }}>
            {titleText}
          </span>
          {/* 著者縦書き */}
          <span style={{
            writingMode: 'vertical-rl',
            color: 'rgba(255,255,255,0.55)',
            fontSize: 9,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxHeight: 56,
          }}>
            {authorText}
          </span>
        </div>

        {/* ── 右面（小口）── 紙の断面っぽい色 */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: W - S / 2,
            width: S,
            height: H,
            transform: 'rotateY(90deg)',
            backfaceVisibility: 'hidden',
            // 小口は少し明るいオフホワイト〜クリーム（紙の断面）
            background: `linear-gradient(to right, ${lightenColor(spineColor)}, rgba(240,235,225,0.9))`,
            boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.2), inset -2px 0 6px rgba(255,255,255,0.15)',
          }}
        />

      </div>

      {/* フォーカスリング（アクティブ時のみ） */}
      {isActive && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: 2,
            boxShadow: '0 0 0 2px rgba(99,102,241,0.8)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** spine カラーを少し明るくして小口の紙色に近づける */
function lightenColor(color: string): string {
  // CSS 変数の場合はそのまま使い、rgba 合成で明るく見せる
  return color;
}

function FallbackFace({
  w, h, color, title, dimmed = false,
}: {
  w: number; h: number; color: string; title: string; dimmed?: boolean;
}) {
  return (
    <div style={{
      width: w, height: h,
      backgroundColor: color,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      filter: dimmed ? 'saturate(0.45) brightness(0.58)' : undefined,
    }}>
      <BookOpen style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.4)' }} />
      {!dimmed && title && (
        <p style={{
          color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600,
          textAlign: 'center', padding: '0 12px',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {title}
        </p>
      )}
    </div>
  );
}
