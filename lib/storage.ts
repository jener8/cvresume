import type { JobApplication, ResumeVersion, Folder, CoverLetter } from "./types"
import { supabase } from "./supabase/client"

// Helper function to retry failed fetch operations with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 500
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      // Only retry on network errors (Failed to fetch)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`[v0] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        // For non-network errors, don't retry
        throw error
      }
    }
  }
  
  throw lastError
}

// Resume versions storage functions
export const loadResumeVersions = async (folderId?: string): Promise<ResumeVersion[]> => {
  if (typeof window === "undefined") return []

  try {
    return await withRetry(async () => {
      let query = supabase.from("resume_versions").select("*").order("created_at", { ascending: false })

      if (folderId) {
        query = query.eq("folder_id", folderId)
      }

      const { data, error } = await query

      if (error) {
        console.error("[v0] Supabase load error:", error)
        return []
      }

      const versions: ResumeVersion[] =
        data?.map((row: any) => ({
          id: row.id,
          name: row.name,
          resumeText: row.resume_text,
          profileImage: row.profile_image,
          companyLogo: row.company_logo,
          timestamp: new Date(row.created_at).getTime(),
          contactInfo: row.contact_info,
          accentColor: row.accent_color,
          accentColorHex: row.accent_color,
          jobDescription: row.job_description,
          folderId: row.folder_id,
          profilePhotoBorder: row.profile_photo_border !== false,
          targetBoxBgColor: row.target_box_bg_color || "#f8f9fa",
          targetBoxBorderColor: row.target_box_border_color || "",
        })) || []

      console.log("[v0] Loaded", versions.length, "resume versions from database")
      return versions
    })
  } catch (e) {
    console.error("[v0] Failed to load resume versions from database after retries:", e)
    return []
  }
}

