/**
 * Tamil → natural Tanglish for en-IN browser TTS (devices without ta-IN voice).
 * Optimized for Indian English voices: full phrases first, then syllables, then cleanup.
 */

import { tamilLoanwordsToLatin } from "@/lib/tamil-phonetics";

const PULLI = "\u0bcd";
const TAMIL_BLOCK = /[\u0b80-\u0bff]+/g;

/** Independent vowels */
const VOWEL: Record<string, string> = {
  "\u0b85": "a",
  "\u0b86": "aa",
  "\u0b87": "i",
  "\u0b88": "ee",
  "\u0b89": "u",
  "\u0b8a": "oo",
  "\u0b8e": "e",
  "\u0b8f": "ae",
  "\u0b90": "ai",
  "\u0b92": "o",
  "\u0b93": "oa",
  "\u0b94": "au",
};

/** Consonant bases (inherent vowel = short 'a') */
const CONSONANT: Record<string, string> = {
  "\u0b95": "k",
  "\u0b99": "ng",
  "\u0b9a": "s",
  "\u0b9e": "nj",
  "\u0b9f": "t",
  "\u0ba3": "n",
  "\u0ba4": "th",
  "\u0ba8": "n",
  "\u0baa": "p",
  "\u0bae": "m",
  "\u0baf": "y",
  "\u0bb0": "r",
  "\u0bb2": "l",
  "\u0bb5": "v",
  "\u0bb4": "zh",
  "\u0bb3": "l",
  "\u0bb1": "r",
  "\u0ba9": "n",
};

/** Vowel signs attached to consonants */
const VOWEL_SIGN: Record<string, string> = {
  "\u0bbe": "aa",
  "\u0bbf": "i",
  "\u0bc0": "ee",
  "\u0bc1": "u",
  "\u0bc2": "oo",
  "\u0bc6": "e",
  "\u0bc7": "ae",
  "\u0bc8": "ai",
  "\u0bca": "o",
  "\u0bcb": "oa",
  "\u0bcc": "au",
};

/**
 * Common hospital phrases → natural Tanglish (longest match first).
 * Hand-tuned for Indian English TTS rhythm.
 */
