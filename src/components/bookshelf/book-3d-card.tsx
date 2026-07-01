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
// 高さ基準で表紙比率を維持
// ---------------------------------------------------------------------------

export function getBookVisualSize(aspectRatio: number): { width: number; height: number } {
  const safeRatio = Math.min(Math.max(aspectRatio, 0.42), 1.15);
  const height = 268;
  return { width: Math.round(height * safeRatio), height };
}

/** 3D ボックスの厚み（スパイン幅） */
export const SPINE_WIDTH = 32;

interface Book3DCardProps {
  book: Book;
  /** Y 軸回転 (deg)。±75〜82 でスパインが主役になる */
  rotateY: number;
  onClick: () => void;
  transitionMs?: number;
  scale?: number;
  opacity?: number;
  reduceMotion?: boolean;
}

/**
 * front / back / spine / fore-edge の 4 面ボックス。
 * rotateY ≈ ±80° でスパイン面がカメラ向きになり、参考 UI の薄い板列になる。
 */
export function Book3DCard({
  book,
  rotateY,
  onClick,
  transitionMs = 340,
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
  const ease = 'cubic-bezier(0.22, 0.9, 0.28, 1)';
  const hasCover = !!coverSrc && !imageError;

  const titleText = book.title.length > 16 ? `${book.title.slice(0, 15)}…` : book.title;
  const authorText = book.author.length > 10 ? `${book.author.slice(0, 9)}…` : book.author;

  const imgStyle: React.CSSProperties = {
    width: W,
    height: H,
    objectFit: 'cover',
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
        transformOrigin: 'center center',
        transition: `transform ${dur} ${ease}, opacity ${dur} ease`,
        flexShrink: 0,
      }}
    >
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
        {/* 表紙 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translateZ(${S / 2}px)`,
            backfaceVisibility: 'hidden',
            overflow: 'hidden',
            backgroundColor: spineColor,
          }}
        >
          {hasCover ? (
            <img
              src={coverSrc!}
              alt=""
              style={imgStyle}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
            />
          ) : (
            <FallbackFace w={W} h={H} color={spineColor} title={book.title} />
          )}
        </div>

        {/* 背面 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `rotateY(180deg) translateZ(${S / 2}px)`,
            backfaceVisibility: 'hidden',
            overflow: 'hidden',
            backgroundColor: spineColor,
          }}
        >
          {hasCover ? (
            <img
              src={coverSrc!}
              alt=""
              style={{ ...imgStyle, filter: 'brightness(0.7) saturate(0.7)' }}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <FallbackFace w={W} h={H} color={spineColor} title="" dimmed />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 60%, rgba(255,255,255,0.03) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* 背表紙（左面） */}
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
            padding: '8px 0',
            overflow: 'hidden',
            boxShadow:
              'inset -3px 0 10px rgba(0,0,0,0.35), inset 2px 0 4px rgba(255,255,255,0.1)',
          }}
        >
          <span
            style={{
              flex: 1,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              color: 'rgba(255,255,255,0.95)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.05em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxHeight: H - 44,
            }}
          >
            {titleText}
          </span>
          <span
            style={{
              writingMode: 'vertical-rl',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxHeight: 48,
            }}
          >
            {authorText}
          </span>
        </div>

        {/* 小口（右面） */}
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
            background:
              'linear-gradient(to right, rgba(235,230,220,0.95), rgba(248,244,236,0.92))',
            boxShadow:
              'inset 3px 0 8px rgba(0,0,0,0.18), inset -2px 0 5px rgba(255,255,255,0.2)',
          }}
        />
      </div>
    </div>
  );
}

function FallbackFace({
  w,
  h,
  color,
  title,
  dimmed = false,
}: {
  w: number;
  h: number;
  color: string;
  title: string;
  dimmed?: boolean;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        backgroundColor: color,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        filter: dimmed ? 'brightness(0.65) saturate(0.6)' : undefined,
      }}
    >
      <BookOpen style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.4)' }} />
      {!dimmed && title && (
        <p
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 10,
            fontWeight: 600,
            textAlign: 'center',
            padding: '0 10px',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </p>
      )}
    </div>
  );
}
