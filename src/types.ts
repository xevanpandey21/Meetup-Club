/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string; // e.g. "2026-11-20"
  time: string; // e.g. "08:00 PM IST"
  venue: string; // e.g. "The Grand St. Regis Ballroom, Mumbai"
  ticketPrice: number; // in INR
  capacity: number;
  registeredCount: number;
  coverImageUrl: string;
  category: 'Gala' | 'Networking' | 'Fashion' | 'Summit' | 'VIP Party' | 'Concert';
  createdAt?: string;
  updatedAt?: string;
}

export type TicketStatus = 'Pending' | 'Verified' | 'Rejected';

export interface TicketItem {
  id: string; // e.g. "MC-89421A"
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  eventTime?: string;
  eventVenue?: string;
  attendeeId?: string; // firebase UID if signed in
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  attendeeDob: string;
  attendeeAge: number;
  attendeeOrg: string;
  attendeeAddress: string;
  utrNumber: string; // UTR or Bank transaction reference
  receiptUrl: string; // Base64 data URL or image URL
  receiptFileName?: string;
  status: TicketStatus;
  qrCodeData: string; // e.g. "MEETUP_CLUB:MC-89421A:EVT-01"
  isCheckedIn: boolean;
  checkedInAt?: string | null;
  checkedInBy?: string | null;
  adminNotes?: string;
  createdAt: string;
  verifiedAt?: string | null;
  amountPaid: number;
}

export interface CMSContentData {
  id: string;
  pageKey: 'settings';
  // Branding
  logoUrl?: string;
  // Home Section
  bannerTitle: string;
  bannerSubtitle: string;
  bannerImageUrl: string;
  bodyText: string;
  homeMissionText?: string;
  homeFeatureBadges?: string[];
  // Events Section
  eventsSubtitle?: string;
  // About Section
  aboutCompanyOverview?: string;
  aboutMissionStatement?: string;
  aboutTeamOverview?: string;
  aboutCoreValues?: string;
  // Contact Section
  contactAddress?: string;
  contactOperatingHours?: string;
  supportEmail: string;
  adminPhone: string;
  // Payment credentials
  adminUpiId: string;
  adminUpiQrUrl: string;
  // Social Media & Community Links
  socialLinks: {
    instagram: string;
    twitter: string;
    linkedin: string;
    indeed: string;
    discord: string;
  };
  updatedAt?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  eventDate: string;
  createdAt?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  clientOrEvent: string;
  description: string;
  coverImageUrl: string;
  metrics: string; // e.g. "1,200+ VIPs Attended • 100% Sold Out"
  createdAt?: string;
}

export interface InquiryItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  createdAt: string;
}

export type AuthRole = 'attendee' | 'admin' | 'staff';

export interface UserSession {
  role: AuthRole;
  email: string;
  displayName: string;
  uid: string;
  phone?: string;
  photoURL?: string;
  authProvider?: 'password' | 'email' | 'manual' | 'admin' | 'staff';
}

export interface GateScanResult {
  status: 'valid' | 'invalid' | 'unverified';
  message: string;
  ticket?: TicketItem;
  scannedAt: string;
}

export interface GateStaffItem {
  id: string;
  name: string;
  email: string;
  password?: string;
  status: 'active' | 'deactivated';
  createdAt: string;
}

export interface AttendeeAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  passwordHash?: string;
  role: 'attendee';
  photoURL?: string;
  authProvider?: 'password' | 'email' | 'manual';
  createdAt: string;
  lastLoginAt?: string;
}