const PHRASE_TANGLISH: [string, string][] = [
  [
    "\u0bb5\u0ba3\u0b95\u0bcd\u0b95\u0bae\u0bcd. CIPACA Hospital, Thiruvannamalai Unit. \u0ba8\u0bbe\u0ba9\u0bcd \u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd AI \u0bb0\u0bbf\u0b9a\u0baa\u0bcd\u0bb7\u0ba9\u0bbf\u0bb8\u0bcd\u0b9f\u0bcd. \u0b8e\u0ba9\u0bcd\u0ba9 \u0bb9\u0bc7\u0bb2\u0bcd\u0baa\u0bcd \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd?",
    "Vanakkam. Sipaka Hospital, Thiruvannamalai unit. Naan ungal AI receptionist. Enna help venum?",
  ],
  [
    "\u0b9a\u0bb0\u0bbf. \u0b85\u0baa\u0bcd\u0baa\u0bbe\u0baf\u0bbf\u0ba9\u0bcd\u0b9f\u0bcd\u0bae\u0bc7\u0ba9\u0bcd\u0b9f\u0bcd \u0baa\u0bc1\u0b95\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0baf \u0b89\u0ba4\u0bb5\u0bc1 \u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd. \u0ba4\u0baf\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0ba4\u0bc1 \u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0baa\u0bc6\u0baf\u0bb0\u0bcd \u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
    "Sari. Appointment book seiya udhavi kiren. Dayavu seithu ungal peyar sollunga.",
  ],
  [
    "\u0ba4\u0baf\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0ba4\u0bc1 \u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0baa\u0bc6\u0baf\u0bb0\u0bcd \u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
    "Dayavu seithu ungal peyar sollunga.",
  ],
  [
    "\u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0bae\u0bbe\u0b9f\u0bcd\u0b9f\u0bc8\u0bb2\u0bcd \u0ba8\u0bae\u0bcd\u0baa\u0bb0\u0bcd \u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
    "Ungal mobile number sollunga.",
  ],
  [
    "\u0b8e\u0ba8\u0bcd\u0ba4 \u0b9f\u0bbf\u0baa\u0bcd\u0baa\u0bbe\u0b0f\u0bcd\u0b9f\u0bcd\u0bae\u0bc7\u0ba9\u0bcd\u0b9f\u0bcd\u0b95\u0bcd\u0b95\u0bc1 \u0bb5\u0bb0 \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd?",
    "Entha department ku vara venum?",
  ],
  [
    "\u0b8e\u0ba8\u0bcd\u0ba4 \u0b9f\u0bbe\u0b95\u0bcd\u0b9f\u0bb0\u0bcd\u0b90 \u0baa\u0bbe\u0bb0\u0bcd\u0b95\u0bcd\u0b95 \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd?",
    "Entha doctor ai paarka venum?",
  ],
  [
    "\u0b8e\u0ba8\u0bcd\u0ba4 \u0b9f\u0bc7\u0b9f\u0bcd \u0bb5\u0b9a\u0ba4\u0bbf\u0baf\u0bbe\u0b95 \u0b87\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bbf\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bbf\u0bb0\u0ba4\u0bc1?",
    "Entha date vasathiya irukkiradhu?",
  ],
  [
    "\u0b8e\u0ba8\u0bcd\u0ba4 \u0b9f\u0bc8\u0bae\u0bcd \u0bb5\u0b9a\u0ba4\u0bbf\u0baf\u0bbe\u0b95 \u0b87\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bbf\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bbf\u0bb0\u0ba4\u0bc1?",
    "Entha time vasathiya irukkiradhu?",
  ],
  [
    "\u0bae\u0ba9\u0bcd\u0ba9\u0bbf\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd. \u0b87\u0ba8\u0bcd\u0ba4 \u0ba4\u0b95\u0bb5\u0bb2\u0bcd \u0b8e\u0ba9\u0bcd\u0ba9\u0bbf\u0b9f\u0bae\u0bcd \u0b87\u0bb2\u0bcd\u0bb2\u0bc8.",
    "Mannikkavum. Indha thagaval ennidam illai.",
  ],
  [
    "\u0bb5\u0bc7\u0bb1\u0bc1 \u0b8e\u0ba4\u0bbe\u0bb5\u0ba4\u0bc1 \u0bb9\u0bc7\u0bb2\u0bcd\u0baa\u0bcd \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd\u0b86?",
    "Veru edhaavadhu help venumaa?",
  ],
  [
    "\u0b85\u0bb5\u0b9a\u0bb0\u0bae\u0bbe? \u0b95\u0bb5\u0bb2\u0bc8\u0baa\u0bcd\u0baa\u0b9f \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bbe\u0bae\u0bcd. \u0ba8\u0bbe\u0ba9\u0bcd \u0b89\u0ba4\u0bb5\u0bbf \u0b9a\u0bc6\u0baf\u0bcd\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd.",
    "Avasarama? Kavalai pada vendaam. Naan udhavi seikiren.",
  ],
  [
    "\u0bb5\u0ba3\u0b95\u0bcd\u0b95\u0bae\u0bcd! \u0b8e\u0ba9\u0bcd\u0ba9 \u0bb9\u0bc6\u0bb2\u0bcd\u0baa\u0bcd \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd? \u0b85\u0baa\u0bcd\u0baa\u0bbe\u0baf\u0bbf\u0ba9\u0bcd\u0b9f\u0bcd\u0bae\u0bc7\u0ba9\u0bcd\u0b9f\u0bcd, \u0b8e\u0bae\u0bb0\u0bcd\u0b9c\u0bc6\u0ba9\u0bcd\u0b9a\u0bbf, \u0bb8\u0bcd\u0b95\u0bc7\u0ba9\u0bcd, \u0bb9\u0bbe\u0b86\u0bb8\u0bcd\u0baa\u0bbf\u0b9f\u0bb2\u0bcd \u0ba4\u0b95\u0bb5\u0bb2\u0bcd \u2014 \u0b8e\u0ba4\u0bb1\u0bcd\u0b95\u0bc1\u0bae\u0bcd \u0b89\u0ba4\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd.",
    "Vanakkam! Enna help venum? Appointment, emergency, scan, hospital thagaval — edharkum udhavi seikiren.",
  ],
  [
    "\u0bae\u0ba9\u0bcd\u0ba9\u0bbf\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd. \u0b87\u0ba8\u0bcd\u0ba4 \u0ba4\u0b95\u0bb5\u0bb2\u0bcd \u0b8e\u0ba9\u0bcd\u0ba9\u0bbf\u0b9f\u0bae\u0bcd \u0b87\u0bb2\u0bcd\u0bb2\u0bc8. \u0bb9\u0bbe\u0b86\u0bb8\u0bcd\u0baa\u0bbf\u0b9f\u0bb2\u0bcd \u0b9f\u0bc0\u0bae\u0bcd-\u0b90 \u0b95\u0ba9\u0bc6\u0b95\u0bcd\u0b9f\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd.",
    "Mannikkavum. Indha thagaval ennidam illai. Hospital team ai connect seikiren.",
  ],
  [
    "CIPACA Thiruvannamalai-\u0b90 \u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1 \u0b95\u0bca\u0ba3\u0bcd\u0b9f\u0ba4\u0bb1\u0bcd\u0b95\u0bc1 \u0ba8\u0ba9\u0bcd\u0bb1\u0bbf. \u0ba8\u0bb2\u0bcd\u0bb2\u0bbe \u0b87\u0bb0\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
    "Thank you for calling Sipaka Thiruvannamalai. Nalla irungal.",
  ],
  [
    "\u0b9a\u0bbf\u0baa\u0bbe\u0b95\u0bbe \u0ba4\u0bbf\u0bb0\u0bc1\u0bb5\u0ba9\u0bcd\u0ba9\u0bae\u0bb2\u0bc8-\u0b90 \u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1 \u0b95\u0bca\u0ba3\u0bcd\u0b9f\u0ba4\u0bb1\u0bcd\u0b95\u0bc1 \u0ba8\u0ba9\u0bcd\u0bb1\u0bbf. \u0ba8\u0bb2\u0bcd\u0bb2\u0bbe \u0b87\u0bb0\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
    "Thank you for calling Sipaka Thiruvannamalai. Nalla irungal.",
  ],
  [
    "appointment \u0baa\u0ba4\u0bbf\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1",
    "appointment record panniyachu",
  ],
  [
    "booking \u0baa\u0ba4\u0bbf\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1",
    "booking record panniyachu",
  ],
  [
    "cipaca thiruvannamalai-\u0b90 \u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1 \u0b95\u0bca\u0ba3\u0bcd\u0b9f\u0ba4\u0bb1\u0bcd\u0b95\u0bc1 \u0ba8\u0ba9\u0bcd\u0bb1\u0bbf. \u0ba8\u0bb2\u0bcd\u0bb2\u0bbe \u0b87\u0bb0\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
    "Thank you for calling Sipaka Thiruvannamalai. Nalla irungal.",
  ],
  [
    "engal team seekirama confirm seiya call seyvaarkal",
    "Engal team seekirama ungalukku phone pannitu details verify pannuvanga",
  ],
  [
    "\u0b95\u0ba9\u0bcd\u0b9a\u0bb0\u0bcd\u0bae\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0baf call \u0b9a\u0bc6\u0baf\u0bcd\u0bb5\u0bbe\u0bb0\u0bcd\u0b95\u0bb3\u0bcd",
    "phone pannitu details verify pannuvanga",
  ],
  [
    "\u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1 \u0b95\u0bca\u0ba3\u0bcd\u0b9f\u0ba4\u0bb1\u0bcd\u0b95\u0bc1",
    "call pannadhaarku",
  ],
  [
    "\u0b9a\u0bc6\u0b9f\u0bcd\u0bb7\u0ba9\u0bcd \u0bae\u0bc1\u0b9f\u0bbf\u0ba8\u0bcd\u0ba4\u0bc1\u0bb5\u0bbf\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1. \u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0bb9\u0bc6\u0bb2\u0bcd\u0baa\u0bcd \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bc7\u0ba9\u0bcd\u0bb1\u0bbe\u0bb2\u0bcd \u0bb0\u0bc0\u0bb8\u0bcd\u0b9f\u0bbe\u0bb0\u0bcd\u0b9f\u0bcd \u0b85\u0bb4\u0bc1\u0ba4\u0bcd\u0ba4\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
    "Session mudindhuvittadhu. Meendum help venumenraal restart azhuthungal.",
  ],
  [
    "\u0b85\u0baa\u0bcd\u0baa\u0bbe\u0baf\u0bbf\u0ba9\u0bcd\u0b9f\u0bcd\u0bae\u0bc7\u0ba9\u0bcd\u0b9f\u0bcd, \u0b8e\u0bae\u0bb0\u0bcd\u0b9c\u0bc6\u0ba9\u0bcd\u0b9a\u0bbf, \u0bb8\u0bcd\u0b95\u0bc7\u0ba9\u0bcd, \u0bb9\u0bbe\u0b86\u0bb8\u0bcd\u0baa\u0bbf\u0b9f\u0bb2\u0bcd \u0ba4\u0b95\u0bb5\u0bb2\u0bcd \u2014 \u0b8e\u0ba4\u0bbf\u0bb0\u0bcd\u0b95\u0bc1 \u0bb9\u0bc6\u0bb2\u0bcd\u0baa\u0bcd \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd?",
    "Appointment, emergency, scan, hospital thagaval — edharku help venum?",
  ],
  ["\u0b8e\u0ba4\u0bbf\u0bb0\u0bcd\u0b95\u0bc1", "edharku"],
  [
    "\u0b8e\u0ba8\u0bcd\u0ba4 \u0b9f\u0bbf\u0baa\u0bcd\u0baa\u0bbe\u0b0f\u0bcd\u0b9f\u0bcd\u0bae\u0bc7\u0ba9\u0bcd\u0b9f\u0bcd-\u0b95\u0bcd\u0b95\u0bc1 \u0bb5\u0bb0 \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd?",
    "Entha department ku vara venum?",
  ],
  [
    "\u0b8e\u0ba8\u0bcd\u0ba4 \u0b9f\u0bbe\u0b95\u0bcd\u0b9f\u0bb0\u0bcd-\u0b90 \u0baa\u0bbe\u0bb0\u0bcd\u0b95\u0bcd\u0b95 \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd?",
    "Entha doctor ai paarka venum?",
  ],
  [
    "\u0b8e\u0ba8\u0bcd\u0ba4 \u0b9f\u0bc7\u0b9f\u0bcd \u0bb5\u0b9a\u0ba4\u0bbf\u0baf\u0bbe\u0b95 \u0b87\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bc1\u0bae\u0bcd?",
    "Entha date vasathiya irukkum?",
  ],
  [
    "\u0b8e\u0ba8\u0bcd\u0ba4 \u0b9f\u0bc8\u0bae\u0bcd \u0bb5\u0b9a\u0ba4\u0bbf\u0baf\u0bbe\u0b95 \u0b87\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bc1\u0bae\u0bcd?",
    "Entha time vasathiya irukkum?",
  ],
  [
    "\u0ba8\u0bcd\u0b95\u0baf\u0bbe\u0bb3\u0bbf \u0b87\u0baa\u0bcd\u0baa\u0bcb\u0ba4\u0bc1 \u0b8e\u0b99\u0bcd\u0b95\u0bc7 \u0b87\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bbf\u0bb1\u0bbe\u0bb0\u0bcd?",
    "Noyali ippodhu enge irukkaar?",
  ],
  [
    "\u0b8e\u0ba9\u0bcd\u0ba9 \u0b8e\u0bae\u0bb0\u0bcd\u0b9c\u0bc6\u0ba9\u0bcd\u0b9a\u0bbf? \u0b86\u0b95\u0bcd\u0b9a\u0bbf\u0b9f\u0bc6\u0ba9\u0bcd\u0b9f\u0bcd, \u0b9a\u0bc6\u0bb8\u0bcd\u0b9f\u0bcd \u0baa\u0bc7\u0ba9\u0bcd, \u0bb8\u0bcd\u0b9f\u0bcd\u0bb0\u0bcb\u0b95\u0bcd \u2014 \u0b8e\u0ba4\u0bbe\u0bb5\u0ba4\u0bc1 \u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd.",
    "Enna emergency? Accident, chest pain, stroke — edhaavadhu sollunga.",
  ],
  [
    "\u0ba8\u0bcd\u0b95\u0baf\u0bbe\u0bb3\u0bbf\u0baf\u0bbf\u0ba9\u0bcd \u0b95\u0ba3\u0bcd\u0b9f\u0bbf\u0bb7\u0ba9\u0bcd \u0b8e\u0baa\u0bcd\u0baa\u0b9f\u0bbf \u0b87\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bbf\u0bb1\u0ba4\u0bc1?",
    "Noyaliyin condition eppadi irukkiradhu?",
  ],
  [
    "\u0ba8\u0bc0\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0bb9\u0bbe\u0b86\u0bb8\u0bcd\u0baa\u0bbf\u0b9f\u0bb2\u0bcd-\u0b95\u0bcd\u0b95\u0bc1 \u0bb5\u0ba8\u0bcd\u0ba4\u0bc1\u0b95\u0bcb\u0ba3\u0bcd\u0b9f\u0bbf\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bc0\u0bb0\u0bcd\u0b95\u0bb3\u0bbe?",
    "Neengal hospital ku varugindrirgala?",
  ],
  [
    "\u0b8e\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0b9f\u0bc0\u0bae\u0bcd \u0bb5\u0bbf\u0bb0\u0bc8\u0bb5\u0bbf\u0bb2\u0bcd \u0b95\u0ba9\u0bcd\u0b9a\u0bb0\u0bcd\u0bae\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0baf \u0b95\u0bbe\u0bb2\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0bb5\u0bbe\u0bb0\u0bcd\u0b95\u0bb3\u0bcd.",
    "Engal team seekirama ungalukku phone pannitu details verify pannuvanga.",
  ],
  [
    "\u0b95\u0ba9\u0bcd\u0b9a\u0bb0\u0bcd\u0bae\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0baf \u0b9f\u0bc0\u0bae\u0bcd \u0b95\u0bbe\u0bb2\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0bb5\u0bbe\u0bb0\u0bcd\u0b95\u0bb3\u0bcd.",
    "team phone pannitu details verify pannuvanga.",
  ],
  [
    "\u0baa\u0ba4\u0bbf\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1",
    "record panniyachu",
  ],
  ["\u0b8e\u0b99\u0bcd\u0b95\u0bc7", "enge"],
  ["\u0ba8\u0bc0\u0b99\u0bcd\u0b95\u0bb3\u0bcd", "neengal"],
  ["\u0b8e\u0ba8\u0bcd\u0ba4", "entha"],
  ["\u0b85\u0bb2\u0bcd\u0bb2\u0ba4\u0bc1", "allathu"],
  ["\u0b95\u0bcd\u0b95\u0bc1", "ku"],
  ["\u0b90", "ai"],
  ["\u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd", "matrum"],
  ["\u0b86\u0b95\u0bbf\u0baf\u0bc1\u0bb3\u0bcd\u0bb3\u0ba4\u0bc1", "aagiyulladhu"],
  ["\u0b95\u0bbe\u0bb2\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0bb5\u0bbe\u0bb0\u0bcd\u0b95\u0bb3\u0bcd", "phone pannuvanga"],
  ["\u0b95\u0ba9\u0bcd\u0b9a\u0bb0\u0bcd\u0bae\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0baf", "details verify panna"],
  ["\u0b95\u0ba9\u0bcd\u0b9a\u0bb0\u0bcd\u0bae\u0bcd", "details verify"],
  ["\u0bb5\u0bbf\u0bb0\u0bc8\u0bb5\u0bbf\u0bb2\u0bcd", "seekirama"],
  ["\u0b85\u0bb4\u0bc1\u0ba4\u0bcd\u0ba4\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd", "azhuthungal"],
  ["\u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bc7\u0ba9\u0bcd\u0bb1\u0bbe\u0bb2\u0bcd", "venumenraal"],
  ["\u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd\u0b86", "venumaa"],
  ["\u0b8e\u0baa\u0bcd\u0baa\u0b9f\u0bbf", "eppadi"],
  ["\u0b95\u0ba3\u0bcd\u0b9f\u0bbf\u0bb7\u0ba9\u0bcd", "condition"],
  ["\u0bb5\u0ba8\u0bcd\u0ba4\u0bc1\u0b95\u0bcb\u0ba3\u0bcd\u0b9f\u0bbf\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bc0\u0bb0\u0bcd\u0b95\u0bb3\u0bbe", "varugindrirgala"],
  ["\u0b95\u0bbe\u0ba9\u0bbe", "kaana"],
  ["\u0b85\u0bb5\u0bb0\u0bcd\u0b95\u0bb3\u0bc7", "avargale"],
  ["\u0ba4\u0baf\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0ba4\u0bc1", "dayavu seithu"],
  ["\u0b9a\u0bca\u0bb2\u0bcd\u0bb2\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd", "sollunga"],
  ["\u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd", "ungal"],
  ["\u0ba8\u0bbe\u0ba9\u0bcd", "naan"],
  ["\u0b8e\u0ba9\u0bcd\u0ba9", "enna"],
  ["\u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd", "venum"],
  ["\u0bb5\u0ba3\u0b95\u0bcd\u0b95\u0bae\u0bcd", "vanakkam"],
  ["\u0b9a\u0bb0\u0bbf", "sari"],
  ["\u0ba8\u0ba9\u0bcd\u0bb1\u0bbf", "nandri"],
  ["\u0b87\u0bb2\u0bcd\u0bb2\u0bc8", "illai"],
  ["\u0b89\u0ba4\u0bb5\u0bc1", "udhavi"],
  ["\u0ba4\u0b95\u0bb5\u0bb2\u0bcd", "thagaval"],
  ["\u0ba4\u0bbf\u0bb0\u0bc1\u0bb5\u0ba9\u0bcd\u0ba9\u0bae\u0bb2\u0bc8", "Thiruvannamalai"],
  ["\u0ba4\u0bbf\u0bb0\u0bc1\u0bb5\u0ba3\u0bcd\u0ba3\u0bbe\u0bae\u0bb2\u0bc8", "Thiruvannamalai"],
  ["\u0ba8\u0bcb\u0baf\u0bbe\u0bb3\u0bbf", "noyali"],
  ["\u0ba8\u0bcb\u0baf\u0bbe\u0bb3\u0bbf\u0baf\u0bbf\u0ba9\u0bcd", "noyaliyin"],
  ["\u0b87\u0ba4\u0bc1", "idhu"],
  ["\u0b87\u0baa\u0bcd\u0baa\u0bcb\u0ba4\u0bc1", "ippodhu"],
  ["\u0b87\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bbf\u0bb1\u0bbe\u0bb0\u0bcd", "irukkaar"],
  ["\u0b87\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bbf\u0bb0\u0ba4\u0bc1", "irukkiradhu"],
  ["\u0bb5\u0b9a\u0ba4\u0bbf\u0baf\u0bbe\u0b95", "vasathiya"],
  ["\u0b9a\u0bc6\u0baf\u0bcd\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd", "seikiren"],
  ["\u0b9a\u0bc6\u0baf\u0bcd\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd", "seikiren"],
  ["\u0baa\u0ba4\u0bbf\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1", "record panniyachu"],
  ["\u0baa\u0ba4\u0bbf\u0bb5\u0bc1", "record"],
  ["\u0ba4\u0bc6\u0bb0\u0bbf\u0bb5\u0bbf\u0ba4\u0bcd\u0ba4\u0bc1\u0bb5\u0bbf\u0b9f\u0bcd\u0b9f\u0bc7\u0ba9\u0bcd", "inform panniten"],
  ["\u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1 \u0b95\u0bca\u0bb3\u0bcd\u0bb5\u0bbe\u0bb0\u0bcd\u0b95\u0bb3\u0bcd", "contact pannuvanga"],
  ["\u0b9a\u0bb0\u0bbf\u0baf\u0bbe", "sariyaa"],
  ["\u0b8e\u0b99\u0bcd\u0b95\u0bc7 \u0bb5\u0ba8\u0bcd\u0ba4\u0bc1\u0b95\u0bcb\u0ba3\u0bcd\u0b9f\u0bbf\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bc0\u0bb0\u0bcd\u0b95\u0bb3\u0bbe", "neengal hospital ku varugindrirgala"],
  ["\u0ba8\u0bb2\u0bcd\u0bb2\u0bbe \u0b87\u0bb0\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd", "nalla irungal"],
  ["\u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0bb9\u0bc6\u0bb2\u0bcd\u0baa\u0bcd \u0bb5\u0bc7\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bc7\u0ba9\u0bcd\u0bb1\u0bbe\u0bb2\u0bcd", "meendum help venumenraal"],
  ["\u0bae\u0bc1\u0b9f\u0bbf\u0ba8\u0bcd\u0ba4\u0bc1\u0bb5\u0bbf\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1", "mudindhuvittadhu"],
  ["\u0b89\u0ba4\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd", "udhavi seikiren"],
  ["\u0b89\u0ba4\u0bb5\u0bc1 \u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd", "udhavi kiren"],
  ["\u0b89\u0ba4\u0bb5\u0bc1\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd", "udhavi seikiren"],
  ["\u0b9a\u0bc6\u0baf\u0bcd\u0baf", "seiya"],
  ["\u0b9a\u0bc6\u0baf\u0bcd\u0ba4\u0bc1", "seithu"],
  ["\u0baa\u0bc6\u0baf\u0bb0\u0bcd", "peyar"],
  ["\u0b95\u0bb5\u0bb2\u0bc8\u0baa\u0bcd\u0baa\u0b9f", "kavalaipada"],
  ["\u0b85\u0bb5\u0b9a\u0bb0\u0bae\u0bbe", "avasarama"],
  ["\u0b8e\u0ba4\u0bbe\u0bb5\u0ba4\u0bc1", "edhaavadhu"],
  ["\u0b8e\u0ba4\u0bbf\u0bb0\u0bcd\u0b95\u0bc1", "edharku"],
  ["\u0b8e\u0ba4\u0bb1\u0bcd\u0b95\u0bc1\u0bae\u0bcd", "edharkum"],
  ["\u0bb5\u0bc7\u0bb1\u0bc1", "veru"],
  ["\u0b87\u0ba4\u0bc1 \u0ba4\u0b95\u0bb5\u0bb2\u0bcd", "idhu thagaval"],
  ["\u0b87\u0ba4\u0bbf\u0bb2\u0bcd", "idhil"],
  ["\u0b8e\u0b99\u0bcd\u0b95\u0bb3\u0bcd", "engal"],
  ["\u0b9f\u0bc0\u0bae\u0bcd", "team"],
  ["\u0bb9\u0bcb\u0bb2\u0bcd\u0b9f\u0bcd-\u0bb2\u0bcd", "hold il"],
  ["hold-\u0bb2\u0bcd", "hold il"],
  ["\u0ba4\u0baf\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0ba4\u0bc1 \u0bb9\u0bcb\u0bb2\u0bcd\u0b9f\u0bcd-\u0bb2\u0bcd \u0b87\u0bb0\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd", "dayavu seithu hold il irungal"],
  ["\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd", "kiren"],
  ["\u0b95\u0bbf\u0bb1\u0bcd\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd", "kirkiren"],
];

