import { generateText } from "ai"
import { NextResponse } from "next/server"

// Simple in-memory rate limit tracking
let rateLimitedUntil = 0

export async function POST(request: Request) {
  let originalText = ""
  
  try {
    const { text, targetLanguage } = await request.json()
    originalText = text || ""

    if (!text || !targetLanguage) {
      return NextResponse.json({ translatedText: text || "", rateLimited: false })
    }

    // Skip translation if text is empty or very short
    if (text.trim().length < 3) {
      return NextResponse.json({ translatedText: text, rateLimited: false })
    }

    // If we're in a rate limit cooldown period, return original text immediately
    if (Date.now() < rateLimitedUntil) {
      return NextResponse.json({ translatedText: originalText, rateLimited: true })
    }

    const languageName = targetLanguage === "de" ? "German" : "English"
    const sourceLanguage = targetLanguage === "de" ? "English" : "German"

    const { text: translatedText } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Translate the following text from ${sourceLanguage} to ${languageName}. 
Keep the same tone, formatting, and structure. Only return the translated text, nothing else.

Text to translate:
${text}`,
    })

    return NextResponse.json({ translatedText: translatedText.trim(), rateLimited: false })
  } catch {
    // On rate limit or any error, set a 5-minute cooldown to prevent hammering the API
    rateLimitedUntil = Date.now() + 300000
    
    // Return original text so the UI continues to work (no error logging to reduce noise)
    return NextResponse.json({ 
      translatedText: originalText,
      rateLimited: true
    })
  }
}
