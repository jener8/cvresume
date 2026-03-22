"use client"

import { useEffect } from "react"

import { useState } from "react"

import { AccordionContent } from "@/components/ui/accordion"
import { AccordionTrigger } from "@/components/ui/accordion"
import { AccordionItem } from "@/components/ui/accordion"
import { Accordion } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Download, Copy, Bold, Save, Sparkles } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { CoverLetter, ResumeVersion, ContactInfo } from "@/lib/types"

interface StandaloneCoverLetterProps {
  coverLetter: CoverLetter
  resumeVersions: ResumeVersion[]
  onUpdate: (updates: Partial<CoverLetter>) => void
  onBack: () => void
  contactInfo?: ContactInfo // Contact info from CV to pre-fill applicant details
  jobDescription?: string // Job description from the linked job application
  resumeText?: string // Current resume text from the linked resume version
}

export function StandaloneCoverLetter({ coverLetter, resumeVersions, onUpdate, onBack, contactInfo, jobDescription: propJobDescription, resumeText: propResumeText }: StandaloneCoverLetterProps) {
  const [language, setLanguage] = useState<"en" | "de">(contactInfo?.language || "en")
  const [contentEn, setContentEn] = useState(coverLetter.contentEn)
  const [contentDe, setContentDe] = useState(coverLetter.contentDe)
  const [name, setName] = useState(coverLetter.name)
  const [contactPersonName, setContactPersonName] = useState(coverLetter.contactPersonName)
  // Use CV contact info if available, otherwise use defaults
  const [applicantName, setApplicantName] = useState(contactInfo?.name || "Jennifer Simonds")
  const [applicantAddress, setApplicantAddress] = useState(contactInfo?.address || "Berlin, Germany")
  const [applicantEmail, setApplicantEmail] = useState(contactInfo?.email || "info@jennifersimonds.com")
  const [applicantPhone, setApplicantPhone] = useState(contactInfo?.phone || "+49 176 23859106")
  const [recipientCompany, setRecipientCompany] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showChatGPTPrompt, setShowChatGPTPrompt] = useState(false)
  const [selectedResumeVersionId, setSelectedResumeVersionId] = useState("")
  // Use job description from prop (specific to this job application) or fall back to sessionStorage
  const [localJobDescription, setLocalJobDescription] = useState(propJobDescription || "")
  const [showBackDialog, setShowBackDialog] = useState(false)
  
  // Track original values to detect changes
  const originalContentEn = coverLetter.contentEn
  const originalContentDe = coverLetter.contentDe
  const hasUnsavedChanges = contentEn !== originalContentEn || contentDe !== originalContentDe
  
  // Use resume text from prop (the saved/tailored CV) or fall back to sessionStorage
  const [currentResumeText, setCurrentResumeText] = useState(propResumeText || "")
  
  // Load job description and resume text - prioritize props (from job application) over sessionStorage
  useEffect(() => {
    // Priority: prop (from specific job application) > sessionStorage (from getting started)
    if (propJobDescription) {
      setLocalJobDescription(propJobDescription)
    } else {
      const savedJobDescription = sessionStorage.getItem("pendingJobDescription")
      if (savedJobDescription) {
        setLocalJobDescription(savedJobDescription)
      }
    }
    
    // Priority: prop (saved/tailored CV) > sessionStorage
    if (propResumeText) {
      setCurrentResumeText(propResumeText)
    } else {
      const savedResumeText = sessionStorage.getItem("coverLetterResumeText")
      if (savedResumeText) {
        setCurrentResumeText(savedResumeText)
      }
    }
    
    // Get resume version ID from sessionStorage (set when coming from Resume Builder)
    const savedResumeVersionId = sessionStorage.getItem("coverLetterResumeVersionId")
    if (savedResumeVersionId && resumeVersions.some(v => v.id === savedResumeVersionId)) {
      setSelectedResumeVersionId(savedResumeVersionId)
    } else if (resumeVersions.length > 0) {
      setSelectedResumeVersionId(resumeVersions[0].id)
    }
  }, [resumeVersions, propJobDescription, propResumeText])
  
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowBackDialog(true)
    } else {
      onBack()
    }
  }
  
  const handleSaveAndBack = () => {
    handleSave()
    setShowBackDialog(false)
    onBack()
  }
  
  const handleDiscardAndBack = () => {
    setShowBackDialog(false)
    onBack()
  }

  const currentContent = language === "en" ? contentEn : contentDe
  const setCurrentContent = language === "en" ? setContentEn : setContentDe

  const generateChatGPTPrompt = () => {
    // Use the current resume text from sessionStorage (set by Resume Builder)
    // or fall back to the selected version's resume text
    const selectedVersion = resumeVersions.find((v) => v.id === selectedResumeVersionId)
    const resumeContent = currentResumeText || selectedVersion?.resumeText || ""
    
    // Generate prompt in the selected language
    if (language === "de") {
      return `Ich brauche ein professionelles Anschreiben basierend auf den folgenden Informationen:

**Mein Lebenslauf:**
${resumeContent || "[LEBENSLAUF HIER EINFUEGEN]"}

**Stellenbeschreibung:**
${localJobDescription || "[STELLENBESCHREIBUNG HIER EINFUEGEN]"}

**Zusaetzliche Informationen:**
- Bewerber: ${applicantName}
- Ansprechpartner: ${contactPersonName || "Nicht angegeben"}
- Unternehmen: ${recipientCompany || "Nicht angegeben"}

**Anweisungen:**
Bitte schreiben Sie ein ueberzeugendes Anschreiben, das:
1. Relevante Erfahrungen aus meinem Lebenslauf hervorhebt, die zu den Stellenanforderungen passen
2. Begeisterung fuer die Position und das Unternehmen zeigt
3. Verstaendnis fuer die Rolle demonstriert
4. Einen professionellen, aber persoenlichen Ton beibehält
5. Auf Deutsch geschrieben ist
6. **Fettdruck** fuer wichtige Erfolge oder Faehigkeiten verwendet (Format: **Text**)
7. Ungefaehr 3-4 Absaetze lang ist

Bitte geben Sie nur den Haupttext des Anschreibens an (keine Kopfzeile, keine Anrede, keine Schlussformel - nur die Hauptabsaetze).`
    }
    
    // English prompt (default)
    return `I need you to write a professional cover letter based on the following information:

**My CV/Resume:**
${resumeContent || "[PASTE YOUR CV/RESUME HERE]"}

**Job Description:**
${localJobDescription || "[PASTE THE JOB DESCRIPTION HERE]"}

**Additional Information:**
- Applicant Name: ${applicantName}
- Contact Person: ${contactPersonName || "Not specified"}
- Company: ${recipientCompany || "Not specified"}

**Instructions:**
Please write a compelling cover letter that:
1. Highlights relevant experience from my CV that matches the job requirements
2. Shows enthusiasm for the position and company
3. Demonstrates understanding of the role
4. Maintains a professional yet personable tone
5. Is written in English
6. Uses **bold text** for key achievements or skills (format: **text**)
7. Is approximately 3-4 paragraphs long

Please provide only the body text of the cover letter (no header, no salutation, no closing signature - just the main content paragraphs).`
  }

  const handleCopyChatGPTPrompt = async () => {
    const prompt = generateChatGPTPrompt()
    await navigator.clipboard.writeText(prompt)
    alert("ChatGPT prompt copied to clipboard! Paste it into ChatGPT and add your CV and job description.")
  }

  const handleBoldText = () => {
    const textarea = document.getElementById("cover-letter-textarea") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = currentContent.substring(start, end)

    if (selectedText) {
      const newContent = currentContent.substring(0, start) + `**${selectedText}**` + currentContent.substring(end)
      setCurrentContent(newContent)

      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + 2, end + 2)
      }, 0)
    }
  }

  const renderFormattedContent = (text: string) => {
    if (!text) return "Your cover letter content will appear here..."

    return text.split(/(\*\*.*?\*\*)/).map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const boldText = part.slice(2, -2)
        return <strong key={index}>{boldText}</strong>
      }
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      )
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    await onUpdate({
      name,
      contentEn,
      contentDe,
      contactPersonName,
    })
    setIsSaving(false)
    alert("Cover letter saved successfully!")
  }

  const handleCopyToClipboard = async () => {
    const formattedText = document.getElementById("cover-letter-preview")?.innerText
    if (formattedText) {
      await navigator.clipboard.writeText(formattedText)
      alert("Cover letter copied to clipboard!")
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const element = document.getElementById("cover-letter-preview")
      if (!element) {
        alert("Could not find cover letter to export")
        return
      }

      const html2canvas = (await import("html2canvas")).default
      const jsPDF = (await import("jspdf")).default

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      pdf.save(`${name || "cover-letter"}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    }
  }

  const today = new Date().toLocaleDateString(language === "en" ? "en-US" : "de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <>
      <AlertDialog open={showBackDialog} onOpenChange={setShowBackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Cover Letter?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to your cover letter. Would you like to save them before going back?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardAndBack}>
              No, Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndBack}>
              Yes, Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button onClick={handleBackClick} variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Resume
          </Button>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Cover Letter Builder</h1>
            <p className="text-muted-foreground text-lg">Create a tailored cover letter for your application</p>
            
            {/* Language Toggle - affects ChatGPT prompt and all sections */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="text-sm text-muted-foreground">Language:</span>
              <Tabs value={language} onValueChange={(v) => setLanguage(v as "en" | "de")}>
                <TabsList className="h-8">
                  <TabsTrigger value="en" className="text-sm px-3 h-7">English</TabsTrigger>
                  <TabsTrigger value="de" className="text-sm px-3 h-7">Deutsch</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Input Column - 1 column width with accordion */}
            <div className="lg:col-span-1 space-y-4">
              <Accordion type="multiple" defaultValue={["generate", "edit"]} className="space-y-4">
                <AccordionItem value="generate" className="border rounded-lg bg-purple-50/50 border-purple-200">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold">Generate with ChatGPT</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3">
                      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Click "Copy Prompt" - CV & job description included</li>
                        <li>Paste into ChatGPT and submit</li>
                        <li>Copy result back here</li>
                      </ol>
                      <div className={`text-xs px-2 py-1.5 rounded-md text-center font-medium ${
                        language === "de" 
                          ? "bg-amber-100 text-amber-800 border border-amber-200" 
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}>
                        {language === "de" 
                          ? "Prompt auf Deutsch - Anschreiben wird auf Deutsch generiert" 
                          : "Prompt in English - Cover letter will be generated in English"}
                      </div>
                      <Button onClick={handleCopyChatGPTPrompt} className="w-full" size="sm">
                        <Copy className="mr-2 h-3 w-3" />
                        Copy ChatGPT Prompt
                      </Button>
                      <Button
                        onClick={() => setShowChatGPTPrompt(!showChatGPTPrompt)}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        {showChatGPTPrompt ? "Hide Prompt" : "Show Prompt"}
                      </Button>
                      {showChatGPTPrompt && (
                        <Textarea
                          value={generateChatGPTPrompt()}
                          readOnly
                          className="min-h-[200px] font-mono text-xs bg-white"
                        />
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="details" className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <span className="font-semibold text-sm">Cover Letter Details</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="letter-name" className="text-xs">Name</Label>
                        <Input
                          id="letter-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g., Software Engineer"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-person" className="text-xs">Contact Person</Label>
                        <Input
                          id="contact-person"
                          value={contactPersonName}
                          onChange={(e) => setContactPersonName(e.target.value)}
                          placeholder="e.g., John Smith"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="your-info" className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <span className="font-semibold text-sm">Your Information</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="applicant-name" className="text-xs">Full Name</Label>
                        <Input
                          id="applicant-name"
                          value={applicantName}
                          onChange={(e) => setApplicantName(e.target.value)}
                          placeholder="Your full name"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="applicant-address" className="text-xs">Address (one line per row)</Label>
                        <Textarea
                          id="applicant-address"
                          value={applicantAddress}
                          onChange={(e) => setApplicantAddress(e.target.value)}
                          placeholder={"Street Name 123\n12345 City\nCountry"}
                          className="text-sm min-h-[72px] resize-none"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="applicant-email" className="text-xs">Email</Label>
                        <Input
                          id="applicant-email"
                          value={applicantEmail}
                          onChange={(e) => setApplicantEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="applicant-phone" className="text-xs">Phone</Label>
                        <Input
                          id="applicant-phone"
                          value={applicantPhone}
                          onChange={(e) => setApplicantPhone(e.target.value)}
                          placeholder="+49 123 456789"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="recipient" className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <span className="font-semibold text-sm">Recipient</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div>
                      <Label htmlFor="recipient-company" className="text-xs">Company Name</Label>
                      <Input
                        id="recipient-company"
                        value={recipientCompany}
                        onChange={(e) => setRecipientCompany(e.target.value)}
                        placeholder="Company name"
                        className="h-8 text-sm"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="edit" className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <span className="font-semibold text-sm">Edit Cover Letter</span>
                  </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Button onClick={handleBoldText} variant="outline" size="sm">
                            <Bold className="h-3 w-3 mr-1" />
                            Bold
                          </Button>
                          <span className="ml-2 text-xs text-muted-foreground">
                            Editing: {language === "en" ? "English" : "German"} version
                          </span>
                        </div>
                        <Textarea
                        id="cover-letter-textarea"
                        value={currentContent}
                        onChange={(e) => setCurrentContent(e.target.value)}
                        placeholder="Write your cover letter here... Use **text** for bold."
                        className="min-h-[250px] font-mono text-xs"
                      />
                      <Button onClick={handleSave} disabled={isSaving} className="w-full" size="sm">
                        <Save className="mr-2 h-3 w-3" />
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Preview Column - 3 columns width */}
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Preview</CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={handleCopyToClipboard} variant="outline" size="sm">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    id="cover-letter-preview"
                    className="bg-white text-black p-8 rounded-lg min-h-[400px] shadow-sm space-y-6"
                    style={{ fontFamily: "Georgia, serif", lineHeight: "1.6", fontSize: "14px" }}
                  >
                {/* Sender Information */}
                <div className="text-sm leading-relaxed">
                  <p className="font-semibold">{applicantName}</p>
                  {applicantAddress.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                  <p>{applicantEmail}</p>
                  <p>{applicantPhone}</p>
                </div>

                    {/* Date */}
                    <div className="text-sm">
                      <p>{today}</p>
                    </div>

                    {/* Recipient Information */}
                    <div className="text-sm leading-relaxed">
                      {recipientCompany && <p className="font-semibold">{recipientCompany}</p>}
                      {contactPersonName ? (
                        <p>{language === "en" ? `${contactPersonName} and Team` : `${contactPersonName} und Team`}</p>
                      ) : (
                        <p>{language === "en" ? "Hiring Manager" : "Personalabteilung"}</p>
                      )}
                    </div>

                    {/* Salutation */}
                    {contactPersonName && (
                      <div className="text-sm">
                        <p>
                          {language === "en"
                            ? `Dear ${contactPersonName} and Team,`
                            : `Sehr geehrte/r ${contactPersonName} und Team,`}
                        </p>
                      </div>
                    )}
                    {!contactPersonName && (
                      <div className="text-sm">
                        <p>{language === "en" ? "Dear Hiring Manager," : "Sehr geehrte Damen und Herren,"}</p>
                      </div>
                    )}

                    {/* Cover Letter Content */}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {renderFormattedContent(currentContent)}
                    </div>

                    {/* Closing */}
                    <div className="text-sm">
                      <p>{language === "en" ? "Sincerely," : "Mit freundlichen Grüßen,"}</p>
                      <p className="mt-8">{applicantName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