/** Latin tokens → clearer pronunciation for en-IN voices */
const LATIN_TTS_HINTS: [RegExp, string][] = [
  [/\bCIPACA\b/gi, "Sipaka"],
  [/\bcipaca\b/g, "Sipaka"],
  [/\bThiruvannamalai\b/gi, "Thiruvannamalai"],
  [/\bMRI\b/g, "M R I"],
  [/\bCT\b/g, "C T"],
  [/\bECG\b/g, "E C G"],
  [/\bGRE\b/g, "G R E"],
  [/\bAI\b/gi, "A I"],
  [/\bAPT-/g, "A P T "],
  [/\bEMG-/g, "E M G "],
  [/\bDIAG-/g, "D I A G "],
  [/\bconfirm\b/gi, "verify"],
  [/\bkanparma\b/gi, "verify"],
  [/\bkanfirm\b/gi, "verify"],
];

function joinSyllable(consonant: string, vowel: string): string {
  if (vowel === "a") return `${consonant}a`;
  if (vowel === "aa") return `${consonant}aa`;
  if (vowel === "i") return `${consonant}i`;
  if (vowel === "ee") return `${consonant}ee`;
  if (vowel === "u") return `${consonant}u`;
  if (vowel === "oo") return `${consonant}oo`;
  if (vowel === "e") return `${consonant}e`;
  if (vowel === "ae") return `${consonant}ae`;
  if (vowel === "ai") return `${consonant}ai`;
  if (vowel === "o") return `${consonant}o`;
  if (vowel === "oa") return `${consonant}oa`;
  if (vowel === "au") return `${consonant}au`;
  return consonant + vowel;
}

