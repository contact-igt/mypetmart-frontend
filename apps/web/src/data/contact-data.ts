/**
 * Contact page fixture content — mirrors the footer's contact details
 * (site-footer.tsx) plus the Contact-only elements (enquiry types, FAQ).
 * FAQ items intentionally carry no answer copy: several of the reference's
 * questions touch unconfirmed claims (COD, pan-India shipping, delivery
 * timeframes — CLAUDE.md's unconfirmed-claims list) and must not assert a
 * specific answer until confirmed. See docs/DESIGN_SYSTEM.md §18.
 */
export const CONTACT_INFO = {
  phone: "+91 94440 25511",
  email: "mypetmartstore@gmail.com",
  address: "12A, JR Enclave, MGR Nagar, Ayyapakkam, Chennai – 600077, Tamil Nadu, India",
  instagramHandle: "@my.petmart",
  instagramUrl: "https://www.instagram.com/my.petmart",
  youtubeUrl: "https://www.youtube.com/@MypetMart-MPM",
};

export const ENQUIRY_TYPES = ["Product Question", "Order Question", "Something Else"];

export const FAQ_QUESTIONS = [
  "How long does delivery take?",
  "Is Cash on Delivery available?",
  "How do I return an item?",
  "Do you ship pan-India?",
];
