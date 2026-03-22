"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Check, Copy, ChevronDown, ChevronUp, Linkedin, FileText, Sparkles, Download, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

const COMBINED_PROMPT = (jobDescription: string, cvContent: string, outputLanguage: "en" | "de") => `I need you to tailor my CV to match this job description AND format it using a specific markdown syntax for a resume builder.

**OUTPUT LANGUAGE: ${outputLanguage === "de" ? "GERMAN (Deutsch)" : "ENGLISH"}**
- The entire CV content MUST be written in ${outputLanguage === "de" ? "German" : "English"}
- Section headers should be in ${outputLanguage === "de" ? "German (e.g., PROFIL, BERUFSERFAHRUNG, AUSBILDUNG, FÄHIGKEITEN, SPRACHEN)" : "English (e.g., PROFILE, EXPERIENCE, EDUCATION, SKILLS, LANGUAGES)"}
- All descriptions, bullet points, and content must be in ${outputLanguage === "de" ? "German" : "English"}

**STEP 1: TAILOR MY CV**
1. Analyze the job description and identify key requirements, skills, and keywords
2. Rewrite my CV content to highlight relevant experience and skills that match the job
3. Incorporate important keywords from the job description naturally into my CV
4. Ensure the CV is ATS-friendly (Applicant Tracking System optimized)
5. Keep all information truthful - do not fabricate experience or skills I don't have
6. Prioritize and reorder bullet points to emphasize the most relevant achievements
7. Use action verbs and quantifiable results where possible
8. **OUTPUT THE CV IN ${outputLanguage === "de" ? "GERMAN" : "ENGLISH"} as specified above**

**STEP 2: FORMAT THE OUTPUT AS CODE**
Output the entire CV in a code block so I can copy it easily. Use this EXACT markdown-style syntax:

**FORMATTING SYNTAX:**
\`# Text\` = Job Title or Degree Name (will be styled as: 18px, bold, uppercase, accent color)
\`## Text\` = Company or Institution Name (will be styled as: 16px, bold, black)
\`### Text\` = Date Range / Duration (will be styled as: 14px, regular, italic, gray)
\`- Text\` = Bullet Point Item (will be styled as: 14px, regular, with bullet marker)

**IMPORTANT RULES:**
- Section headers (PROFIL, EXPERIENCE, EDUCATION, SKILLS, etc.) should be in ALL CAPS without any prefix
- Each job/education entry needs: # for title, ## for company, ### for dates, then - for bullet points
- Keep bullet points concise and achievement-focused
- Do NOT use ** for bold or other markdown - ONLY use #, ##, ###, and -

**STRUCTURE:**
PROFIL
- Brief professional summary points (2-4 bullet points)

EXPERIENCE
# Job Title
## Company Name, Location
### Month Year – Month Year (or "today"/"heute")
- Achievement or responsibility
- Another achievement with metrics if possible

EDUCATION
# Degree Name
## University Name
### Year – Year
- Notable achievement or grade (optional)

SKILLS
- Skill category or individual skills as bullet points

LANGUAGES
- Language (Level)

**EXAMPLE OUTPUT:**
\`\`\`
PROFIL
- Senior Software Engineer with 8+ years of experience in full-stack development
- Expertise in microservices architecture and cloud-native applications
- Strong focus on performance optimization and team mentorship

EXPERIENCE

# Senior Software Engineer
## Google, Mountain View
### January 2020 – today
- Led development of microservices architecture serving 10M+ users
- Reduced API response time by 40% through optimization
- Mentored team of 5 junior developers

# Software Engineer
## Microsoft, Seattle
### June 2016 – December 2019
- Built real-time data processing pipeline handling 1M events/day
- Implemented CI/CD pipelines reducing deployment time by 60%

EDUCATION

# Master of Science – Computer Science
## Stanford University
### 2014 – 2016
- GPA: 3.9/4.0

SKILLS
- Languages: TypeScript, Python, Go, Java
- Cloud: AWS, GCP, Kubernetes, Docker
- Databases: PostgreSQL, MongoDB, Redis

LANGUAGES
- English (Native)
- German (B2)
\`\`\`

---

**Job Description:**
${jobDescription.trim() || "[PASTE JOB DESCRIPTION HERE]"}

**My Current CV:**
${cvContent.trim() || "[PASTE YOUR CV CONTENT HERE]"}`

