// Public website content. Edit the text, prices and sample testimonials here.

export const BRAND = "Smart Invoice & Follow-Up";
export const BRAND_BLURB =
  "Create professional invoices, track payments and automate customer follow-ups from one place, so you spend less time chasing and more time growing.";

export const FEATURES = [
  { id: "invoice", title: "Smart Invoice Creation", body: "Build invoices with live GST and discount calculations, then save, send or download them." },
  { id: "voice", title: "Voice-to-Invoice", body: "Say what you need and let the assistant prepare it. Available on the Business plan." },
  { id: "customers", title: "Customer Management", body: "Keep every customer, invoice and payment history in one organised place." },
  { id: "payments", title: "Payment Tracking", body: "Record payments, see balances and spot overdue invoices at a glance." },
  { id: "reminders", title: "Automated Reminders", body: "Polite reminders before, on and after the due date, by email or WhatsApp." },
  { id: "automation", title: "Smart Follow-Up Automation", body: "Set your own rules once. Reminders stop automatically when an invoice is paid." },
  { id: "analytics", title: "Business Analytics", body: "Revenue, paid vs unpaid and customer payment behaviour, with CSV and PDF export." },
  { id: "pdf", title: "Professional PDF Invoices", body: "Clean, branded invoices with your logo and GST number, ready to print or save as PDF." },
] as const;

export const STEPS = [
  { n: 1, title: "Speak Your Command", body: "Just talk. Our smart voice system understands what you need." },
  { n: 2, title: "Get Instant Invoices", body: "Convert your voice into professional invoices automatically." },
  { n: 3, title: "Send Reminders & Follow-Ups", body: "Automate payment reminders and get paid without the hassle." },
] as const;

export const BENEFITS = [
  "Save time on manual invoicing.",
  "Reduce missed payments.",
  "Manage all customers in one place.",
  "Automate repetitive follow-ups.",
  "Monitor business performance.",
  "Generate invoices quickly.",
] as const;

export const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    featured: false,
    perks: ["Basic invoice creation", "Customer management", "Payment tracking"],
  },
  {
    name: "Professional",
    price: "₹499",
    period: "/month",
    featured: true,
    perks: ["Unlimited invoices", "Automated reminders", "PDF downloads", "Business analytics"],
  },
  {
    name: "Business",
    price: "₹1,499",
    period: "/month",
    featured: false,
    perks: ["Everything in Professional", "Advanced automation", "Voice-to-invoice", "Priority support"],
  },
] as const;

/** Sample wording only. Replace with real, permitted customer quotes before launch. */
export const TESTIMONIALS = [
  { name: "Sample customer", role: "Freelance designer", quote: "I can raise an invoice in a couple of minutes, and the reminders mean I stop chasing people by hand." },
  { name: "Sample customer", role: "Agency owner", quote: "Seeing who has paid and who hasn't in one dashboard saves our team hours every week." },
  { name: "Sample customer", role: "Consultant", quote: "The GST totals are worked out for me, and the PDF looks professional enough to send straight away." },
] as const;

export const FAQS = [
  { q: "What is Smart Invoice & Follow-Up?", a: "It is an online tool for creating invoices, tracking payments and automating payment reminders and follow-ups for your customers." },
  { q: "How do I create an invoice?", a: "Open Create Invoice, choose or add a customer, add your items with quantity and price, set GST and any discount, then save it as a draft or send it. Totals update as you type." },
  { q: "Can I track unpaid invoices?", a: "Yes. Invoices show as Pending or Overdue automatically, and the dashboard and Payment Tracking page show what is still owed." },
  { q: "Can I automate payment reminders?", a: "Yes. In Follow-Up Automation you set when reminders go out (before, on or after the due date) and which message to use. Reminders stop once an invoice is paid." },
  { q: "Can I manage multiple customers?", a: "Yes. Customers has everyone you bill, with their invoices, payments and outstanding balance." },
  { q: "Can I download invoices as PDF?", a: "Yes. Open an invoice and choose Download PDF, then save it from your browser's print dialog." },
  { q: "Is my business data secure?", a: "Accounts use secure sign-in, and your data is protected with database-level access rules so each business can only see its own records." },
] as const;

export const FOOTER_LINKS = {
  product: [
    { label: "Home", to: "/" },
    { label: "Features", to: "/features" },
    { label: "Pricing", to: "/pricing" },
  ],
  company: [
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms & Conditions", to: "/terms" },
  ],
} as const;

/** Add real profile URLs. Links that are empty are not shown. */
export const SOCIAL_LINKS: { label: string; href: string }[] = [
  { label: "LinkedIn", href: "" },
  { label: "X (Twitter)", href: "" },
  { label: "Instagram", href: "" },
];

/** Where the Contact page sends messages. Change to your real inbox. */
export const CONTACT_EMAIL = "support@smartinvoice.example";

/**
 * Phone number of your Vapi voice agent, with the country code, for example "+1 415 555 0123".
 * Shown exactly as written. Leave it empty to hide the call buttons.
 */
export const VOICE_AGENT_PHONE = "+1 (302) 754 2049";

/** The tap-to-call link for the voice agent number, or null while no valid number is set. */
export function voiceAgentPhone() {
  const digits = VOICE_AGENT_PHONE.replace(/[^\d+]/g, "");
  if (!/^\+\d{8,15}$/.test(digits)) return null;
  return { href: `tel:${digits}`, label: VOICE_AGENT_PHONE.trim() };
}
