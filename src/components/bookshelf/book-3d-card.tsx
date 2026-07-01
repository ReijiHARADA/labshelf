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
import { loadCoverDominantColor } from '@/lib/cover-dominant-color';

export function getBookVisualSize(
  aspectRatio: number,
  baseHeight = 308
): { width: number; height: number } {
  const safeRatio = Math.min(Math.max(aspectRatio, 0.42), 1.15);
  return { width: Math.round(baseHeight * safeRatio), height: baseHeight };
}

export function getBookThickness(height: number): number {
  return Math.max(12, Math.min(24, Math.round(height * 0.055)));
}

interface Book3DCardProps {
  book: Book;
  rotateY: number;
  onClick: () => void;
  baseHeight?: number;
  thickness?: number;
  transitionMs?: number;
  scale?: number;
  opacity?: number;
  reduceMotion?: boolean;
}

export function Book3DCard({
  book,
  rotateY,
  onClick,
  baseHeight = 308,
  thickness,
  transitionMs = 340,
  scale = 1,
  opacity = 1,
  reduceMotion = false,
}: Book3DCardProps) {
  const coverSrc = normalizeCoverUrl(book.coverImageUrl);

  const [spineColor, setSpineColor] = useState(() => getBookSpineColor(book));
  const [aspectRatio, setAspectRatio] = useState(() => getCoverAspectRatio(book));
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    setSpineColor(getBookSpineColor(book));
    setAspectRatio(getCoverAspectRatio(book));
    if (!coverSrc) return;
    void loadCoverAspectRatio(coverSrc).then(setAspectRatio);
    if (!book.spineColor?.trim()) {
      void loadCoverDominantColor(coverSrc).then((color) => {
        if (color) setSpineColor(color);
      });
    }
  }, [book.id, book.coverImageUrl, book.spineColor, book.category, coverSrc]);

  const { width: W, height: H } = getBookVisualSize(aspectRatio, baseHeight);
  const S = thickness ?? getBookThickness(H);

  const dur = reduceMotion ? '0ms' : `${transitionMs}ms`;
  const ease = 'cubic-bezier(0.22, 0.9, 0.28, 1)';
  const hasCover = !!coverSrc && !imageError;

  const imgStyle: React.CSSProperties = {
    width: W,
    height: H,
    objectFit: 'contain',
    objectPosition: 'center top',
    display: 'block',
  };

  const sideFaceBase: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: (W - S) / 2,
    width: S,
    height: H,
    backfaceVisibility: 'visible',
    WebkitBackfaceVisibility: 'visible',
    transformStyle: 'preserve-3d',
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
        transformStyle: 'preserve-3d',
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
          transform: `rotateY(${rotateY}deg) translate3d(0,0,0)`,
          transition: reduceMotion ? 'none' : `transform ${dur} ${ease}`,
          willChange: reduceMotion ? undefined : 'transform',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate3d(0,0,${S / 2}px)`,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
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

        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `rotateY(180deg) translate3d(0,0,${S / 2}px)`,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
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

        <div
          aria-hidden
          style={{
            ...sideFaceBase,
            transform: `rotateY(-90deg) translate3d(0,0,${W / 2}px)`,
            backgroundColor: spineColor,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 0',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              color: 'rgba(255,255,255,0.95)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxHeight: H - 20,
            }}
          >
            {book.title}
          </span>
        </div>

        <div
          aria-hidden
          style={{
            ...sideFaceBase,
            transform: `rotateY(90deg) translate3d(0,0,${W / 2}px)`,
            background:
              'linear-gradient(to right, rgba(235,230,220,0.95), rgba(248,244,236,0.92))',
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
