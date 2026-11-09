/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Upload,
  Phone,
  ShieldCheck,
  AlertCircle,
  QrCode,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EventItem, CMSContentData, UserSession } from '../types';
import { submitTicketApplication } from '../services/dbService';

interface BuyTicketModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  cmsContent: CMSContentData;
  userSession: UserSession | null;
  onTicketPurchased: (ticketId: string) => void;
  onRequireAuth?: () => void;
}

export const BuyTicketModal: React.FC<BuyTicketModalProps> = ({
  event,
  isOpen,
  onClose,
  cmsContent,
  userSession,
  onTicketPurchased,
  onRequireAuth,
}) => {
  // 4 Steps: 1 = Info, 2 = UPI Gateway, 3 = Proof Submission, 4 = Confirmation Modal
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Attendee Information
  const [fullName, setFullName] = useState(userSession?.displayName || '');
  const [email, setEmail] = useState(userSession?.email || '');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [organization, setOrganization] = useState('');
  const [address, setAddress] = useState('');

  // Step 2 & 3: Payment details
  const [utrNumber, setUtrNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState('');
  const [validationError, setValidationError] = useState('');

  // Sync with authenticated user session
  React.useEffect(() => {
    if (userSession) {
      if (userSession.displayName && !fullName) {
        setFullName(userSession.displayName);
      }
      if (userSession.email && !email) {
        setEmail(userSession.email);
      }
      if (userSession.phone && !phone) {
        setPhone(userSession.phone);
      }
    }
  }, [userSession, isOpen]);

  if (!isOpen || !event) return null;

  // Copy UPI string
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(cmsContent.adminUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // Handle file upload (converts to base64 for image / preview)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setValidationError('Receipt file size must be under 2MB.');
      return;
    }

    setValidationError('');
    setReceiptFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Auto-calculate age from DOB
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (val) {
      const birthDate = new Date(val);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 1 && calculatedAge <= 120) {
        setAge(calculatedAge);
      }
    }
  };

  // Step 1 validation -> Step 2
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!userSession || userSession.role !== 'attendee') {
      setValidationError('Sign-in is mandatory before purchasing tickets. Please log in or register.');
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (!fullName.trim()) {
      setValidationError('Please enter your full legal name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setValidationError('Please enter a valid phone number with area/country code.');
      return;
    }
    if (!dob) {
      setValidationError('Please provide your Date of Birth.');
      return;
    }
    if (!age || Number(age) < 18) {
      setValidationError('Attendance requires minimum age of 18 years.');
      return;
    }
    if (!organization.trim()) {
      setValidationError('Please provide your company or institution affiliation.');
      return;
    }
    if (!address.trim()) {
      setValidationError('Please provide your residential address for verified guest register.');
      return;
    }

    setCurrentStep(2);
  };

  // Step 3 validation -> Final Submission
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!userSession || userSession.role !== 'attendee') {
      setValidationError('Sign-in is mandatory before submitting payment. Please log in to your Attendee account.');
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (!receiptUrl) {
      setValidationError('Please upload a screenshot or copy of your payment receipt.');
      return;
    }
    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      setValidationError('Please enter a valid banking UTR or transaction reference number.');
      return;
    }
    if (!declarationChecked) {
      setValidationError('You must confirm the authenticity declaration to proceed.');
      return;
    }

    setIsSubmitting(true);

    try {
      const ticketId = await submitTicketApplication({
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventVenue: event.venue,
        attendeeId: userSession?.uid,
        attendeeName: fullName.trim(),
        attendeeEmail: email.trim(),
        attendeePhone: phone.trim(),
        attendeeDob: dob,
        attendeeAge: Number(age),
        attendeeOrg: organization.trim(),
        attendeeAddress: address.trim(),
        utrNumber: utrNumber.trim(),
        receiptUrl,
        receiptFileName: receiptFileName || 'receipt_screenshot.png',
        amountPaid: event.ticketPrice,
      });
      setCreatedTicketId(ticketId);

      // Trigger celebratory confetti burst
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#A3E635', '#bef264', '#000000', '#FFFFFF'],
        });
      } catch {
        // Confetti silent fail
      }

      setCurrentStep(4);
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'Payment submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#121214] border border-[#27272A] p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto text-white">
        {/* Subtle lime glow background */}
        <div className="absolute -top-20 -right-20 w-52 h-52 bg-[#A3E635]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            if (currentStep === 4) {
              onTicketPurchased(createdTicketId);
            } else {
              onClose();
            }
          }}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#18181B] transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator Header */}
        <div className="mb-6 pb-4 border-b border-[#27272A]">
          <div className="flex items-center gap-2 text-[#A3E635] text-xs font-mono uppercase tracking-widest mb-1 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pass Application • Step {currentStep} of 4</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">
            {event.title}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-[#A1A1AA] font-mono">
            <span>📅 {event.date}</span>
            <span>•</span>
            <span className="text-[#A3E635] font-bold">₹{event.ticketPrice.toLocaleString('en-IN')} INR</span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStep >= stepNum
                    ? 'bg-[#A3E635] shadow-[0_0_8px_rgba(163,230,53,0.5)]'
                    : 'bg-[#27272A]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Error Notification */}
        {validationError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Mandatory Sign-In Notice Banner */}
        {(!userSession || userSession.role !== 'attendee') && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-amber-300">Mandatory Attendee Sign-In Required</p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  You must be logged into your registered Attendee profile to purchase tickets and generate scannable gate passes.
                </p>
              </div>
            </div>
            {onRequireAuth && (
              <button
                type="button"
                onClick={onRequireAuth}
                className="px-3.5 py-1.5 rounded-xl bg-[#A3E635] hover:bg-[#bef264] text-black text-xs font-bold whitespace-nowrap shadow-xs cursor-pointer"
              >
                Sign In / Register
              </button>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 1: ATTENDEE INFORMATION FORM                     */}
        {/* ==================================================== */}
        {currentStep === 1 && (
          <form onSubmit={handleProceedToPayment} className="space-y-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-white">Attendee Registration</h3>
              <p className="text-xs text-[#A1A1AA]">
                Please provide accurate legal identification details for your non-transferable pass.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-white mb-1">
                  Full Legal Name (as on Govt ID) <span className="text-[#A3E635]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jacqueline Vance"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635] focus:outline-none text-white placeholder-[#71717A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-white mb-1">
                    Email Address <span className="text-[#A3E635]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patron@estate.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635] focus:outline-none text-white placeholder-[#71717A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white mb-1">
                    Mobile Phone Number <span className="text-[#A3E635]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635] focus:outline-none text-white font-mono placeholder-[#71717A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-white mb-1">
                    Date of Birth (DOB) <span className="text-[#A3E635]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={handleDobChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635] focus:outline-none text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white mb-1">
                    Age (18+) <span className="text-[#A3E635]">*</span>
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                    placeholder="26"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635] focus:outline-none text-white font-mono placeholder-[#71717A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-white mb-1">
                  College / Organization <span className="text-[#A3E635]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Goldman Sachs / IIT Bombay / Singhania Ventures"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635] focus:outline-none text-white placeholder-[#71717A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-white mb-1">
                  Full Residential Address <span className="text-[#A3E635]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Penthouse/Apt, Area, City & PIN code"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:ring-1 focus:ring-[#A3E635] focus:outline-none text-white placeholder-[#71717A] resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm hover:shadow-[0_0_16px_rgba(163,230,53,0.35)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Payment Gateway</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* ==================================================== */}
        {/* STEP 2: PAYMENT GATEWAY DISPLAY                       */}
        {/* ==================================================== */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="text-center">
              <h3 className="text-lg font-serif font-bold text-white">Administrator Payment Gateway</h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Scan the official Meetup Club UPI QR Code or transfer via UPI ID using any banking app (GPay, PhonePe, Paytm).
              </p>
            </div>

            {/* QR Code and Amount Card */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-[#18181B] border border-[#27272A]">
              {/* QR Code Box */}
              <div className="relative group shrink-0">
                <div className="w-40 h-40 p-2 rounded-xl bg-white flex items-center justify-center shadow-sm border-2 border-[#A3E635]">
                  <img
                    src={cmsContent.adminUpiQrUrl?.trim() ? cmsContent.adminUpiQrUrl.trim() : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${encodeURIComponent(cmsContent.adminUpiId || '8287342192@ptyes')}%26pn=Meetup%20Club%26cu=INR`}
                    alt="Administrator UPI QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-center mt-1.5 text-[10px] font-mono text-[#A3E635] uppercase tracking-widest font-bold">
                  Scan to Pay
                </div>
              </div>

              {/* UPI ID Details */}
              <div className="flex-1 space-y-3.5 w-full text-left">
                <div>
                  <span className="text-[11px] text-[#A1A1AA] uppercase font-mono block">Payable Amount</span>
                  <div className="text-2xl font-bold font-mono text-[#A3E635]">
                    ₹{event.ticketPrice.toLocaleString('en-IN')}{' '}
                    <span className="text-xs text-[#D4D4D8] font-normal">INR (All Inclusive)</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-[#A1A1AA] uppercase font-mono block mb-1">
                    Administrator UPI ID
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-1.5 rounded-lg bg-[#121214] text-white border border-[#27272A] text-xs font-mono font-bold flex-1 truncate">
                      {cmsContent.adminUpiId}
                    </code>
                    <button
                      onClick={handleCopyUpi}
                      className="px-3 py-1.5 rounded-lg bg-[#121214] hover:bg-[#27272A] text-white text-xs font-medium border border-[#27272A] hover:border-[#A3E635] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#A3E635]" />
                          <span className="text-[#A3E635] font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#A3E635]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Helpline */}
                <div className="p-2.5 rounded-xl bg-[#121214] border border-[#27272A] flex items-center gap-2.5 text-xs">
                  <Phone className="w-4 h-4 text-[#A3E635] shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#A1A1AA] block font-mono">Support / Verification Helpline</span>
                    <a
                      href={`tel:${cmsContent.adminPhone}`}
                      className="text-[#A3E635] hover:underline font-mono font-semibold"
                    >
                      {cmsContent.adminPhone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#18181B] border border-[#27272A] text-xs text-[#D4D4D8] leading-relaxed">
              <strong className="text-[#A3E635]">Instructions:</strong> After completing payment in your UPI app, keep your transaction receipt or take a screenshot, and note down the 12-digit UTR number.
            </div>

            {/* Stepper Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#A1A1AA] hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm hover:shadow-[0_0_16px_rgba(163,230,53,0.35)] transition-all duration-300 flex items-center gap-2 cursor-pointer"
              >
                <span>Upload Payment Proof</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 3: PAYMENT PROOF SUBMISSION                      */}
        {/* ==================================================== */}
        {currentStep === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-white">Payment Proof Submission</h3>
              <p className="text-xs text-[#A1A1AA]">
                Submit your transaction proof for manual bank reconciliation by club administrators.
              </p>
            </div>

            {/* File Upload Input (Image or PDF) */}
            <div>
              <label className="block text-[11px] font-semibold text-white mb-1">
                Upload Payment Receipt (Image or PDF screenshot) <span className="text-[#A3E635]">*</span>
              </label>
              <div className="relative border-2 border-dashed border-[#27272A] hover:border-[#A3E635] rounded-2xl p-4 text-center transition-colors bg-[#18181B]">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-10 h-10 rounded-full bg-[#121214] flex items-center justify-center text-[#A3E635]">
                    <Upload className="w-5 h-5" />
                  </div>
                  {receiptFileName ? (
                    <div className="flex items-center gap-2 text-xs text-[#A3E635] font-medium">
                      <FileText className="w-4 h-4" />
                      <span className="truncate max-w-[240px] text-white">{receiptFileName}</span>
                      <span className="text-[#A3E635] text-[10px] font-bold">✓ Selected</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-white font-medium">
                        Click to browse or drag & drop payment receipt
                      </p>
                      <p className="text-[10px] text-[#A1A1AA]">Supports PNG, JPG, JPEG, or PDF up to 2MB</p>
                    </>
                  )}
                </div>
              </div>

              {receiptUrl && receiptUrl.trim() !== '' && receiptUrl.trim().startsWith('data:image') && (
                <div className="mt-2 p-2 rounded-xl bg-white border border-[#27272A] inline-block">
                  <img src={receiptUrl.trim()} alt="Receipt preview" className="h-16 rounded object-contain" />
                </div>
              )}
            </div>

            {/* UTR / Transaction Reference Number */}
            <div>
              <label className="block text-[11px] font-semibold text-white mb-1">
                UTR / Transaction Reference Number <span className="text-[#A3E635]">*</span>
              </label>
              <input
                type="text"
                required
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 431098765432 or UPI Ref ID"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#18181B] border border-[#27272A] focus:border-[#A3E635] focus:outline-none text-white font-mono uppercase tracking-wider placeholder-[#71717A]"
              />
              <p className="text-[10px] text-[#A1A1AA] mt-1 font-mono">
                Found on your UPI app transaction summary screen under "UPI Transaction ID" or "UTR".
              </p>
            </div>

            {/* Mandatory Declaration Checkbox */}
            <div className="p-3 rounded-xl bg-[#18181B] border border-[#27272A]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={declarationChecked}
                  onChange={(e) => setDeclarationChecked(e.target.checked)}
                  className="mt-0.5 rounded border-[#27272A] text-[#A3E635] focus:ring-[#A3E635] bg-[#121214] h-4 w-4"
                />
                <span className="text-xs text-[#D4D4D8] leading-snug select-none">
                  <strong className="text-[#A3E635] font-semibold">Mandatory Declaration:</strong> "I confirm that the UTR and payment details provided above are authentic."
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#A1A1AA] hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !declarationChecked || !utrNumber.trim()}
                className="px-6 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm hover:shadow-[0_0_16px_rgba(163,230,53,0.35)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Transmitting Proof...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Payment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ==================================================== */}
        {/* STEP 4: SUBMISSION CONFIRMATION POPUP MODAL          */}
        {/* ==================================================== */}
        {currentStep === 4 && (
          <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[#A3E635]/15 border-2 border-[#A3E635] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-[#A3E635]" />
            </div>

            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#A3E635] bg-[#18181B] px-3 py-1 rounded-full border border-[#27272A] font-bold">
                Application Received • Ref: {createdTicketId}
              </span>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-2">
                Payment Submitted Successfully
              </h3>
            </div>

            {/* Exact Required Prompt Modal Message */}
            <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] text-[#D4D4D8] text-xs sm:text-sm leading-relaxed text-left space-y-2">
              <p>
                <strong className="text-white">"Your payment details have been submitted successfully!</strong> Your ticket will be verified and generated within <strong className="text-white">10 to 20 minutes</strong>. If your ticket is not generated within this timeframe, please contact support directly at{' '}
                <a
                  href={`tel:${cmsContent.adminPhone}`}
                  className="text-[#A3E635] font-bold font-mono underline hover:text-[#bef264]"
                >
                  {cmsContent.adminPhone}
                </a>
                ."
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#18181B] border border-[#27272A] text-xs text-[#A1A1AA] flex items-center justify-between font-mono">
              <span>Submitted UTR:</span>
              <span className="text-[#A3E635] font-bold">{utrNumber}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => onTicketPurchased(createdTicketId)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase text-black bg-[#A3E635] hover:bg-[#bef264] shadow-sm transition-all duration-300 cursor-pointer"
              >
                Open My Attendee Panel
              </button>
              <a
                href={`tel:${cmsContent.adminPhone}`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-white border border-[#27272A] hover:border-[#A3E635] hover:text-[#A3E635] transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-[#A3E635]" />
                <span>Call Helpline</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
