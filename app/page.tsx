"use client"

import React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { SavedVersions } from "@/components/saved-versions"
import ResumeInput from "@/components/resume-input"
import { ResumePreview } from "@/components/resume-preview"
import { InterviewPrep } from "@/components/interview-prep"
import { CompanyInfo } from "@/components/company-info"
import { Contacts } from "@/components/contacts"
import { JobStrategy } from "@/components/job-strategy"
import { FoldersView } from "@/components/folders-view"
import { StandaloneCoverLetter } from "@/components/standalone-cover-letter"
import { CoverLetterFormatter } from "@/components/cover-letter-formatter"
import { PasswordGate } from "@/components/password-gate"
import { Dashboard } from "@/components/dashboard" // Changed from default import to named import
import type { ResumeVersion, JobApplication, ContactInfo, Folder, CoverLetter, FolderContactInfo } from "@/lib/types"
import {
  loadResumeVersions,
  saveResumeVersions,
  loadJobApplications,
  saveJobApplications,
  foldersStorage,
  coverLettersStorage,
  loadCoverLetters,
  saveCoverLetters,
  saveFolders,
} from "@/lib/storage"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { supabase } from "@/lib/supabase/client" // Fixed import path from @/lib/supabase to @/lib/supabase/client
import { toast } from "@/components/ui/use-toast"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [view, setView] = useState<
    "folders" | "dashboard" | "resume" | "coverLetter" | "jobCoverLetter" | "interviewPrep" | "companyInfo" | "contacts" | "jobStrategy"
  >("folders")
  const [versions, setVersions] = useState<ResumeVersion[]>([])
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number | null>(null)
  const [isUpdatingVersion, setIsUpdatingVersion] = useState(false)
  const [showStartAgainDialog, setShowStartAgainDialog] = useState(false)
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([])
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([])
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string>("")
  const [resumeText, setResumeText] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>("/images/profile-photo.png")
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)
  const [showBackConfirmDialog, setShowBackConfirmDialog] = useState(false)
  const [accentColor, setAccentColor] = useState<string>("oklch(74% 0.10 81)")
  const [accentColorHex, setAccentColorHex] = useState<string | null>(null)
  const [targetBoxBgColor, setTargetBoxBgColor] = useState<string>("#f8f9fa")
  const [targetBoxBorderColor, setTargetBoxBorderColor] = useState<string>("")
  const [profilePhotoBorder, setProfilePhotoBorder] = useState<boolean>(true)
  const previewRef = useRef<HTMLDivElement>(null)

  const defaultContactInfo: ContactInfo = {
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    portfolio: "",
    address: "",
    citizenship: "",
    showPortfolio: false,
    professionalTitle: "",
    language: "en",
    targetCompany: "",
    targetRole: "",
    jobAdvertSource: "",
  }
  
  const [contactInfo, setContactInfo] = useState<ContactInfo>(defaultContactInfo)

  const router = useRouter()

  const jobs = [] // Declare the jobs variable

  const [pendingApplicationName, setPendingApplicationName] = useState("")

  useEffect(() => {
    const authenticated = localStorage.getItem("cv_authenticated") === "true"
    setIsAuthenticated(authenticated)
    setIsLoading(false)
  }, [])

  // Ref to track last refresh time for debouncing
  const lastRefreshRef = React.useRef<number>(0)
  const isOperationInProgressRef = React.useRef<boolean>(false)

  // Function to refresh data from database (source of truth)
  const refreshDataFromDatabase = async (force = false) => {
    // Debounce: don't refresh if we just refreshed in the last 2 seconds
    const now = Date.now()
    if (!force && (now - lastRefreshRef.current < 2000 || isOperationInProgressRef.current)) {
      return
    }
    lastRefreshRef.current = now

    if (currentFolderId) {
      const [loadedVersions, loadedApplications, loadedLetters] = await Promise.all([
        loadResumeVersions(currentFolderId),
        loadJobApplications(currentFolderId),
        loadCoverLetters(currentFolderId),
      ])
      setVersions(loadedVersions)
      setJobApplications(loadedApplications)
      setCoverLetters(loadedLetters)
    } else {
      const loadedFolders = await foldersStorage.getAll()
      setFolders(loadedFolders)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return

    refreshDataFromDatabase(true) // Force initial load

    // Refresh data when window regains focus (in case changes were made on published site)
    // Use a longer debounce for focus events to avoid issues with dialogs
    const handleFocus = () => {
      setTimeout(() => {
        if (!isOperationInProgressRef.current) {
          refreshDataFromDatabase()
        }
      }, 500)
    }

    // Refresh data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setTimeout(() => {
          if (!isOperationInProgressRef.current) {
            refreshDataFromDatabase()
          }
        }, 500)
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [currentFolderId, isAuthenticated])

  const handleLogin = () => {
    setIsAuthenticated(true)
    localStorage.setItem("cv_authenticated", "true")
  }

  const handleSaveProfile = (name: string, email: string, password: string) => {
    const profileData = {
      name,
      email,
      password,
    }
    localStorage.setItem("profile", JSON.stringify(profileData))
    setUserName(name)
    setUserEmail(email)
  }

  const exportAllData = () => {
    const profileData = localStorage.getItem("profile")
    const profile = profileData ? JSON.parse(profileData) : undefined

    const exportData = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      resumeVersions: versions,
      jobApplications: jobApplications,
      coverLetters: coverLetters,
      profile: profile,
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `job-search-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importAllData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        const importData = JSON.parse(content)

        let importedVersions = 0
        let importedJobs = 0
        let importedLetters = 0

        if (importData.version === "2.0") {
          if (importData.resumeVersions) {
            setVersions(importData.resumeVersions)
            await saveResumeVersions(importData.resumeVersions)
            importedVersions = importData.resumeVersions.length
          }
          if (importData.jobApplications) {
            setJobApplications(importData.jobApplications)
            await saveJobApplications(importData.jobApplications)
            importedJobs = importData.jobApplications.length
          }
          if (importData.coverLetters) {
            setCoverLetters(importData.coverLetters)
            await saveCoverLetters(importData.coverLetters)
            importedLetters = importData.coverLetters.length
          }
          if (importData.profile) {
            localStorage.setItem("profile", JSON.stringify(importData.profile))
            setUserName(importData.profile.name || "")
            setUserEmail(importData.profile.email || "")
          }
        } else if (Array.isArray(importData)) {
          setVersions(importData)
          await saveResumeVersions(importData)
          importedVersions = importData.length
        }

        alert(
          `Successfully imported ${importedVersions} resume version(s), ${importedJobs} job application(s), and ${importedLetters} cover letter(s)!`,
        )
      } catch (error) {
        console.error("[v0] Import error:", error)
        alert("Failed to import data. Please check the file format.")
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  const saveNewVersion = async (data: {
    name: string
    resumeText: string
    profileImage: string | null
    companyLogo: string | null
    contactInfo: ContactInfo
    accentColor: string
    accentColorHex: string
  }) => {
    try {
      console.log("[v0] Saving new resume version:", {
        name: data.name,
        hasResumeText: !!data.resumeText,
        resumeTextLength: data.resumeText?.length,
        hasProfileImage: !!data.profileImage,
        currentFolderId,
      })

      let sanitizedContactInfo: ContactInfo
      try {
        sanitizedContactInfo = JSON.parse(JSON.stringify(data.contactInfo || {}))
      } catch (e) {
        console.error("[v0] Failed to serialize contactInfo, using empty object:", e)
        sanitizedContactInfo = {} as ContactInfo
      }

  // Get job description from sessionStorage (set by Getting Started wizard)
  const pendingJobDescription = sessionStorage.getItem("pendingJobDescription") || ""
  console.log("[v0] Pending job description from sessionStorage:", pendingJobDescription ? pendingJobDescription.substring(0, 100) + "..." : "EMPTY")
  
  const newVersion: ResumeVersion = {
  id: crypto.randomUUID(),
  name: data.name,
  resumeText: data.resumeText,
  profileImage: data.profileImage,
  companyLogo: data.companyLogo,
  timestamp: Date.now(),
  contactInfo: sanitizedContactInfo,
    accentColor: data.accentColor,
    accentColorHex: data.accentColorHex,
    targetBoxBgColor: data.targetBoxBgColor,
    targetBoxBorderColor: data.targetBoxBorderColor,
    profilePhotoBorder: data.profilePhotoBorder,
    jobDescription: pendingJobDescription, // Include job description from Getting Started
    folderId: currentFolderId || undefined,
    }
  
  // Clear the pending job description after saving to the resume version
  // so it doesn't carry over to other new resumes
  sessionStorage.removeItem("pendingJobDescription")

      console.log("[v0] New version created:", newVersion)

      const updatedVersions = [newVersion, ...versions]
      setVersions(updatedVersions)

      console.log("[v0] Saving to database...")
      await saveResumeVersions(updatedVersions)
      console.log("[v0] Save successful!")

      setResumeText(data.resumeText)
      setContactInfo(sanitizedContactInfo)
      setProfileImage(data.profileImage)
      setCompanyLogo(data.companyLogo)
      setAccentColor(data.accentColor)
      setAccentColorHex(data.accentColorHex)
      setTargetBoxBgColor(data.targetBoxBgColor || "#f8f9fa")
      setTargetBoxBorderColor(data.targetBoxBorderColor || "")
      setProfilePhotoBorder(data.profilePhotoBorder !== false)
      setCurrentVersionIndex(0)
    } catch (error) {
      console.error("[v0] Error saving resume version:", error)
      alert(`Failed to save resume: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Handle creating a new resume - check for pending content from wizard
  // Also apply folder defaults (contact info and profile image) if available
  const handleCreateNew = () => {
    const pendingContent = sessionStorage.getItem("pendingResumeContent")
    const pendingName = sessionStorage.getItem("pendingApplicationName")
    
    if (pendingContent) {
      setResumeText(pendingContent)
      sessionStorage.removeItem("pendingResumeContent")
    } else {
      setResumeText("")
    }
    
    // Set the pending application name in state for the Save Version dialog default
    if (pendingName) {
      setPendingApplicationName(pendingName)
      sessionStorage.removeItem("pendingApplicationName")
    } else {
      setPendingApplicationName("")
    }
    
    // Apply folder defaults for contact info and profile image if available
    const currentFolder = folders.find((f) => f.id === currentFolderId)
    
    if (currentFolder) {
      // Apply folder's default profile image
      if (currentFolder.profileImage) {
        setProfileImage(currentFolder.profileImage)
      } else {
        setProfileImage(null)
      }
      
      // Apply folder's default contact info
      if (currentFolder.contactInfo) {
        setContactInfo({
          ...defaultContactInfo,
          name: currentFolder.contactInfo.name || "",
          email: currentFolder.contactInfo.email || "",
          phone: currentFolder.contactInfo.phone || "",
          address: currentFolder.contactInfo.address || "",
          linkedin: currentFolder.contactInfo.linkedin || "",
          citizenship: currentFolder.contactInfo.citizenship || "",
          portfolio: currentFolder.contactInfo.portfolio || "",
          professionalTitle: currentFolder.contactInfo.professionalTitle || "",
          language: currentFolder.contactInfo.language || "en",
        })
      } else {
        setContactInfo(defaultContactInfo)
      }
    } else {
      setProfileImage(null)
      setContactInfo(defaultContactInfo)
    }
    
    // Reset to null/defaults - ResumeInput will use its built-in placeholder values
    setCurrentVersionIndex(null)
    setView("resume")
  }

  const loadVersion = (version: ResumeVersion) => {
    console.log("[v0] Loading version:", version.name)
    const index = versions.findIndex((v) => v.id === version.id)
    setCurrentVersionIndex(index)
    setResumeText(version.resumeText)
    setContactInfo(version.contactInfo)
    setProfileImage(version.profileImage)
    setCompanyLogo(version.companyLogo)
  setAccentColor(version.accentColor)
  setAccentColorHex(version.accentColorHex)
  setTargetBoxBgColor(version.targetBoxBgColor || "#f8f9fa")
  setTargetBoxBorderColor(version.targetBoxBorderColor || "")
  setProfilePhotoBorder(version.profilePhotoBorder !== false)
  setView("resume")
  }

const updateCurrentVersion = async () => {
  if (currentVersionIndex !== null) {
  setIsUpdatingVersion(true)
  try {
    const updatedVersions = [...versions]
  updatedVersions[currentVersionIndex] = {
  ...updatedVersions[currentVersionIndex],
  resumeText,
  contactInfo,
  profileImage,
  companyLogo,
  accentColor,
  accentColorHex,
  targetBoxBgColor,
  targetBoxBorderColor,
  profilePhotoBorder,
  timestamp: Date.now(),
  jobAdvertSource: contactInfo.jobAdvertSource || "",
  }
    setVersions(updatedVersions)
    await saveResumeVersions(updatedVersions)
  } finally {
    setIsUpdatingVersion(false)
  }
  }
  }

  const deleteVersion = async (id: string) => {
    console.log("[v0] Deleting resume version:", id)

    // Delete from database first
    try {
      const { error } = await supabase.from("resume_versions").delete().eq("id", id)

      if (error) {
        console.error("[v0] Failed to delete resume from database:", error)
        toast({
          title: "Error",
          description: "Failed to delete resume. Please try again.",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Resume deleted from database successfully")
    } catch (error) {
      console.error("[v0] Error deleting resume:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
      return
    }

    // Update local state after successful database deletion
    const newVersions = versions.filter((v) => v.id !== id)
    setVersions(newVersions)

    if (currentVersionIndex !== null && currentVersionIndex >= newVersions.length) {
      setCurrentVersionIndex(newVersions.length > 0 ? newVersions.length - 1 : null)
    }

    toast({
      title: "Success",
      description: "Resume deleted successfully.",
    })
  }

  const renameVersion = async (id: string, newName: string) => {
    console.log("[v0] Renaming resume version:", id, "to", newName)

    // Update local state first for immediate UI feedback
    const updatedVersions = versions.map((v) => (v.id === id ? { ...v, name: newName } : v))
    setVersions(updatedVersions)

    // Directly update the database record
    try {
      const { error } = await supabase
        .from("resume_versions")
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) {
        console.error("[v0] Failed to rename resume in database:", error)
        throw error
      }

      console.log("[v0] Successfully renamed resume in database")
    } catch (e) {
      console.error("[v0] Error renaming resume:", e)
      // Revert local state on error
      setVersions(versions)
    }
  }

  const scrollToPreview = () => {
    if (previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const currentVersion = currentVersionIndex !== null ? versions[currentVersionIndex] : null

  const profileImageFromCV = versions.length > 0 ? versions[versions.length - 1]?.profileImage : null

  const handleSelectFolder = (folderId: string) => {
    setCurrentFolderId(folderId)
    
    // Apply folder defaults for contact info and profile image
    const selectedFolder = folders.find((f) => f.id === folderId)
    
    if (selectedFolder) {
      // Apply folder's default profile image
      if (selectedFolder.profileImage) {
        setProfileImage(selectedFolder.profileImage)
      }
      
      // Apply folder's default contact info (only if contact info has values)
      if (selectedFolder.contactInfo && selectedFolder.contactInfo.name) {
        setContactInfo({
          ...defaultContactInfo,
          name: selectedFolder.contactInfo.name || "",
          email: selectedFolder.contactInfo.email || "",
          phone: selectedFolder.contactInfo.phone || "",
          address: selectedFolder.contactInfo.address || "",
          linkedin: selectedFolder.contactInfo.linkedin || "",
          citizenship: selectedFolder.contactInfo.citizenship || "",
          portfolio: selectedFolder.contactInfo.portfolio || "",
          professionalTitle: selectedFolder.contactInfo.professionalTitle || "",
          language: selectedFolder.contactInfo.language || "en",
        })
      }
    }
    
    setView("dashboard")
  }

  const handleCreateFolder = async (
    name: string,
    profileImage: string | null,
    contactInfo: Partial<FolderContactInfo>
  ) => {
    console.log("[v0] Creating folder:", name, "with profile image:", !!profileImage)
    const defaultFolderContactInfo: FolderContactInfo = {
      name: "",
      email: "",
      phone: "",
      address: "",
      linkedin: "",
      citizenship: "",
      portfolio: "",
      professionalTitle: "",
      language: "en",
    }
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      profileImage,
      contactInfo: { ...defaultFolderContactInfo, ...contactInfo },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const updatedFolders = [...folders, newFolder]
    setFolders(updatedFolders)
    await saveFolders(updatedFolders)
  }

  const handleDeleteFolder = async (folderId: string) => {
    console.log("[v0] Deleting folder and all its contents:", folderId)

    // Delete the folder itself from database
    const { error: folderError } = await supabase.from("folders").delete().eq("id", folderId)

    if (folderError) {
      console.error("[v0] Error deleting folder from database:", folderError)
      return // Don't proceed if folder deletion failed
    }

    // Delete all resume versions for this folder from database
    const { error: resumeError } = await supabase.from("resume_versions").delete().eq("folder_id", folderId)

    if (resumeError) {
      console.error("[v0] Error deleting resume versions:", resumeError)
    }

    // Delete all job applications for this folder from database
    const { error: jobError } = await supabase.from("job_applications").delete().eq("folder_id", folderId)

    if (jobError) {
      console.error("[v0] Error deleting job applications:", jobError)
    }

    // Delete all cover letters for this folder from database
    const { error: coverLetterError } = await supabase.from("cover_letters").delete().eq("folder_id", folderId)

    if (coverLetterError) {
      console.error("[v0] Error deleting cover letters:", coverLetterError)
    }

    const updatedFolders = folders.filter((f) => f.id !== folderId)
    setFolders(updatedFolders)

    console.log("[v0] Successfully deleted folder and all contents")
  }

  const handleRenameFolder = async (folderId: string, newName: string) => {
    console.log("[v0] Renaming folder:", folderId, "to", newName)
    const updatedFolders = folders.map((f) => (f.id === folderId ? { ...f, name: newName, updatedAt: Date.now() } : f))
    setFolders(updatedFolders)
    await saveFolders(updatedFolders)
  }

  const handleUpdateFolder = async (updates: { name?: string; profileImage?: string | null; contactInfo?: Partial<FolderContactInfo> }) => {
    if (!currentFolderId) return
    console.log("[v0] Updating folder:", currentFolderId, updates)
    
    const updatedFolders = folders.map((f) => {
      if (f.id !== currentFolderId) return f
      return {
        ...f,
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.profileImage !== undefined && { profileImage: updates.profileImage }),
        ...(updates.contactInfo && { contactInfo: { ...f.contactInfo, ...updates.contactInfo } }),
        updatedAt: Date.now(),
      }
    })
    
    setFolders(updatedFolders)
    await saveFolders(updatedFolders)
  }

  const handleBackToDashboard = () => {
    // Check if there are unsaved changes or if working on a new (unsaved) resume
    const isNewResume = currentVersionIndex === null
    const hasChanges = hasUnsavedChanges || (resumeText && resumeText.trim().length > 0 && isNewResume)
    
    if (hasChanges) {
      setShowBackConfirmDialog(true)
    } else {
      setView("dashboard")
    }
  }

  const handleBackConfirmSave = async () => {
    const isNewResume = currentVersionIndex === null
    
    if (isNewResume) {
      // Save as new version
      const defaultName = `Resume ${new Date().toLocaleDateString()}`
  await saveNewVersion({
  name: defaultName,
  resumeText,
  profileImage,
  companyLogo,
  contactInfo,
  accentColor,
  accentColorHex,
  targetBoxBgColor,
  targetBoxBorderColor,
  profilePhotoBorder,
  })
  } else {
      // Update existing version
      await updateCurrentVersion()
    }
    
    setShowBackConfirmDialog(false)
    setView("dashboard")
  }

  const handleBackConfirmDiscard = () => {
    setShowBackConfirmDialog(false)
    setHasUnsavedChanges(false)
    setView("dashboard")
  }

  const handleBackToFolders = () => {
    setCurrentFolderId(null)
    setView("folders")
    setVersions([])
    setJobApplications([])
    setCoverLetters([])
  }

  const handleCreateCoverLetter = async () => {
    if (!currentFolderId) return
    const newLetter = await coverLettersStorage.create("New Cover Letter", currentFolderId)
    setCoverLetters([newLetter, ...coverLetters])
    setSelectedCoverLetterId(newLetter.id)
    setView("coverLetter")
  }
  
  // Handler for creating cover letter from Resume Builder - uses standalone cover letter (no job application)
  const handleCreateCoverLetterFromResume = async () => {
    if (!currentFolderId) return
    
    // Use the current version if one is loaded, otherwise use "New Resume"
    const versionName = currentVersionIndex !== null && versions[currentVersionIndex]
      ? versions[currentVersionIndex].name
      : "New Resume"
    
    const versionId = currentVersionIndex !== null && versions[currentVersionIndex]
      ? versions[currentVersionIndex].id
      : null
    
    // Create a standalone cover letter linked to the current resume version
    const newLetter = await coverLettersStorage.create(
      `Cover Letter - ${versionName}`, 
      currentFolderId
    )
    
    // Store the selected resume version ID in sessionStorage for the cover letter component
    if (typeof window !== "undefined") {
      if (versionId) {
        sessionStorage.setItem("coverLetterResumeVersionId", versionId)
      }
      // Also store the current resume text for the cover letter prompt
      sessionStorage.setItem("coverLetterResumeText", resumeText)
    }
    
    setCoverLetters([newLetter, ...coverLetters])
    setSelectedCoverLetterId(newLetter.id)
    setView("coverLetter")
  }

  const handleUpdateCoverLetter = async (updates: Partial<CoverLetter>) => {
    if (!selectedCoverLetterId) return
    await coverLettersStorage.update(selectedCoverLetterId, updates)
    const updatedLetters = await loadCoverLetters(currentFolderId || undefined)
    setCoverLetters(updatedLetters)
  }

  const handleDeleteCoverLetter = async (letterId: string) => {
    const newCoverLetters = coverLetters.filter((l) => l.id !== letterId)
    setCoverLetters(newCoverLetters)
    await saveCoverLetters(newCoverLetters)
    if (selectedCoverLetterId === letterId) {
      setSelectedCoverLetterId(null)
    }
  }

  const handleCreateJobApplication = async (newApplication: Partial<JobApplication>) => {
    if (!currentFolderId) return
    const newJob: JobApplication = {
      ...newApplication,
      id: crypto.randomUUID(),
      folderId: currentFolderId || undefined,
    }
    const updatedJobs = [newJob, ...jobApplications]
    setJobApplications(updatedJobs)
    await saveJobApplications(updatedJobs)
  }

  const handleUpdateJobStatus = async (id: string, updates: Partial<JobApplication>) => {
    const newJobs = jobApplications.map((j) => (j.id === id ? { ...j, ...updates, lastModified: Date.now() } : j))
    setJobApplications(newJobs)
    await saveJobApplications(newJobs)
  }

  const handleUpdateJob = async (id: string, updates: Partial<JobApplication>) => {
    const newJobs = jobApplications.map((j) => (j.id === id ? { ...j, ...updates, lastModified: Date.now() } : j))
    setJobApplications(newJobs)
    await saveJobApplications(newJobs)
  }

  const handleDeleteJobApplication = async (id: string) => {
    isOperationInProgressRef.current = true
    const newJobs = jobApplications.filter((j) => j.id !== id)
    setJobApplications(newJobs)
    await saveJobApplications(newJobs, currentFolderId || undefined)
    // Wait a bit before allowing refreshes again
    setTimeout(() => {
      isOperationInProgressRef.current = false
    }, 1000)
  }

  const handleResumeUpdate = (data: {
  contactInfo: any
  resumeContent: string
  profilePhoto?: string | null
  companyLogo?: string | null
  accentColor: string
  accentColorHex: string
  targetBoxBgColor: string
  targetBoxBorderColor: string
  profilePhotoBorder: boolean
  }) => {
  console.log("[v0] Resume update received, companyLogo:", data.companyLogo)
  setContactInfo(data.contactInfo)
  setResumeText(data.resumeContent)
  if (data.profilePhoto !== undefined) setProfileImage(data.profilePhoto)
  // Always update companyLogo when it's in the data (including null to remove it)
  setCompanyLogo(data.companyLogo ?? null)
  setAccentColor(data.accentColor)
  setAccentColorHex(data.accentColorHex)
  setTargetBoxBgColor(data.targetBoxBgColor)
  setTargetBoxBorderColor(data.targetBoxBorderColor)
  setProfilePhotoBorder(data.profilePhotoBorder)
  setHasUnsavedChanges(true)
  }

  const handleOpenCompanyInfo = (jobId: string) => {
    setSelectedJobId(jobId)
    setView("companyInfo")
  }

  const handleOpenContacts = (jobId: string) => {
    setSelectedJobId(jobId)
    setView("contacts")
  }

  const handleOpenJobStrategy = (jobId: string) => {
    setSelectedJobId(jobId)
    setView("jobStrategy")
  }

  const handleOpenInterviewPrep = (jobId: string) => {
    setSelectedJobId(jobId)
    setView("interviewPrep")
  }

  const handleOpenJobApplication = async (newApplication: Partial<JobApplication>) => {
    if (!currentFolderId) return
    const newJob: JobApplication = {
      ...newApplication,
      id: crypto.randomUUID(),
      folderId: currentFolderId || undefined,
    }
    const updatedJobs = [newJob, ...jobApplications]
    setJobApplications(updatedJobs)
    await saveJobApplications(updatedJobs)
    setSelectedJobId(newJob.id)
    setView("dashboard")
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={handleLogin} />
  }

  const selectedJob = selectedJobId ? jobApplications.find((j) => j.id === selectedJobId) : null
  const coverLetter = selectedCoverLetterId ? coverLetters.find((l) => l.id === selectedCoverLetterId) : null

  if (view === "coverLetter" && coverLetter) {
    // Find the resume version linked to this cover letter (via job application or directly)
    // First try to find via job application, then fall back to current version
    const linkedJob = jobApplications.find((j) => j.coverLetterId === coverLetter.id)
    const linkedResumeVersion = linkedJob 
      ? versions.find((v) => v.id === linkedJob.resumeVersionId)
      : currentVersion // Fall back to current resume version
    
    return (
      <StandaloneCoverLetter
        coverLetter={coverLetter}
        resumeVersions={versions}
        onUpdate={handleUpdateCoverLetter}
        onBack={() => {
          setView("resume")
          setSelectedCoverLetterId(null)
        }}
        contactInfo={contactInfo}
        jobDescription={linkedResumeVersion?.jobDescription}
        resumeText={linkedResumeVersion?.resumeText}
      />
    )
  }
  
  // Cover letter linked to a job application (from Resume Builder)
  if (view === "jobCoverLetter" && selectedJob) {
    return (
      <CoverLetterFormatter
        job={selectedJob}
        resumeVersions={versions}
        onUpdate={(updates) => handleUpdateJob(selectedJob.id, updates)}
        onBack={() => {
          setView("resume")
          setSelectedJobId(null)
        }}
      />
    )
  }

  if (view === "interviewPrep" && selectedJob) {
    return (
      <InterviewPrep
        job={selectedJob}
        onUpdate={(updates) => {
          const newJobs = jobApplications.map((j) => (j.id === selectedJobId ? { ...j, ...updates } : j))
          setJobApplications(newJobs)
          saveJobApplications(newJobs)
        }}
        onBack={() => setView("dashboard")}
      />
    )
  }

  if (view === "companyInfo" && selectedJob) {
    return (
      <CompanyInfo
        jobApplication={selectedJob}
        onUpdate={(updates) => {
          const newJobs = jobApplications.map((j) => (j.id === selectedJobId ? { ...j, ...updates } : j))
          setJobApplications(newJobs)
          saveJobApplications(newJobs)
        }}
        onClose={() => setView("dashboard")}
      />
    )
  }

  if (view === "contacts" && selectedJob) {
    return (
      <Contacts
        job={selectedJob}
        onUpdate={(updates) => {
          const newJobs = jobApplications.map((j) => (j.id === selectedJobId ? { ...j, ...updates } : j))
          setJobApplications(newJobs)
          saveJobApplications(newJobs)
        }}
        onBack={() => setView("dashboard")}
      />
    )
  }

  if (view === "jobStrategy" && selectedJob) {
    return (
      <JobStrategy
        job={selectedJob}
        onUpdate={(updates) => {
          const newJobs = jobApplications.map((j) => (j.id === selectedJobId ? { ...j, ...updates } : j))
          setJobApplications(newJobs)
          saveJobApplications(newJobs)
        }}
        onBack={() => setView("dashboard")}
      />
    )
  }

  if (view === "folders") {
    return (
      <FoldersView
        folders={folders}
        onSelectFolder={handleSelectFolder}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onRenameFolder={handleRenameFolder}
      />
    )
  }

  if (view === "dashboard") {
    return (
      <Dashboard
        jobApplications={jobApplications} // Fixed prop name from 'jobs' to 'jobApplications'
        versions={versions}
        coverLetters={coverLetters}
        onOpenCompanyInfo={handleOpenCompanyInfo}
        onOpenContacts={handleOpenContacts}
        onOpenJobStrategy={handleOpenJobStrategy}
        onOpenCoverLetter={(letterId) => {
          setSelectedCoverLetterId(letterId)
          setView("coverLetter")
        }}
        onOpenInterviewPrep={handleOpenInterviewPrep}
        onCreateJobApplication={handleOpenJobApplication}
        onCreateNew={handleCreateNew}
        onCreateCoverLetter={handleCreateCoverLetter}
        onUpdateJobStatus={handleUpdateJobStatus}
        onUpdateJob={handleUpdateJobStatus}
        onLoadVersion={loadVersion}
        onDeleteVersion={deleteVersion}
        onRenameVersion={renameVersion}
        onDeleteCoverLetter={handleDeleteCoverLetter}
        onDeleteJobApplication={handleDeleteJobApplication}
        onRefresh={refreshDataFromDatabase}
        onBack={handleBackToFolders}
        folderName={folders.find((f) => f.id === currentFolderId)?.name}
        folderProfileImage={folders.find((f) => f.id === currentFolderId)?.profileImage}
        folderContactInfo={folders.find((f) => f.id === currentFolderId)?.contactInfo}
        onUpdateFolder={handleUpdateFolder}
        />
        )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <AlertDialog open={showBackConfirmDialog} onOpenChange={setShowBackConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {currentVersionIndex === null ? "Save Resume?" : "Update Resume?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {currentVersionIndex === null
                    ? "You have unsaved changes. Would you like to save this resume before going back?"
                    : "You have unsaved changes. Would you like to update this version before going back?"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleBackConfirmDiscard}>No, Discard Changes</AlertDialogCancel>
                <AlertDialogAction onClick={handleBackConfirmSave}>
                  {currentVersionIndex === null ? "Yes, Save" : "Yes, Update"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <h1 className="text-4xl font-bold text-center mb-2">Resume Formatter</h1>
          <p className="text-center text-muted-foreground">Create and manage your professional resume</p>
          {selectedJob && (
            <div className="mt-3 text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {selectedJob.company}{selectedJob.jobTitle ? ` - ${selectedJob.jobTitle}` : ""}
              </span>
            </div>
          )}
        </div>

        <SavedVersions
          versions={versions}
          currentVersionId={currentVersion?.id || null}
  onSave={(name) =>
  saveNewVersion({
  name,
  resumeText,
  profileImage,
  companyLogo,
  contactInfo,
  accentColor,
  accentColorHex,
  targetBoxBgColor,
  targetBoxBorderColor,
  profilePhotoBorder,
  })
  }
          onLoad={loadVersion}
          onDelete={deleteVersion}
          onRename={renameVersion}
          onUpdate={updateCurrentVersion}
          hasUnsavedChanges={hasUnsavedChanges}
          onImport={(importedVersions) => {
            setVersions(importedVersions)
            saveResumeVersions(importedVersions)
          }}
          onImportAll={importAllData}
          onExportAll={exportAllData}
          onScrollToPreview={scrollToPreview}
          isUpdating={isUpdatingVersion}
          onStartAgain={() => setShowStartAgainDialog(true)}
          jobDescription={
            currentVersion?.jobDescription || 
            (typeof window !== 'undefined' ? sessionStorage.getItem("pendingJobDescription") || "" : "")
          }
          onJobDescriptionChange={(newJobDescription) => {
            // Update the job description directly on the resume version
            if (currentVersion) {
              const updatedVersions = versions.map((v) => 
                v.id === currentVersion.id 
                  ? { ...v, jobDescription: newJobDescription }
                  : v
              )
              setVersions(updatedVersions)
              saveResumeVersions(updatedVersions)
            } else {
              // For new resumes not yet saved, store in sessionStorage
              sessionStorage.setItem("pendingJobDescription", newJobDescription)
            }
          }}
          defaultVersionName={pendingApplicationName}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ResumeInput
              key={currentVersion?.id || "new-resume"}
              initialVersion={(() => {
                // Get current folder's defaults
                const currentFolder = folders.find((f) => f.id === currentFolderId)
                const folderProfileImage = currentFolder?.profileImage || null
                const folderContactInfo = currentFolder?.contactInfo
                
                if (currentVersion) {
  return {
  resumeText: currentVersion.resumeText,
  profileImage: currentVersion.profileImage,
  companyLogo: currentVersion.companyLogo,
  accentColor: currentVersion.accentColor,
  accentColorHex: currentVersion.accentColorHex,
  targetBoxBgColor: currentVersion.targetBoxBgColor,
  targetBoxBorderColor: currentVersion.targetBoxBorderColor,
  profilePhotoBorder: currentVersion.profilePhotoBorder,
  contactInfo: currentVersion.contactInfo,
  }
                }
                
                // For new resumes, use folder defaults if available
                return {
                  resumeText: resumeText || "",
                  profileImage: folderProfileImage,
                  companyLogo: null,
                  accentColor: "oklch(65% .15 85)",
                  accentColorHex: "#b89968",
                  contactInfo: folderContactInfo ? {
                    email: folderContactInfo.email || "",
                    linkedin: folderContactInfo.linkedin || "",
                    phone: folderContactInfo.phone || "",
                    address: folderContactInfo.address || "",
                    citizenship: folderContactInfo.citizenship || "",
                    portfolio: folderContactInfo.portfolio || "",
                    showPortfolio: !!folderContactInfo.portfolio,
                    professionalTitle: folderContactInfo.professionalTitle || "",
                    name: folderContactInfo.name || "",
                    language: folderContactInfo.language || "en",
                    targetCompany: "",
                    targetRole: "",
                    jobAdvertSource: "",
                  } : undefined,
                }
              })()}
              onSave={saveNewVersion}
              onResumeUpdate={handleResumeUpdate}
              jobDescription={
                currentVersion?.jobDescription || 
                (typeof window !== 'undefined' ? sessionStorage.getItem("pendingJobDescription") || "" : "")
              }
              onJobDescriptionChange={(newJobDescription) => {
                // Update the job description directly on the resume version
                if (currentVersion) {
                  const updatedVersions = versions.map((v) => 
                    v.id === currentVersion.id 
                      ? { ...v, jobDescription: newJobDescription }
                      : v
                  )
                  setVersions(updatedVersions)
                  saveResumeVersions(updatedVersions)
                } else {
                  // For new resumes not yet saved, store in sessionStorage
                  sessionStorage.setItem("pendingJobDescription", newJobDescription)
                }
              }}
              showStartAgainDialog={showStartAgainDialog}
              onStartAgainDialogChange={setShowStartAgainDialog}
            />
          </div>

          <div ref={previewRef} id="resume-preview-section" className="lg:col-span-2">
            <ResumePreview
              version={{
                id: currentVersion?.id || "temp",
                name: currentVersion?.name || "New Resume",
                resumeText: resumeText,
                contactInfo: contactInfo,
                profileImage: profileImage,
                companyLogo: companyLogo,
  accentColor: accentColor,
  accentColorHex: accentColorHex,
  targetBoxBgColor: targetBoxBgColor,
  targetBoxBorderColor: targetBoxBorderColor,
  profilePhotoBorder: profilePhotoBorder,
  timestamp: currentVersion?.timestamp || Date.now(),
  }}
  onCreateCoverLetter={handleCreateCoverLetterFromResume}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
