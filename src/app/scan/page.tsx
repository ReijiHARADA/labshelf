'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BookPlus,
  Table2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { normalizeToIsbn13 } from '@/lib/isbn';
import {
  LABSHELF_INGEST_TOKEN_KEY,
  LABSHELF_SHEET_ID_KEY,
} from '@/lib/labshelf-client-storage';
import { useBackgroundTasks } from '@/components/background-tasks/background-tasks-provider';

type ScanStatus =
  | { type: 'idle' }
  | { type: 'starting' }
  | { type: 'running' }
  | { type: 'error'; message: string };

const QUEUE_DEBOUNCE_MS = 3000;
const MAX_QUEUE_HISTORY = 12;

const GUIDE_WIDTH_RATIO = 0.72;
const GUIDE_HEIGHT_RATIO = 0.34;

function hasBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

type DetectedCodeLike = {
  rawValue?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
};

function isInsideGuide(
  box: { x: number; y: number; width: number; height: number } | undefined,
  width: number,
  height: number
): boolean {
  if (!box || width <= 0 || height <= 0) return true;

  const gx = width * (1 - GUIDE_WIDTH_RATIO) * 0.5;
  const gy = height * (1 - GUIDE_HEIGHT_RATIO) * 0.5;
  const gw = width * GUIDE_WIDTH_RATIO;
  const gh = height * GUIDE_HEIGHT_RATIO;

  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.5;
  return cx >= gx && cx <= gx + gw && cy >= gy && cy <= gy + gh;
}

function pickGuideCandidate(
  codes: DetectedCodeLike[] | undefined,
  width: number,
  height: number
): string | null {
  if (!codes || codes.length === 0) return null;
  for (const code of codes) {
    const raw = code.rawValue || '';
    if (!raw) continue;
    if (!isInsideGuide(code.boundingBox, width, height)) continue;
    if (!normalizeToIsbn13(raw)) continue;
    return raw;
  }
  return null;
}

