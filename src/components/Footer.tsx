/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Crown,
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  Twitter,
  Linkedin,
  Building2,
  MessageSquare,
  ShieldCheck,
  Heart,
  ExternalLink,
} from 'lucide-react';
import { CMSContentData } from '../types';

interface FooterProps {
  onNavigate: (page: string) => void;
  cmsContent: CMSContentData;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, cmsContent }) => {
  const socialLinks = [
    {
      name: 'Instagram',
      url: cmsContent.socialLinks?.instagram || 'https://instagram.com/meetupclub',
      icon: Instagram,
    },
    {
      name: 'Twitter (X)',
      url: cmsContent.socialLinks?.twitter || 'https://x.com/meetupclub',
      icon: Twitter,
    },
    {
      name: 'LinkedIn',
      url: cmsContent.socialLinks?.linkedin || 'https://linkedin.com/company/meetupclub',
      icon: Linkedin,
    },
    {
      name: 'Indeed',
      url: cmsContent.socialLinks?.indeed || 'https://www.indeed.com/cmp/meetupclub',
      icon: Building2,
    },
    {
      name: 'Discord',
      url: cmsContent.socialLinks?.discord || 'https://discord.gg/meetupclub',
      icon: MessageSquare,
    },
  ];

  return (
    <footer className="w-full bg-[#0A0A0A] border-t border-[#27272A] text-[#D4D4D8] pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 pb-12 border-b border-[#27272A]">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {cmsContent.logoUrl && cmsContent.logoUrl.trim() ? (
                <img
                  src={cmsContent.logoUrl.trim()}
                  alt="Meetup Club"
                  className="max-h-10 w-auto object-contain rounded-lg border border-[#27272A]"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-[#18181B] border border-[#27272A] p-[1.5px] shadow-sm">
                  <div className="w-full h-full bg-[#121214] rounded-[7px] flex items-center justify-center">
                    <Crown className="w-4 h-4 text-[#A3E635]" />
                  </div>
                </div>
              )}
              <span className="text-xl font-serif tracking-[0.12em] font-bold text-white">
                Meetup Club
              </span>
            </div>
            <p className="text-sm text-[#A1A1AA] leading-relaxed font-light">
              An echelon of high-society gatherings, private summits, and curated galas. Experience verified guest lists and seamless manual UPI concierge ticketing.
            </p>

            {/* Direct Social Media Redirects */}
            <div className="pt-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#A3E635] block mb-2 font-semibold">
                Social Channels & Community:
              </span>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((soc) => {
                  const Icon = soc.icon;
                  return (
                    <a
                      key={soc.name}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-[#A3E635] text-white hover:text-[#A3E635] text-xs flex items-center gap-1.5 transition-all duration-200"
                      title={`Open ${soc.name} in new tab`}
                    >
                      <Icon className="w-3.5 h-3.5 text-[#A3E635]" />
                      <span>{soc.name}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-[#71717A]" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[#A3E635] font-bold">
              Explore Meetup Club
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#A3E635] transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('events')}
                  className="hover:text-[#A3E635] transition-colors cursor-pointer"
                >
                  Events Calendar
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('portfolio')}
                  className="hover:text-[#A3E635] transition-colors cursor-pointer"
                >
                  Portfolio & Milestones
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('gallery')}
                  className="hover:text-[#A3E635] transition-colors cursor-pointer"
                >
                  Haute Gallery
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-[#A3E635] transition-colors cursor-pointer"
                >
                  About The Club
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#A3E635] transition-colors cursor-pointer"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Patron Services */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[#A3E635] font-bold">
              Patron Services
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="hover:text-[#A3E635] transition-colors cursor-pointer"
                >
                  Attendee Ticket Vault
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('events')}
                  className="hover:text-[#A3E635] transition-colors cursor-pointer"
                >
                  Gala Seat Reservations
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#A3E635] transition-colors cursor-pointer"
                >
                  Private Table Concierge
                </button>
              </li>
              <li className="pt-2 text-xs text-[#D4D4D8] leading-relaxed font-mono">
                Manual UPI ID: <strong className="text-[#A3E635]">{cmsContent.adminUpiId}</strong>
              </li>
              <li className="text-xs text-[#71717A] leading-relaxed">
                Verification reconciles in 10-20 minutes by authorized club treasurers.
              </li>
            </ul>
          </div>

          {/* Contact Info from CMS */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-[#A3E635] font-bold">
              Concierge & Helpline
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#A3E635] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-[#71717A] block">UPI Verification Helpline</span>
                  <a
                    href={`tel:${cmsContent.adminPhone}`}
                    className="text-white hover:text-[#A3E635] transition-colors font-medium font-mono"
                  >
                    {cmsContent.adminPhone}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#A3E635] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-[#71717A] block">Private Desk</span>
                  <a
                    href={`mailto:${cmsContent.supportEmail}`}
                    className="text-white hover:text-[#A3E635] transition-colors"
                  >
                    {cmsContent.supportEmail}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#A3E635] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-[#71717A] block">Headquarters</span>
                  <span className="text-[#A1A1AA] text-xs">
                    {cmsContent.contactAddress || 'The Capital, G Block BKC, Bandra Kurla Complex, Mumbai'}
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#A3E635] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-[#71717A] block">Desk Hours</span>
                  <span className="text-[#A1A1AA] text-xs">
                    {cmsContent.contactOperatingHours || 'Mon – Sun: 10:00 AM – 10:00 PM IST'}
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#71717A] gap-4">
          <p>© {new Date().getFullYear()} Meetup Club Inc. All rights reserved. Production-ready event management platform.</p>
          <div className="flex items-center gap-1 text-[#71717A]">
            <span>Crafted for</span>
            <Heart className="w-3.5 h-3.5 text-[#A3E635] fill-[#A3E635]" />
            <span className="text-white">High-Society Gatherings</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
