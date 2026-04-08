'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, BookPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { normalizeToIsbn13 } from '@/lib/isbn';
import { LABSHELF_INGEST_TOKEN_KEY } from '@/lib/labshelf-client-storage';

type ScanStatus =
  | { type: 'idle' }
  | { type: 'starting' }
  | { type: 'running' }
  | { type: 'error'; message: string }
  | { type: 'found'; isbn: string };

type ResultTone = 'success' | 'warning' | 'error';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const ingestingRef = useRef(false);
  const lastSubmittedRef = useRef<{ isbn: string; at: number } | null>(null);

  const [status, setStatus] = useState<ScanStatus>({ type: 'idle' });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [lastRaw, setLastRaw] = useState<string>('');
  const [result, setResult] = useState<{
    ok: boolean;
    tone: ResultTone;
    title: string;
    message: string;
    detail?: string;
    added?: string[];
    skipped?: string[];
    invalid?: string[];
  } | null>(null);

  const supportsDetector = useMemo(() => hasBarcodeDetector(), []);

  useEffect(() => {
    const readToken = () =>
      setToken(
        typeof window !== 'undefined'
          ? localStorage.getItem(LABSHELF_INGEST_TOKEN_KEY) || ''
          : ''
      );
    readToken();
    const onStorage = (e: StorageEvent) => {
      if (e.key === LABSHELF_INGEST_TOKEN_KEY) readToken();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  async function stopCamera() {
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
    setResult(null);
    setStatus({ type: 'starting' });
    try {
      await stopCamera();
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

  async function reportFound(raw: string): Promise<boolean> {
    setLastRaw(raw);
    const isbn13 = normalizeToIsbn13(raw);
    if (!isbn13) return false;
    return addIsbn(isbn13);
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
          const accepted = await reportFound(v);
          if (accepted) return;
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
          const accepted = await reportFound(result.getText());
          if (accepted) return;
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

  async function resumeScanning() {
    if (!streamRef.current || !videoRef.current) return;
    if (status.type === 'starting') return;
    scanningRef.current = true;
    setStatus({ type: 'running' });
    if (supportsDetector) {
      runBarcodeDetectorLoop();
    } else {
      await runZxingLoop();
    }
  }

  async function addIsbn(isbn13: string): Promise<boolean> {
    if (ingestingRef.current) return false;
    const now = Date.now();
    const last = lastSubmittedRef.current;
    if (last && last.isbn === isbn13 && now - last.at < 3000) {
      return false;
    }
    scanningRef.current = false;
    setStatus({ type: 'found', isbn: isbn13 });
    lastSubmittedRef.current = { isbn: isbn13, at: now };
    ingestingRef.current = true;
    setResult(null);
    if (!token.trim()) {
      setResult({
        ok: false,
        tone: 'error',
        title: '送信できません',
        message: '共有トークンを入力してください',
      });
      ingestingRef.current = false;
      return true;
    }
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LabShelf-Token': token.trim(),
        },
        body: JSON.stringify({ isbn: isbn13 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          ok: false,
          tone: 'error',
          title: '追加に失敗しました',
          message: data?.error || `追加に失敗しました (${res.status})`,
          detail:
            typeof data?.sheet?.error === 'string'
              ? data.sheet.error
              : undefined,
        });
        return true;
      }
      const added = Array.isArray(data?.added) ? data.added : [];
      const skipped = Array.isArray(data?.skipped) ? data.skipped : [];
      const invalid = Array.isArray(data?.invalid) ? data.invalid : [];
      const sheetError =
        typeof data?.sheet?.error === 'string' ? data.sheet.error : undefined;
      const hasSheetError = Boolean(sheetError);
      const hasAdded = added.length > 0;
      const hasSkipped = skipped.length > 0;
      setResult({
        ok: hasAdded && Boolean(data?.success) && !hasSheetError,
        tone: hasSheetError
          ? 'error'
          : hasAdded
            ? 'success'
            : hasSkipped
              ? 'warning'
              : 'error',
        title: hasAdded
          ? hasSheetError
            ? '一部失敗（スプレッドシート未反映）'
            : '登録完了'
          : hasSkipped
            ? '既に登録済み'
            : '追加に失敗しました',
        message:
          hasAdded && !hasSheetError
            ? 'データベースとスプレッドシートへ追加しました'
            : hasAdded && hasSheetError
              ? 'データベースへの追加は成功しましたが、スプレッドシート追記に失敗しました'
            : hasSkipped
              ? 'このISBNは既に登録済みのためスキップしました'
              : '追加できませんでした',
        detail: sheetError,
        added,
        skipped,
        invalid,
      });
      return true;
    } catch (e) {
      setResult({
        ok: false,
        tone: 'error',
        title: '追加に失敗しました',
        message: e instanceof Error ? e.message : '追加に失敗しました',
        detail: undefined,
      });
      return true;
    } finally {
      ingestingRef.current = false;
      // 同じカメラ起動状態のまま次の本を読み取れるように再開する。
      window.setTimeout(() => {
        void resumeScanning();
      }, 600);
    }
    return true;
  }

  const foundIsbn = status.type === 'found' ? status.isbn : '';
  const isCameraOn =
    status.type === 'running' || status.type === 'found' || status.type === 'error';
  const frameClass =
    status.type === 'found'
      ? 'border-emerald-400'
      : status.type === 'error'
        ? 'border-red-400'
        : result?.tone === 'success'
          ? 'border-emerald-400'
          : result?.tone === 'warning'
            ? 'border-amber-400'
            : result?.tone === 'error'
              ? 'border-red-400'
              : status.type === 'running'
                ? 'border-sky-400'
                : 'border-border';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">スキャンして追加</h1>
            <p className="mt-2 text-muted-foreground">
              スマホ/PCのカメラでISBNバーコードを読み取り、そのままDBとスプレッドシートに追加します。
            </p>
          </div>
          <Button variant="outline" onClick={refreshDevices}>
            <RefreshCw className="h-4 w-4 mr-2" />
            カメラ更新
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              カメラ
            </CardTitle>
            <CardDescription>
              {supportsDetector
                ? 'このブラウザはBarcodeDetectorに対応しています。'
                : 'BarcodeDetector非対応のため、フォールバック方式で読み取ります。'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
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
                  className="h-11 min-w-28"
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

            <div className={cn('relative overflow-hidden rounded-xl border-2 bg-black/95 transition-colors', frameClass)}>
              <video
                ref={videoRef}
                className="w-full h-[320px] sm:h-[420px] object-contain"
                muted
                playsInline
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className="rounded-lg border-2 border-emerald-300/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                  style={{
                    width: `${GUIDE_WIDTH_RATIO * 100}%`,
                    height: `${GUIDE_HEIGHT_RATIO * 100}%`,
                  }}
                />
              </div>
            </div>

            {status.type === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                {status.message}
              </div>
            )}
            {status.type === 'running' && (
              <div className="text-sm text-muted-foreground">
                バーコードを枠内に入れてください。
                {lastRaw ? `（直近: ${lastRaw}）` : ''}
              </div>
            )}
            {status.type === 'found' && (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">検出したISBN</p>
                  <p className="font-mono text-lg truncate">{foundIsbn}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    自動で追加しています...
                  </p>
                </div>
                <BookPlus className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <div
            className={cn(
              'rounded-lg border p-4 text-sm flex items-start gap-2',
              result.tone === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : result.tone === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-red-50 border-red-200 text-red-900'
            )}
          >
            {result.tone === 'success' ? (
              <CheckCircle2 className="h-5 w-5 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-semibold">{result.title}</div>
              <div>{result.message}</div>
              {result.detail ? (
                <div className="text-xs opacity-90 break-all">
                  原因詳細: {result.detail}
                </div>
              ) : null}
              {result.added?.length ? (
                <div>追加: {result.added.join(', ')}</div>
              ) : null}
              {result.skipped?.length ? (
                <div>既存: {result.skipped.join(', ')}</div>
              ) : null}
              {result.invalid?.length ? (
                <div>不正: {result.invalid.join(', ')}</div>
              ) : null}
            </div>
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