export default function ScanPage() {
  const { enqueueIngest, ingestTasks } = useBackgroundTasks();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const lastSubmittedRef = useRef<{ isbn: string; at: number } | null>(null);
  const tokenRef = useRef('');

  const [status, setStatus] = useState<ScanStatus>({ type: 'idle' });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [lastRaw, setLastRaw] = useState<string>('');
  const [savedSheetId, setSavedSheetId] = useState('');
  const [recentIsbn, setRecentIsbn] = useState<string>('');

  const supportsDetector = useMemo(() => hasBarcodeDetector(), []);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    const readToken = () =>
      setToken(
        typeof window !== 'undefined'
          ? localStorage.getItem(LABSHELF_INGEST_TOKEN_KEY) || ''
          : ''
      );
    const readSheetId = () =>
      setSavedSheetId(
        typeof window !== 'undefined'
          ? localStorage.getItem(LABSHELF_SHEET_ID_KEY) || ''
          : ''
      );
    readToken();
    readSheetId();
    const onStorage = (e: StorageEvent) => {
      if (e.key === LABSHELF_INGEST_TOKEN_KEY) readToken();
      if (e.key === LABSHELF_SHEET_ID_KEY) readSheetId();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function releaseMediaTracks() {
    scanningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function stopCamera() {
    releaseMediaTracks();
    setStatus({ type: 'idle' });
  }

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    const cams = list.filter((d) => d.kind === 'videoinput');
    setDevices(cams);
    if (!deviceId && cams[0]?.deviceId) setDeviceId(cams[0].deviceId);
  }, [deviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  async function startCamera() {
    setStatus({ type: 'starting' });
    try {
      // idle に戻さない（video がアンマウントして ref が null になるのを防ぐ）
      releaseMediaTracks();
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('video要素が見つかりません');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      await refreshDevices();

      scanningRef.current = true;
      setStatus({ type: 'running' });

      if (supportsDetector) {
        runBarcodeDetectorLoop();
      } else {
        await runZxingLoop();
      }
    } catch (e) {
      setStatus({
        type: 'error',
        message: e instanceof Error ? e.message : 'カメラの起動に失敗しました',
      });
    }
  }

  function enqueueIsbn(isbn13: string) {
    const now = Date.now();
    const last = lastSubmittedRef.current;
    if (last && last.isbn === isbn13 && now - last.at < QUEUE_DEBOUNCE_MS) {
      return;
    }

    lastSubmittedRef.current = { isbn: isbn13, at: now };
    setRecentIsbn(isbn13);
    enqueueIngest(isbn13, tokenRef.current);
  }

  function reportFound(raw: string) {
    setLastRaw(raw);
    const isbn13 = normalizeToIsbn13(raw);
    if (!isbn13) return;
    enqueueIsbn(isbn13);
  }

  function runBarcodeDetectorLoop() {
    const video = videoRef.current;
    if (!video) return;

    // @ts-expect-error: BarcodeDetector is not in TS lib by default
    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'],
    });

    const tick = async () => {
      if (!videoRef.current || !scanningRef.current) return;
      try {
        const codes = (await detector.detect(video)) as DetectedCodeLike[];
        const v = pickGuideCandidate(
          codes,
          video.videoWidth || video.clientWidth || 0,
          video.videoHeight || video.clientHeight || 0
        );
        if (v) {
          reportFound(v);
        }
      } catch {
        // ignore and keep scanning
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function runZxingLoop() {
    const video = videoRef.current;
    if (!video) return;

    const mod = await import('@zxing/browser');
    const { BrowserMultiFormatReader } = mod;
    const reader = new BrowserMultiFormatReader();

    const decode = async () => {
      if (!scanningRef.current) return;
      try {
        const result = await reader.decodeOnceFromVideoDevice(
          deviceId || undefined,
          video
        );
        if (result?.getText) {
          reportFound(result.getText());
        }
      } catch {
        // keep trying while camera is running
      }
      if (scanningRef.current) {
        window.setTimeout(decode, 200);
      }
    };

    void decode();
  }

  const pendingCount = ingestTasks.filter(
    (item) => item.status === 'pending' || item.status === 'running'
  ).length;
  const queueItems = ingestTasks.slice(0, MAX_QUEUE_HISTORY);
  const isCameraOn = status.type === 'running' || status.type === 'error';
  const showVideoPreview =
    status.type === 'starting' || status.type === 'running' || status.type === 'error';
  const frameClass =
    recentIsbn && status.type === 'running'
      ? 'border-emerald-400'
      : status.type === 'error'
        ? 'border-red-400'
        : status.type === 'running'
          ? pendingCount > 0
            ? 'border-amber-400'
            : 'border-sky-400'
          : 'border-border';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">本を取り込む</h1>
            <p className="mt-2 text-muted-foreground">
              本の登録は次の2通りです。上から順に、バーコード読み取りとスプレッドシートからの取り込みを選べます。
            </p>
          </div>
          <Button variant="outline" onClick={refreshDevices} className="shrink-0 self-start">
            <RefreshCw className="h-4 w-4 mr-2" />
            カメラ更新
          </Button>
        </div>

        <div className="flex flex-col gap-12">
          <section className="space-y-4">
            <div>
              <h2 className="flex items-center gap-3 text-xl font-bold leading-snug sm:text-2xl">
                <Camera className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
                バーコードで追加
              </h2>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">使い方: </span>
                  「開始」を押してカメラを起動し、本の背表紙などにあるISBNバーコードを、画面中央の枠の中に入れてください。読み取るとすぐ次の本をスキャンでき、登録はバックグラウンドで行われます。
                </p>
                <p className="text-xs">
                  {supportsDetector
                    ? 'このブラウザでは BarcodeDetector を使って読み取ります。'
                    : 'このブラウザでは代替の読み取り方式を使います。'}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">使用するカメラ</label>
                  <select
                    className={cn(
                      'mt-1 w-full h-11 rounded-md border bg-background px-3 text-sm'
                    )}
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                  >
                    {devices.length === 0 && (
                      <option value="">（カメラが見つかりません）</option>
                    )}
                    {devices.map((d, idx) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `カメラ ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="shrink-0">
                  <Button
                    className={cn(
                      'h-11 min-w-28 shadow-none',
                      !isCameraOn &&
                        'bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white'
                    )}
                    onClick={isCameraOn ? stopCamera : startCamera}
                    disabled={status.type === 'starting'}
                    variant={isCameraOn ? 'destructive' : 'default'}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {status.type === 'starting'
                      ? '起動中...'
                      : isCameraOn
                        ? '停止'
                        : '開始'}
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  'relative min-h-[200px] overflow-hidden rounded-xl border-2 transition-colors',
                  showVideoPreview
                    ? cn('bg-black/95', frameClass)
                    : 'border-dashed border-muted-foreground/30 bg-transparent'
                )}
              >
                {/* 常にマウントして ref を維持（開始直後に stopCamera で idle に戻すと外れてエラーになる） */}
                <video
                  ref={videoRef}
                  className={cn(
                    'h-[320px] w-full object-contain sm:h-[420px]',
                    !showVideoPreview && 'invisible'
                  )}
                  muted
                  playsInline
                />
                {!showVideoPreview && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
                    <Camera className="h-8 w-8 opacity-40" />
                    <p>「開始」を押すと、ここにカメラ映像が表示されます。</p>
                  </div>
                )}
                {showVideoPreview && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className="rounded-lg border-2 border-emerald-300/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                      style={{
                        width: `${GUIDE_WIDTH_RATIO * 100}%`,
                        height: `${GUIDE_HEIGHT_RATIO * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {status.type === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {status.message}
                </div>
              )}
              {status.type === 'running' && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    バーコードを枠内に入れてください。読み取った本はそのまま次をスキャンできます。
                    {lastRaw ? `（直近: ${lastRaw}）` : ''}
                  </p>
                  {pendingCount > 0 ? (
                    <p className="text-amber-800 dark:text-amber-200">
                      バックグラウンド登録中: {pendingCount} 件
                    </p>
                  ) : null}
                  {recentIsbn ? (
                    <p className="font-mono text-xs text-foreground/80">
                      直近キュー: {recentIsbn}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="flex items-center gap-3 text-xl font-bold leading-snug sm:text-2xl">
                <Table2 className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
                スプレッドシートに直接追加
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                スプレッドシートに行を追加し、管理画面の「今すぐ同期」でデータベースに取り込みます（カメラは不要です）。
              </p>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  スプレッドシートを開き、新しい行に{' '}
                  <span className="font-medium text-foreground">ISBN</span>（と分かれば{' '}
                  <span className="font-medium text-foreground">タイトル</span>）を入力します。
                </li>
                <li>
                  <Link href="/admin" className="font-medium text-primary underline underline-offset-2">
                    管理画面
                  </Link>
                  で「今すぐ同期」を実行すると、反映されます。
                </li>
              </ol>
              {savedSheetId ? (
                <Button
                  variant="outline"
                  className="h-11 w-full border-0 bg-zinc-950 text-white shadow-none hover:bg-zinc-800 hover:text-white sm:w-auto"
                  asChild
                >
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${savedSheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    スプレッドシートを開く
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  スプレッドシートIDが未設定です。{' '}
                  <Link href="/admin" className="font-medium underline underline-offset-2">
                    管理画面
                  </Link>
                  で保存してください。
                </p>
              )}
            </div>
          </section>
        </div>

        {queueItems.length > 0 && (
          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">登録キュー</h3>
              {pendingCount > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {pendingCount} 件処理中
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">待機なし</span>
              )}
            </div>
            <ul className="space-y-2">
              {queueItems.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm',
                    item.status === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-950',
                    item.status === 'warning' && 'border-amber-200 bg-amber-50 text-amber-950',
                    item.status === 'error' && 'border-red-200 bg-red-50 text-red-950',
                    item.status === 'running' && 'border-sky-200 bg-sky-50 text-sky-950',
                    item.status === 'pending' && 'border-border bg-muted/30 text-foreground'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="font-mono text-xs mt-0.5">{item.meta?.isbn ?? ''}</p>
                      {item.message ? (
                        <p className="text-xs mt-1 opacity-90">{item.message}</p>
                      ) : null}
                      {item.detail ? (
                        <p className="text-xs mt-1 opacity-80 break-all">{item.detail}</p>
                      ) : null}
                    </div>
                    {item.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    ) : item.status === 'running' || item.status === 'pending' ? (
                      <BookPlus className="h-4 w-4 shrink-0 mt-0.5 animate-pulse" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!token.trim() && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">共有トークンが未設定です</p>
            <p className="mt-1 text-amber-900/90">
              右上の歯車から{' '}
              <Link href="/admin" className="font-medium underline underline-offset-2">
                管理画面
              </Link>
              を開き、スプレッドシートIDと共有トークンを保存してください。
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

