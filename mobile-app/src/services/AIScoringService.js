// /**
//  * Advanced Arabic Handwriting Scoring Service
//  * Size-invariant, shift-invariant, shape-based scoring
//  */


// import axios from 'axios';
// import { API_URL } from './api';

// const getScoringUrl = () => {
//   if (process.env.EXPO_PUBLIC_PYTHON_API_URL) {
//     return `${process.env.EXPO_PUBLIC_PYTHON_API_URL}/score`;
//   }
//   return 'http://192.168.0.159:8000/score';
// };

// export async function scoreHandwriting(userBase64, targetWord) {
//   try {
//     console.log("Scoring request:", getScoringUrl());
//     const response = await axios.post(getScoringUrl(), {
//       base64Image: userBase64,
//       targetWord: targetWord
//     });

//     return {
//       score: response.data.score,
//       feedback: response.data.feedback,
//     };
//   } catch (error) {
//     console.log("Scoring error:", error);
//     return {
//       score: 0,
//       feedback: "Scoring failed. Please try again.",
//     };
//   }
// }


import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// HARDCODED API KEY AS REQUESTED (Note: In production, use ENV variables)
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// Simple in-memory cache to prevent duplicate API calls for the same image
// Key: base64 string, Value: { score, feedback }
const resultCache = new Map();

export const scoreHandwriting = async (base64Image, targetWord) => {
  try {
    // 1. Check Cache
    // Create a unique key for this specific request
    // We use a substring of the base64 to save memory/time while staying unique enough for this session
    const cacheKey = `${targetWord.arabic}_${base64Image.substring(0, 50)}_${base64Image.length}`;

    if (resultCache.has(cacheKey)) {
      console.log("Returning cached scoring result");
      return resultCache.get(cacheKey);
    }

    console.log("Analyzing new image with Gemini...");

    // 2. Incremental Completion Prompt Engineering
    const prompt = `
        You are an expert Arabic handwriting evaluator.

        The student is attempting to write:
        Arabic: "${targetWord.arabic}"
        Meaning: "${targetWord.english}"

        Your job is to visually evaluate the handwriting in the provided image and score how well the student wrote the target Arabic word.

        =====================
        SCORING SYSTEM (0–100)
        =====================

        STEP 1 — BASE SCORE (COMPLETENESS) [0–60]
        Judge how complete the written word is compared to the correct Arabic spelling.

        - Fully written word with all letters and required dots → 60
        - Mostly complete, minor missing parts (like a dot or small stroke) → 45–55
        - About half the letters correctly formed → 30–40
        - Only a small portion started → 10–20
        - Nothing recognizable → 0

        STEP 2 — QUALITY BONUSES (ADD up to +40)
        Add bonuses ONLY if the writing is reasonably complete.

        - Smooth, confident strokes → +10
        - Correct letter proportions and relative sizes → +10
        - Correct letter connections (where applicable) → +10
        - Neat, visually pleasing handwriting → +10

        STEP 3 — PENALTIES (SUBTRACT)
        Subtract for clear mistakes:

        - Shaky, wobbly, or very uneven lines → -5
        - Incorrect or missing dot placement → -5 each major dot error
        - Letters written in clearly wrong shape → -5 per major shape error
        - Letters disconnected when they should connect → -5

        FINAL SCORE = Base + Bonuses − Penalties  
        Clamp the final score between 0 and 100.

        =====================
        FEEDBACK RULES
        =====================
        Write SHORT, simple feedback for a learner.

        Feedback must:
        - Be 1–2 short sentences maximum
        - Mention ONE thing done well (if score ≥ 30)
        - Mention ONE most important improvement
        - Be encouraging and beginner-friendly
        - Do NOT mention numbers or scoring rules

        If nothing is recognizable, say the student should try writing the full word more clearly.

        =====================
        OUTPUT FORMAT (STRICT)
        =====================
        Return ONLY valid JSON. No markdown. No extra text.

        {
        "score": integer (0–100),
        "feedback": "short learner-friendly sentence(s)"
        }
        `;


    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1000,
      }
    };

    const response = await axios.post(API_URL, requestBody, {
      headers: { 'Content-Type': 'application/json' }
    });

    const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (textResponse) {
      // Clean markdown if present
      console.log("Gemini Raw Response:", textResponse); // Debug what AI actually sent
      try {
        // Clean markdown if present (e.g., ```json ... ```)
        const cleanJson = textResponse.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
        const result = JSON.parse(cleanJson);

        // 3. Store in Cache
        resultCache.set(cacheKey, result);

        return result;
      } catch (err) {
        console.error("JSON Parse Error:", err);
        console.error("Failed text:", textResponse);
        return {
          score: 0,
          feedback: "Please try again."
        };
      }
    }

    return { score: 0, feedback: "Evaluation failed. Please try again." };

  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);

    // Handle Quota/Rate Limits specifically
    if (error.response?.status === 429) {
      return {
        score: 0,
        feedback: "Please wait a moment and try again."
      };
    }

    return {
      score: 0,
      feedback: "Connection error. Please check your internet."
    };
  }
};