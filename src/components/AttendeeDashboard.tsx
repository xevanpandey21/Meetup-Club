/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Ticket,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { TicketItem, UserSession } from '../types';
import { subscribeTickets } from '../services/dbService';
import { TicketPassCard } from './TicketPassCard';

interface AttendeeDashboardProps {
  userSession: UserSession | null;
  onNavigateToEvents: () => void;
  onOpenAuth: () => void;
}

export const AttendeeDashboard: React.FC<AttendeeDashboardProps> = ({
  userSession,
  onNavigateToEvents,
  onOpenAuth,
}) => {
  const [allTickets, setAllTickets] = useState<TicketItem[]>([]);
  const [searchEmail, setSearchEmail] = useState(userSession?.email || '');
  const [searchTicketId, setSearchTicketId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Verified' | 'Pending' | 'Rejected'>('All');

  useEffect(() => {
    const unsub = subscribeTickets((list) => {
      setAllTickets(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (userSession?.email) {
      setSearchEmail(userSession.email);
    }
  }, [userSession]);

  // Filter tickets matching user email, phone, UID, or explicit search
  const myTickets = allTickets.filter((t) => {
    // 1. Explicit Ticket ID or UTR search takes priority
    if (searchTicketId.trim()) {
      const q = searchTicketId.trim().toLowerCase();
      return t.id.toLowerCase().includes(q) || t.utrNumber.toLowerCase().includes(q);
    }

    // 2. Logged-in session matching
    if (userSession) {
      const sessionEmail = (userSession.email || '').toLowerCase().trim();
      const ticketEmail = (t.attendeeEmail || '').toLowerCase().trim();
      const sessionPhone = (userSession.phone || '').replace(/[\s\-\(\)\.]/g, '');
      const ticketPhone = (t.attendeePhone || '').replace(/[\s\-\(\)\.]/g, '');

      const isMatch =
        (sessionEmail && ticketEmail === sessionEmail) ||
        (userSession.uid && t.attendeeId === userSession.uid) ||
        (sessionPhone && ticketPhone && sessionPhone === ticketPhone);

      if (!isMatch && searchEmail.trim()) {
        return ticketEmail === searchEmail.trim().toLowerCase();
      }
      return isMatch;
    }

    // 3. Guest lookup by email
    if (searchEmail.trim()) {
      return (t.attendeeEmail || '').toLowerCase().trim() === searchEmail.trim().toLowerCase();
    }

    return false;
  }).filter((t) => {
    if (statusFilter === 'All') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-white">
      {/* Header Profile Bar */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#121214] border border-[#27272A] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#A3E635] flex items-center justify-center text-black shadow-md shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-wide text-white">
                {userSession ? `Welcome, ${userSession.displayName || 'Patron'}` : 'My Attendee Panel'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#18181B] text-[#A3E635] border border-[#27272A] uppercase">
                {userSession ? 'Registered Member' : 'Guest Vault'}
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1">
              {userSession
                ? `Account: ${userSession.email} ${userSession.phone ? `• ${userSession.phone}` : ''} • Access your verified QR tickets and track manual UPI approvals.`
                : 'Sign in to access your persistent digital tickets or lookup your reservation by email.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {!userSession ? (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-black bg-[#A3E635] hover:bg-[#bef264] shadow-md shadow-[#A3E635]/25 transition-all cursor-pointer"
            >
              Sign In to Your Account
            </button>
          ) : (
            <span className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#18181B] border border-[#27272A] text-white">
              Active Patron Session
            </span>
          )}

          <button
            onClick={onNavigateToEvents}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#18181B] border border-[#27272A] hover:border-[#A3E635] hover:text-[#A3E635] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>Browse More Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Ticket Lookup Search & Status Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#121214] border border-[#27272A] flex flex-col md:flex-row items-center justify-between gap-3 text-xs shadow-sm">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto scrollbar-none">
          {(['All', 'Verified', 'Pending', 'Rejected'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs ${
                statusFilter === filter
                  ? 'bg-[#A3E635] text-black shadow-xs'
                  : 'bg-[#18181B] text-[#D4D4D8] border border-[#27272A] hover:text-white hover:bg-white/5'
              }`}
            >
              {filter === 'All' ? 'All Passes' : filter}
            </button>
          ))}
        </div>

        {/* Search Inputs */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {!userSession && (
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Registered email..."
              className="px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635] focus:outline-none text-white text-xs w-full sm:w-56 placeholder-[#71717A]"
            />
          )}
          <input
            type="text"
            value={searchTicketId}
            onChange={(e) => setSearchTicketId(e.target.value)}
            placeholder="Search Ticket ID or UTR..."
            className="px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635] focus:outline-none text-white text-xs w-full sm:w-52 font-mono placeholder-[#71717A]"
          />
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#A3E635]" />
            <span>My Event Passes ({myTickets.length})</span>
          </h2>
          <span className="text-xs text-[#A1A1AA] font-mono">
            Auto-refreshes in real time via Firestore
          </span>
        </div>

        {myTickets.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-[#121214] border border-[#27272A] shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center mx-auto text-[#71717A]">
              <Ticket className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Tickets Found</h3>
              <p className="text-xs text-[#A1A1AA] mt-1 max-w-md mx-auto">
                No active or pending ticket registrations match this email or search ID. If you just submitted a ticket, enter your registration email above or explore our calendar.
              </p>
            </div>
            <button
              onClick={onNavigateToEvents}
              className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-[#A3E635] hover:bg-[#bef264] shadow-md shadow-[#A3E635]/25 transition-all cursor-pointer"
            >
              Explore Upcoming Galas
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {myTickets.map((ticket) => (
              <TicketPassCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
