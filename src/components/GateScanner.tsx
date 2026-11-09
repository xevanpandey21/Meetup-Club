/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Users,
  ShieldCheck,
  Building,
  Calendar,
  Volume2,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TicketItem, GateScanResult } from '../types';
import { findTicketByIdOrQr, checkInTicket, subscribeTickets } from '../services/dbService';

interface GateScannerProps {
  staffName?: string;
  onExit?: () => void;
}

export const GateScanner: React.FC<GateScannerProps> = ({
  staffName = 'Gate Officer',
  onExit,
}) => {
  // Input modes: 'camera' | 'upload' | 'search'
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'search'>('camera');

  // Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Manual search input
  const [searchCode, setSearchCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Scan Result Overlay
  const [scanResult, setScanResult] = useState<GateScanResult | null>(null);

  // Live Stats from DB
  const [allTickets, setAllTickets] = useState<TicketItem[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Subscribe to live ticket stats
  useEffect(() => {
    const unsub = subscribeTickets((list) => {
      setAllTickets(list);
    });
    return () => unsub();
  }, []);

  // Web Audio Tone generator
  const playTone = (type: 'valid' | 'invalid' | 'warning') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'valid') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'invalid') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(330, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Audio context policy fallback
    }
  };

  // Trigger haptic vibration on mobile
  const triggerHaptic = (pattern: number[]) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore vibration errors
      }
    }
  };

  // Start Camera QR Scanner
  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError(
          'Live camera streaming is not supported or accessible in this browser/preview window. Use Search ID or QR Upload below.'
        );
        setScannerActive(false);
        return;
      }

      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch {
          // Ignore clean-up error
        }
      }

      const scanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = scanner;

      const qrConfig = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      try {
        await scanner.start(
          { facingMode: 'environment' },
          qrConfig,
          (decodedText) => {
            handleQrDecoded(decodedText);
          },
          (_errorMessage) => {
            // Frame read pass
          }
        );
      } catch (firstErr: any) {
        const firstErrMsg = String(firstErr?.message || firstErr || '');
        const isPermission =
          firstErr?.name === 'NotAllowedError' ||
          firstErr?.name === 'PermissionDeniedError' ||
          firstErrMsg.toLowerCase().includes('permission denied') ||
          firstErrMsg.toLowerCase().includes('notallowederror');

        if (!isPermission) {
          // If back camera is not available (e.g. desktop/laptop webcam), fallback to front/user camera
          try {
            await scanner.start(
              { facingMode: 'user' },
              qrConfig,
              (decodedText) => {
                handleQrDecoded(decodedText);
              },
              () => {}
            );
          } catch {
            // Further fallback to generic video constraints
            await scanner.start(
              { video: true } as any,
              qrConfig,
              (decodedText) => {
                handleQrDecoded(decodedText);
              },
              () => {}
            );
          }
        } else {
          throw firstErr;
        }
      }

      setScannerActive(true);
    } catch (err: any) {
      // Gracefully handle camera denial or unavailability without generating console warnings
      const errMsg = String(err?.message || err || '');
      const errName = String(err?.name || '');
      const isPermissionDenied =
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('permission denied') ||
        errMsg.toLowerCase().includes('notallowederror');

      const isNotFound =
        errName === 'NotFoundError' ||
        errName === 'DevicesNotFoundError' ||
        errMsg.toLowerCase().includes('not found') ||
        errMsg.toLowerCase().includes('requested device not found');

      if (isPermissionDenied) {
        setCameraError(
          'Camera access was denied or restricted by your browser/iframe environment. Click "Search ID" below to check in tickets manually or upload a pass image.'
        );
      } else if (isNotFound) {
        setCameraError(
          'No camera was detected on this device. Please use manual Search ID or upload a ticket QR screenshot.'
        );
      } else {
        setCameraError(
          'Live camera stream is unavailable. Please use Search ID or QR Image Upload below.'
        );
      }
      setScannerActive(false);
    }
  };

  // Stop Camera Scanner
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {
        // Ignore cleanup error
      }
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  };

  // Handle activeMode transitions
  useEffect(() => {
    if (activeMode === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [activeMode]);

  // Unified ticket processor
  const processTicketCode = async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    const ticket = await findTicketByIdOrQr(trimmed);

    if (!ticket) {
      playTone('invalid');
      triggerHaptic([200, 100, 200]);
      setScanResult({
        status: 'invalid',
        message: 'INVALID OR FORGED TICKET - NO RECORD FOUND',
        scannedAt: new Date().toLocaleTimeString(),
      });
      return;
    }

    if (ticket.status === 'Verified') {
      if (ticket.isCheckedIn) {
        playTone('invalid');
        triggerHaptic([300, 100, 300]);
        setScanResult({
          status: 'invalid',
          ticket,
          message: 'TICKET ALREADY SCANNED - ENTRY PREVIOUSLY GRANTED',
          scannedAt: new Date().toLocaleTimeString(),
        });
      } else {
        await checkInTicket(ticket.id, staffName);
        playTone('valid');
        triggerHaptic([100, 50, 100, 50, 150]);

        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#A3E635', '#bef264', '#000000', '#FFFFFF'],
          });
        } catch {
          // Confetti silent fail
        }

        setScanResult({
          status: 'valid',
          ticket: { ...ticket, isCheckedIn: true },
          message: 'ACCESS GRANTED - VIP ADMITTED',
          scannedAt: new Date().toLocaleTimeString(),
        });
      }
    } else if (ticket.status === 'Pending') {
      playTone('warning');
      triggerHaptic([150, 100, 150]);
      setScanResult({
        status: 'unverified',
        ticket,
        message: 'Tickets are not verified from the admin',
        scannedAt: new Date().toLocaleTimeString(),
      });
    } else {
      playTone('invalid');
      triggerHaptic([250, 80, 250]);
      setScanResult({
        status: 'invalid',
        ticket,
        message: 'REJECTED TICKET - PAYMENT CANCELLED OR REFUNDED',
        scannedAt: new Date().toLocaleTimeString(),
      });
    }
  };

  const handleQrDecoded = (decodedText: string) => {
    if (isProcessingRef.current || scanResult !== null) return;
    isProcessingRef.current = true;
    processTicketCode(decodedText);
  };

  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('file-qr-temp');
      const decodedResult = await html5QrCode.scanFile(file, true);
      processTicketCode(decodedResult);
    } catch {
      setScanResult({
        status: 'invalid',
        message: 'INVALID OR UNREADABLE TICKET QR IMAGE',
        scannedAt: new Date().toLocaleTimeString(),
      });
    }
  };

  const handleManualSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    setIsSearching(true);
    await processTicketCode(searchCode.trim());
    setIsSearching(false);
  };

  const handleScanNextGuest = () => {
    setScanResult(null);
    setSearchCode('');
    // Brief 300ms cooldown so the previous physical pass isn't instantly scanned again
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 300);
  };

  // Gate Turnstile Stats
  const checkedInCount = allTickets.filter((t) => t.isCheckedIn).length;
  const verifiedPendingCount = allTickets.filter((t) => t.status === 'Verified' && !t.isCheckedIn).length;
  const totalVerifiedCount = allTickets.filter((t) => t.status === 'Verified').length;

  return (
    <div className="relative min-h-[85vh] w-full max-w-2xl mx-auto px-3 sm:px-6 py-6 text-white">
      {/* Hidden container for temp file scanning */}
      <div id="file-qr-temp" className="hidden" />

      {/* Top Staff Navigation & Title */}
      <div className="flex items-center justify-between pb-4 border-b border-[#27272A] mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#A3E635] flex items-center justify-center text-black shadow-sm">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-white tracking-wide">
              Turnstile Gate Scanner
            </h2>
            <p className="text-[11px] font-mono text-[#A1A1AA]">
              Station: Main Entry VIP Gate • {staffName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-white cursor-pointer shadow-sm"
            title={soundEnabled ? 'Mute Chimes' : 'Unmute Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#A3E635]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-xs font-semibold text-white hover:text-[#A3E635] cursor-pointer shadow-sm"
            >
              Exit Scanner
            </button>
          )}
        </div>
      </div>

      {/* Live Turnstile Stats Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        <div className="p-3 rounded-xl bg-[#121214] border border-[#27272A] text-center shadow-sm">
          <span className="text-[10px] uppercase font-mono text-[#A1A1AA] block">Admitted / In</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-[#A3E635]">
            {checkedInCount}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#121214] border border-[#27272A] text-center shadow-sm">
          <span className="text-[10px] uppercase font-mono text-[#A1A1AA] block">Awaiting Entry</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
            {verifiedPendingCount}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#121214] border border-[#27272A] text-center shadow-sm">
          <span className="text-[10px] uppercase font-mono text-[#A1A1AA] block">Total Issued</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-white">
            {totalVerifiedCount}
          </span>
        </div>
      </div>

      {/* 3 Verification Input Modes Selector */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#121214] border border-[#27272A] mb-5">
        <button
          onClick={() => {
            setActiveMode('camera');
            setScanResult(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer ${
            activeMode === 'camera'
              ? 'bg-[#A3E635] text-black shadow-md shadow-[#A3E635]/25'
              : 'text-[#D4D4D8] hover:text-white hover:bg-[#18181B]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Live Camera</span>
        </button>

        <button
          onClick={() => {
            setActiveMode('upload');
            setScanResult(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer ${
            activeMode === 'upload'
              ? 'bg-[#A3E635] text-black shadow-md shadow-[#A3E635]/25'
              : 'text-[#D4D4D8] hover:text-white hover:bg-[#18181B]'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>QR Upload</span>
        </button>

        <button
          onClick={() => {
            setActiveMode('search');
            setScanResult(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer ${
            activeMode === 'search'
              ? 'bg-[#A3E635] text-black shadow-md shadow-[#A3E635]/25'
              : 'text-[#D4D4D8] hover:text-white hover:bg-[#18181B]'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search ID</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* MODE 1: LIVE CAMERA SCANNER                                */}
      {/* ========================================================= */}
      {activeMode === 'camera' && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-[#27272A] min-h-[320px] sm:min-h-[380px] flex flex-col items-center justify-center">
            {/* Html5Qrcode video mount target - permanently mounted in camera mode to eliminate stream lag */}
            <div id="qr-reader" className="w-full h-full" />

            {/* Viewfinder crosshairs overlay - ONLY when actively scanning without error */}
            {!scanResult && !cameraError && scannerActive && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative w-56 h-56 border-2 border-[#A3E635] rounded-2xl shadow-[0_0_25px_rgba(163,230,53,0.4)]">
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#A3E635]" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#A3E635]" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#A3E635]" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#A3E635]" />
                  <div className="w-full h-0.5 bg-[#A3E635] absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_12px_rgba(163,230,53,0.9)]" />
                </div>
              </div>
            )}

            {/* Polished, clear Camera Notice Overlay */}
            {cameraError && !scanResult && (
              <div className="absolute inset-0 p-6 bg-[#0A0A0A]/95 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-4 z-20">
                <div className="w-14 h-14 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#A3E635] shadow-sm">
                  <Camera className="w-7 h-7" />
                </div>

                <div className="max-w-md space-y-1.5">
                  <h3 className="text-base font-serif font-bold text-white">
                    Camera Permission Restricted
                  </h3>
                  <p className="text-xs text-[#D4D4D8] leading-relaxed">
                    {cameraError}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-sm pt-1">
                  <button
                    onClick={() => setActiveMode('search')}
                    className="w-full sm:flex-1 py-2.5 px-3 rounded-xl font-bold text-xs tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-md shadow-[#A3E635]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search ID</span>
                  </button>
                  <button
                    onClick={() => setActiveMode('upload')}
                    className="w-full sm:flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs text-white bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#A3E635] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload QR</span>
                  </button>
                  <button
                    onClick={startCamera}
                    className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-white bg-[#121214] border border-[#27272A] hover:border-[#A3E635] flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Retry camera stream"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="sm:hidden">Retry</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {!scanResult && !cameraError && (
            <div className="flex items-center justify-between text-xs text-[#A1A1AA] px-1 font-mono">
              <span>Align attendee ticket QR inside the reticle.</span>
              <button
                onClick={startCamera}
                className="text-[#A3E635] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                Restart Lens
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: MANUAL QR UPLOAD                                  */}
      {/* ========================================================= */}
      {activeMode === 'upload' && !scanResult && (
        <div className="p-8 rounded-2xl bg-[#121214] border border-[#27272A] text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center mx-auto text-[#A3E635]">
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Scan QR from Image / Screenshot</h3>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm mx-auto">
              If an attendee sent a screenshot of their VIP Pass via WhatsApp or photo gallery, upload it directly here.
            </p>
          </div>

          <label className="inline-block px-6 py-3 rounded-xl font-bold text-xs tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-md shadow-[#A3E635]/30 cursor-pointer transition-all duration-200">
            <span>Select Ticket Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleQrFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 3: MANUAL CODE SEARCH                                */}
      {/* ========================================================= */}
      {activeMode === 'search' && !scanResult && (
        <form onSubmit={handleManualSearchSubmit} className="space-y-4 p-6 rounded-2xl bg-[#121214] border border-[#27272A] shadow-sm">
          <div>
            <h3 className="text-base font-bold text-white">Manual Ticket ID / UTR Search</h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Enter the unique 6-digit Ticket ID (e.g. <code>MC-123456</code>) or banking UTR number.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              placeholder="e.g. MC-89421A or 431098765432"
              className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635] focus:outline-none text-white font-mono uppercase tracking-widest placeholder-[#71717A]"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || !searchCode.trim()}
            className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-md shadow-[#A3E635]/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? 'Verifying Credentials...' : 'Search & Check In Guest'}
          </button>
        </form>
      )}

      {/* Quick Turnstile Pass Simulator (Active Event Passes) */}
      {!scanResult && allTickets.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#121214] border border-[#27272A] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3E635] font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#A3E635]" />
              Quick Pass Verification ({allTickets.length} registered)
            </span>
            <span className="text-[10px] text-[#A1A1AA] font-mono">
              Click to admit / verify
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allTickets.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => processTicketCode(t.qrCodeData || t.id)}
                className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#A3E635] text-left transition-colors flex items-center justify-between gap-2 group cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-white group-hover:text-[#A3E635]">
                      {t.id}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                        t.isCheckedIn
                          ? 'bg-zinc-800 text-zinc-400'
                          : t.status === 'Verified'
                          ? 'bg-lime-950/80 text-[#A3E635] border border-lime-800/40'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                      }`}
                    >
                      {t.isCheckedIn ? 'Checked-In' : t.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#A1A1AA] truncate mt-0.5">
                    {t.attendeeName} • UTR: {t.utrNumber}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#A3E635] uppercase font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  Verify →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCANNER RESULT OVERLAYS & COLOR ALERTS                    */}
      {/* ========================================================= */}
      {scanResult && (
        <div className="mt-4 space-y-4 animate-in zoom-in-95 duration-150">
          {/* 🟢 GREEN/LIME OVERLAY: VALID TICKET */}
          {scanResult.status === 'valid' && (
            <div className="relative p-6 sm:p-8 rounded-3xl bg-[#121214] border-2 border-[#A3E635] shadow-[0_0_30px_rgba(163,230,53,0.2)] text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-[#A3E635]/15 border-2 border-[#A3E635] flex items-center justify-center mx-auto text-[#A3E635] shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#A3E635] bg-[#A3E635]/15 px-3 py-1 rounded-full border border-[#A3E635]/40 font-bold">
                  {scanResult.scannedAt} • Pass ID: {scanResult.ticket?.id}
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-2">
                  {scanResult.message}
                </h3>
              </div>

              {/* Attendee Details Card */}
              {scanResult.ticket && (
                <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] text-left space-y-2 text-xs shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                    <span className="text-[#A1A1AA] font-mono">Attendee Name:</span>
                    <strong className="text-white text-sm font-semibold">
                      {scanResult.ticket.attendeeName}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                    <span className="text-[#A1A1AA] font-mono">Event:</span>
                    <strong className="text-[#A3E635] text-xs">
                      {scanResult.ticket.eventTitle}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                    <span className="text-[#A1A1AA] font-mono">Organization:</span>
                    <span className="text-white">
                      {scanResult.ticket.attendeeOrg || 'Private Patron'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#A3E635] font-mono font-semibold">
                    <span>Turnstile Status:</span>
                    <span>✓ Admitted & Locked</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleScanNextGuest}
                className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] active:scale-[0.99] shadow-lg shadow-[#A3E635]/30 transition-all cursor-pointer"
              >
                Scan Next Ticket
              </button>
            </div>
          )}

          {/* 🔴 RED OVERLAY: INVALID OR ALREADY USED */}
          {scanResult.status === 'invalid' && (
            <div className="relative p-6 sm:p-8 rounded-3xl bg-[#121214] border-2 border-rose-500 shadow-xl text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-rose-950/40 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-400 shadow-md animate-pulse">
                <XCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[11px] font-mono tracking-widest uppercase text-rose-300 bg-rose-950/50 px-3 py-1 rounded-full border border-rose-500/40 font-bold">
                  Access Denied • {scanResult.scannedAt}
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-2">
                  {scanResult.message}
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-[#18181B] border border-rose-900/40 text-left text-xs space-y-2 shadow-sm">
                {scanResult.ticket?.isCheckedIn ? (
                  <>
                    <p className="text-rose-400 font-medium">
                      ⚠️ This ticket was already checked in at{' '}
                      <span className="font-mono text-white font-bold">
                        {scanResult.ticket.checkedInAt
                          ? new Date(scanResult.ticket.checkedInAt).toLocaleString()
                          : 'Earlier Today'}
                      </span>
                      . Re-entry with the same QR code is strictly prohibited.
                    </p>
                    <p className="text-[#A1A1AA]">
                      Original Guest: <strong className="text-white">{scanResult.ticket.attendeeName}</strong>
                    </p>
                  </>
                ) : (
                  <p className="text-[#A1A1AA]">
                    No matching active ticket found for this QR payload. The ticket may be forged or an invalid code.
                  </p>
                )}
              </div>

              <button
                onClick={handleScanNextGuest}
                className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] active:scale-[0.99] shadow-lg shadow-[#A3E635]/30 transition-all cursor-pointer"
              >
                Scan Next Ticket
              </button>
            </div>
          )}

          {/* 🟡 YELLOW OVERLAY: UNVERIFIED / FLAGGED */}
          {scanResult.status === 'unverified' && (
            <div className="relative p-6 sm:p-8 rounded-3xl bg-[#121214] border-2 border-amber-500 shadow-xl text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-amber-950/40 border-2 border-amber-500 flex items-center justify-center mx-auto text-amber-400 shadow-md">
                <AlertTriangle className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[11px] font-mono tracking-widest uppercase text-amber-300 bg-amber-950/50 px-3 py-1 rounded-full border border-amber-500/40 font-bold">
                  Staff Verification Flag • {scanResult.scannedAt}
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-2">
                  Tickets are not verified from the admin
                </h3>
              </div>

              {scanResult.ticket && (
                <div className="p-4 rounded-2xl bg-[#18181B] border border-amber-900/40 text-left text-xs space-y-2 shadow-sm">
                  <p className="text-amber-300 font-medium">
                    This ticket has not yet been approved by the club administrator. Payment UTR: <code className="bg-amber-950/60 text-amber-200 px-1 py-0.5 rounded border border-amber-700/50">{scanResult.ticket.utrNumber}</code>
                  </p>
                  <p className="text-[#A1A1AA]">
                    Guest Name: <strong className="text-white">{scanResult.ticket.attendeeName}</strong> ({scanResult.ticket.attendeePhone || 'No phone'})
                  </p>
                  <p className="text-[#71717A] text-[11px]">
                    Direct guest to the Help Desk or request Admin verification in the Admin CMS Queue.
                  </p>
                </div>
              )}

              <button
                onClick={handleScanNextGuest}
                className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] active:scale-[0.99] shadow-lg shadow-[#A3E635]/30 transition-all cursor-pointer"
              >
                Scan Next Ticket
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
