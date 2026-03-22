"use client"

import React from "react"

import { useRef } from "react"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import type { ResumeVersion, JobApplication, User, CoverLetter, FitScore, RedFlag, FolderContactInfo } from "@/lib/types"
import { type Language, getTranslation, getFitScoreTypeLabel, getStatusLabel } from "@/lib/translations"
import {
  PlusCircle,
  FileText,
  Trash2,
  Briefcase,
  FileEdit,
  MessageSquare,
  Building2,
  ExternalLink,
  Target,
  Sparkles,
  Download,
  Upload,
  ArrowLeft,
  Pencil,
  User as UserIcon,
  Settings,
  Star,
  AlertTriangle,
  Plus,
  X,
  Globe,
  RefreshCw,
  Info,
} from "lucide-react"
import { ProfileMenu } from "@/components/profile-menu"
import { GettingStartedGuide } from "@/components/getting-started-guide"
import { ApplicationCreationWizard } from "@/components/application-creation-wizard"

import { translateTextWithRateLimit, isTranslationRateLimited, clearTranslationRateLimit } from "@/lib/utils"

interface DashboardProps {
  user?: User // Added user prop for UserMenu
  versions: ResumeVersion[]
  jobApplications: JobApplication[] // Changed from 'jobs'
  coverLetters?: CoverLetter[] // Added coverLetters prop
  onCreateNew: () => void
  onCreateCoverLetter: () => void // Added onCreateCoverLetter prop
  onLoadVersion: (version: ResumeVersion) => void
  onDeleteVersion: (id: string) => void
  onRenameVersion?: (id: string, newName: string) => void // Added onRenameVersion prop
  onCreateJobApplication: (newApplication: Omit<JobApplication, "id">) => void
  onOpenCoverLetter: (jobId: string) => void
  onOpenInterviewPrep: (jobId: string) => void
  onOpenCompanyInfo: (jobId: string) => void
  onOpenContacts: (jobId: string) => void
  onOpenJobStrategy: (jobId: string) => void
  onDeleteJobApplication: (id: string) => void
  onUpdateJobStatus: (id: string, updates: Partial<JobApplication>) => void
  onUpdateJob: (id: string, updates: Partial<JobApplication>) => void
  onExportAll?: () => void // Added export all handler
  onImportAll?: () => void // Added import all handler
  onRefresh?: () => void // Refresh data from database
  onSaveProfile?: (name: string, email: string, password: string) => void
  onBack?: () => void // Added onBack prop to navigate back to folders
  userName?: string
  userEmail?: string
  profileImage?: string | null // Added profileImage prop from CV
  onDeleteCoverLetter: (id: string) => void // Added onDeleteCoverLetter prop
  folderName?: string // Name of the current folder/workspace
  folderProfileImage?: string | null // Profile image from the folder
  folderContactInfo?: FolderContactInfo | null // Contact info from the folder
  onUpdateFolder?: (updates: { name?: string; profileImage?: string | null; contactInfo?: Partial<FolderContactInfo> }) => void
}

