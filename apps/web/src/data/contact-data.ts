/**
 * Contact page fixture content — mirrors the footer's contact details
 * (site-footer.tsx) plus the Contact-only elements (enquiry types, FAQ).
 * FAQ answers avoid fixed promises for COD, pan-India shipping, and delivery
 * timeframes because those claims are not yet confirmed.
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

export const FAQ_ITEMS = [
  {
    question: "How long does delivery take?",
    answer: "Delivery timing depends on your location and the courier service. Share your delivery postcode with our team for the latest estimate before ordering.",
  },
  {
    question: "Is Cash on Delivery available?",
    answer: "Available payment methods are shown during checkout. If Cash on Delivery is not listed for your order, please choose one of the displayed online payment options.",
  },
  {
    question: "How do I return an item?",
    answer: "Sign in, open My Orders, choose the delivered order, and submit a refund or replacement request for the eligible item. You can follow its status under Returns.",
  },
  {
    question: "Do you ship pan-India?",
    answer: "Serviceability depends on the delivery postcode. Enter your shipping address at checkout or contact us with your postcode so we can confirm coverage.",
  },
];
