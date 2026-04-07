'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, BookPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { normalizeToIsbn13 } from '@/lib/isbn';

type ScanStatus =
  | { type: 'idle' }
  | { type: 'starting' }
  | { type: 'running' }
  | { type: 'error'; message: string }
  | { type: 'found'; isbn: string };

const TOKEN_KEY = 'labshelf_ingest_token';

function hasBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<ScanStatus>({ type: 'idle' });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [lastRaw, setLastRaw] = useState<string>('');
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    added?: string[];
    skipped?: string[];
    invalid?: string[];
  } | null>(null);

  const supportsDetector = useMemo(() => hasBarcodeDetector(), []);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY) || '');
  }, []);

  useEffect(() => {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
  }, [token]);

  async function stopCamera() {
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

  function reportFound(raw: string) {
    setLastRaw(raw);
    const isbn13 = normalizeToIsbn13(raw);
    if (!isbn13) return;
    setStatus({ type: 'found', isbn: isbn13 });
  }

  function runBarcodeDetectorLoop() {
    const video = videoRef.current;
    if (!video) return;

    // @ts-expect-error: BarcodeDetector is not in TS lib by default
    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'],
    });

    const tick = async () => {
      if (!videoRef.current || status.type !== 'running') return;
      try {
        const codes = await detector.detect(video);
        const v = codes?.[0]?.rawValue;
        if (v) {
          reportFound(v);
          return;
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

    try {
      const result = await reader.decodeOnceFromVideoDevice(
        deviceId || undefined,
        video
      );
      if (result?.getText) {
        reportFound(result.getText());
      }
    } catch (e) {
      setStatus({
        type: 'error',
        message:
          e instanceof Error ? e.message : 'バーコードの読み取りに失敗しました',
      });
    }
  }

  async function addIsbn(isbn13: string) {
    setResult(null);
    if (!token.trim()) {
      setResult({ ok: false, message: '共有トークンを入力してください' });
      return;
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
          message: data?.error || `追加に失敗しました (${res.status})`,
        });
        return;
      }
      const added = Array.isArray(data?.added) ? data.added : [];
      const skipped = Array.isArray(data?.skipped) ? data.skipped : [];
      const invalid = Array.isArray(data?.invalid) ? data.invalid : [];
      setResult({
        ok: Boolean(data?.success),
        message:
          added.length > 0
            ? '追加しました'
            : skipped.length > 0
              ? '既に登録済みです'
              : '追加できませんでした',
        added,
        skipped,
        invalid,
      });
    } catch (e) {
      setResult({
        ok: false,
        message: e instanceof Error ? e.message : '追加に失敗しました',
      });
    }
  }

  const foundIsbn = status.type === 'found' ? status.isbn : '';

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
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
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
              <div className="flex gap-2 pt-6 sm:pt-0">
                <Button onClick={startCamera} disabled={status.type === 'starting'}>
                  <Camera className="h-4 w-4 mr-2" />
                  {status.type === 'running' ? '再起動' : '開始'}
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  停止
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-black/95">
              <video
                ref={videoRef}
                className="w-full h-[320px] sm:h-[420px] object-contain"
                muted
                playsInline
              />
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
                </div>
                <Button onClick={() => addIsbn(foundIsbn)}>
                  <BookPlus className="h-4 w-4 mr-2" />
                  追加
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>共有トークン</CardTitle>
            <CardDescription>
              研究室内で共有するトークンです（この端末のローカルに保存されます）。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="例: labshelf-xxxx"
              className="h-11"
            />
            {token && (
              <div className="text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                保存済み
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <div
            className={cn(
              'rounded-lg border p-4 text-sm flex items-start gap-2',
              result.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            )}
          >
            {result.ok ? (
              <CheckCircle2 className="h-5 w-5 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-medium">{result.message}</div>
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
      </div>
    </div>
  );
}

