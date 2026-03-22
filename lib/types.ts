export interface FitScore {
  score: number // 1-5 rating
  summary: string // Short explanation
}

export interface RedFlag {
  id: string
  question: string
  answer: string
}

export interface JobApplication {
  id: string
  jobTitle: string
  company: string
  jobDescription: string
  jobDescriptionSummary?: string // Short summary for job card display
  jobDescriptionUrl?: string // Link to job posting
  strategySummary?: string // Added strategy summary for card display
  why?: string // One powerful motivating sentence explaining why you're applying
  resumeVersionId: string // Links to a saved resume version
  contactPersonName?: string // Optional name of the hiring manager/contact person
  salaryExpectation?: string // Salary expectation (e.g., "60,000-80,000€")
  employmentType?: "full-time" | "part-time" | "contract" | "freelance" // Employment type
  // Fit scores for evaluating job match
  fitScores?: {
    culture?: FitScore
    ambitions?: FitScore
    skills?: FitScore
    strategy?: FitScore
  }
  redFlags?: RedFlag[] // List of red flag questions and answers
  jobStrategy?: {
    intent: string
    strategicFit: string
    positioning: string
    constraints: string
    successCriteria: string
    lastModified: number
  }
  companyInfo: {
    website: string
    researchNotes: string
    linkedInContacts: Array<{
      id: string
      name: string
      role: string
      linkedInUrl: string
      outreachNotes: string
      contactDate: number | null
    }>
    lastModified: number
  }
  contacts: Array<{
    id: string
    name: string
    role: string
    email: string
    phone: string
    linkedIn: string // Added LinkedIn profile URL field
    location?: string // Added optional location field
    language?: string // Added optional language field
    notes: string
  }>
  coverLetterId?: string // Reference to standalone cover letter
  coverLetter?: {
    content: string
    lastModified: number
  }
  interviewPrep: {
    questions: Array<{
      id: string
      question: string
      framework: string
      answer: string
      wasAsked?: boolean
      myAnswerNotes?: string
    }>
    possibleAnswers: Array<{
      id: string
      question: string
      answer: string
    }>
    personalDescription: string
    interviewers: Array<{
      id: string
      name: string
      role: string
      notes: string
    }>
    projectStories?: Array<{
      id: string
      projectName: string
      role: string
      challenge: string
      action: string
      result: string
      technologies: string
    }>
    generalNotes: string
    lastModified: number
  }
  status: "applied" | "interview" | "offer" | "rejected" | "withdrawn"
  appliedDate: number
  lastModified: number
  folderId?: string // Adding folder association
}

export interface ResumeVersion {
  id: string
  name: string
  resumeText: string
  profileImage: string | null
  companyLogo: string | null
  timestamp: number
  contactInfo: {
    email: string
    linkedin: string
    phone: string
    address: string
    citizenship: string
    portfolio: string
    showPortfolio: boolean
    professionalTitle: string
    name: string // Adding name field to store user's name
    language: "en" | "de" // Adding language preference for contact info labels
    targetCompany: string // Adding company and role fields for application-specific customization
    targetRole: string
    jobAdvertSource: string // Added jobAdvertSource to contactInfo
  }
  accentColor?: string
  accentColorHex?: string // Store the original hex value for accurate PDF generation
  profilePhotoBorder?: boolean // Whether to show border around profile photo
  targetBoxBgColor?: string // Background color for the job target box
  targetBoxBorderColor?: string // Left border color for the job target box
  jobAdvertSource?: string // Deprecated: keeping for backward compatibility, but now stored in contactInfo
  jobDescription?: string // Job description specific to this resume version/application
  folderId?: string // Adding folder association
}

export interface FolderContactInfo {
  name: string
  email: string
  phone: string
  address: string
  linkedin: string
  citizenship: string
  portfolio: string
  professionalTitle: string
  language: "en" | "de"
}

export interface Folder {
  id: string
  name: string
  profileImage: string | null
  contactInfo: FolderContactInfo
  createdAt: number
  updatedAt: number
}

export interface CoverLetter {
  id: string
  name: string
  contentEn: string
  contentDe: string
  contactPersonName: string
  folderId?: string
  createdAt: number
  updatedAt: number
}
