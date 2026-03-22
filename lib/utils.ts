import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeLower(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : ""
}

// Shared translation rate limit tracking
const RATE_LIMIT_KEY = "translation_rate_limited_until"

export function isTranslationRateLimited(): boolean {
  if (typeof window === "undefined") return false
  
  // Always clear old rate limits on check - user has credits now
  const limitedUntil = localStorage.getItem(RATE_LIMIT_KEY)
  if (limitedUntil) {
    // Clear any rate limit that's older than 1 minute (stale from before credits were added)
    const limitTime = parseInt(limitedUntil, 10)
    if (Date.now() > limitTime || limitTime - Date.now() > 60000) {
      localStorage.removeItem(RATE_LIMIT_KEY)
      return false
    }
    return Date.now() < limitTime
  }
  return false
}

export function setTranslationRateLimited(): void {
  if (typeof window === "undefined") return
  // Rate limit for 5 minutes to match server-side cooldown
  localStorage.setItem(RATE_LIMIT_KEY, String(Date.now() + 300000))
}

export function clearTranslationRateLimit(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(RATE_LIMIT_KEY)
}

// Translation feature enabled - using Anthropic Claude instead of OpenAI
const ENABLE_TRANSLATION = true

export async function translateTextWithRateLimit(
  text: string, 
  targetLanguage: "en" | "de"
): Promise<{ translatedText: string; rateLimited: boolean; disabled?: boolean }> {
  // Translation is disabled - return original text
  if (!ENABLE_TRANSLATION) {
    return { translatedText: text, rateLimited: false, disabled: true }
  }
  
  if (!text || text.trim().length < 3) {
    return { translatedText: text, rateLimited: false }
  }
  
  // Check if we're rate limited before making the request
  if (isTranslationRateLimited()) {
    return { translatedText: text, rateLimited: true }
  }
  
  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLanguage }),
    })
    const data = await response.json()
    
    if (response.status === 429 || data.rateLimited) {
      setTranslationRateLimited()
      return { translatedText: text, rateLimited: true }
    }
    
    return { 
      translatedText: data.translatedText || text, 
      rateLimited: false 
    }
  } catch {
    return { translatedText: text, rateLimited: false }
  }
}

export function isTranslationDisabled(): boolean {
  return !ENABLE_TRANSLATION
}
