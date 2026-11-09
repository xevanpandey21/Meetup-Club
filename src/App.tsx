/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Crown,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  QrCode,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Phone,
  Mail,
  UserCheck,
  ChevronRight,
  Search,
  Users,
  Instagram,
  Twitter,
  Linkedin,
  Building2,
  MessageSquare,
  TrendingUp,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

import {
  EventItem,
  TicketItem,
  CMSContentData,
  GalleryItem,
  PortfolioItem,
  UserSession,
} from './types';
import {
  subscribeEvents,
  subscribeTickets,
  subscribeGallery,
  subscribePortfolio,
  getCMSContent,
  DEFAULT_CMS_SETTINGS,
  submitInquiry,
} from './services/dbService';
import { testConnection } from './firebase';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { EventCard } from './components/EventCard';
import { AuthModal } from './components/AuthModal';
import { BuyTicketModal } from './components/BuyTicketModal';
import { GateScanner } from './components/GateScanner';
import { AdminPanel } from './components/AdminPanel';
import { AttendeeDashboard } from './components/AttendeeDashboard';
import { AIConciergeModal } from './components/AIConciergeModal';
import { InquiryModal } from './components/InquiryModal';

export default function App() {
  // Navigation: 'home' | 'events' | 'portfolio' | 'gallery' | 'about' | 'contact' | 'admin' | 'gate-scanner' | 'dashboard'
  const [currentPage, setCurrentPage] = useState<string>('home');

  // Multi-role session
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('mc_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  // CMS Content
  const [cmsContent, setCmsContent] = useState<CMSContentData>(DEFAULT_CMS_SETTINGS);

  // Data from Firestore
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'attendee' | 'admin' | 'staff'>('attendee');
  const [buyTicketModalOpen, setBuyTicketModalOpen] = useState(false);
  const [selectedEventForBuy, setSelectedEventForBuy] = useState<EventItem | null>(null);
  const [aiConciergeOpen, setAiConciergeOpen] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Events page filter
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('All');
  const [eventSearchQuery, setEventSearchQuery] = useState<string>('');

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'VIP Gala Inquiry',
    message: '',
  });
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);

  // Test connection and subscribe to database on boot
  useEffect(() => {
    testConnection();

    // Fetch dynamic CMS content
    getCMSContent('settings').then((data) => {
      setCmsContent(data);
    });

    // Real-time Firestore subscriptions
    const unsubEvents = subscribeEvents(setEvents);
    const unsubTickets = subscribeTickets(setTickets);
    const unsubGallery = subscribeGallery(setGallery);
    const unsubPortfolio = subscribePortfolio(setPortfolio);

    return () => {
      unsubEvents();
      unsubTickets();
      unsubGallery();
      unsubPortfolio();
    };
  }, []);


  // Handle URL route synchronization (supports /admin, /login, #admin, ?page=admin)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.toLowerCase().replace(/^\/+/, '');
    const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
    const search = new URLSearchParams(window.location.search);
    const param = search.get('page')?.toLowerCase() || search.get('tab')?.toLowerCase();

    const target = (path || hash || param || '').trim();
    if (target === 'admin') {
      setCurrentPage('admin');
      const saved = localStorage.getItem('mc_user_session');
      const session = saved ? JSON.parse(saved) : null;
      if (!session || session.role !== 'admin') {
        setAuthDefaultTab('admin');
        setAuthModalOpen(true);
      }
    } else if (target === 'login') {
      setAuthDefaultTab('admin');
      setAuthModalOpen(true);
    } else if (target === 'my-tickets' || target === 'attendee/dashboard') {
      setCurrentPage('my-tickets');
    } else if (['events', 'portfolio', 'gallery', 'about', 'contact', 'dashboard', 'gate-scanner'].includes(target)) {
      setCurrentPage(target);
    }

    const onPopState = () => {
      const popPath = window.location.pathname.toLowerCase().replace(/^\/+/, '') || 'home';
      if (popPath === 'my-tickets' || popPath === 'attendee/dashboard') {
        setCurrentPage('my-tickets');
      } else {
        setCurrentPage(popPath);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined' && window.history) {
      const targetUrl = page === 'home' ? '/' : `/${page}`;
      window.history.pushState({ page }, '', targetUrl);
    }
  };

  // Sync user session to localStorage and auto-redirect attendee to My Attendee Panel or resume checkout
  const handleLoginSuccess = (session: UserSession) => {
    setUserSession(session);
    localStorage.setItem('mc_user_session', JSON.stringify(session));
    if (session.role === 'admin') {
      handleNavigate('admin');
    } else if (session.role === 'staff') {
      handleNavigate('gate-scanner');
    } else {
      // If user was prompted to sign in while buying a ticket, immediately reopen checkout
      if (selectedEventForBuy) {
        setBuyTicketModalOpen(true);
      } else {
        handleNavigate('my-tickets');
      }
    }
  };

  const handleSignOut = () => {
    setUserSession(null);
    setSelectedEventForBuy(null);
    localStorage.removeItem('mc_user_session');
    handleNavigate('home');
  };

  // Mandatory Authentication Guard on Ticket Purchase:
  // If unauthenticated guest clicks Book Ticket, automatically pop up Sign In / Sign Up modal.
  const handleOpenBuyModal = (event: EventItem) => {
    setSelectedEventForBuy(event);
    if (!userSession || userSession.role !== 'attendee') {
      setAuthDefaultTab('attendee');
      setAuthModalOpen(true);
      return;
    }
    setBuyTicketModalOpen(true);
  };

  const handleTicketPurchased = (_ticketId: string) => {
    setSelectedEventForBuy(null);
    // When purchased, attendee can view ticket status under My Attendee Panel
    handleNavigate('my-tickets');
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setContactSubmitting(true);
    try {
      await submitInquiry({
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone || undefined,
        subject: contactForm.subject,
        message: contactForm.message,
      });
      setContactSuccess(true);
      setContactForm({
        name: '',
        email: '',
        phone: '',
        subject: 'VIP Gala Inquiry',
        message: '',
      });
      setTimeout(() => setContactSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setContactSubmitting(false);
    }
  };

  // Filtered Events
  const filteredEvents = events.filter((e) => {
    const matchesCategory =
      eventCategoryFilter === 'All' || e.category === eventCategoryFilter;
    const matchesSearch =
      !eventSearchQuery.trim() ||
      e.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(eventSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const verifiedTicketsCount = tickets.filter((t) => t.status === 'Verified').length;

  const socialLinksList = [
    { name: 'Instagram', url: cmsContent.socialLinks?.instagram || 'https://instagram.com/meetupclub', icon: Instagram },
    { name: 'Twitter (X)', url: cmsContent.socialLinks?.twitter || 'https://x.com/meetupclub', icon: Twitter },
    { name: 'LinkedIn', url: cmsContent.socialLinks?.linkedin || 'https://linkedin.com/company/meetupclub', icon: Linkedin },
    { name: 'Indeed', url: cmsContent.socialLinks?.indeed || 'https://www.indeed.com/cmp/meetupclub', icon: Building2 },
    { name: 'Discord', url: cmsContent.socialLinks?.discord || 'https://discord.gg/meetupclub', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans selection:bg-[#A3E635]/20 selection:text-[#A3E635]">
      {/* Top Navigation */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(page) => handleNavigate(page)}
        userSession={userSession}
        cmsContent={cmsContent}
        onOpenAuth={(tab) => {
          if (tab) setAuthDefaultTab(tab);
          setAuthModalOpen(true);
        }}
        onOpenInquiryModal={() => setInquiryModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 1. HOME VIEW (CLEAN, SLEEK MODERN BLACK & LIME HERO)                      */}
        {/* ========================================================================= */}
        {currentPage === 'home' && (
          <div className="space-y-20 pb-20">
            {/* Clean Modern Luxury Hero Section */}
            <section className="relative pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden border-b border-[#27272A] bg-[#0A0A0A]">
              {/* Subtle ambient lime highlights */}
              <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#A3E635]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#121214] rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  {/* Left Column: Hero Copy */}
                  <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-widest uppercase bg-[#18181B] text-[#A3E635] border border-[#27272A] shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 text-[#A3E635]" />
                      <span>{cmsContent.bannerTitle || 'Meetup Club'}</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-white leading-[1.14]">
                      {cmsContent.bannerSubtitle || 'The Premier Circle for Elite Gatherings & Extraordinary Galas'}
                    </h1>

                    <p className="text-base sm:text-lg text-[#D4D4D8] max-w-2xl font-light leading-relaxed mx-auto lg:mx-0">
                      {cmsContent.bodyText}
                    </p>

                    {cmsContent.homeMissionText && (
                      <div className="p-4 rounded-2xl bg-[#121214] border-l-4 border-[#A3E635] text-xs sm:text-sm text-[#D4D4D8] leading-relaxed font-normal shadow-xs">
                        "{cmsContent.homeMissionText}"
                      </div>
                    )}

                    {/* CTAs */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                      <button
                        onClick={() => handleNavigate('events')}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm hover:shadow-[0_4px_20px_rgba(163,230,53,0.35)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Calendar className="w-4 h-4 text-black" />
                        <span>Explore Event Calendar</span>
                      </button>

                      <button
                        onClick={() => setInquiryModalOpen(true)}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-xs uppercase tracking-wider text-white bg-[#18181B] border border-[#27272A] hover:border-[#A3E635] hover:text-[#A3E635] transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        <MessageCircle className="w-4 h-4 text-[#A3E635]" />
                        <span>Make an Inquiry</span>
                      </button>
                    </div>

                    {/* Social Media Redirect Strip in Hero */}
                    <div className="pt-2 flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                      <span className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider font-semibold">
                        Social Circles:
                      </span>
                      {socialLinksList.map((soc) => {
                        const Icon = soc.icon;
                        return (
                          <a
                            key={soc.name}
                            href={soc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-[#A3E635] text-[#D4D4D8] hover:text-[#A3E635] text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                            title={`Redirect to ${soc.name}`}
                          >
                            <Icon className="w-3.5 h-3.5 text-[#A3E635]" />
                            <span>{soc.name}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-[#A1A1AA]" />
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Clean Executive Showcase Card */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-7 rounded-3xl bg-[#121214] border border-[#27272A] shadow-xl backdrop-blur-md space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#A3E635] font-bold shadow-xs">
                            <Crown className="w-5 h-5 text-[#A3E635]" />
                          </div>
                          <div>
                            <h3 className="font-serif font-bold text-white text-base">Club Integrity Stats</h3>
                            <span className="text-[10px] font-mono text-[#A3E635] font-semibold">● Live Synchronization</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-black bg-[#A3E635] px-2.5 py-1 rounded-full border border-[#A3E635]">
                          {events.length} Active Events
                        </span>
                      </div>

                      {/* Live Counter Badges */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                          <span className="text-[10px] uppercase font-mono text-[#A1A1AA] block">Verified Patrons</span>
                          <span className="text-xl font-bold font-mono text-[#A3E635] mt-0.5 block">
                            {verifiedTicketsCount > 0 ? `${verifiedTicketsCount} Issued` : 'Admitting'}
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A]">
                          <span className="text-[10px] uppercase font-mono text-[#A1A1AA] block">UPI Verification</span>
                          <span className="text-xl font-bold font-mono text-[#A3E635] mt-0.5 block">
                            10–20 Mins
                          </span>
                        </div>
                      </div>

                      {/* Feature Badges */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[#A1A1AA] block font-semibold">
                          Core Architectural Guarantees:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {(cmsContent.homeFeatureBadges || [
                            '100% Verified Patrons',
                            'Direct UPI Treasury',
                            'Real-Time Gate Turnstiles',
                            'Zero Data Scalping',
                          ]).map((badge, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-xs text-[#D4D4D8] flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#A3E635] shrink-0" />
                              <span className="truncate font-medium">{badge}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Helpline banner */}
                      <div className="p-3 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#A3E635]" />
                          <span className="text-[#D4D4D8] font-mono font-medium">UPI Helpline:</span>
                        </div>
                        <a href={`tel:${cmsContent.adminPhone}`} className="text-[#A3E635] font-bold font-mono hover:underline">
                          {cmsContent.adminPhone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Featured Events Section with Real-Time Counters */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#A3E635] mb-1 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-[#A3E635]" />
                    <span>Live Ticketing & Seat Status</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
                    Upcoming Flagship Gatherings
                  </h2>
                </div>
                {events.length > 0 && (
                  <button
                    onClick={() => setCurrentPage('events')}
                    className="text-xs font-mono uppercase tracking-wider text-[#A3E635] hover:text-[#bef264] font-bold flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>View All {events.length} Events</span>
                    <ChevronRight className="w-4 h-4 text-[#A3E635]" />
                  </button>
                )}
              </div>

              {events.length === 0 ? (
                <div className="p-12 sm:p-16 text-center rounded-3xl bg-[#121214] border border-[#27272A] space-y-4 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mx-auto text-[#A3E635]">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-white">
                    New Season Calendar in Preparation
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
                    Private invitations and upcoming gala dates will be announced shortly. Patrons and prospective hosts may submit an inquiry for custom VIP reservations.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setInquiryModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm hover:shadow-[0_4px_16px_rgba(163,230,53,0.35)]"
                    >
                      Make an Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {events.slice(0, 3).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      tickets={tickets}
                      onBuyTicket={handleOpenBuyModal}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Portfolio Case Studies Preview */}
            {portfolio.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#A3E635] block font-bold">
                      Proven Track Record
                    </span>
                    <h2 className="text-2xl font-serif font-bold text-white">
                      Flagship Case Studies & Milestones
                    </h2>
                  </div>
                  <button
                    onClick={() => setCurrentPage('portfolio')}
                    className="text-xs font-mono uppercase tracking-wider text-[#A3E635] hover:text-[#bef264] font-bold flex items-center gap-1"
                  >
                    <span>View All Portfolio</span>
                    <ChevronRight className="w-4 h-4 text-[#A3E635]" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {portfolio.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-[#121214] border border-[#27272A] hover:border-[#A3E635]/50 transition-all flex flex-col justify-between shadow-xs hover:shadow-md"
                    >
                      <div className="space-y-3">
                        <div className="h-44 rounded-xl overflow-hidden bg-[#18181B]">
                          <img src={item.coverImageUrl?.trim() ? item.coverImageUrl.trim() : 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] font-mono text-[#A3E635] uppercase font-bold block">
                          {item.clientOrEvent}
                        </span>
                        <h3 className="text-base font-serif font-bold text-white line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>
                      <div className="pt-3 border-t border-[#27272A] mt-3 text-xs font-mono text-[#A3E635] font-semibold">
                        🏆 {item.metrics}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Gallery Highlights */}
            {gallery.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#A3E635] block font-bold">
                      Visual Archive
                    </span>
                    <h2 className="text-2xl font-serif font-bold text-white">
                      Captured Moments of Splendor
                    </h2>
                  </div>
                  <button
                    onClick={() => setCurrentPage('gallery')}
                    className="text-xs font-mono uppercase tracking-wider text-[#A3E635] hover:text-[#bef264] font-bold flex items-center gap-1"
                  >
                    <span>View Gallery</span>
                    <ChevronRight className="w-4 h-4 text-[#A3E635]" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gallery.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setLightboxImage(item.imageUrl)}
                      className="group relative h-56 rounded-2xl overflow-hidden bg-[#121214] border border-[#27272A] hover:border-[#A3E635]/50 cursor-pointer shadow-xs hover:shadow-md"
                    >
                      <img
                        src={item.imageUrl?.trim() ? item.imageUrl.trim() : 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-xs font-medium text-white truncate">
                          {item.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. EVENTS VIEW WITH REAL-TIME TICKET COUNTERS                             */}
        {/* ========================================================================= */}
        {currentPage === 'events' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
            {/* Page Header */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#A3E635] font-bold block">
                Official Season Calendar
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
                Upcoming Galas, Summits & Soirées
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA]">
                {cmsContent.eventsSubtitle || 'Discover upcoming high-society galas, private summits, and curated cultural gatherings with real-time seat availability.'}
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 rounded-2xl bg-[#121214] border border-[#27272A] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none text-xs">
                {['All', 'Gala', 'Summit', 'Fashion', 'Concert', 'VIP Party'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setEventCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                      eventCategoryFilter === cat
                        ? 'bg-[#A3E635] text-black font-bold shadow-xs'
                        : 'text-[#D4D4D8] hover:text-white bg-[#18181B] border border-[#27272A]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search box */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={eventSearchQuery}
                  onChange={(e) => setEventSearchQuery(e.target.value)}
                  placeholder="Search events or venues..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:outline-none text-white placeholder-[#71717A]"
                />
              </div>
            </div>

            {/* Events Grid with real-time ticket counters */}
            {filteredEvents.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-[#121214] border border-[#27272A] space-y-4 shadow-xs">
                <Calendar className="w-12 h-12 text-[#71717A] mx-auto" />
                <p className="text-white font-medium text-sm">No Events Currently Published</p>
                <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
                  Our calendar is freshly cleared for new season announcements. Inquire below to arrange private reservations.
                </p>
                <button
                  onClick={() => setInquiryModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm"
                >
                  Make an Inquiry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    tickets={tickets}
                    onBuyTicket={handleOpenBuyModal}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. PORTFOLIO VIEW                                                         */}
        {/* ========================================================================= */}
        {currentPage === 'portfolio' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#A3E635] font-bold block">
                Track Record of Grandeur
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
                Prestigious Galas & Historic Summits
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA]">
                A retrospective of our bespoke high-society milestones, royal masquerades, and tier-1 venture gatherings.
              </p>
            </div>

            {portfolio.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-[#121214] border border-[#27272A] space-y-4 shadow-xs">
                <Building2 className="w-12 h-12 text-[#71717A] mx-auto" />
                <p className="text-white font-medium text-sm">Portfolio Archive Refreshing</p>
                <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
                  Case studies and client milestones are updated live via the club administration suite.
                </p>
                <button
                  onClick={() => setInquiryModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm"
                >
                  Inquire for Private Commission
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {portfolio.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl overflow-hidden bg-[#121214] border border-[#27272A] hover:border-[#A3E635]/50 shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-56 w-full overflow-hidden bg-[#18181B]">
                        <img
                          src={item.coverImageUrl?.trim() ? item.coverImageUrl.trim() : 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'}
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-6 space-y-3">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#A3E635] block font-bold">
                          {item.clientOrEvent}
                        </span>
                        <h3 className="text-xl font-serif font-bold text-white">{item.title}</h3>
                        <p className="text-xs text-[#A1A1AA] leading-relaxed font-light">{item.description}</p>
                      </div>
                    </div>

                    <div className="p-6 pt-0">
                      <div className="p-3 rounded-xl bg-[#18181B] border border-[#27272A] text-xs font-mono text-[#A3E635] font-semibold">
                        🏆 {item.metrics}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. GALLERY VIEW                                                           */}
        {/* ========================================================================= */}
        {currentPage === 'gallery' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#A3E635] font-bold block">
                Haute Society Moments
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
                The Meetup Club Gallery
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA]">
                Glimpses of high-society patronage, couture presentations, and unscripted memories.
              </p>
            </div>

            {gallery.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-[#121214] border border-[#27272A] space-y-4 shadow-xs">
                <Sparkles className="w-12 h-12 text-[#71717A] mx-auto" />
                <p className="text-white font-medium text-sm">Visual Archives Cleared for New Season</p>
                <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
                  New high-resolution gala captures will be uploaded following upcoming events.
                </p>
                <button
                  onClick={() => setInquiryModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm"
                >
                  Make an Inquiry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {gallery.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setLightboxImage(item.imageUrl)}
                    className="group relative rounded-2xl overflow-hidden bg-[#121214] border border-[#27272A] hover:border-[#A3E635]/50 cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md"
                  >
                    <div className="h-64 w-full bg-[#18181B]">
                      <img
                        src={item.imageUrl?.trim() ? item.imageUrl.trim() : 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-3.5 bg-[#18181B]">
                      <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
                      <p className="text-[10px] text-[#A1A1AA] mt-0.5">{item.category} • {item.eventDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. ABOUT VIEW (CONNECTED TO CMS MODULAR EDITOR)                           */}
        {/* ========================================================================= */}
        {currentPage === 'about' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#A3E635] font-bold block">
                Our Heritage & Ethos
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
                About Meetup Club
              </h1>
              <p className="text-sm text-[#A1A1AA] max-w-xl mx-auto">
                {cmsContent.aboutMissionStatement || 'Founded as an enclave for discerning patrons seeking elevated discourse, cultural opulence, and authentic human connection.'}
              </p>
            </div>

            <div className="p-8 sm:p-10 rounded-3xl bg-[#121214] border border-[#27272A] shadow-xl space-y-6 text-sm text-[#D4D4D8] leading-relaxed font-light">
              <h3 className="text-xl font-serif font-bold text-white">
                Company Overview
              </h3>
              <p>
                {cmsContent.aboutCompanyOverview ||
                  'Meetup Club was founded to restore intimacy and prestige to executive gatherings and high-society galas across India and premier global capitals.'}
              </p>

              {cmsContent.aboutTeamOverview && (
                <div className="pt-2">
                  <h4 className="font-serif font-bold text-white text-base mb-1">Executive Steering Committee</h4>
                  <p className="text-xs text-[#A1A1AA]">
                    {cmsContent.aboutTeamOverview}
                  </p>
                </div>
              )}

              {cmsContent.aboutCoreValues && (
                <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] text-xs">
                  <span className="font-mono uppercase text-[#A3E635] font-bold block mb-1">Club Core Values:</span>
                  <p className="text-[#D4D4D8]">{cmsContent.aboutCoreValues}</p>
                </div>
              )}

              <div className="pt-4 border-t border-[#27272A] grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-serif font-bold text-white text-base">Direct UPI Treasury</h4>
                  <p className="text-xs text-[#A1A1AA]">
                    We deliberately bypass algorithmic payment gateways. All payments flow directly to our treasury via UPI ({cmsContent.adminUpiId}), cross-checked manually against banking UTR logs within 10 to 20 minutes to preserve absolute member privacy.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-serif font-bold text-white text-base">Zero-Scalping Turnstiles</h4>
                  <p className="text-xs text-[#A1A1AA]">
                    Every issued pass contains cryptographic QR payload vectors linked to the buyer's genuine identity. Once scanned at our physical turnstiles, the pass is instantly retired to prevent re-entry.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. CONTACT US VIEW                                                        */}
        {/* ========================================================================= */}
        {currentPage === 'contact' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#A3E635] font-bold block">
                Direct Inquiry Desk
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
                Contact Meetup Club
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA]">
                For table reservations, corporate syndicates, sponsorship proposals, or immediate payment verification assistance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Contact Info Card */}
              <div className="md:col-span-5 p-6 sm:p-8 rounded-3xl bg-[#121214] border border-[#27272A] space-y-6 shadow-sm">
                <h3 className="text-lg font-serif font-bold text-white">Concierge Headquarters</h3>

                <div className="space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-[#A3E635] shrink-0 mt-1" />
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#A1A1AA] block">Verification Helpline</span>
                      <a href={`tel:${cmsContent.adminPhone}`} className="text-[#A3E635] hover:underline font-bold font-mono text-sm">
                        {cmsContent.adminPhone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-[#A3E635] shrink-0 mt-1" />
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#A1A1AA] block">Private Desk</span>
                      <a href={`mailto:${cmsContent.supportEmail}`} className="text-white hover:text-[#A3E635] font-medium">
                        {cmsContent.supportEmail}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#A3E635] shrink-0 mt-1" />
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#A1A1AA] block">Regional Office</span>
                      <p className="text-[#D4D4D8]">
                        {cmsContent.contactAddress || 'The Capital, G Block BKC, Bandra Kurla Complex, Mumbai'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#A3E635] shrink-0 mt-1" />
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#A1A1AA] block">Desk Hours</span>
                      <p className="text-[#D4D4D8]">
                        {cmsContent.contactOperatingHours || 'Mon – Sun: 10:00 AM – 10:00 PM IST'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] text-xs text-[#D4D4D8] leading-relaxed">
                  <strong className="text-[#A3E635]">UPI Support Notice:</strong> If your ticket has not verified within 20 minutes of payment submission, please call our direct hotline with your 12-digit UTR reference number.
                </div>
              </div>

              {/* Inquiry Form */}
              <div className="md:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#121214] border border-[#27272A] shadow-sm">
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <h3 className="text-lg font-serif font-bold text-white">Send Private Message</h3>

                  {contactSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-[#A3E635] text-[#A3E635] text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#A3E635]" />
                      <span>Inquiry transmitted successfully. Our desk will review and contact you shortly.</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-[#D4D4D8] mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="e.g. Lord Alistair Croft"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#18181B] border border-[#27272A] text-white placeholder-[#71717A] outline-none focus:border-[#A3E635]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#D4D4D8] mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="alistair@estate.com"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#18181B] border border-[#27272A] text-white placeholder-[#71717A] outline-none focus:border-[#A3E635]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#D4D4D8] mb-1">Mobile Phone</label>
                      <input
                        type="tel"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        placeholder="+91 98200 00000"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#18181B] border border-[#27272A] text-white font-mono outline-none focus:border-[#A3E635]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#D4D4D8] mb-1">Subject</label>
                    <input
                      type="text"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#18181B] border border-[#27272A] text-white outline-none focus:border-[#A3E635]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#D4D4D8] mb-1">Inquiry / Message *</label>
                    <textarea
                      rows={4}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Detail your inquiry, VIP table requirements, or ticketing reference..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#18181B] border border-[#27272A] text-white placeholder-[#71717A] resize-none outline-none focus:border-[#A3E635]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm hover:shadow-[0_4px_16px_rgba(163,230,53,0.35)] transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{contactSubmitting ? 'Transmitting...' : 'Send Inquiry'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. ADMIN PANEL VIEW (REVENUE ANALYTICS & MODULAR CMS)                     */}
        {/* ========================================================================= */}
        {currentPage === 'admin' && (
          userSession?.role === 'admin' ? (
            <AdminPanel
              cmsContent={cmsContent}
              onUpdateCMS={(upd) => setCmsContent(upd)}
              onOpenGateScanner={() => handleNavigate('gate-scanner')}
            />
          ) : (
            <div className="max-w-md mx-auto px-4 py-20 text-center">
              <div className="p-8 rounded-3xl bg-[#121214] border border-[#27272A] shadow-xl space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#18181B] text-[#A3E635] flex items-center justify-center mx-auto border border-[#27272A] shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-serif font-bold text-white">
                  Administrator Session Required
                </h2>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Access to the Meetup Club Admin Suite, revenue analytics, and CMS configuration is restricted to authorized master administrators.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setAuthDefaultTab('admin');
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm transition-all"
                  >
                    Sign In as Administrator
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* 8. GATE SCANNER VIEW                                                      */}
        {/* ========================================================================= */}
        {currentPage === 'gate-scanner' && (
          userSession?.role === 'staff' || userSession?.role === 'admin' ? (
            <GateScanner
              staffName={userSession?.displayName || 'Gate Officer Aryan'}
              onExit={() => setCurrentPage('home')}
            />
          ) : (
            <div className="max-w-md mx-auto px-4 py-20 text-center">
              <div className="p-8 rounded-3xl bg-[#121214] border border-[#27272A] shadow-xl space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#18181B] text-[#A3E635] flex items-center justify-center mx-auto border border-[#27272A] shadow-xs">
                  <QrCode className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-serif font-bold text-white">
                  Gate Staff Authorization Required
                </h2>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  The mobile turnstile QR code ticket scanner is restricted to active gate officers and security personnel.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setAuthDefaultTab('staff');
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm transition-all"
                  >
                    Sign In as Gate Staff
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* 9. MY ATTENDEE PANEL / MY TICKETS DASHBOARD VIEW                          */}
        {/* ========================================================================= */}
        {(currentPage === 'dashboard' || currentPage === 'my-tickets') && (
          <AttendeeDashboard
            userSession={userSession}
            onNavigateToEvents={() => handleNavigate('events')}
            onOpenAuth={() => {
              setAuthDefaultTab('attendee');
              setAuthModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Lightbox for Gallery */}
      {lightboxImage && lightboxImage.trim() !== '' && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
        >
          <img
            src={lightboxImage.trim()}
            alt="Enlarged view"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl border-2 border-[#A3E635]"
          />
        </div>
      )}

      {/* Floating AI Concierge Button */}
      <button
        onClick={() => setAiConciergeOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-[#A3E635] hover:bg-[#bef264] text-black font-bold text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(163,230,53,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        title="Open VIP AI Concierge"
      >
        <Sparkles className="w-4 h-4 text-black" />
        <span className="hidden sm:inline">VIP AI Concierge</span>
      </button>

      {/* Modals */}
      <InquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authDefaultTab}
        onLoginSuccess={handleLoginSuccess}
      />

      <BuyTicketModal
        event={selectedEventForBuy}
        isOpen={buyTicketModalOpen}
        onClose={() => setBuyTicketModalOpen(false)}
        cmsContent={cmsContent}
        userSession={userSession}
        onRequireAuth={() => {
          setAuthDefaultTab('attendee');
          setAuthModalOpen(true);
        }}
        onTicketPurchased={handleTicketPurchased}
      />

      <AIConciergeModal
        isOpen={aiConciergeOpen}
        onClose={() => setAiConciergeOpen(false)}
      />

      {/* Footer */}
      <Footer
        onNavigate={(page) => handleNavigate(page)}
        cmsContent={cmsContent}
      />
    </div>
  );
}