export function Dashboard({
  user, // Accept user prop
  versions,
  jobApplications, // Changed from 'jobs'
  coverLetters, // Accept coverLetters prop
  onCreateNew,
  onCreateCoverLetter, // Accept onCreateCoverLetter prop
  onLoadVersion,
  onDeleteVersion,
  onRenameVersion, // Accept onRenameVersion prop
  onCreateJobApplication,
  onOpenCoverLetter,
  onOpenInterviewPrep,
  onOpenCompanyInfo,
  onOpenContacts,
  onOpenJobStrategy,
  onDeleteJobApplication,
  onUpdateJobStatus,
  onUpdateJob,
  onExportAll, // Added export all prop
  onImportAll, // Added import all prop
  onRefresh, // Refresh data from database
  onSaveProfile,
  onBack, // Accept onBack prop
  userName,
  userEmail,
  profileImage, // Accept profileImage prop
  onDeleteCoverLetter, // Accept onDeleteCoverLetter prop
  folderName, // Accept folder name
  folderProfileImage, // Accept folder profile image
  folderContactInfo, // Accept folder contact info
  onUpdateFolder, // Callback to update folder settings
}: DashboardProps) {
  const [language, setLanguage] = useState<Language>("en")
  const t = (key: keyof typeof import("@/lib/translations").translations.en) => getTranslation(language, key)
  
  // Translation cache to store translated content
  const [translatedContent, setTranslatedContent] = useState<Record<string, { en: string; de: string }>>({})
  const [isTranslating, setIsTranslating] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(false)

  // Clear any stale rate limit on mount and check status periodically
  useEffect(() => {
    // Clear stale rate limit from previous sessions
    clearTranslationRateLimit()
    setIsRateLimited(false)
    
    const checkRateLimit = () => setIsRateLimited(isTranslationRateLimited())
    const interval = setInterval(checkRateLimit, 5000)
    return () => clearInterval(interval)
  }, [])

  // Function to translate text using shared utility
  const translateText = async (text: string, targetLanguage: Language): Promise<string> => {
    const result = await translateTextWithRateLimit(text, targetLanguage)
    if (result.rateLimited) {
      setIsRateLimited(true)
    }
    return result.translatedText
  }

  // Get content with translation support
  const getTranslatedContent = (jobId: string, field: string, originalContent: string): string => {
    // For red flags, the field already contains the full key suffix (e.g., "redflag-123-question")
    const key = field.startsWith("redflag-") ? `${jobId}-${field}` : `${jobId}-${field}`
    const cached = translatedContent[key]
    if (cached && cached[language]) {
      return cached[language]
    }
    return originalContent
  }

  // Handle language change with translation
  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === language) return
    setIsTranslating(true)
    
    // Translate all job content
    const newTranslations: Record<string, { en: string; de: string }> = { ...translatedContent }
    
    for (const job of jobApplications) {
      const fieldsToTranslate = [
        { field: "jobDescriptionSummary", content: job.jobDescriptionSummary },
        { field: "strategySummary", content: job.strategySummary },
        { field: "why", content: job.why },
        { field: "jobDescription", content: job.jobDescription },
      ]
      
      for (const { field, content } of fieldsToTranslate) {
        if (!content || content.trim().length < 3) continue
        const key = `${job.id}-${field}`
        
        // If we don't have this translation cached
        if (!newTranslations[key]) {
          // Store original in current language
          newTranslations[key] = { en: "", de: "" }
          newTranslations[key][language] = content
        }
        
        // If we don't have the target language translation
        if (!newTranslations[key][newLanguage]) {
          const translated = await translateText(content, newLanguage)
          newTranslations[key][newLanguage] = translated
        }
      }

    }
    
    setTranslatedContent(newTranslations)
    setLanguage(newLanguage)
    setIsTranslating(false)
  }

  const [showNewJobDialog, setShowNewJobDialog] = useState(false)
  const [viewJobDescriptionId, setViewJobDescriptionId] = useState<string | null>(null)
  const [isEditingJobDescription, setIsEditingJobDescription] = useState(false)
  const [editedJobDescription, setEditedJobDescription] = useState("")
  const [editedJobDescriptionUrl, setEditedJobDescriptionUrl] = useState("")
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [editedCompanyName, setEditedCompanyName] = useState("")
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null)
  const [editedSalary, setEditedSalary] = useState("")
  const [editedEmploymentType, setEditedEmploymentType] = useState<
    "full-time" | "part-time" | "contract" | "freelance"
  >("full-time")
  const [newJobData, setNewJobData] = useState({
    jobTitle: "",
    company: "",
    jobDescription: "",
    jobDescriptionSummary: "",
    jobDescriptionUrl: "",
    resumeVersionId: "",
    coverLetterId: "",
  })
  const [uploadedResumeFile, setUploadedResumeFile] = useState<File | null>(null)
  const [uploadedCoverLetterFile, setUploadedCoverLetterFile] = useState<File | null>(null)
  const [editUploadedResumeFile, setEditUploadedResumeFile] = useState<File | null>(null)
  const [editUploadedCoverLetterFile, setEditUploadedCoverLetterFile] = useState<File | null>(null)
  const [editedJobDescriptionSummary, setEditedJobDescriptionSummary] = useState("")
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null)
  const [editedSummary, setEditedSummary] = useState("")
  const [editingWhyId, setEditingWhyId] = useState<string | null>(null)
  const [editedWhy, setEditedWhy] = useState("")

  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [editedJobData, setEditedJobData] = useState({
    jobTitle: "",
    company: "",
    jobDescription: "",
    jobDescriptionUrl: "",
    resumeVersionId: "",
    coverLetterId: "",
    appliedDate: Date.now(),
  })

  const [editingResumeId, setEditingResumeId] = useState<string | null>(null)
  const [editedResumeName, setEditedResumeName] = useState("")
  
  // Application creation wizard state
  const [showApplicationWizard, setShowApplicationWizard] = useState(false)
  
  // Folder settings edit dialog
  const [showFolderSettingsDialog, setShowFolderSettingsDialog] = useState(false)
  const [editFolderName, setEditFolderName] = useState(folderName || "")
  const [editFolderProfileImage, setEditFolderProfileImage] = useState<string | null>(folderProfileImage || null)
  const [editFolderContactInfo, setEditFolderContactInfo] = useState<FolderContactInfo>({
    name: folderContactInfo?.name || "",
    email: folderContactInfo?.email || "",
    phone: folderContactInfo?.phone || "",
    address: folderContactInfo?.address || "",
    linkedin: folderContactInfo?.linkedin || "",
    citizenship: folderContactInfo?.citizenship || "",
    portfolio: folderContactInfo?.portfolio || "",
    professionalTitle: folderContactInfo?.professionalTitle || "",
    language: folderContactInfo?.language || "en",
  })
  const folderImageInputRef = useRef<HTMLInputElement>(null)
  const [pendingApplicationName, setPendingApplicationName] = useState<string | null>(null)

  // Fit scores state
  const [editingFitScoreJobId, setEditingFitScoreJobId] = useState<string | null>(null)
  const [editingFitScoreType, setEditingFitScoreType] = useState<"culture" | "ambitions" | "skills" | "strategy" | null>(null)
  const [editedFitScore, setEditedFitScore] = useState<number>(3)
  const [editedFitSummary, setEditedFitSummary] = useState("")

  // Red flags state
  const [editingRedFlagsJobId, setEditingRedFlagsJobId] = useState<string | null>(null)
  const [editedRedFlags, setEditedRedFlags] = useState<RedFlag[]>([])
  const [newRedFlagQuestion, setNewRedFlagQuestion] = useState("")
  const [newRedFlagAnswer, setNewRedFlagAnswer] = useState("")
  const [editingFlagId, setEditingFlagId] = useState<string | null>(null)
  const [editingFlagQuestion, setEditingFlagQuestion] = useState("")
  const [editingFlagAnswer, setEditingFlagAnswer] = useState("")

  // Folder settings handlers
  const handleOpenFolderSettings = () => {
    setEditFolderName(folderName || "")
    setEditFolderProfileImage(folderProfileImage || null)
    setEditFolderContactInfo({
      name: folderContactInfo?.name || "",
      email: folderContactInfo?.email || "",
      phone: folderContactInfo?.phone || "",
      address: folderContactInfo?.address || "",
      linkedin: folderContactInfo?.linkedin || "",
      citizenship: folderContactInfo?.citizenship || "",
      portfolio: folderContactInfo?.portfolio || "",
      professionalTitle: folderContactInfo?.professionalTitle || "",
      language: folderContactInfo?.language || "en",
    })
    setShowFolderSettingsDialog(true)
  }

  const handleFolderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditFolderProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveFolderSettings = () => {
    if (onUpdateFolder) {
      onUpdateFolder({
        name: editFolderName,
        profileImage: editFolderProfileImage,
        contactInfo: editFolderContactInfo,
      })
    }
    setShowFolderSettingsDialog(false)
  }

  const handleStartEditJob = (job: JobApplication) => {
    setEditingJobId(job.id)
    setEditedJobData({
      jobTitle: job.jobTitle || "",
      company: job.company || "",
      jobDescription: job.jobDescription || "",
      jobDescriptionUrl: job.jobDescriptionUrl || "",
      resumeVersionId: job.resumeVersionId || "",
      coverLetterId: job.coverLetterId || "",
      appliedDate: job.appliedDate || Date.now(),
    })
  }

  const handleSaveJob = (jobId: string) => {
    onUpdateJob(jobId, editedJobData)
    setEditingJobId(null)
    setEditUploadedResumeFile(null)
    setEditUploadedCoverLetterFile(null)
  }

  const handleCancelEditJob = () => {
    setEditingJobId(null)
    setEditUploadedResumeFile(null)
    setEditUploadedCoverLetterFile(null)
  }

  // Fit Score handlers
  const handleStartEditFitScore = (jobId: string, type: "culture" | "ambitions" | "skills" | "strategy", job: JobApplication) => {
    setEditingFitScoreJobId(jobId)
    setEditingFitScoreType(type)
    const existingScore = job.fitScores?.[type]
    setEditedFitScore(existingScore?.score || 3)
    setEditedFitSummary(existingScore?.summary || "")
  }

  const handleSaveFitScore = (jobId: string) => {
    const job = jobApplications.find(j => j.id === jobId)
    if (!job || !editingFitScoreType) return
    
    const updatedFitScores = {
      ...job.fitScores,
      [editingFitScoreType]: {
        score: editedFitScore,
        summary: editedFitSummary,
      }
    }
    onUpdateJob(jobId, { fitScores: updatedFitScores })
    setEditingFitScoreJobId(null)
    setEditingFitScoreType(null)
  }

  const handleCancelEditFitScore = () => {
    setEditingFitScoreJobId(null)
    setEditingFitScoreType(null)
    setEditedFitScore(3)
    setEditedFitSummary("")
  }

  // Red Flags handlers
  const handleStartEditRedFlags = (jobId: string, job: JobApplication) => {
    setEditingRedFlagsJobId(jobId)
    setEditedRedFlags(job.redFlags || [])
    setNewRedFlagQuestion("")
    setNewRedFlagAnswer("")
  }

  const handleAddRedFlag = () => {
    if (!newRedFlagQuestion.trim()) return
    const newFlag: RedFlag = {
      id: crypto.randomUUID(),
      question: newRedFlagQuestion.trim(),
      answer: newRedFlagAnswer.trim() || undefined,
    }
    setEditedRedFlags([...editedRedFlags, newFlag])
    setNewRedFlagQuestion("")
    setNewRedFlagAnswer("")
  }

  const handleRemoveRedFlag = (flagId: string) => {
    setEditedRedFlags(editedRedFlags.filter(f => f.id !== flagId))
  }

  const handleStartEditFlag = (flag: RedFlag) => {
    setEditingFlagId(flag.id)
    setEditingFlagQuestion(flag.question)
    setEditingFlagAnswer(flag.answer || "")
  }

  const handleSaveEditFlag = () => {
    if (!editingFlagId || !editingFlagQuestion.trim()) return
    setEditedRedFlags(editedRedFlags.map(f => 
      f.id === editingFlagId 
        ? { ...f, question: editingFlagQuestion.trim(), answer: editingFlagAnswer.trim() || undefined }
        : f
    ))
    setEditingFlagId(null)
    setEditingFlagQuestion("")
    setEditingFlagAnswer("")
  }

  const handleCancelEditFlag = () => {
    setEditingFlagId(null)
    setEditingFlagQuestion("")
    setEditingFlagAnswer("")
  }

  const handleSaveRedFlags = (jobId: string) => {
    onUpdateJob(jobId, { redFlags: editedRedFlags })
    setEditingRedFlagsJobId(null)
  }

  const handleCancelEditRedFlags = () => {
    setEditingRedFlagsJobId(null)
    setEditedRedFlags([])
    setNewRedFlagQuestion("")
    setNewRedFlagAnswer("")
  }

  const getFitScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600 bg-green-100"
    if (score >= 3) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const extractDomain = (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace(/^www\./, "")
    } catch {
      return url
    }
  }

  const handleCreateJob = () => {
    if (!newJobData.jobTitle || !newJobData.company) {
      alert("Please fill in all required fields (Job Title and Company)")
      return
    }

    const newApplication: Omit<JobApplication, "id"> = {
      jobTitle: newJobData.jobTitle,
      company: newJobData.company,
      jobDescription: newJobData.jobDescription,
      jobDescriptionSummary: newJobData.jobDescriptionSummary,
      jobDescriptionUrl: newJobData.jobDescriptionUrl,
      resumeVersionId: newJobData.resumeVersionId,
      coverLetterId: newJobData.coverLetterId || "",
      companyInfo: {
        website: "",
        researchNotes: "",
        linkedInContacts: [],
        lastModified: Date.now(),
      },
      contacts: [],
      coverLetter: {
        content: "",
        lastModified: Date.now(),
      },
      interviewPrep: {
        questions: [],
        personalDescription: "",
        interviewers: [],
        generalNotes: "",
        lastModified: Date.now(),
      },
      status: "applied",
      appliedDate: Date.now(),
      lastModified: Date.now(),
      salaryExpectation: "",
      employmentType: "full-time",
      why: "",
    }

    onCreateJobApplication(newApplication)
    setShowNewJobDialog(false)
    setNewJobData({
      jobTitle: "",
      company: "",
      jobDescription: "",
      jobDescriptionSummary: "",
      jobDescriptionUrl: "",
      resumeVersionId: "",
      coverLetterId: "",
    })
    setUploadedResumeFile(null)
    setUploadedCoverLetterFile(null)
  }

  const getStatusColor = (status: JobApplication["status"]) => {
    switch (status) {
      case "applied":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "interview":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      case "offer":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "withdrawn":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const handleStartEditCompany = (jobId: string, companyName: string) => {
    setEditingCompanyId(jobId)
    setEditedCompanyName(companyName)
  }

  const handleSaveCompanyName = (jobId: string) => {
    if (editedCompanyName.trim()) {
      onUpdateJobStatus(jobId, { company: editedCompanyName.trim() })
    }
    setEditingCompanyId(null)
    setEditedCompanyName("")
  }

  const handleCancelEditCompany = () => {
    setEditingCompanyId(null)
    setEditedCompanyName("")
  }

  const handleStartEditSalary = (jobId: string, salary?: string, employmentType?: string) => {
    setEditingSalaryId(jobId)
    setEditedSalary(salary || "")
    setEditedEmploymentType((employmentType as any) || "full-time")
  }

  const handleSaveSalary = (jobId: string) => {
    onUpdateJob(jobId, {
      salaryExpectation: editedSalary.trim() || undefined,
      employmentType: editedEmploymentType,
    })
    setEditingSalaryId(null)
    setEditedSalary("")
  }

  const handleCancelEditSalary = () => {
    setEditingSalaryId(null)
    setEditedSalary("")
  }

  const handleStartEditWhy = (jobId: string, currentWhy: string) => {
    setEditingWhyId(jobId)
    setEditedWhy(currentWhy || "")
  }

  const handleSaveWhy = (jobId: string) => {
    onUpdateJob(jobId, {
      why: editedWhy.trim() || undefined,
    })
    setEditingWhyId(null)
    setEditedWhy("")
  }

  const handleCancelEditWhy = () => {
    setEditingWhyId(null)
    setEditedWhy("")
  }

  const handleGenerateWhyPrompt = (job: JobApplication) => {
    const resumeVersion = versions?.find((v) => v.id === job.resumeVersionId)
    const resumeName = resumeVersion?.name || "No resume selected"
    const resumeContent = resumeVersion?.resumeText || ""

    const strategyContext = job.jobStrategy
      ? `
Job Strategy:
- Intent: ${job.jobStrategy.intent}
- Strategic Fit: ${job.jobStrategy.strategicFit}
- Positioning: ${job.jobStrategy.positioning}
- Success Criteria: ${job.jobStrategy.successCriteria}
`
      : ""

    const prompt = `Based on the following information, create ONE powerful, motivating sentence that captures why I'm applying for this role. This sentence should be bold, clear, and inspiring.

Job Title: ${job.jobTitle}
Company: ${job.company}

Job Description:
${job.jobDescription}

${strategyContext}

Resume Version: ${resumeName}
${resumeContent ? `Resume Content:\n${resumeContent.substring(0, 1000)}...` : ""}

Create a single sentence that captures:
1. My core motivation for this role
2. The unique value I bring
3. The alignment between my goals and this opportunity

The sentence should be powerful, direct, and memorable.`

    navigator.clipboard.writeText(prompt)
    toast({
      title: "Prompt Copied!",
      description: "ChatGPT prompt for your 'Why' has been copied to clipboard.",
    })
  }

  const handleOpenJobDescription = (job: JobApplication) => {
    setViewJobDescriptionId(job.id)
    setEditedJobDescription(job.jobDescription || "")
    setEditedJobDescriptionUrl(job.jobDescriptionUrl || "")
    setEditedJobDescriptionSummary(job.jobDescriptionSummary || "")
    setIsEditingJobDescription(false)
  }

  // Summary inline edit handlers
  const handleStartEditSummary = (jobId: string, currentSummary: string) => {
    setEditingSummaryId(jobId)
    setEditedSummary(currentSummary)
  }

  const handleSaveSummary = (jobId: string) => {
    onUpdateJob(jobId, { jobDescriptionSummary: editedSummary })
    setEditingSummaryId(null)
    setEditedSummary("")
  }

  const handleCancelEditSummary = () => {
    setEditingSummaryId(null)
    setEditedSummary("")
  }

  const handleSaveJobDescription = () => {
    if (viewJobDescriptionId) {
      onUpdateJob(viewJobDescriptionId, {
        jobDescription: editedJobDescription,
        jobDescriptionUrl: editedJobDescriptionUrl,
        jobDescriptionSummary: editedJobDescriptionSummary,
      })
      setIsEditingJobDescription(false)
    }
  }

  const handleStartRenameResume = (resumeId: string, currentName: string) => {
    setEditingResumeId(resumeId)
    setEditedResumeName(currentName)
  }

  const handleSaveResumeName = (resumeId: string) => {
    if (editedResumeName.trim() && onRenameVersion) {
      // Check if the name already exists
      const nameExists = versions.some((v) => v.id !== resumeId && v.name === editedResumeName.trim())
      if (nameExists) {
        toast({
          title: "Name Already Exists",
          description: "Please choose a different name.",
          variant: "destructive",
        })
        return
      }
      onRenameVersion(resumeId, editedResumeName.trim())
      toast({
        title: "Resume Renamed",
        description: `Resume renamed to "${editedResumeName.trim()}"`,
      })
    }
    setEditingResumeId(null)
    setEditedResumeName("")
  }

  const handleCancelRenameResume = () => {
    setEditingResumeId(null)
    setEditedResumeName("")
  }

  const viewingJob = jobApplications.find((j) => j.id === viewJobDescriptionId)

  // Handle wizard completion - trigger resume creation with name and content
  const handleWizardComplete = (applicationName: string, resumeContent: string) => {
    setPendingApplicationName(applicationName)
    setShowApplicationWizard(false)
    
    // Store content in sessionStorage for the resume builder to pick up
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pendingResumeContent", resumeContent)
      sessionStorage.setItem("pendingApplicationName", applicationName)
    }
    
    onCreateNew() // This will open the resume builder
  }

  // If showing the application creation wizard
  if (showApplicationWizard) {
    return (
      <ApplicationCreationWizard
        onComplete={handleWizardComplete}
        onCancel={() => setShowApplicationWizard(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button onClick={onBack} variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              {/* Show folder avatar or placeholder */}
              {onUpdateFolder && (
                <div 
                  className="flex-shrink-0 cursor-pointer group relative"
                  onClick={handleOpenFolderSettings}
                  title="Click to edit workspace settings"
                >
                  {folderProfileImage ? (
                    <img
                      src={folderProfileImage || "/placeholder.svg"}
                      alt="Workspace avatar"
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 group-hover:border-primary transition-colors"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30 group-hover:border-primary transition-colors">
                      <UserIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity">
                    <Settings className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">
                    {folderName ? `${folderName}'s Applications` : "Job Application Tracker"}
                  </h1>
                  {onUpdateFolder && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleOpenFolderSettings}
                      className="h-8 w-8"
                      title="Edit workspace settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {folderContactInfo?.name ? (
                    <span>
                      {folderContactInfo.name}
                      {folderContactInfo.professionalTitle && ` • ${folderContactInfo.professionalTitle}`}
                      {folderContactInfo.email && ` • ${folderContactInfo.email}`}
                    </span>
                  ) : (
                    "Manage your applications, resumes, cover letters, and interview prep"
                  )}
                </p>
              </div>
            </div>
            {onSaveProfile && (
              <ProfileMenu
                userName={userName}
                userEmail={userEmail}
                profileImage={profileImage}
                onSaveProfile={onSaveProfile}
              />
            )}
          </div>

          <div className="flex items-center gap-3 mt-4 rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Use a <span className="font-medium text-foreground">Chrome browser</span> for best results — improves export quality and produces better 1-page PDFs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {/* Main Create Application button - launches the wizard */}
            <Button onClick={() => setShowApplicationWizard(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Application
            </Button>
            {/* Only show in v0 development environment */}
            {typeof window !== "undefined" &&
              (window.location.hostname.includes("v0.dev") ||
                window.location.hostname.includes("vusercontent") ||
                window.location.hostname === "localhost") && (
                <Button onClick={() => setShowNewJobDialog(true)} size="lg" variant="outline">
                  <Briefcase className="mr-2 h-5 w-5" />
                  Quick Add Job
                </Button>
              )}
            {onExportAll && (
              <Button onClick={onExportAll} variant="outline" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Export All Data
              </Button>
            )}
            {onImportAll && (
              <Button onClick={onImportAll} variant="outline" size="lg">
                <Upload className="mr-2 h-5 w-5" />
                Import All Data
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Job Applications section hidden - using Resume Versions only */}
      {false && jobApplications.length > 0 && (
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">{t("jobApplications")}</h2>
            <div className="flex items-center gap-4">
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} title="Refresh data from database">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("refresh") || "Refresh"}
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Select value={language} onValueChange={(val) => handleLanguageChange(val as Language)} disabled={isTranslating}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("english")}</SelectItem>
                    <SelectItem value="de">{t("german")}</SelectItem>
                  </SelectContent>
                </Select>
{isTranslating && (
  <span className="text-xs text-muted-foreground animate-pulse">{t("translating") || "Translating..."}</span>
  )}
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            {jobApplications.map((job) => {
              const resumeVersion = versions.find((v) => v.id === job.resumeVersionId)
              const resumeVersionName = resumeVersion?.name || "Unknown"
              const linkedCoverLetter = coverLetters?.find((cl) => cl.id === job.coverLetterId)
              return (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">{job.jobTitle}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                            {getStatusLabel(language, job.status)}
                          </span>
                          <Button
                            onClick={() => handleStartEditJob(job)}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                          >
                            <FileEdit className="h-3 w-3 mr-1" />
                            {t("edit")}
                          </Button>
                        </div>
                        {editingCompanyId === job.id ? (
                          <div className="flex items-center gap-2 mb-1">
                            <Input
                              value={editedCompanyName}
                              onChange={(e) => setEditedCompanyName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveCompanyName(job.id)
                                } else if (e.key === "Escape") {
                                  handleCancelEditCompany()
                                }
                              }}
                              className="h-7 text-base"
                              autoFocus
                            />
                            <Button onClick={() => handleSaveCompanyName(job.id)} size="sm" variant="ghost">
                              {t("save")}
                            </Button>
                            <Button onClick={handleCancelEditCompany} size="sm" variant="ghost">
                              {t("cancel")}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-1 group">
                            <p className="text-base text-muted-foreground">{job.company}</p>
                            <Button
                              onClick={() => handleStartEditCompany(job.id, job.company)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <FileEdit className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {editingSummaryId === job.id ? (
                          <div className="mt-2 space-y-2">
                            <Textarea
                              value={editedSummary}
                              onChange={(e) => setEditedSummary(e.target.value)}
                              placeholder={t("shortSummaryPlaceholder")}
                              rows={3}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSaveSummary(job.id)}>
                                {t("save")}
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEditSummary}>
                                {t("cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : job.jobDescriptionSummary ? (
                          <div className="relative group/summary mt-2">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap pr-8">
                              {getTranslatedContent(job.id, "jobDescriptionSummary", job.jobDescriptionSummary)}
                            </p>
                            <Button
                              onClick={() => handleStartEditSummary(job.id, job.jobDescriptionSummary || "")}
                              size="sm"
                              variant="ghost"
                              className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover/summary:opacity-100 transition-opacity"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleStartEditSummary(job.id, "")}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            {t("addJobSummary")}
                          </Button>
                        )}
                        {editingWhyId === job.id ? (
                          <div className="mt-4 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <Label className="text-sm font-medium">Why I'm applying:</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerateWhyPrompt(job)}
                                className="h-7 text-xs"
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                Generate Prompt
                              </Button>
                            </div>
                            <Textarea
                              value={editedWhy}
                              onChange={(e) => setEditedWhy(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  handleCancelEditWhy()
                                }
                              }}
                              placeholder="One powerful sentence that captures why you're applying..."
                              className="min-h-[80px] resize-y"
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                              <Button onClick={() => handleSaveWhy(job.id)} size="sm">
                                {t("save")}
                              </Button>
                              <Button onClick={handleCancelEditWhy} size="sm" variant="outline">
                                {t("cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : job.why ? (
                          <div className="mt-4 p-4 bg-primary/10 rounded-lg border-2 border-primary/30 group relative">
                            <p className="text-base font-semibold text-foreground leading-relaxed">{getTranslatedContent(job.id, "why", job.why)}</p>
                            <Button
                              onClick={() => handleStartEditWhy(job.id, job.why || "")}
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <FileEdit className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleStartEditWhy(job.id, "")}
                            variant="outline"
                            size="sm"
                            className="mt-4 w-full"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Add Your "Why"
                          </Button>
                        )}
                        {job.strategySummary && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md border border-muted">
                            <p className="text-sm font-medium text-foreground mb-1">{t("strategy")}:</p>
                            <p className="text-sm text-muted-foreground">{getTranslatedContent(job.id, "strategySummary", job.strategySummary)}</p>
                          </div>
                        )}

                        {/* Fit Scores Section */}
                        <div className="mt-4 p-3 bg-muted/30 rounded-lg border">
                          <div className="flex items-center gap-2 mb-3">
                            <Star className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{t("jobFitScores")}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {(["culture", "ambitions", "skills", "strategy"] as const).map((type) => {
                              const fitScore = job.fitScores?.[type]
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => handleStartEditFitScore(job.id, type, job)}
                                  className="p-2 rounded-md border bg-background hover:bg-muted/50 transition-colors text-left"
                                >
                                  <div className="text-xs font-medium capitalize mb-1">{getFitScoreTypeLabel(language, type)}</div>
                                  {fitScore ? (
                                    <div className="flex flex-col gap-1">
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold w-fit ${getFitScoreColor(fitScore.score)}`}>
                                        {fitScore.score}/5
                                      </span>
                                      {fitScore.summary && (
                                        <span className="text-xs text-muted-foreground whitespace-pre-wrap">{fitScore.summary}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">{t("clickToAdd")}</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground mt-3">
                          <span>{t("applied")}: {job.appliedDate ? formatDate(job.appliedDate) : t("notSet")}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            {t("resume")}:{" "}
                            {resumeVersion ? (
                              <button
                                type="button"
                                onClick={() => onLoadVersion(resumeVersion)}
                                className="text-primary hover:underline font-medium"
                              >
                                {resumeVersionName}
                              </button>
                            ) : (
                              <span className="italic">{t("notSet")}</span>
                            )}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            {t("coverLetter")}:{" "}
                            {linkedCoverLetter ? (
                              <button
                                type="button"
                                onClick={() => onOpenCoverLetter(job.id)}
                                className="text-primary hover:underline font-medium"
                              >
                                {linkedCoverLetter.name}
                              </button>
                            ) : (
                              <span className="italic">{t("notSet")}</span>
                            )}
                          </span>
                        </div>
                        {editingSalaryId === job.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              value={editedSalary}
                              onChange={(e) => setEditedSalary(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveSalary(job.id)
                                } else if (e.key === "Escape") {
                                  handleCancelEditSalary()
                                }
                              }}
                              placeholder="e.g., 60,000-80,000€"
                              className="h-7 text-sm flex-1"
                              autoFocus
                            />
                            <select
                              value={editedEmploymentType}
                              onChange={(e) => setEditedEmploymentType(e.target.value as any)}
                              className="h-7 text-sm px-2 border rounded"
                            >
                              <option value="full-time">Full-time</option>
                              <option value="part-time">Part-time</option>
                              <option value="contract">Contract</option>
                              <option value="freelance">Freelance</option>
                            </select>
                            <Button onClick={() => handleSaveSalary(job.id)} size="sm" variant="ghost">
                              Save
                            </Button>
                            <Button onClick={() => handleCancelEditSalary} size="sm" variant="ghost">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-2 group">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {job.salaryExpectation && (
                                <>
                                  <span className="font-medium">{job.salaryExpectation}</span>
                                  <span>•</span>
                                </>
                              )}
                              {job.employmentType && <span className="capitalize">{job.employmentType}</span>}
                              {!job.salaryExpectation && !job.employmentType && (
                                <span className="italic">No salary/employment info</span>
                              )}
                            </div>
                            <Button
                              onClick={() => handleStartEditSalary(job.id, job.salaryExpectation, job.employmentType)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <FileEdit className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {job.jobDescriptionUrl && (
                          <div className="mt-2">
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                              <a href={job.jobDescriptionUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View on {extractDomain(job.jobDescriptionUrl)}
                              </a>
                            </Button>
                          </div>
                        )}
                        {job.jobAdvertSource && (
                          <div className="mt-2">
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                              <a
                                href={job.jobAdvertSource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1"
                              >
                                <span>View on {extractDomain(job.jobAdvertSource)}</span>
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => {
                          if (confirm(`Delete application for ${job.jobTitle} at ${job.company}?`)) {
                            onDeleteJobApplication(job.id)
                          }
                        }}
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={job.status}
                        onValueChange={(value) =>
                          onUpdateJobStatus(job.id, { status: value as JobApplication["status"] })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="applied">Applied</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                          <SelectItem value="offer">Offer</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="withdrawn">Withdrawn</SelectItem>
                        </SelectContent>
                      </Select>
                      {job.jobDescription && (
                        <Button onClick={() => handleOpenJobDescription(job)} variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          {t("seeFullJobDescription")}
                        </Button>
                      )}
                      <Button onClick={() => onOpenCompanyInfo(job.id)} variant="outline" size="sm">
                        <Building2 className="h-4 w-4 mr-2" />
                        {t("companyInfo")}
                      </Button>
                      <Button onClick={() => onOpenJobStrategy(job.id)} variant="outline" size="sm">
                        <Target className="h-4 w-4 mr-2" />
                        {t("jobStrategy")}
                      </Button>
                      <Button onClick={() => onOpenContacts(job.id)} variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t("contacts")}
                        {job.contacts && job.contacts.length > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            {job.contacts.length}
                          </span>
                        )}
                      </Button>
                      <Button onClick={() => onOpenCoverLetter(job.id)} variant="outline" size="sm">
                        <FileEdit className="h-4 w-4 mr-2" />
                        {t("coverLetter")}
                      </Button>
                      <Button onClick={() => onOpenInterviewPrep(job.id)} variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t("interviewPrep")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {versions.length > 0 && (
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl">
          <h2 className="text-2xl font-semibold mb-6">Your Resume Versions</h2>
          <div className="grid gap-4">
            {versions.map((version) => {
              console.log("[v0] Dashboard rendering version:", {
                id: version.id,
                name: version.name,
                hasContactInfo: !!version.contactInfo,
                targetCompany: version.contactInfo?.targetCompany,
                hasJobAdvertSource: !!version.jobAdvertSource,
                jobAdvertSource: version.jobAdvertSource,
              })

              return (
                <Card key={version.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {editingResumeId === version.id ? (
                          <div className="flex gap-2 items-center mb-2">
                            <Input
                              value={editedResumeName}
                              onChange={(e) => setEditedResumeName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveResumeName(version.id)
                                } else if (e.key === "Escape") {
                                  handleCancelRenameResume()
                                }
                              }}
                              className="h-8 text-base"
                              autoFocus
                            />
                            <Button onClick={() => handleSaveResumeName(version.id)} size="sm" variant="ghost">
                              Save
                            </Button>
                            <Button onClick={handleCancelRenameResume} size="sm" variant="ghost">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-1 group">
                            <h3 className="text-lg font-semibold text-foreground truncate">{version.name}</h3>
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              Resume
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                              Cover Letter
                            </span>
                            {onRenameVersion && (
                              <Button
                                onClick={() => handleStartRenameResume(version.id, version.name)}
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                        {version.contactInfo?.targetCompany && (
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            {version.contactInfo.targetCompany}
                          </p>
                        )}
                        {!version.contactInfo?.targetCompany && (
                          <p className="text-xs text-muted-foreground/60 mb-1 italic">Company not set</p>
                        )}
                        <p className="text-sm text-muted-foreground">{formatDate(version.timestamp)}</p>
                        {version.jobAdvertSource && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Source:{" "}
                            <a
                              href={version.jobAdvertSource}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {extractDomain(version.jobAdvertSource)}
                            </a>
                          </p>
                        )}
                        {!version.jobAdvertSource && (
                          <p className="text-xs text-muted-foreground/60 mt-1 italic">Source: Not set</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button onClick={() => onLoadVersion(version)} variant="default" size="sm">
                          Load Version
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Delete "${version.name}"?`)) {
                              onDeleteVersion(version.id)
                            }
                          }}
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Folder Settings Dialog */}
      <Dialog open={showFolderSettingsDialog} onOpenChange={setShowFolderSettingsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workspace Settings</DialogTitle>
            <DialogDescription>
              Edit your workspace profile and contact information. These will be used as defaults for new resumes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Workspace Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-folder-name" className="text-sm font-semibold">Workspace Name</Label>
              <Input
                id="edit-folder-name"
                placeholder="e.g., Tech Jobs 2026"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
              />
            </div>

            {/* Profile Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Profile Photo</Label>
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed cursor-pointer hover:border-primary transition-colors overflow-hidden"
                  onClick={() => folderImageInputRef.current?.click()}
                >
                  {editFolderProfileImage ? (
                    <img src={editFolderProfileImage || "/placeholder.svg"} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => folderImageInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                  {editFolderProfileImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditFolderProfileImage(null)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  ref={folderImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFolderImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Contact Information</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-name" className="text-xs">Full Name</Label>
                  <Input
                    id="edit-contact-name"
                    placeholder="Your full name"
                    value={editFolderContactInfo.name}
                    onChange={(e) => setEditFolderContactInfo({ ...editFolderContactInfo, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-title" className="text-xs">Professional Title</Label>
                  <Input
                    id="edit-contact-title"
                    placeholder="e.g., Software Engineer"
                    value={editFolderContactInfo.professionalTitle}
                    onChange={(e) => setEditFolderContactInfo({ ...editFolderContactInfo, professionalTitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-email" className="text-xs">Email</Label>
                  <Input
                    id="edit-contact-email"
                    type="email"
                    placeholder="your@email.com"
                    value={editFolderContactInfo.email}
                    onChange={(e) => setEditFolderContactInfo({ ...editFolderContactInfo, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-phone" className="text-xs">Phone</Label>
                  <Input
                    id="edit-contact-phone"
                    placeholder="+1 234 567 890"
                    value={editFolderContactInfo.phone}
                    onChange={(e) => setEditFolderContactInfo({ ...editFolderContactInfo, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-address" className="text-xs">Location</Label>
                  <Input
                    id="edit-contact-address"
                    placeholder="City, Country"
                    value={editFolderContactInfo.address}
                    onChange={(e) => setEditFolderContactInfo({ ...editFolderContactInfo, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-citizenship" className="text-xs">Citizenship</Label>
                  <Input
                    id="edit-contact-citizenship"
                    placeholder="e.g., German"
                    value={editFolderContactInfo.citizenship}
                    onChange={(e) => setEditFolderContactInfo({ ...editFolderContactInfo, citizenship: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-linkedin" className="text-xs">LinkedIn Profile</Label>
                  <Input
                    id="edit-contact-linkedin"
                    placeholder="linkedin.com/in/yourprofile"
                    value={editFolderContactInfo.linkedin}
                    onChange={(e) => setEditFolderContactInfo({ ...editFolderContactInfo, linkedin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-portfolio" className="text-xs">Portfolio URL</Label>
                  <Input
                    id="edit-contact-portfolio"
                    placeholder="yourportfolio.com"
                    value={editFolderContactInfo.portfolio}
                    onChange={(e) => setEditFolderContactInfo({ ...editFolderContactInfo, portfolio: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-contact-language" className="text-xs">Default Language</Label>
                <Select
                  value={editFolderContactInfo.language}
                  onValueChange={(value: "en" | "de") => setEditFolderContactInfo({ ...editFolderContactInfo, language: value })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFolderSettings}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewJobDialog} onOpenChange={setShowNewJobDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("createNewJobApplication")}</DialogTitle>
            <DialogDescription>{t("addJobApplicationToTrack")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="jobTitle">{t("jobTitle")} *</Label>
                <Input
                  id="jobTitle"
                  value={newJobData.jobTitle}
                  onChange={(e) => setNewJobData({ ...newJobData, jobTitle: e.target.value })}
                  placeholder={t("egSeniorSoftwareEngineer")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">{t("company")} *</Label>
                <Input
                  id="company"
                  value={newJobData.company}
                  onChange={(e) => setNewJobData({ ...newJobData, company: e.target.value })}
                  placeholder={t("egTechCorp")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="resumeVersion">{t("selectResumeVersion")}</Label>
                <Select
                  value={newJobData.resumeVersionId || "none"}
                  onValueChange={(value) => setNewJobData({ ...newJobData, resumeVersionId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectResumeVersionPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noResume")}</SelectItem>
                    {versions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        {version.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uploadResume">{t("orUploadResume")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="uploadResume"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadedResumeFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {uploadedResumeFile && (
                    <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {uploadedResumeFile.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coverLetter">{t("selectCoverLetter")}</Label>
                <Select
                  value={newJobData.coverLetterId || "none"}
                  onValueChange={(value) => setNewJobData({ ...newJobData, coverLetterId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCoverLetterPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noCoverLetter")}</SelectItem>
                    {coverLetters?.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>
                        {cl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uploadCoverLetter">{t("orUploadCoverLetter")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="uploadCoverLetter"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadedCoverLetterFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {uploadedCoverLetterFile && (
                    <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {uploadedCoverLetterFile.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jobDescriptionSummary">{t("jobDescriptionSummary")}</Label>
                <Textarea
                  id="jobDescriptionSummary"
                  value={newJobData.jobDescriptionSummary}
                  onChange={(e) => setNewJobData({ ...newJobData, jobDescriptionSummary: e.target.value })}
                  placeholder={t("shortSummaryPlaceholder")}
                  rows={3}
                  className="resize-y"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jobDescriptionUrl">{t("jobPostingUrl")}</Label>
                <Input
                  id="jobDescriptionUrl"
                  value={newJobData.jobDescriptionUrl}
                  onChange={(e) => setNewJobData({ ...newJobData, jobDescriptionUrl: e.target.value })}
                  placeholder={t("httpsPlaceholder")}
                  type="url"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jobDescription">{t("fullJobDescription")}</Label>
                <Textarea
                  id="jobDescription"
                  value={newJobData.jobDescription}
                  onChange={(e) => setNewJobData({ ...newJobData, jobDescription: e.target.value })}
                  placeholder={t("pasteFullDescription")}
                  rows={12}
                  className="resize-y min-h-[200px]"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowNewJobDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreateJob}>{t("createApplication")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewJobDescriptionId} onOpenChange={() => setViewJobDescriptionId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {viewingJob?.jobTitle} at {viewingJob?.company}
            </DialogTitle>
            <DialogDescription>
              {isEditingJobDescription ? "Edit job description and URL" : "Full job description"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] pr-4 space-y-4">
            {isEditingJobDescription ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-job-description">Job Description</Label>
                  <Textarea
                    id="edit-job-description"
                    value={editedJobDescription}
                    onChange={(e) => setEditedJobDescription(e.target.value)}
                    placeholder="Enter the full job description here..."
                    rows={15}
                    className="resize-y min-h-[300px] font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-job-summary">Job Description Summary (for card display)</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const prompt = `Create a concise 5-line summary of this job posting:\n\n${editedJobDescription}\n\nThe summary should capture the key role, main responsibilities, and essential requirements.`
                        navigator.clipboard.writeText(prompt)
                        alert("ChatGPT prompt copied to clipboard!")
                      }}
                    >
                      Create ChatGPT Prompt
                    </Button>
                  </div>
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">View prompt</summary>
                    <pre className="mt-2 p-3 bg-background rounded-md border overflow-x-auto font-mono whitespace-pre-wrap">
                      <code>{`Create a concise 5-line summary of this job posting:

${editedJobDescription}

The summary should capture the key role, main responsibilities, and essential requirements.`}</code>
                    </pre>
                  </details>
                  <Textarea
                    id="edit-job-summary"
                    value={editedJobDescriptionSummary}
                    onChange={(e) => setEditedJobDescriptionSummary(e.target.value)}
                    placeholder="A concise 5-line summary that will appear on the job card..."
                    rows={5}
                    className="resize-y"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-job-url">Job Posting URL</Label>
                  <Input
                    id="edit-job-url"
                    type="url"
                    value={editedJobDescriptionUrl}
                    onChange={(e) => setEditedJobDescriptionUrl(e.target.value)}
                    placeholder="https://www.example.com/jobs/..."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{viewingJob?.jobDescription}</div>
                {viewingJob?.jobDescriptionUrl && (
                  <div className="pt-4 border-t">
                    <a
                      href={viewingJob.jobDescriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      View Original Job Posting →
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-between gap-2 pt-4 pb-2 px-2 border-t mt-4">
            {isEditingJobDescription ? (
              <>
                <Button variant="outline" onClick={() => setIsEditingJobDescription(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveJobDescription}>Save Changes</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditingJobDescription(true)}>
                  Edit
                </Button>
                <Button onClick={() => setViewJobDescriptionId(null)}>Close</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editingJobId !== null} onOpenChange={(open) => !open && handleCancelEditJob()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Application Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-job-title">Job Title *</Label>
              <Input
                id="edit-job-title"
                value={editedJobData.jobTitle}
                onChange={(e) => setEditedJobData({ ...editedJobData, jobTitle: e.target.value })}
                placeholder="e.g., Senior Product Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company">Company *</Label>
              <Input
                id="edit-company"
                value={editedJobData.company}
                onChange={(e) => setEditedJobData({ ...editedJobData, company: e.target.value })}
                placeholder="e.g., Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-applied-date">Application Date</Label>
              <Input
                id="edit-applied-date"
                type="date"
                value={new Date(editedJobData.appliedDate).toISOString().split("T")[0]}
                onChange={(e) =>
                  setEditedJobData({ ...editedJobData, appliedDate: new Date(e.target.value).getTime() })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-resume-version">Select Resume Version (Optional)</Label>
              <select
                id="edit-resume-version"
                value={editedJobData.resumeVersionId}
                onChange={(e) => setEditedJobData({ ...editedJobData, resumeVersionId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">No resume</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-upload-resume">Or Upload Resume (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-upload-resume"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setEditUploadedResumeFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {editUploadedResumeFile && (
                  <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                    {editUploadedResumeFile.name}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cover-letter">Select Cover Letter (Optional)</Label>
              <select
                id="edit-cover-letter"
                value={editedJobData.coverLetterId}
                onChange={(e) => setEditedJobData({ ...editedJobData, coverLetterId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">No cover letter</option>
                {coverLetters?.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-upload-cover-letter">Or Upload Cover Letter (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-upload-cover-letter"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setEditUploadedCoverLetterFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {editUploadedCoverLetterFile && (
                  <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                    {editUploadedCoverLetterFile.name}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-job-url">Job Posting URL (Optional)</Label>
              <Input
                id="edit-job-url"
                type="url"
                value={editedJobData.jobDescriptionUrl}
                onChange={(e) => setEditedJobData({ ...editedJobData, jobDescriptionUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-job-description">Job Description (Optional)</Label>
              <Textarea
                id="edit-job-description"
                value={editedJobData.jobDescription}
                onChange={(e) => setEditedJobData({ ...editedJobData, jobDescription: e.target.value })}
                rows={8}
                placeholder="Paste the full job description here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCancelEditJob} variant="outline">
              Cancel
            </Button>
            <Button onClick={() => editingJobId && handleSaveJob(editingJobId)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fit Score Edit Dialog */}
      <Dialog open={editingFitScoreJobId !== null} onOpenChange={(open) => !open && handleCancelEditFitScore()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {t("editFitScore").replace("{type}", editingFitScoreType ? getFitScoreTypeLabel(language, editingFitScoreType) : "")}
            </DialogTitle>
            <DialogDescription>
              {t("rateHowWellFits").replace("{type}", editingFitScoreType ? getFitScoreTypeLabel(language, editingFitScoreType) : "")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("score")} (1-5)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setEditedFitScore(score)}
                    className={`w-10 h-10 rounded-lg border-2 font-bold transition-colors ${
                      editedFitScore === score
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                1 = {t("poorFit")}, 5 = {t("excellentFit")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fit-summary">{t("summary")}</Label>
              <Textarea
                id="fit-summary"
                value={editedFitSummary}
                onChange={(e) => setEditedFitSummary(e.target.value)}
                placeholder={t("briefExplanation")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCancelEditFitScore} variant="outline">
              {t("cancel")}
            </Button>
            <Button onClick={() => editingFitScoreJobId && handleSaveFitScore(editingFitScoreJobId)}>
              {t("saveScore")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Red Flags Edit Dialog */}
      <Dialog open={editingRedFlagsJobId !== null} onOpenChange={(open) => !open && handleCancelEditRedFlags()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t("redFlagsTitle")}
            </DialogTitle>
            <DialogDescription>{t("redFlagsDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Existing Red Flags */}
            {editedRedFlags.length > 0 && (
              <div className="space-y-3">
                {editedRedFlags.map((flag) => (
                  <div key={flag.id} className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                    {editingFlagId === flag.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editingFlagQuestion}
                          onChange={(e) => setEditingFlagQuestion(e.target.value)}
                          placeholder={t("questionOrConcern")}
                        />
                        <Textarea
                          value={editingFlagAnswer}
                          onChange={(e) => setEditingFlagAnswer(e.target.value)}
                          placeholder={t("answerOrNotes")}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEditFlag}>
                            {t("save")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEditFlag}>
                            {t("cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">{flag.question}</p>
                          {flag.answer && (
                            <p className="text-sm text-muted-foreground mt-1">{flag.answer}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditFlag(flag)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveRedFlag(flag.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add New Red Flag */}
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-sm font-medium mb-2">{t("addNewRedFlag")}</p>
              <div className="space-y-2">
                <Input
                  value={newRedFlagQuestion}
                  onChange={(e) => setNewRedFlagQuestion(e.target.value)}
                  placeholder={t("questionOrConcern")}
                />
                <Textarea
                  value={newRedFlagAnswer}
                  onChange={(e) => setNewRedFlagAnswer(e.target.value)}
                  placeholder={t("answerOrNotes")}
                  rows={2}
                />
                <Button
                  onClick={handleAddRedFlag}
                  size="sm"
                  variant="outline"
                  disabled={!newRedFlagQuestion.trim()}
                  className="w-full bg-transparent"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("addRedFlag")}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCancelEditRedFlags} variant="outline">
              {t("cancel")}
            </Button>
            <Button onClick={() => editingRedFlagsJobId && handleSaveRedFlags(editingRedFlagsJobId)}>
              {t("saveRedFlags")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
