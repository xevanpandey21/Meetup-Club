/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, MapPin, Ticket, Zap, Crown, AlertOctagon } from 'lucide-react';
import { EventItem, TicketItem } from '../types';

interface EventCardProps {
  event: EventItem;
  tickets?: TicketItem[];
  onBuyTicket: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, tickets = [], onBuyTicket }) => {
  // Calculate live tickets sold from tickets matching this event (Verified or Pending)
  const eventTickets = tickets.filter(
    (t) => t.eventId === event.id && (t.status === 'Verified' || t.status === 'Pending')
  );
  const actualTicketsSold = eventTickets.length > 0 ? eventTickets.length : (event.registeredCount || 0);
  const capacity = event.capacity || 100;
  const remainingSeats = Math.max(0, capacity - actualTicketsSold);
  const isSoldOut = remainingSeats <= 0;
  const progressPercentage = Math.min(100, (actualTicketsSold / capacity) * 100);

  return (
    <div className="group relative rounded-3xl overflow-hidden bg-[#121214] border border-[#27272A] hover:border-[#A3E635]/60 shadow-md hover:shadow-[0_0_25px_rgba(163,230,53,0.15)] transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Cover image container */}
        <div className="relative h-60 w-full overflow-hidden bg-[#18181B]">
          <img
            src={event.coverImageUrl?.trim() ? event.coverImageUrl.trim() : 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent opacity-80" />

          {/* Category Tag */}
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[#18181B]/90 text-white border border-[#27272A] uppercase backdrop-blur-md shadow-xs">
            {event.category}
          </div>

          {/* Ticket Price */}
          <div className="absolute top-4 right-4 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-[#A3E635] text-black shadow-md">
            ₹{event.ticketPrice.toLocaleString('en-IN')}
          </div>

          {/* Prominent Real-Time Sold Out Overlay if no seats remaining */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="px-5 py-2.5 rounded-2xl bg-rose-600 border border-rose-400 text-white font-mono font-bold text-sm uppercase tracking-widest shadow-2xl flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" />
                <span>SOLD OUT</span>
              </div>
            </div>
          )}
        </div>

        {/* Content body */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-serif font-bold text-white group-hover:text-[#A3E635] transition-colors line-clamp-1">
              {event.title}
            </h3>
            <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed font-light mt-1.5">
              {event.description}
            </p>
          </div>

          <div className="space-y-1.5 text-xs text-[#D4D4D8] font-mono">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#A3E635] shrink-0" />
              <span>{event.date} • {event.time}</span>
            </div>
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#A3E635] shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
          </div>

          {/* REAL-TIME EVENT CARD TICKET COUNTERS */}
          <div className="pt-2 p-3.5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              {/* Remaining Seat Counter Badge */}
              <span className={`flex items-center gap-1 font-bold ${
                isSoldOut
                  ? 'text-rose-400'
                  : remainingSeats < 20
                  ? 'text-[#A3E635] animate-pulse'
                  : 'text-[#A3E635]'
              }`}>
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>{isSoldOut ? '0 Seats Left' : `⚡ ${remainingSeats} / ${capacity} Seats Remaining`}</span>
              </span>

              {/* Total Tickets Sold Counter Badge */}
              <span className="flex items-center gap-1 text-[#A1A1AA] font-medium text-[11px]">
                <Ticket className="w-3 h-3 text-[#A3E635]" />
                <span>🎟️ {actualTicketsSold} Sold</span>
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="w-full h-2 bg-[#27272A] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isSoldOut
                    ? 'bg-rose-500'
                    : 'bg-[#A3E635]'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button / Sold Out State */}
      <div className="p-6 pt-0">
        {isSoldOut ? (
          <button
            disabled
            className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-[#71717A] bg-[#27272A] border border-[#3F3F46] cursor-not-allowed flex items-center justify-center gap-2"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>SOLD OUT (Waitlist Closed)</span>
          </button>
        ) : (
          <button
            onClick={() => onBuyTicket(event)}
            className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm hover:shadow-[0_0_16px_rgba(163,230,53,0.35)] transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-black" />
            <span>Buy Ticket (Manual UPI)</span>
          </button>
        )}
      </div>
    </div>
  );
};
