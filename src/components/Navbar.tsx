/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Crown,
  Calendar,
  Image as GalleryIcon,
  Briefcase,
  Info,
  Mail,
  UserCheck,
  Menu,
  X,
  Sparkles,
  LogOut,
  ChevronDown,
  HelpCircle,
  ShieldAlert,
  QrCode,
  MessageCircle,
} from 'lucide-react';
import { UserSession, CMSContentData } from '../types';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userSession: UserSession | null;
  cmsContent: CMSContentData;
  onOpenAuth: (defaultTab?: 'attendee' | 'admin' | 'staff') => void;
  onOpenInquiryModal: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  userSession,
  cmsContent,
  onOpenAuth,
  onOpenInquiryModal,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'events', label: 'Events' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact Us' },
  ];

  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#0A0A0A]/95 border-b border-[#27272A] shadow-xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 group text-left focus:outline-none"
        >
          {cmsContent.logoUrl && cmsContent.logoUrl.trim() ? (
            <img
              src={cmsContent.logoUrl.trim()}
              alt="Meetup Club"
              className="max-h-11 w-auto object-contain rounded-lg border border-[#27272A]"
            />
          ) : (
            <div className="relative w-11 h-11 rounded-xl bg-[#18181B] p-[1.5px] border border-[#27272A] group-hover:border-[#A3E635]/50 group-hover:shadow-[0_0_15px_rgba(163,230,53,0.3)] transition-all duration-300">
              <div className="w-full h-full bg-[#121214] rounded-[10px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#A3E635] group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
          )}
          <span className="text-xl sm:text-2xl font-serif tracking-[0.12em] font-bold text-white group-hover:text-[#A3E635] transition-colors">
            Meetup Club
          </span>
        </button>

        {/* Clean Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-[#A3E635] bg-[#A3E635]/10 font-bold border border-[#A3E635]/30 shadow-xs'
                    : 'text-[#D4D4D8] hover:text-white hover:bg-[#18181B]'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right CTA Area: "Make an Inquiry" + "Sign In / Portal" */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Streamlined "Make an Inquiry" Button */}
          <button
            onClick={onOpenInquiryModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-[#18181B] border border-[#27272A] hover:border-[#A3E635] hover:text-[#A3E635] transition-all shadow-xs cursor-pointer"
            title="Submit a private inquiry to Meetup Club"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#A3E635]" />
            <span>Make an Inquiry</span>
          </button>

          {/* Conditional Admin Quick Shortcut (ONLY visible when signed in as admin) */}
          {userSession?.role === 'admin' && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border cursor-pointer ${
                currentPage === 'admin'
                  ? 'bg-[#A3E635] text-black border-[#A3E635] font-bold shadow-sm'
                  : 'text-white border-[#27272A] bg-[#18181B] hover:border-[#A3E635] hover:text-[#A3E635]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-current" />
              <span>Admin Suite</span>
            </button>
          )}

          {/* Conditional Staff Quick Shortcut (ONLY visible when signed in as staff) */}
          {userSession?.role === 'staff' && (
            <button
              onClick={() => handleNavClick('gate-scanner')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border cursor-pointer ${
                currentPage === 'gate-scanner'
                  ? 'bg-[#A3E635] text-black border-[#A3E635] font-bold shadow-sm'
                  : 'text-white border-[#27272A] bg-[#18181B] hover:border-[#A3E635] hover:text-[#A3E635]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-current" />
              <span>Gate Scanner</span>
            </button>
          )}

          {userSession ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#A3E635] transition-all text-xs font-medium text-white shadow-xs cursor-pointer"
              >
                {userSession.photoURL && userSession.photoURL.trim() ? (
                  <img
                    src={userSession.photoURL.trim()}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-[#27272A]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#27272A] flex items-center justify-center text-white font-bold text-[10px]">
                    {userSession.displayName ? userSession.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="truncate max-w-[100px] leading-tight font-semibold text-white">
                    {userSession.displayName || 'Member'}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#A3E635] font-mono font-bold">
                    {userSession.role}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-[#A1A1AA]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#121214] border border-[#27272A] p-2 shadow-2xl z-50 backdrop-blur-xl">
                  <div className="px-3 py-2 border-b border-[#27272A] text-xs">
                    <p className="text-[#A1A1AA] text-[10px] uppercase font-mono">Signed in as</p>
                    <p className="font-semibold text-white truncate">{userSession.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#18181B] text-[#A3E635] border border-[#27272A] uppercase">
                      {userSession.role}
                    </span>
                  </div>

                  {userSession.role === 'attendee' && (
                    <button
                      onClick={() => handleNavClick('my-tickets')}
                      className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg text-[#D4D4D8] hover:bg-[#18181B] hover:text-[#A3E635] transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-[#A3E635]" />
                      <span>My Attendee Panel (Tickets)</span>
                    </button>
                  )}

                  {userSession.role === 'admin' && (
                    <button
                      onClick={() => handleNavClick('admin')}
                      className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg text-[#D4D4D8] hover:bg-[#18181B] hover:text-[#A3E635] transition-colors cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 text-[#A3E635]" />
                      <span>Admin CMS & Analytics</span>
                    </button>
                  )}

                  {userSession.role === 'staff' && (
                    <button
                      onClick={() => handleNavClick('gate-scanner')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg text-[#D4D4D8] hover:bg-[#18181B] hover:text-[#A3E635] transition-colors cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 text-[#A3E635]" />
                      <span>Mobile Gate Scanner</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg text-[#A1A1AA] hover:bg-[#18181B] hover:text-white transition-colors cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-[#A3E635]" />
                    <span>Switch Role / Sign In</span>
                  </button>

                  <div className="my-1 border-t border-[#27272A]" />

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg text-[#D4D4D8] hover:text-[#A3E635] hover:bg-[#18181B] border border-transparent hover:border-[#A3E635]/30 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-[#A3E635]" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('attendee')}
              className="relative group px-5 py-2 rounded-xl font-bold text-xs tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm hover:shadow-[0_0_16px_rgba(163,230,53,0.35)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-black" />
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Mobile menu triggers */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={onOpenInquiryModal}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#18181B] border border-[#27272A]"
          >
            Inquire
          </button>
          {!userSession && (
            <button
              onClick={() => onOpenAuth('attendee')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase text-black bg-[#A3E635] shadow-sm"
            >
              Sign In
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-white hover:bg-[#18181B]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#27272A] bg-[#0A0A0A]/98 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#A3E635] bg-[#A3E635]/10 font-bold border border-[#A3E635]/30'
                    : 'text-[#D4D4D8] hover:bg-[#18181B] hover:text-white'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-[#27272A] space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenInquiryModal();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#18181B] border border-[#27272A]"
            >
              <MessageCircle className="w-4 h-4 text-[#A3E635]" />
              <span>Make an Inquiry</span>
            </button>

            {userSession ? (
              <div className="pt-2 flex items-center justify-between px-2">
                <span className="text-xs text-[#A1A1AA]">{userSession.email}</span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="text-xs text-[#D4D4D8] hover:text-[#A3E635] flex items-center gap-1 font-medium px-2 py-1 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-[#A3E635]/40 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#A3E635]" /> Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('attendee');
                }}
                className="w-full mt-2 py-2.5 rounded-xl text-center font-bold text-xs uppercase tracking-wider text-black bg-[#A3E635] hover:bg-[#bef264] shadow-md flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 text-black" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