interface GettingStartedGuideProps {
  defaultExpanded?: boolean
  onOpenResumeBuilder?: (resumeContent: string) => void
  // Update mode - when true, only updates resume content of existing version
  updateMode?: boolean
  onUpdateResumeContent?: (resumeContent: string, jobDescription: string) => void
  initialJobDescription?: string // Pre-fill job description in update mode
  onCancel?: () => void // Close the guide without making changes
  }
  
  export function GettingStartedGuide({ 
    defaultExpanded = true, 
    onOpenResumeBuilder,
    updateMode = false,
    onUpdateResumeContent,
    initialJobDescription = "",
    onCancel,
  }: GettingStartedGuideProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [copiedPrompt, setCopiedPrompt] = useState<"matching" | "formatting" | null>(null)
  const [jobDescription, setJobDescription] = useState(initialJobDescription)
  const [cvContent, setCvContent] = useState("")
  const [resumeContent, setResumeContent] = useState("")
  const [outputLanguage, setOutputLanguage] = useState<"en" | "de">("en")

  const copyToClipboard = async (text: string, type: "matching" | "formatting") => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPrompt(type)
      setTimeout(() => setCopiedPrompt(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const steps = [
    {
      number: 1,
      title: "Paste Your CV Content",
      description: (
        <>
          Open your CV (PDF or document), copy the text content, and paste it below. You can also export from{" "}
          <a
            href="https://www.linkedin.com/in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            LinkedIn
          </a>{" "}
          by clicking <strong>"More"</strong> then <strong>"Save to PDF"</strong>.
        </>
      ),
      icon: FileText,
      hasCVTextarea: true,
    },
    {
      number: 2,
      title: "Find a Job & Copy the Description",
      description: "Browse job listings and paste the full job description below:",
      icon: FileText,
      hasTextarea: true,
    },
    {
      number: 3,
      title: "Select CV Output Language",
      description: "Choose the language for your tailored CV:",
      icon: Globe,
      hasLanguageSelector: true,
    },
    {
      number: 4,
      title: "Use ChatGPT to Match & Format Your CV",
      description: cvContent.trim() && jobDescription.trim()
        ? "Copy this prompt (with your CV and job description included) and paste it into ChatGPT:"
        : cvContent.trim()
        ? "Copy this prompt (with your CV included) and paste it into ChatGPT, then add the job description:"
        : jobDescription.trim()
        ? "Copy this prompt (with your job description included) and paste it into ChatGPT, then add your CV:"
        : "Copy this prompt, paste it into ChatGPT, then add your CV and job description:",
      icon: Sparkles,
      prompt: COMBINED_PROMPT(jobDescription, cvContent, outputLanguage),
      promptType: "matching" as const,
    },
    {
      number: 5,
      title: "Paste Your Formatted Resume",
      description: "Copy the formatted response from ChatGPT and paste it below:",
      icon: FileText,
      hasResumeTextarea: true,
    },
    {
      number: 6,
      title: "Open Resume Builder",
      description: "Click the button below to open the resume formatter and customize your profile photo, company logo, accent color, and contact information.",
      icon: Download,
      hasOpenButton: true,
    },
  ]

  return (
    <Card className={updateMode ? "border-0 shadow-none" : "border-dashed"}>
      {!updateMode && (
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Getting Started Guide</CardTitle>
              <CardDescription>Learn how to create an ATS-optimized resume in minutes</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="bg-transparent">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
      )}

      {(isExpanded || updateMode) && (
        <CardContent className={updateMode ? "space-y-6 p-0" : "space-y-6"}>
          {steps.map((step) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {step.number}
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>

                {step.hasCVTextarea && (
                  <Textarea
                    placeholder="Paste your CV/resume content here..."
                    value={cvContent}
                    onChange={(e) => setCvContent(e.target.value)}
                    className="min-h-[150px] text-sm"
                  />
                )}

                {step.hasTextarea && (
                  <Textarea
                    placeholder="Paste the job description here for easy reference..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[120px] text-sm"
                  />
                )}

                {step.hasLanguageSelector && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="lg"
                      variant={outputLanguage === "en" ? "default" : "outline"}
                      onClick={() => setOutputLanguage("en")}
                      className={`flex-1 ${outputLanguage !== "en" ? "bg-transparent" : ""}`}
                    >
                      English
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant={outputLanguage === "de" ? "default" : "outline"}
                      onClick={() => setOutputLanguage("de")}
                      className={`flex-1 ${outputLanguage !== "de" ? "bg-transparent" : ""}`}
                    >
                      Deutsch (German)
                    </Button>
                  </div>
                )}

                {step.hasResumeTextarea && (
                  <Textarea
                    placeholder="Paste your formatted resume from ChatGPT here..."
                    value={resumeContent}
                    onChange={(e) => setResumeContent(e.target.value)}
                    className="min-h-[200px] text-sm font-mono"
                  />
                )}

  {step.hasOpenButton && (
  <div className="flex gap-2 mt-2">
    {updateMode && onCancel && (
      <Button
        size="lg"
        variant="outline"
        onClick={onCancel}
        className="bg-transparent"
      >
        Cancel
      </Button>
    )}
    <Button
      size="lg"
      disabled={!resumeContent.trim()}
      onClick={() => {
        // Save job description to sessionStorage for reuse in Resume Formatter and Cover Letter
        if (jobDescription.trim()) {
          sessionStorage.setItem("pendingJobDescription", jobDescription)
        }
        if (updateMode && onUpdateResumeContent) {
          // Update mode - only update resume content, preserve everything else
          onUpdateResumeContent(resumeContent, jobDescription)
        } else if (onOpenResumeBuilder) {
          onOpenResumeBuilder(resumeContent)
        }
      }}
    >
      {updateMode ? "Update Resume Content" : "See Resume"}
    </Button>
  </div>
  )}

                {step.prompt && (
                  <div className="relative">
                    <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {step.prompt}
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 gap-1.5"
                      onClick={() => copyToClipboard(step.prompt!, step.promptType!)}
                    >
                      {copiedPrompt === step.promptType ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Prompt
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="rounded-lg bg-muted/50 p-4 mt-6">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Pro Tip:</strong> The AI prompts are designed to keep your resume
              truthful while maximizing keyword matching. Never fabricate experience or skills - ATS systems and
              recruiters can detect inconsistencies.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
