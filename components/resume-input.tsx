"use client"

import type React from "react"
import { useEffect } from "react"

import { Upload, X, Copy, Check, HelpCircle, FileText, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { GettingStartedGuide } from "@/components/getting-started-guide"
import { useRef, useState } from "react"

interface ResumeInputProps {
  initialVersion?: {
    resumeText: string
    profileImage: string | null
    companyLogo: string | null
    accentColor: string
    accentColorHex: string
    contactInfo?: ContactInfo
    targetBoxBgColor?: string
    targetBoxBorderColor?: string
    profilePhotoBorder?: boolean
  }
  onSave: (data: {
    name: string
    resumeText: string
    profileImage: string | null
    companyLogo: string | null
    contactInfo: ContactInfo
    accentColor: string
    accentColorHex: string
    targetBoxBgColor: string
    targetBoxBorderColor: string
    profilePhotoBorder: boolean
  }) => void
  onResumeUpdate: (data: {
    contactInfo: ContactInfo
    resumeContent: string
    profilePhoto?: string | null
    companyLogo?: string | null
    accentColor: string
    accentColorHex: string
    targetBoxBgColor: string
    targetBoxBorderColor: string
    profilePhotoBorder: boolean
  }) => void
  availableResumes?: any[]
  selectedJobId?: string
  onJobSelect?: (jobId: string) => void
  onClose?: () => void
  jobDescription?: string // Job description from job application or getting started
  onJobDescriptionChange?: (jobDescription: string) => void // Callback to update job description for current job application
  showStartAgainDialog?: boolean // Control the Start Again dialog from parent
  onStartAgainDialogChange?: (open: boolean) => void // Callback when dialog state changes
}

interface ContactInfo {
  email: string
  linkedin: string
  phone: string
  address: string
  citizenship: string
  portfolio: string
  showPortfolio: boolean
  professionalTitle: string
  name: string
  language: "en" | "de"
  targetCompany: string
  targetRole: string
  jobAdvertSource: string
}

export default function ResumeInput({
  initialVersion,
  onSave,
  onResumeUpdate,
  availableResumes,
  selectedJobId,
  onJobSelect,
  onClose,
  jobDescription: propJobDescription,
  onJobDescriptionChange,
  showStartAgainDialog = false,
  onStartAgainDialogChange,
}: ResumeInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  
  // Get job description from prop (from job application) or sessionStorage (from Getting Started wizard)
  const [jobDescription, setJobDescription] = useState<string>(propJobDescription || "")
  
  // State to show the regenerate resume guide
  const [showRegenerateGuide, setShowRegenerateGuide] = useState(false)
  
  useEffect(() => {
    // Priority: prop > sessionStorage
    if (propJobDescription) {
      setJobDescription(propJobDescription)
    } else {
      const savedJobDescription = sessionStorage.getItem("pendingJobDescription")
      if (savedJobDescription) {
        setJobDescription(savedJobDescription)
      }
    }
  }, [propJobDescription])
  const [resumeText, setResumeText] = useState<string>(initialVersion?.resumeText || "")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    initialVersion?.profileImage || "/images/profile-photo.png",
  )
  const [companyLogo, setCompanyLogo] = useState<string | null>(initialVersion?.companyLogo || null)
  const [contactInfo, setContactInfo] = useState<ContactInfo>(
    initialVersion?.contactInfo || {
      email: "info@jennifersimonds.com",
      linkedin: "linkedin.com/in/simondsjennifer/",
      phone: "0176 23859106",
      address: "Berlin",
      citizenship: "German & British",
      portfolio: "https://jennifersimonds.com",
      showPortfolio: true,
      professionalTitle: "UX for AI Designer | Human-Centered & Responsible AI",
      name: "Jennifer Simonds",
      language: "en",
      targetCompany: "",
      targetRole: "",
      jobAdvertSource: "",
    },
  )
  const [accentColor, setAccentColor] = useState<string>(initialVersion?.accentColor || "oklch(65% .15 85)")
  const [currentHexValue, setCurrentHexValue] = useState<string>(initialVersion?.accentColorHex || "#b89968")
  const [targetBoxBgColor, setTargetBoxBgColor] = useState<string>(initialVersion?.targetBoxBgColor || "#f8f9fa")
  const [targetBoxBorderColor, setTargetBoxBorderColor] = useState<string>(initialVersion?.targetBoxBorderColor || "")
  const [profilePhotoBorder, setProfilePhotoBorder] = useState<boolean>(initialVersion?.profilePhotoBorder !== false)

  const formattingPrompt = `Please help me format my resume content for an ATS-friendly resume formatter.

IMPORTANT FORMATTING RULES:

Use this markup syntax:
# Job Title or Degree Name
## Company Name or Institution Name  
### Date Range
- Bullet point for responsibilities, achievements, or details

DO NOT INCLUDE:
- Name (goes in a separate field)
- Email, Phone, LinkedIn, Address (goes in separate contact info fields)
- Just provide the main resume sections with content

SECTIONS YOU CAN USE:
You can customize section titles and add sections as needed. Common sections:
- PROFIL (Profile/Summary)
- BERUFSERFAHRUNG (Work Experience)
- AUSBILDUNG (Education)
- EIGENPROJEKT & FORSCHUNG (Projects & Research)
- KI- & FACHLICHE KENNTNISSE (AI & Technical Skills)
- SPRACHEN (Languages)
- ZERTIFIZIERUNGEN (Certifications)
- PUBLIKATIONEN (Publications)
- EHRENAMT (Volunteer Work)
- SONSTIGES (Other/Additional Information)

EXAMPLE OUTPUT:

PROFIL
- Experienced software engineer with 5+ years developing scalable web applications
- Passionate about AI and machine learning with focus on responsible AI practices
- Strong leadership and mentoring capabilities

BERUFSERFAHRUNG

# Senior Software Engineer
## Tech Solutions GmbH, Berlin
### März 2021 – heute
- Led development of microservices architecture serving 1M+ users
- Reduced API response time by 40% through optimization
- Mentored team of 3 junior developers

# Software Engineer
## StartUp Inc., München
### Juni 2019 – Februar 2021
- Built React-based dashboard for data visualization
- Implemented CI/CD pipeline reducing deployment time by 60%
- Collaborated with cross-functional teams on product roadmap

AUSBILDUNG

# Master of Science in Computer Science
## Technische Universität München
### Oktober 2017 – Mai 2019
- Focus on Machine Learning and Artificial Intelligence
- Thesis: "Deep Learning Approaches for Natural Language Processing"

# Bachelor of Science in Computer Science
## Ludwig-Maximilians-Universität München
### Oktober 2014 – September 2017

KI- & FACHLICHE KENNTNISSE
- Programming: Python, JavaScript, TypeScript, Java
- Frameworks: React, Node.js, Next.js, Django, Flask
- AI/ML: TensorFlow, PyTorch, scikit-learn, OpenAI API
- Cloud: AWS, Azure, Google Cloud Platform
- Databases: PostgreSQL, MongoDB, Redis
- Tools: Git, Docker, Kubernetes, Jenkins

SPRACHEN
- Deutsch (Muttersprache)
- Englisch (Fließend)

---

**IMPORTANT: Write your entire formatted CV in a code block using triple backticks (\`\`\`) so I can easily copy and paste it into the resume formatter.**

Now please format my resume content following this structure with the markup syntax. Here's my information:

${resumeText || "[Paste your resume information here]"}`

  useEffect(() => {
    if (onResumeUpdate) {
      onResumeUpdate({
        contactInfo,
    resumeContent: resumeText,
    profilePhoto: profilePhoto ?? undefined,
    companyLogo: companyLogo, // Pass null explicitly so it can be removed from preview
    accentColor,
    accentColorHex: currentHexValue,
    targetBoxBgColor,
    targetBoxBorderColor,
  profilePhotoBorder,
  })
  }
  }, [contactInfo, resumeText, profilePhoto, companyLogo, accentColor, currentHexValue, targetBoxBgColor, targetBoxBorderColor, profilePhotoBorder, onResumeUpdate])

  // Compress image to reduce file size for PDF export
  const compressImage = (file: File, maxWidth: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          let width = img.width
          let height = img.height
          
          // Scale down if larger than maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          if (height > maxWidth) {
            width = (width * maxWidth) / height
            height = maxWidth
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Could not get canvas context"))
            return
          }
          
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert to JPEG with specified quality
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality)
          resolve(compressedDataUrl)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        // Compress to max 200px and 70% quality for small PDF size
        const compressed = await compressImage(file, 200, 0.7)
        setProfilePhoto(compressed)
      } catch (error) {
        console.error("Image compression failed:", error)
        // Fallback to original
        const reader = new FileReader()
        reader.onloadend = () => setProfilePhoto(reader.result as string)
        reader.readAsDataURL(file)
      }
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        // Compress to max 300px and 70% quality for small PDF size
        const compressed = await compressImage(file, 300, 0.7)
        setCompanyLogo(compressed)
      } catch (error) {
        console.error("Logo compression failed:", error)
        // Fallback to original
        const reader = new FileReader()
        reader.onloadend = () => setCompanyLogo(reader.result as string)
        reader.readAsDataURL(file)
      }
    }
  }

  const handleRemoveImage = () => {
    setProfilePhoto(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveLogo = () => {
    setCompanyLogo(null)
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
    }
  }

  const hexToOklch = (hex: string): string => {
    hex = hex.replace("#", "")
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      return accentColor
    }
    const r = Number.parseInt(hex.substring(0, 2), 16) / 255
    const g = Number.parseInt(hex.substring(2, 4), 16) / 255
    const b = Number.parseInt(hex.substring(4, 6), 16) / 255

    // Convert to linear RGB
    const linearR = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
    const linearG = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
    const linearB = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

    // Calculate perceived lightness using relative luminance
    const luminance = 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB
    // Apply cube root for perceptual lightness (closer to oklch L)
    const lightness = Math.round(Math.pow(luminance, 1 / 3) * 100)

    // Calculate hue from sRGB values (not linear)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min

    let hue = 0
    if (delta !== 0) {
      if (max === r) {
        hue = 60 * (((g - b) / delta) % 6)
      } else if (max === g) {
        hue = 60 * ((b - r) / delta + 2)
      } else {
        hue = 60 * ((r - g) / delta + 4)
      }
    }
    if (hue < 0) hue += 360

    // Calculate chroma - simplified approximation based on saturation and lightness
    const l = (max + min) / 2
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
    const chroma = saturation * 0.15

    return `oklch(${lightness}% ${chroma.toFixed(2)} ${Math.round(hue)})`
  }

  const oklchToRgb = (oklchString: string): string => {
    // Parse OKLCH string like "oklch$$([\d.]+)%?\s+([\d.]+)\s+([\d.]+)$$"
    const match = oklchString.match(/oklch$$([\d.]+)%?\s+([\d.]+)\s+([\d.]+)$$/)
    if (!match) return oklchString

    const L = Number.parseFloat(match[1]) / 100 // Lightness (0-1)
    const C = Number.parseFloat(match[2]) // Chroma
    const H = Number.parseFloat(match[3]) // Hue (degrees)

    // Convert OKLCH to RGB (simplified conversion)
    // This is a basic approximation for display purposes
    const hRad = (H * Math.PI) / 180
    const a = C * Math.cos(hRad)
    const b = C * Math.sin(hRad)

    // Convert to linear RGB (simplified)
    const l = L * 100
    const r = Math.max(0, Math.min(255, l + a * 128))
    const g = Math.max(0, Math.min(255, l - a * 64 - b * 64))
    const blue = Math.max(0, Math.min(255, l + b * 128))

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(blue)})`
  }

  const handleHexInput = (hex: string) => {
    let cleanHex = hex.replace("#", "")
    if (cleanHex.length > 6) cleanHex = cleanHex.substring(0, 6)
    const fullHex = cleanHex.length > 0 ? `#${cleanHex}` : ""

    setCurrentHexValue(fullHex)

    if (/^#[0-9A-Fa-f]{6}$/.test(fullHex)) {
      const oklch = hexToOklch(fullHex)
      setAccentColor(oklch)
    }
  }

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(formattingPrompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleResumeUpdate = () => {
  onResumeUpdate({
  contactInfo,
  resumeContent: resumeText,
  profilePhoto: profilePhoto ?? undefined,
  companyLogo: companyLogo, // Pass null explicitly when removed
  accentColor: accentColor,
  accentColorHex: currentHexValue,
  targetBoxBgColor,
  targetBoxBorderColor,
  profilePhotoBorder,
  })
  }
  
  const handleSaveVersion = (versionName: string) => {
  onSave({
  name: versionName,
  resumeText,
  profileImage: profilePhoto,
  companyLogo,
  contactInfo,
  accentColor,
  accentColorHex: currentHexValue,
  targetBoxBgColor,
  targetBoxBorderColor,
  profilePhotoBorder,
  })
  }

  const presetColors = [
    { name: "Warm Brown", oklch: "oklch(74% 0.10 81)", hex: "#C9975B" },
    { name: "Professional Blue", oklch: "oklch(55% 0.15 250)", hex: "#2563eb" },
    { name: "Corporate Green", oklch: "oklch(65% 0.15 150)", hex: "#059669" },
    { name: "Classic Black", oklch: "oklch(20% 0 0)", hex: "#000000" },
  ]

  const selectedJob = availableResumes?.find((job) => job.id === selectedJobId)

  return (
    <>
      {/* Start Again Dialog - controlled from parent via props */}
      <Dialog 
        open={showStartAgainDialog || showRegenerateGuide} 
        onOpenChange={(open) => {
          setShowRegenerateGuide(open)
          if (onStartAgainDialogChange) {
            onStartAgainDialogChange(open)
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Re-generate Resume Content</DialogTitle>
            <DialogDescription>
              Update your resume content while keeping all formatting and contact info
            </DialogDescription>
          </DialogHeader>
          <GettingStartedGuide
            defaultExpanded={true}
            updateMode={true}
            initialJobDescription={jobDescription}
            onUpdateResumeContent={(newResumeContent, newJobDescription) => {
              // Update only the resume content, preserve all other settings
              setResumeText(newResumeContent)
              setJobDescription(newJobDescription)
              if (onJobDescriptionChange) {
                onJobDescriptionChange(newJobDescription)
              }
  // Trigger the resume update to sync with preview
  onResumeUpdate({
  contactInfo,
  resumeContent: newResumeContent,
  profilePhoto: profilePhoto,
  companyLogo: companyLogo,
  accentColor: accentColor,
  accentColorHex: currentHexValue,
  targetBoxBgColor,
  targetBoxBorderColor,
  profilePhotoBorder,
  })
  setShowRegenerateGuide(false)
              if (onStartAgainDialogChange) {
                onStartAgainDialogChange(false)
              }
            }}
            onCancel={() => {
              setShowRegenerateGuide(false)
              if (onStartAgainDialogChange) {
                onStartAgainDialogChange(false)
              }
            }}
          />
        </DialogContent>
      </Dialog>
      
      <Card className="lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:flex lg:flex-col" id="resume-input">
        <CardHeader className="flex-shrink-0">
          <div>
            <CardTitle>Input Your Resume</CardTitle>
            <CardDescription>Add your contact details, photo, and resume content</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto flex-1">
          {/* Language Selector - Above Accordion */}
          <div className="space-y-1.5 pb-2 border-b">
            <Label className="text-sm font-semibold">Contact Info Language</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={contactInfo.language === "en" ? "default" : "outline"}
                onClick={() => setContactInfo({ ...contactInfo, language: "en" })}
                className={`flex-1 ${contactInfo.language !== "en" ? "bg-transparent" : ""}`}
              >
                English
              </Button>
              <Button
                type="button"
                size="sm"
                variant={contactInfo.language === "de" ? "default" : "outline"}
                onClick={() => setContactInfo({ ...contactInfo, language: "de" })}
                className={`flex-1 ${contactInfo.language !== "de" ? "bg-transparent" : ""}`}
              >
                Deutsch
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Language for contact information labels on the resume</p>
          </div>
          
          <Accordion type="multiple" defaultValue={[]} className="w-full">
            {/* Images Section */}
            <AccordionItem value="images">
              <AccordionTrigger className="text-sm font-semibold">Profile Photo</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-photo" className="text-sm">Profile Photo (Optional)</Label>
                  <div className="flex items-center gap-4">
                    {profilePhoto ? (
                      <div className="relative">
                        <img
                          src={profilePhoto || "/placeholder.svg"}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover border-2 border-border"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        id="profile-photo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">Square, 400x400px+</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="profile-photo-border"
                    checked={profilePhotoBorder}
                    onChange={(e) => setProfilePhotoBorder(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="profile-photo-border" className="text-sm font-normal cursor-pointer">Show photo outline on resume</Label>
                </div>

              </AccordionContent>
            </AccordionItem>

            {/* Accent Color Section */}
            <AccordionItem value="accent-color">
              <AccordionTrigger className="text-sm font-semibold">Accent Color</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-10 rounded-lg border-2 border-border shrink-0"
                    style={{
                      backgroundColor: currentHexValue ? currentHexValue : oklchToRgb(accentColor),
                    }}
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      id="accent-color"
                      type="text"
                      placeholder="oklch(74% 0.10 81)"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="font-mono text-xs h-8"
                    />
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {presetColors.map((color) => (
                    <Button
                      key={color.name}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAccentColor(color.oklch)
                        setCurrentHexValue(color.hex)
                      }}
                      className="text-xs bg-transparent h-7 px-2"
                    >
                      {color.name}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Label htmlFor="hex-input" className="text-xs whitespace-nowrap">
                    HEX:
                  </Label>
                  <Input
                    id="hex-input"
                    type="text"
                    placeholder="#C9975B"
                    value={currentHexValue}
                    onChange={(e) => handleHexInput(e.target.value)}
                    className="font-mono text-xs h-7"
                    maxLength={7}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Job Target Box Colors */}
            <AccordionItem value="target-box-colors">
              <AccordionTrigger className="text-sm font-semibold">Job Target Box</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="targetCompany" className="text-sm">
                    Target Company
                  </Label>
                  <Input
                    id="targetCompany"
                    type="text"
                    placeholder="Company name you're applying to"
                    value={contactInfo.targetCompany}
                    onChange={(e) => setContactInfo({ ...contactInfo, targetCompany: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">This will appear prominently at the top of your resume</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="targetRole" className="text-sm">
                    Target Role
                  </Label>
                  <Textarea
                    id="targetRole"
                    placeholder="Position you're applying for"
                    value={contactInfo.targetRole}
                    onChange={(e) => setContactInfo({ ...contactInfo, targetRole: e.target.value })}
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Press Enter to add a line break. This will appear prominently at the top of your resume.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Background Color</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { name: "Light Gray", hex: "#f8f9fa" },
                      { name: "Warm Beige", hex: "#f5f0eb" },
                      { name: "Soft Blue", hex: "#f0f4f8" },
                      { name: "Light Sage", hex: "#f0f5f0" },
                      { name: "White", hex: "#ffffff" },
                      { name: "Soft Green", hex: "#e8f5e9" },
                      { name: "Soft Yellow", hex: "#fff8e1" },
                      { name: "Soft Orange", hex: "#fff3e0" },
                      { name: "Soft Purple", hex: "#f3e5f5" },
                    ].map((color) => (
                      <Button
                        key={color.name}
                        variant={targetBoxBgColor === color.hex ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTargetBoxBgColor(color.hex)}
                        className={`text-xs h-7 px-2 gap-1.5 ${targetBoxBgColor !== color.hex ? "bg-transparent" : ""}`}
                      >
                        <span
                          className="w-3 h-3 rounded-sm border border-border shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        {color.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Left Border Color</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { name: "Accent Color", hex: "" },
                      { name: "Black", hex: "#000000" },
                      { name: "Dark Gray", hex: "#4a4a4a" },
                      { name: "Navy", hex: "#1e3a5f" },
                      { name: "Charcoal", hex: "#2d2d2d" },
                      { name: "White", hex: "#ffffff" },
                      { name: "Green", hex: "#2e7d32" },
                      { name: "Yellow", hex: "#f9a825" },
                      { name: "Orange", hex: "#e65100" },
                      { name: "Purple", hex: "#6a1b9a" },
                    ].map((color) => (
                      <Button
                        key={color.name}
                        variant={targetBoxBorderColor === color.hex ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTargetBoxBorderColor(color.hex)}
                        className={`text-xs h-7 px-2 gap-1.5 ${targetBoxBorderColor !== color.hex ? "bg-transparent" : ""}`}
                      >
                        <span
                          className="w-3 h-3 rounded-sm border border-border shrink-0"
                          style={{ backgroundColor: color.hex || currentHexValue }}
                        />
                        {color.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="company-logo" className="text-sm">Company Logo (Optional)</Label>
                  <div className="flex items-center gap-4">
                    {companyLogo ? (
                      <div className="relative">
                        <div className="w-24 h-16 rounded-lg border-2 border-border flex items-center justify-center bg-white">
                          <img
                            src={companyLogo || "/placeholder.svg"}
                            alt="Company Logo"
                            className="max-w-full max-h-full object-contain p-1"
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={handleRemoveLogo}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-24 h-16 rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={logoInputRef}
                        id="company-logo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">Company you're applying to</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Contact Information Section */}
            <AccordionItem value="contact-info">
              <AccordionTrigger className="text-sm font-semibold">Contact Information</AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Jennifer Simonds"
                      value={contactInfo.name}
                      onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="professionalTitle" className="text-sm">
                      Professional Title / Headline
                    </Label>
                    <Input
                      id="professionalTitle"
                      type="text"
                      placeholder="UX for AI Designer | Human-Centered & Responsible AI"
                      value={contactInfo.professionalTitle}
                      onChange={(e) => setContactInfo({ ...contactInfo, professionalTitle: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Customize your professional title to match the job application
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="jobAdvertSource" className="text-sm">
                      Job Advert Source (Optional)
                    </Label>
                    <Input
                      id="jobAdvertSource"
                      type="text"
                      placeholder="e.g., LinkedIn, Indeed, Company Website, Referral"
                      value={contactInfo.jobAdvertSource}
                      onChange={(e) => setContactInfo({ ...contactInfo, jobAdvertSource: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Track where you found this job posting for your records</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@email.com"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="linkedin" className="text-sm">
                      LinkedIn
                    </Label>
                    <Input
                      id="linkedin"
                      type="text"
                      placeholder="linkedin.com/in/johndoe"
                      value={contactInfo.linkedin}
                      onChange={(e) => setContactInfo({ ...contactInfo, linkedin: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-sm">
                      Address
                    </Label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="San Francisco, CA"
                      value={contactInfo.address}
                      onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="citizenship" className="text-sm">
                      Citizenship
                    </Label>
                    <Input
                      id="citizenship"
                      type="text"
                      placeholder="United States"
                      value={contactInfo.citizenship}
                      onChange={(e) => setContactInfo({ ...contactInfo, citizenship: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="portfolio" className="text-sm">
                      Portfolio (Optional)
                    </Label>
                    <Input
                      id="portfolio"
                      type="url"
                      placeholder="www.johndoe.com"
                      value={contactInfo.portfolio}
                      onChange={(e) => setContactInfo({ ...contactInfo, portfolio: e.target.value })}
                    />
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id="show-portfolio"
                        checked={contactInfo.showPortfolio}
                        onCheckedChange={(checked) => setContactInfo({ ...contactInfo, showPortfolio: checked === true })}
                      />
                      <Label htmlFor="show-portfolio" className="text-sm font-normal cursor-pointer">
                        Show portfolio on resume
                      </Label>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Resume Content Section */}
            <AccordionItem value="resume-content">
              <AccordionTrigger className="text-sm font-semibold">Resume Content</AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="resume-text">Editing Resume Content</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 bg-transparent">
                          <HelpCircle className="h-4 w-4" />
                          Formatting Syntax Key
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96" align="end">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Resume Formatting Syntax</h4>
                            <p className="text-xs text-muted-foreground mb-3">
                              Use these markdown-style prefixes to format your resume content. The formatter will style each element appropriately.
                            </p>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="border rounded-md p-3 bg-muted/30">
                              <div className="flex items-start gap-3">
                                <code className="bg-background px-2 py-1 rounded text-xs font-mono border shrink-0"># Text</code>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-primary">Job Title / Degree Name</p>
                                  <p className="text-xs text-muted-foreground">18px, bold, uppercase, accent color</p>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-md p-3 bg-muted/30">
                              <div className="flex items-start gap-3">
                                <code className="bg-background px-2 py-1 rounded text-xs font-mono border shrink-0">## Text</code>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">Company / Institution Name</p>
                                  <p className="text-xs text-muted-foreground">16px, bold, black</p>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-md p-3 bg-muted/30">
                              <div className="flex items-start gap-3">
                                <code className="bg-background px-2 py-1 rounded text-xs font-mono border shrink-0">### Text</code>
                                <div className="flex-1">
                                  <p className="text-sm italic text-muted-foreground">Date Range / Duration</p>
                                  <p className="text-xs text-muted-foreground">14px, regular, italic, gray (#666666)</p>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-md p-3 bg-muted/30">
                              <div className="flex items-start gap-3">
                                <code className="bg-background px-2 py-1 rounded text-xs font-mono border shrink-0">- Text</code>
                                <div className="flex-1">
                                  <p className="text-sm">Bullet Point Item</p>
                                  <p className="text-xs text-muted-foreground">14px, regular, with bullet marker</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              <strong>Tip:</strong> Section headers (like EXPERIENCE, EDUCATION) should be in ALL CAPS without any prefix.
                            </p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Textarea
                    id="resume-text"
                    placeholder={`Use this markup format for proper formatting:

PROFIL
- Experienced software engineer with 5+ years developing scalable web applications
- Passionate about AI and machine learning with focus on responsible AI practices
- Strong leadership and mentoring capabilities

BERUFSERFAHRUNG

# Senior Software Engineer
## Tech Solutions GmbH, Berlin
### März 2021 – heute
- Led development of microservices architecture serving 1M+ users
- Reduced API response time by 40% through optimization
- Mentored team of 3 junior developers

# Software Engineer
## StartUp Inc., München
### Juni 2019 – Februar 2021
- Built React-based dashboard for data visualization
- Implemented CI/CD pipeline reducing deployment time by 60%
- Collaborated with cross-functional teams on product roadmap

AUSBILDUNG

# Master of Science in Computer Science
## Technische Universität München
### Oktober 2017 – Mai 2019
- Focus on Machine Learning and Artificial Intelligence
- Thesis: "Deep Learning Approaches for Natural Language Processing"

# Bachelor of Science in Computer Science
## Ludwig-Maximilians-Universität München
### Oktober 2014 – September 2017

KI- & FACHLICHE KENNTNISSE
- Programming: Python, JavaScript, TypeScript, Java
- Frameworks: React, Node.js, Next.js, Django, Flask
- AI/ML: TensorFlow, PyTorch, scikit-learn, OpenAI API
- Cloud: AWS, Azure, Google Cloud Platform
- Databases: PostgreSQL, MongoDB, Redis
- Tools: Git, Docker, Kubernetes, Jenkins

SPRACHEN
- Deutsch (Muttersprache)
- Englisch (Fließend)

Format:
# for titles, ## for companies, ### for dates, - for bullets`}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="min-h-[300px] font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use markup: # for titles, ## for companies, ### for dates, - for bullets
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Formatting Help Section */}
            <AccordionItem value="formatting-help">
              <AccordionTrigger className="text-sm font-semibold">Formatting Help & Job Strategy</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <Label className="text-sm font-semibold">Need Help Formatting?</Label>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Copy this prompt and paste it into ChatGPT or similar AI tools.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={copyPromptToClipboard}
                      className="shrink-0 bg-transparent"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="p-2 bg-background rounded-md border overflow-x-auto text-xs font-mono whitespace-pre-wrap max-h-32">
                    {formattingPrompt}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </>
  )
}
