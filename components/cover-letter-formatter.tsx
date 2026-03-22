"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Download, Copy, FileText, Bold } from "lucide-react"
import type { JobApplication, ResumeVersion } from "@/lib/types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface CoverLetterFormatterProps {
  job: JobApplication
  resumeVersions: ResumeVersion[]
  onUpdate: (updates: Partial<JobApplication>) => void
  onBack: () => void
}

export function CoverLetterFormatter({ job, resumeVersions, onUpdate, onBack }: CoverLetterFormatterProps) {
  const [language, setLanguage] = useState<"en" | "de">("en")
  const [contentEn, setContentEn] = useState(job.coverLetter?.contentEn || job.coverLetter?.content || "")
  const [contentDe, setContentDe] = useState(job.coverLetter?.contentDe || "")
  const [contactPersonName, setContactPersonName] = useState(job.contactPersonName || "")
  const [selectedResumeVersionId, setSelectedResumeVersionId] = useState(job.resumeVersionId || "")
  const [isSaving, setIsSaving] = useState(false)
  const [localJobDescription, setLocalJobDescription] = useState(job.jobDescription || "")
  const [showBackDialog, setShowBackDialog] = useState(false)
  
  // Track original values to detect changes
  const originalContentEn = job.coverLetter?.contentEn || job.coverLetter?.content || ""
  const originalContentDe = job.coverLetter?.contentDe || ""
  
  const hasUnsavedChanges = contentEn !== originalContentEn || contentDe !== originalContentDe
  
  // Load saved job description from sessionStorage on mount (from Getting Started guide)
  useEffect(() => {
    const savedJobDescription = sessionStorage.getItem("pendingJobDescription")
    if (savedJobDescription) {
      setLocalJobDescription(savedJobDescription)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const currentContent = language === "en" ? contentEn : contentDe
  const setCurrentContent = language === "en" ? setContentEn : setContentDe

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

    const formatted = text.split(/(\*\*.*?\*\*)/).map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const boldText = part.slice(2, -2)
        return <strong key={index}>{boldText}</strong>
      }
      return part
    })

    return formatted
  }

  const handleSave = () => {
    setIsSaving(true)
    onUpdate({
      contactPersonName,
      resumeVersionId: selectedResumeVersionId,
      coverLetter: {
        content: contentEn,
        contentEn,
        contentDe,
        lastModified: Date.now(),
      },
    })
    setTimeout(() => setIsSaving(false), 500)
  }
  
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
        backgroundColor: "#ffffff",
      })

      const imgData = canvas.toDataURL("image/jpeg", 0.95)

      const pageWidth = 210 // A4 width in mm
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pageWidth, imgHeight],
      })

      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST")

      const coverLetterLabel = language === "de" ? "Anschreiben" : "Cover Letter"
      const fileName = `${coverLetterLabel} - ${job.jobTitle} - Jennifer Simonds.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    }
  }

  const handleCopyPrompt = async () => {
    const selectedVersion = resumeVersions.find((v) => v.id === selectedResumeVersionId)
    const resumeReference = selectedVersion
      ? `\n\nRESUME VERSION TO REFERENCE:\nUse the resume version "${selectedVersion.name}" as the basis for this cover letter. Ensure all claims and qualifications mentioned in the cover letter are supported by and consistent with this resume version.`
      : "\n\nNOTE: No specific resume version selected for this application. Please select a resume version to ensure consistency."

    const strategyContext = job.jobStrategy?.intent
      ? `

IMPORTANT - JOB STRATEGY CONTEXT:
This cover letter must align with the following strategic framework:

Intent: ${job.jobStrategy.intent}
Strategic Fit: ${job.jobStrategy.strategicFit}
Positioning: ${job.jobStrategy.positioning}
Success Criteria: ${job.jobStrategy.successCriteria}
${job.jobStrategy.constraints ? `Constraints: ${job.jobStrategy.constraints}` : ""}

Please ensure the cover letter reflects this strategy and addresses these key points.${resumeReference}`
      : `\n\nNOTE: No job strategy defined yet. Consider creating one in the Job Strategy section first for better alignment.${resumeReference}`

    const resumeContent = selectedVersion?.resumeText || ""
    
    const prompt =
      language === "en"
        ? `Write a professional cover letter in English for the position of ${job.jobTitle} at ${job.company}.

JOB DESCRIPTION:
${localJobDescription || "[paste job description]"}
${resumeContent ? `
MY RESUME/CV (for reference - use this to tailor the cover letter):
${resumeContent}` : `
NOTE: Please select a resume version to include your CV content in this prompt.`}

Please write a compelling cover letter that highlights relevant skills and experience that match the job requirements.${strategyContext}`
        : `Schreibe ein professionelles Anschreiben auf Deutsch für die Position ${job.jobTitle} bei ${job.company}.