export const saveResumeVersions = async (versions: ResumeVersion[]): Promise<void> => {
  if (typeof window === "undefined") return

  try {
    if (versions.length > 0) {
      const dbVersions = versions.map((v) => {
        // Ensure contactInfo is a plain object with no circular references
        let sanitizedContactInfo = {}
        try {
          sanitizedContactInfo = JSON.parse(JSON.stringify(v.contactInfo || {}))
        } catch (e) {
          console.error("[v0] Failed to serialize contactInfo for version:", v.id, e)
          sanitizedContactInfo = {}
        }

        return {
          id: v.id || crypto.randomUUID(),
          name: v.name || "Untitled Resume",
          resume_text: v.resumeText || "",
          profile_image: v.profileImage || null,
          company_logo: v.companyLogo || null,
          contact_info: sanitizedContactInfo,
          accent_color: v.accentColor || v.accentColorHex || null,
          job_description: v.jobDescription || null,
          folder_id: v.folderId || null,
          profile_photo_border: v.profilePhotoBorder !== false,
          target_box_bg_color: v.targetBoxBgColor || null,
          target_box_border_color: v.targetBoxBorderColor || null,
          user_id: null,
          created_at: v.timestamp ? new Date(v.timestamp).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      })

      console.log("[v0] Attempting to save", dbVersions.length, "versions to database")
      console.log("[v0] Resume IDs being saved:", dbVersions.map((v) => v.id).join(", "))
      console.log("[v0] Resume folder IDs:", dbVersions.map((v) => v.folder_id).join(", "))

      const { data, error } = await supabase.from("resume_versions").upsert(dbVersions, {
        onConflict: "id",
      }).select()

      if (error) {
        console.error("[v0] Failed to save resume versions to database:", error)
        console.error("[v0] Error details:", JSON.stringify(error, null, 2))
        throw error
      } else {
        console.log("[v0] Saved", versions.length, "resume versions to database, returned:", JSON.stringify(data, null, 2))
      }
    }
  } catch (e) {
    console.error("[v0] Failed to save resume versions to database:", e)
    throw e
  }
}

// Job applications storage functions
export const loadJobApplications = async (folderId?: string): Promise<JobApplication[]> => {
  return await jobApplicationsStorage.getAll(folderId)
}

export const saveJobApplications = async (applications: JobApplication[], folderId?: string): Promise<void> => {
  await jobApplicationsStorage.save(applications, folderId)
}

export const jobApplicationsStorage = {
  getAll: async (folderId?: string): Promise<JobApplication[]> => {
    if (typeof window === "undefined") return []

    try {
      let query = supabase.from("job_applications").select("*").order("created_at", { ascending: false })

      if (folderId) {
        query = query.eq("folder_id", folderId)
      }

      const { data, error } = await query

      if (error) {
        console.error("[v0] Supabase load error:", error)
        return []
      }

      const applications: JobApplication[] =
        data?.map((row: any) => ({
          id: row.id,
          jobTitle: row.role,
          company: row.company,
          jobDescription: row.job_description?.content || "",
          jobDescriptionSummary: row.job_description?.summary || "",
          jobDescriptionUrl: row.job_description?.url || "",
          strategySummary: row.job_strategy?.summary || "",
          why: row.why_content?.text || "",
          resumeVersionId: row.resume_version_id || row.job_description?.resumeVersionId || "",
          contactPersonName: row.job_description?.contactPerson || "",
          salaryExpectation: row.job_description?.salary || "",
          employmentType: row.job_description?.employmentType || "full-time",
          jobStrategy: row.job_strategy,
          companyInfo: row.company_info || {
            website: "",
            researchNotes: "",
            linkedInContacts: [],
            lastModified: Date.now(),
          },
          contacts: row.contacts || [],
          coverLetter: row.cover_letter || {
            content: "",
            lastModified: Date.now(),
          },
          coverLetterId: row.cover_letter_id || "",
          interviewPrep: row.interview_prep || {
            questions: [],
            possibleAnswers: [],
            personalDescription: "",
            interviewers: [],
            generalNotes: "",
            lastModified: Date.now(),
          },
          fitScores: row.fit_scores || undefined,
          redFlags: row.red_flags || undefined,
          folderId: row.folder_id || undefined,
          status: row.status || "applied",
          appliedDate: row.applied_date ? new Date(row.applied_date).getTime() : Date.now(),
          lastModified: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
        })) || []

      console.log("[v0] Loaded", applications.length, "job applications from database")
      return applications
    } catch (e) {
      console.error("[v0] Failed to load job applications from database:", e)
      return []
    }
  },

  save: async (applications: JobApplication[], folderId?: string): Promise<void> => {
    if (typeof window === "undefined") return

    try {
      // Get current IDs in the applications array
      const currentIds = applications.map((app) => app.id)
      
      // First, delete any applications that are no longer in the array (for this folder)
      if (folderId) {
        // Get all existing IDs for this folder from database
        const { data: existingData } = await supabase
          .from("job_applications")
          .select("id")
          .eq("folder_id", folderId)
        
        if (existingData) {
          const existingIds = existingData.map((row: { id: string }) => row.id)
          const idsToDelete = existingIds.filter((id: string) => !currentIds.includes(id))
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from("job_applications")
              .delete()
              .in("id", idsToDelete)
            
            if (deleteError) {
              console.error("[v0] Failed to delete job applications:", deleteError)
            } else {
              console.log("[v0] Deleted", idsToDelete.length, "job applications from database")
            }
          }
        }
      }
      
      // Then upsert the remaining applications
      if (applications.length > 0) {
        const dbApplications = applications.map((app) => ({
          id: app.id,
          role: app.jobTitle,
          company: app.company,
          job_description: {
            content: app.jobDescription,
            summary: app.jobDescriptionSummary,
            url: app.jobDescriptionUrl,
            resumeVersionId: app.resumeVersionId,
            contactPerson: app.contactPersonName,
            salary: app.salaryExpectation,
            employmentType: app.employmentType,
          },
          job_strategy: app.jobStrategy,
          why_content: {
            text: app.why,
          },
          company_info: app.companyInfo,
          contacts: app.contacts,
          cover_letter: app.coverLetter,
          cover_letter_id: app.coverLetterId || null,
          resume_version_id: app.resumeVersionId || null,
          interview_prep: app.interviewPrep,
          fit_scores: app.fitScores || null,
          red_flags: app.redFlags || null,
          status: app.status,
          folder_id: app.folderId || null,
          user_id: null, // No user authentication, set to null
          applied_date: new Date(app.appliedDate).toISOString(),
          created_at: new Date(app.appliedDate).toISOString(),
          updated_at: new Date(app.lastModified).toISOString(),
        }))

        const { error } = await supabase.from("job_applications").upsert(dbApplications, {
          onConflict: "id",
        })

        if (error) {
          console.error("[v0] Failed to save job applications to database:", error)
        } else {
          console.log("[v0] Saved", applications.length, "job applications to database")
        }
      }
    } catch (e) {
      console.error("[v0] Failed to save job applications to database:", e)
    }
  },

  create: async (application: Omit<JobApplication, "id">): Promise<JobApplication> => {
    const newApplication: JobApplication = {
      ...application,
      id: crypto.randomUUID(),
    }
    const applications = await jobApplicationsStorage.getAll()
    await jobApplicationsStorage.save([newApplication, ...applications])
    return newApplication
  },

  update: async (id: string, updates: Partial<JobApplication>): Promise<void> => {
    const applications = await jobApplicationsStorage.getAll()
    const updated = applications.map((app) =>
      app.id === id
        ? {
            ...app,
            ...updates,
            coverLetter: updates.coverLetter
              ? {
                  ...app.coverLetter,
                  ...updates.coverLetter,
                }
              : app.coverLetter,
            companyInfo: updates.companyInfo
              ? {
                  ...app.companyInfo,
                  ...updates.companyInfo,
                }
              : app.companyInfo,
            interviewPrep: updates.interviewPrep
              ? {
                  ...app.interviewPrep,
                  ...updates.interviewPrep,
                }
              : app.interviewPrep,
            contacts: updates.contacts !== undefined ? updates.contacts : app.contacts,
            lastModified: Date.now(),
          }
        : app,
    )
    await jobApplicationsStorage.save(updated)
  },

  delete: async (id: string): Promise<void> => {
    const applications = await jobApplicationsStorage.getAll()
    await jobApplicationsStorage.save(applications.filter((app) => app.id !== id))
  },
}