function romanizeTamilWord(word: string): string {
  const syllables: string[] = [];
  let i = 0;

  while (i < word.length) {
    const ch = word[i];

    if (VOWEL[ch]) {
      syllables.push(VOWEL[ch]);
      i += 1;
      continue;
    }

    if (ch === "\u0b83") {
      i += 1;
      continue;
    }

    const base = CONSONANT[ch];
    if (!base) {
      i += 1;
      continue;
    }

    i += 1;

    if (i < word.length && word[i] === PULLI) {
      syllables.push(base);
      i += 1;
      continue;
    }

    if (i < word.length && VOWEL_SIGN[word[i]]) {
      syllables.push(joinSyllable(base, VOWEL_SIGN[word[i]]));
      i += 1;
      continue;
    }

    syllables.push(joinSyllable(base, "a"));
  }

  return syllables.join("");
}

function romanizeTamilBlock(block: string): string {
  return block
    .split(/\s+/)
    .map((word) => romanizeTamilWord(word))
    .filter(Boolean)
    .join(" ");
}

function applyPhraseMap(text: string): string {
  let result = text;
  const sorted = [...PHRASE_TANGLISH].sort((a, b) => b[0].length - a[0].length);
  for (const [tamil, tanglish] of sorted) {
    if (result.includes(tamil)) {
      result = result.split(tamil).join(tanglish);
    }
  }
  return result;
}