STELLENBESCHREIBUNG:
${localJobDescription || "[Stellenbeschreibung einfügen]"}
${resumeContent ? `
MEIN LEBENSLAUF (als Referenz - nutze diesen um das Anschreiben anzupassen):
${resumeContent}` : `
HINWEIS: Bitte wählen Sie eine Lebenslauf-Version aus, um Ihren Lebenslauf in diesen Prompt einzufügen.`}

Bitte schreibe ein überzeugendes Anschreiben, das relevante Fähigkeiten und Erfahrungen hervorhebt, die zu den Anforderungen passen.${strategyContext}`

    try {
      await navigator.clipboard.writeText(prompt)
      alert(language === "en" ? "Prompt copied to clipboard!" : "Prompt in Zwischenablage kopiert!")
    } catch (error) {
      // Fallback: show prompt in alert
      alert(`Failed to copy. Here's the prompt:\n\n${prompt.substring(0, 500)}...`)
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
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to your cover letter. Would you like to save them before going back?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardAndBack}>
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndBack}>
              Save & Go Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl">
          <div className="mb-8">
            <Button onClick={handleBackClick} variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Resume
            </Button>
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Cover Letter</h1>
              <p className="text-muted-foreground text-lg">
                {job.jobTitle} at {job.company}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Content</CardTitle>
                  <Tabs value={language} onValueChange={(val) => setLanguage(val as "en" | "de")}>
                    <TabsList>
                      <TabsTrigger value="en">English</TabsTrigger>
                      <TabsTrigger value="de">Deutsch</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="resume-version-select" className="text-sm font-medium">
                    {language === "en" ? "Resume Version to Reference" : "CV-Version zu verweisen"}
                  </label>
                  <Select value={selectedResumeVersionId} onValueChange={setSelectedResumeVersionId}>
                    <SelectTrigger id="resume-version-select">
                      <SelectValue placeholder={language === "en" ? "Select a resume version" : "CV-Version auswählen"} />
                    </SelectTrigger>
                    <SelectContent>
                      {resumeVersions.length > 0 ? (
                        resumeVersions.map((version) => (
                          <SelectItem key={version.id} value={version.id}>
                            {version.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          {language === "en" ? "No resume versions available" : "Keine CV-Versionen verfügbar"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {language === "en"
                      ? "Select which resume version this cover letter should align with"
                      : "Wählen Sie, mit welcher CV-Version dieses Anschreiben übereinstimmen soll"}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-select" className="text-sm font-medium">
                    {language === "en" ? "Contact Person (optional)" : "Kontaktperson (optional)"}
                  </label>
                  {job.contacts && job.contacts.length > 0 ? (
                    <Select value={contactPersonName} onValueChange={(value) => setContactPersonName(value)}>
                      <SelectTrigger id="contact-select">
                        <SelectValue placeholder={language === "en" ? "Select a contact" : "Kontakt auswählen"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {language === "en" ? "No specific contact" : "Keine spezifische Kontaktperson"}
                        </SelectItem>
                        {job.contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.name}>
                            {contact.name}
                            {contact.role && ` (${contact.role})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                      {language === "en"
                        ? "No contacts added yet. Add contacts first to select one here."
                        : "Noch keine Kontakte hinzugefügt. Fügen Sie zuerst Kontakte hinzu."}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {language === "en"
                      ? "If provided, the salutation will be 'Dear [Name] and Team'"
                      : "Falls angegeben, wird die Anrede 'Sehr geehrte/r [Name] und Team'"}
                  </p>
                </div>
              
                <div className="space-y-2">
                  <label htmlFor="job-description-textarea" className="text-sm font-medium">
                    {language === "en" ? "Job Description" : "Stellenbeschreibung"}
                  </label>
                  <Textarea
                    id="job-description-textarea"
                    value={localJobDescription}
                    onChange={(e) => setLocalJobDescription(e.target.value)}
                    placeholder={language === "en" 
                      ? "Paste the job description here. This will be used in the ChatGPT prompt..."
                      : "Fügen Sie die Stellenbeschreibung hier ein. Diese wird im ChatGPT-Prompt verwendet..."
                    }
                    rows={6}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === "en"
                      ? "Pre-filled from Getting Started guide. You can edit it here for this cover letter."
                      : "Vorausgefüllt aus dem Erste-Schritte-Leitfaden. Sie können es hier für dieses Anschreiben bearbeiten."}
                  </p>
                </div>
              
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button onClick={handleBoldText} variant="outline" size="sm" title="Bold (select text first)">
                      <Bold className="h-4 w-4 mr-1" />
                      Bold
                    </Button>
                    <p className="text-xs text-muted-foreground self-center">
                      Select text and click Bold, or use **text** for bold formatting
                    </p>
                  </div>
                  <Textarea
                    id="cover-letter-textarea"
                    value={currentContent}
                    onChange={(e) => setCurrentContent(e.target.value)}
                    placeholder={`Paste your ${language === "en" ? "English" : "German"} cover letter content here. Use **text** for bold formatting...`}
                    rows={20}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">ChatGPT Prompt</p>
                        <Button onClick={handleCopyPrompt} size="sm" variant="outline" className="bg-transparent">
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Copy Prompt
                        </Button>
                      </div>
                      <pre className="max-h-64 overflow-y-auto rounded-md bg-background border p-3 text-xs font-mono whitespace-pre-wrap">
                        <code>
                          {(() => {
                            const selectedVersion = resumeVersions.find((v) => v.id === selectedResumeVersionId)
                            const resumeContent = selectedVersion?.resumeText || ""
                            
                            const strategySection = job.jobStrategy?.intent
                              ? `

IMPORTANT - JOB STRATEGY CONTEXT:
This cover letter must align with the following strategic framework:

Intent: ${job.jobStrategy.intent}
Strategic Fit: ${job.jobStrategy.strategicFit}
Positioning: ${job.jobStrategy.positioning}
Success Criteria: ${job.jobStrategy.successCriteria}
${job.jobStrategy.constraints ? `Constraints: ${job.jobStrategy.constraints}` : ""}

Please ensure the cover letter reflects this strategy and addresses these key points.`
                              : ""
                            
                            const resumeReference = selectedVersion
                              ? `

RESUME VERSION TO REFERENCE:
Use the resume version "${selectedVersion.name}" as the basis for this cover letter. Ensure all claims and qualifications mentioned in the cover letter are supported by and consistent with this resume version.`
                              : "\n\nNOTE: No specific resume version selected for this application. Please select a resume version to ensure consistency."
                            
                            return language === "en"
                              ? `Write a professional cover letter in English for the position of ${job.jobTitle} at ${job.company}.

JOB DESCRIPTION:
${localJobDescription || "[paste job description]"}
${resumeContent ? `
MY RESUME/CV (for reference - use this to tailor the cover letter):
${resumeContent}` : `
NOTE: Please select a resume version above to include your CV content in this prompt.`}

Please write a compelling cover letter that highlights relevant skills and experience that match the job requirements.${strategySection}${resumeReference}`
                              : `Schreibe ein professionelles Anschreiben auf Deutsch für die Position ${job.jobTitle} bei ${job.company}.

STELLENBESCHREIBUNG:
${localJobDescription || "[Stellenbeschreibung einfügen]"}
${resumeContent ? `
MEIN LEBENSLAUF (als Referenz - nutze diesen um das Anschreiben anzupassen):
${resumeContent}` : `
HINWEIS: Bitte wählen Sie oben eine Lebenslauf-Version aus, um Ihren Lebenslauf in diesen Prompt einzufügen.`}

Bitte schreibe ein überzeugendes Anschreiben, das relevante Fähigkeiten und Erfahrungen hervorhebt, die zu den Anforderungen passen.${strategySection}${resumeReference}`
                          })()}
                        </code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={handleCopyToClipboard} variant="outline" className="flex-1 bg-transparent">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button onClick={handleDownloadPDF} variant="outline" className="flex-1 bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              <Card
                id="cover-letter-preview"
                className="bg-white text-black p-12 shadow-lg"
                style={{ minHeight: "297mm" }}
              >
                <CardContent className="p-0">
                  <div className="space-y-6">
                    {job.companyLogo && (
                      <div className="flex justify-end mb-4">
                        <img
                          src={job.companyLogo || "/placeholder.svg"}
                          alt={job.company}
                          className="h-16 w-auto object-contain"
                          style={{ maxWidth: "150px" }}
                        />
                      </div>
                    )}

                    <div className="text-sm leading-relaxed">
                      <p className="font-semibold">Jennifer Simonds</p>
                      <p>Berlin, Germany</p>
                      <p>info@jennifersimonds.com</p>
                      <p>+49 176 23859106</p>
                    </div>

                    <div className="text-sm">
                      <p>{today}</p>
                    </div>

                    <div className="text-sm leading-relaxed">
                      <p className="font-semibold">{job.company}</p>
                      {contactPersonName ? (
                        <p>{language === "en" ? `${contactPersonName} and Team` : `${contactPersonName} und Team`}</p>
                      ) : (
                        <p>{language === "en" ? "Hiring Manager" : "Personalabteilung"}</p>
                      )}
                    </div>

                    <div className="text-sm">
                      <p className="font-semibold mb-2">
                        {language === "en"
                          ? `Re: Application for ${job.jobTitle}`
                          : `Betreff: Bewerbung als ${job.jobTitle}`}
                      </p>
                    </div>

                    {contactPersonName && (
                      <div className="text-sm">
                        <p>
                          {language === "en"
                            ? `Dear ${contactPersonName} and Team,`
                            : `Sehr geehrte/r ${contactPersonName} und Team,`}
                        </p>
                      </div>
                    )}

                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {renderFormattedContent(currentContent)}
                    </div>

                    <div className="text-sm leading-relaxed">
                      <p>{language === "en" ? "Sincerely," : "Mit freundlichen Grüßen,"}</p>
                      <p className="mt-8 font-semibold">Jennifer Simonds</p>
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