// Folder storage functions
export const foldersStorage = {
  getAll: async (): Promise<Folder[]> => {
    if (typeof window === "undefined") return []

    try {
      return await withRetry(async () => {
        console.log("[v0] Loading folders from database...")
        const { data, error } = await supabase.from("folders").select("*").order("created_at", { ascending: false })

        console.log("[v0] Folders query result - data:", data?.length, "folders, error:", error)

      if (error) {
        console.error("[v0] Supabase load error:", error)
        return []
      }

      const defaultContactInfo: Folder["contactInfo"] = {
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
      
      const folders: Folder[] =
        data?.map((row: any) => ({
          id: row.id,
          name: row.name,
          profileImage: row.profile_image || null,
          contactInfo: row.contact_info ? { ...defaultContactInfo, ...row.contact_info } : defaultContactInfo,
          createdAt: new Date(row.created_at).getTime(),
          updatedAt: new Date(row.updated_at).getTime(),
        })) || []

        console.log("[v0] Loaded", folders.length, "folders from database:", folders.map((f) => f.name).join(", "))
        return folders
      })
    } catch (e) {
      console.error("[v0] Failed to load folders from database after retries:", e)
      return []
    }
  },

  save: async (folders: Folder[]): Promise<void> => {
    if (typeof window === "undefined") return

    try {
      console.log("[v0] Saving", folders.length, "folders to database:", folders.map((f) => f.name).join(", "))
      console.log("[v0] Folder IDs being saved:", folders.map((f) => f.id).join(", "))

      if (folders.length > 0) {
        const dbFolders = folders.map((f) => ({
          id: f.id,
          name: f.name,
          profile_image: f.profileImage || null,
          contact_info: f.contactInfo || null,
          user_id: null, // No user authentication, set to null
          created_at: new Date(f.createdAt).toISOString(),
          updated_at: new Date(f.updatedAt).toISOString(),
        }))

        console.log("[v0] DB folders to upsert:", JSON.stringify(dbFolders, null, 2))

        const { data, error } = await supabase.from("folders").upsert(dbFolders, {
          onConflict: "id",
          ignoreDuplicates: false,
        }).select()

        if (error) {
          console.error("[v0] Failed to save folders to database:", error)
          console.error("[v0] Error details:", JSON.stringify(error, null, 2))
        } else {
          console.log("[v0] Successfully saved folders to database, returned data:", JSON.stringify(data, null, 2))
        }
      }
    } catch (e) {
      console.error("[v0] Failed to save folders to database:", e)
    }
  },

  create: async (
    name: string,
    profileImage: string | null = null,
    contactInfo?: Partial<Folder["contactInfo"]>
  ): Promise<Folder> => {
    const defaultContactInfo: Folder["contactInfo"] = {
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
      contactInfo: { ...defaultContactInfo, ...contactInfo },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const folders = await foldersStorage.getAll()
    await foldersStorage.save([newFolder, ...folders])
    return newFolder
  },

  update: async (
    id: string,
    updates: { name?: string; profileImage?: string | null; contactInfo?: Partial<Folder["contactInfo"]> }
  ): Promise<void> => {
    const folders = await foldersStorage.getAll()
    const updated = folders.map((f) => {
      if (f.id !== id) return f
      return {
        ...f,
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.profileImage !== undefined && { profileImage: updates.profileImage }),
        ...(updates.contactInfo && { contactInfo: { ...f.contactInfo, ...updates.contactInfo } }),
        updatedAt: Date.now(),
      }
    })
    await foldersStorage.save(updated)
  },

  delete: async (id: string): Promise<void> => {
    const folders = await foldersStorage.getAll()
    await foldersStorage.save(folders.filter((f) => f.id !== id))
  },
}

// Cover letter storage functions
export const coverLettersStorage = {
  getAll: async (folderId?: string): Promise<CoverLetter[]> => {
    if (typeof window === "undefined") return []

    try {
      let query = supabase.from("cover_letters").select("*").order("created_at", { ascending: false })

      if (folderId) {
        query = query.eq("folder_id", folderId)
      }

      const { data, error } = await query

      if (error) {
        console.error("[v0] Supabase load error:", error)
        return []
      }

      const letters: CoverLetter[] =
        data?.map((row: any) => ({
          id: row.id,
          name: row.name,
          contentEn: row.content_en || "",
          contentDe: row.content_de || "",
          contactPersonName: row.contact_person_name || "",
          folderId: row.folder_id,
          createdAt: new Date(row.created_at).getTime(),
          updatedAt: new Date(row.updated_at).getTime(),
        })) || []

      console.log("[v0] Loaded", letters.length, "cover letters from database")
      return letters
    } catch (e) {
      console.error("[v0] Failed to load cover letters from database:", e)
      return []
    }
  },

  save: async (letters: CoverLetter[]): Promise<void> => {
    if (typeof window === "undefined") return

    try {
      if (letters.length > 0) {
        const dbLetters = letters.map((l) => ({
          id: l.id,
          name: l.name,
          content_en: l.contentEn,
          content_de: l.contentDe,
          contact_person_name: l.contactPersonName,
          folder_id: l.folderId || null,
          user_id: null, // No user authentication, set to null
          created_at: l.createdAt,
          updated_at: l.updatedAt,
        }))

        const { error } = await supabase.from("cover_letters").upsert(dbLetters, {
          onConflict: "id",
        })
        if (error) {
          console.error("[v0] Failed to save cover letters to database:", error)
        } else {
          console.log("[v0] Saved", letters.length, "cover letters to database")
        }
      }
    } catch (e) {
      console.error("[v0] Failed to save cover letters to database:", e)
    }
  },

  create: async (name: string, folderId?: string): Promise<CoverLetter> => {
    const newLetter: CoverLetter = {
      id: crypto.randomUUID(),
      name,
      contentEn: "",
      contentDe: "",
      contactPersonName: "",
      folderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const letters = await coverLettersStorage.getAll(folderId)
    await coverLettersStorage.save([newLetter, ...letters])
    return newLetter
  },

  update: async (id: string, updates: Partial<CoverLetter>): Promise<void> => {
    const letters = await coverLettersStorage.getAll()
    const updated = letters.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: Date.now() } : l))
    await coverLettersStorage.save(updated)
  },

  delete: async (id: string): Promise<void> => {
    const letters = await coverLettersStorage.getAll()
    await coverLettersStorage.save(letters.filter((l) => l.id !== id))
  },
}

export const loadCoverLetters = async (folderId?: string): Promise<CoverLetter[]> => {
  return await coverLettersStorage.getAll(folderId)
}

export const saveCoverLetters = async (letters: CoverLetter[]): Promise<void> => {
  await coverLettersStorage.save(letters)
}

export const saveFolders = async (folders: Folder[]): Promise<void> => {
  await foldersStorage.save(folders)
}