function polishTanglish(text: string): string {
  return text
    .replace(/\bvaentumaa\b/gi, "venumaa")
    .replace(/\bvaentumenraal\b/gi, "venumenraal")
    .replace(/\baethaavathu\b/gi, "edhaavadhu")
    .replace(/\bnooyaali\b/gi, "noyali")
    .replace(/\betharku\b/gi, "edharku")
    .replace(/\bnoayaaliyin\b/gi, "noyaliyin")
    .replace(/\bengkae\b/gi, "enge")
    .replace(/\bkanparma\b/gi, "verify panna")
    .replace(/\bconfirm seiya\b/gi, "details verify panna")
    .replace(/\bconfirm panna\b/gi, "details verify panna")
    .replace(/\bconfirm\b/gi, "verify")
    .replace(/\bkondu irundhaarku\b/gi, "call pannadhaarku")
    .replace(/\bthodarbu kondu irundhaarku\b/gi, "call pannadhaarku")
    .replace(/\bthotarpu kontatharku\b/gi, "call pannadhaarku")
    .replace(/\bseyvaarkal\b/gi, "pannuvanga")
    .replace(/\bseivaargal\b/gi, "pannuvanga")
    .replace(/\bseiyyappattadhu\b/gi, "panniyachu")
    .replace(/\bpadivu seiyyappattadhu\b/gi, "record panniyachu")
    .replace(/\baakiyullathu\b/gi, "aagiyiduchu")
    .replace(/\bmarrum\b/gi, "matrum")
    .replace(/\bkkaana\b/gi, "kaana")
    .replace(/\bkku\b/gi, "ku")
    .replace(/\bhold l\b/gi, "hold il")
    .replace(/\birungkal\b/gi, "irungal")
    .replace(/\bmeentum\b/gi, "meendum")
    .replace(/\bazhuththungkal\b/gi, "azhuthungal")
    .replace(/\bvanthukontirukkireerkalaa\b/gi, "varugindrirgala")
    .replace(/\bverify panna seiya call pannuvanga\b/gi, "phone pannitu details verify pannuvanga")
    .replace(/\bengal team seekirama details verify panna call pannuvanga\b/gi, "engal team seekirama ungalukku phone pannitu details verify pannuvanga")
    .replace(/\bdetails verify panna team call pannuvanga\b/gi, "team phone pannitu details verify pannuvanga")
    .replace(/\bcipaca thiruvannamalai ai call pannadhaarku nandri\b/gi, "Thank you for calling Sipaka Thiruvannamalai")
    .replace(/\bSipaka Thiruvannamalai A I call pannadhaarku nandri\b/gi, "Thank you for calling Sipaka Thiruvannamalai")
    .replace(/\bviraivil\b/gi, "seekirama")
    .replace(/\bkondadhaarku\b/gi, "call pannadhaarku")
    .replace(/\s+,/g, ",");
}

function optimizeForIndianEnglishTts(text: string): string {
  let result = polishTanglish(text);
  for (const [pattern, replacement] of LATIN_TTS_HINTS) {
    result = result.replace(pattern, replacement);
  }
  return result
    .replace(/-+/g, " ")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.?!])/g, "$1")
    .trim();
}

export function hasTamilSpeechVoice(
  voices: SpeechSynthesisVoice[] = typeof window !== "undefined"
    ? window.speechSynthesis?.getVoices() ?? []
    : []
): boolean {
  return voices.some((v) => v.lang.toLowerCase().startsWith("ta"));
}

/** Tamil display text → natural Tanglish for en-IN TTS fallback. */
export function tamilToSpokenRoman(text: string): string {
  let result = tamilLoanwordsToLatin(text);
  result = applyPhraseMap(result);
  result = result.replace(TAMIL_BLOCK, (block) => romanizeTamilBlock(block));
  return optimizeForIndianEnglishTts(result);
}

/** Slower rate for Tanglish fallback — improves clarity on en-IN voices. */
export const TAMIL_FALLBACK_SPEECH_RATE = 0.86;
