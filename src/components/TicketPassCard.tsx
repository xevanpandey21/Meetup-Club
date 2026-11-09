/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Crown,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Clock3,
  XCircle,
  Download,
  Share2,
  Sparkles,
  ShieldCheck,
  User,
  Building,
  QrCode,
  Printer,
} from 'lucide-react';
import { TicketItem } from '../types';

interface TicketPassCardProps {
  ticket: TicketItem;
  onRefresh?: () => void;
}

export const TicketPassCard: React.FC<TicketPassCardProps> = ({ ticket }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Status badge logic
  const renderStatusBadge = () => {
    if (ticket.isCheckedIn) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>CHECKED IN ({ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'USED'})</span>
        </div>
      );
    }

    switch (ticket.status) {
      case 'Verified':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-lime-500/15 text-[#A3E635] border border-lime-500/40 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#A3E635]" />
            <span>VERIFIED VIP PASS</span>
          </div>
        );
      case 'Pending':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/40 animate-pulse">
            <Clock3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Tickets are not verified from the admin</span>
          </div>
        );
      case 'Rejected':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-rose-950/40 text-rose-300 border border-rose-500/40">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>PAYMENT REJECTED</span>
          </div>
        );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    try {
      const svg = cardRef.current?.querySelector('svg');
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width + 48;
        canvas.height = img.height + 48;
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 24, 24);
          const pngFile = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.download = `MeetupClub_Pass_${ticket.id}_QR.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
        }
        URLObj.revokeObjectURL(blobURL);
      };
      img.src = blobURL;
    } catch (e) {
      console.warn('QR download fallback to print:', e);
      window.print();
    }
  };

  return (
    <div
      ref={cardRef}
      className="ticket-print-target relative rounded-3xl overflow-hidden bg-[#121214] border border-[#27272A] shadow-lg transition-all duration-300 hover:shadow-xl"
    >
      {/* Top Header */}
      <div className="relative p-6 sm:p-7 bg-[#18181B] border-b border-[#27272A]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#A3E635] flex items-center justify-center shadow-sm shrink-0 mt-0.5">
              <Crown className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-[#A3E635] block font-bold">
                MEETUP CLUB • OFFICIAL DIGITAL PASS
              </span>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide mt-0.5">
                {ticket.eventTitle}
              </h3>
              {/* Event Date & Venue prominently displayed */}
              <div className="flex items-center gap-3 mt-1.5 text-xs text-[#D4D4D8] font-medium flex-wrap">
                {ticket.eventDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#A3E635]" />
                    <span>{ticket.eventDate} {ticket.eventTime ? `• ${ticket.eventTime}` : ''}</span>
                  </span>
                )}
                {ticket.eventVenue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#A3E635]" />
                    <span className="truncate max-w-xs">{ticket.eventVenue}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1">
            {renderStatusBadge()}
            <span className="text-xs font-mono text-[#A1A1AA] block mt-1">
              Ref: <strong className="text-white font-bold">{ticket.id}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Ticket Body Content */}
      <div className="p-6 sm:p-7 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left Column: Attendee & Event Metadata */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#A1A1AA] uppercase font-mono text-[10px] block">Guest Name</span>
              <span className="text-white font-semibold text-sm flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5 text-[#A3E635]" />
                {ticket.attendeeName} {ticket.attendeeAge ? `(${ticket.attendeeAge}y)` : ''}
              </span>
            </div>

            <div>
              <span className="text-[#A1A1AA] uppercase font-mono text-[10px] block">Affiliation</span>
              <span className="text-white font-medium text-sm flex items-center gap-1.5 mt-0.5 truncate">
                <Building className="w-3.5 h-3.5 text-[#A3E635] shrink-0" />
                {ticket.attendeeOrg || 'Private Patron'}
              </span>
            </div>

            <div>
              <span className="text-[#A1A1AA] uppercase font-mono text-[10px] block">Registered Email</span>
              <span className="text-[#D4D4D8] font-mono text-xs mt-0.5 truncate block">
                {ticket.attendeeEmail}
              </span>
            </div>

            <div>
              <span className="text-[#A1A1AA] uppercase font-mono text-[10px] block">Payment UTR ID</span>
              <span className="text-[#A3E635] font-mono text-xs font-bold mt-0.5 block truncate">
                {ticket.utrNumber}
              </span>
            </div>
          </div>

          {/* Verification Notices */}
          {ticket.status === 'Pending' && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 leading-relaxed space-y-1">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Clock3 className="w-3.5 h-3.5 text-amber-400" />
                Tickets are not verified from the admin
              </span>
              <p className="text-amber-200/80">
                Your payment receipt and UTR reference ({ticket.utrNumber}) are pending verification by the administrator. Turnstile gate access activates immediately upon verification.
              </p>
            </div>
          )}

          {ticket.status === 'Rejected' && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200 leading-relaxed">
              <span className="font-semibold text-rose-300 block mb-0.5">Verification Notice:</span>
              {ticket.adminNotes || 'Payment transaction could not be confirmed. Please reach out to our verification helpline.'}
            </div>
          )}

          {ticket.status === 'Verified' && !ticket.isCheckedIn && (
            <div className="p-3.5 rounded-xl bg-lime-950/30 border border-lime-500/30 text-xs text-lime-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#A3E635] shrink-0" />
              <span>Pass verified and ready for gate entrance. Present this QR code directly to the gate scanner.</span>
            </div>
          )}
        </div>

        {/* Right Column: High-Res QR Code */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-sm">
          <div className="relative p-3 rounded-xl bg-white border border-[#27272A] shadow-sm">
            <QRCodeSVG
              value={ticket.qrCodeData}
              size={140}
              level="H"
              includeMargin={false}
              fgColor="#000000"
              bgColor="#FFFFFF"
            />
          </div>
          <span className="text-[11px] font-mono text-white font-bold mt-2 tracking-widest uppercase">
            {ticket.id}
          </span>
          <span className="text-[10px] text-[#A1A1AA] mt-0.5 font-mono">
            {ticket.isCheckedIn ? 'Checked-In at Gate' : 'Scannable at Turnstile'}
          </span>
        </div>
      </div>

      {/* Perforated Divider */}
      <div className="relative flex items-center justify-between px-2">
        <div className="w-5 h-5 rounded-full bg-[#0A0A0A] -ml-4 border-r border-[#27272A]" />
        <div className="w-full border-t border-dashed border-[#27272A]" />
        <div className="w-5 h-5 rounded-full bg-[#0A0A0A] -mr-4 border-l border-[#27272A]" />
      </div>

      {/* Ticket Footer Bar with "Download Ticket / Save QR" and Print Actions */}
      <div className="no-print p-4 sm:p-5 bg-[#18181B] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A1A1AA]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#A3E635]" />
          <span>Meetup Club Non-Transferable Digital Pass</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadQR}
            className="px-3.5 py-1.5 rounded-lg bg-[#A3E635] hover:bg-[#bef264] text-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download QR code image for gate access"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Ticket / Save QR</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-[#121214] border border-[#27272A] hover:border-[#A3E635] text-white hover:text-[#A3E635] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Print or save PDF pass"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
