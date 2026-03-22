"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Trash2, Calendar, Building2, Plus, FileText, Pencil, Loader2, Check, RotateCcw } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import type { ResumeVersion } from "@/lib/types"
import { safeLower } from "@/lib/utils"

interface SavedVersionsProps {
  versions: ResumeVersion[]
  currentVersionId: string | null
  onSave: (name: string) => void
  onLoad: (version: ResumeVersion) => void
  onDelete: (id: string) => void
  onRename: (id: string, newName: string) => void
  onUpdate: () => void
  hasUnsavedChanges: boolean
  onImport: (versions: ResumeVersion[]) => void
  onImportAll: (data: { versions?: ResumeVersion[]; jobApplications?: any[] }) => void
  onExportAll: () => void
  onScrollToPreview: () => void
  isUpdating?: boolean
  updateSuccess?: boolean
  // Start Again and Job Description
  onStartAgain?: () => void
  jobDescription?: string
  onJobDescriptionChange?: (jobDescription: string) => void
  // Default name for new versions (from application wizard)
  defaultVersionName?: string
}

export function SavedVersions({
  versions,
  currentVersionId,
  onSave,
  onLoad,
  onDelete,
  onRename,
  onUpdate,
  hasUnsavedChanges,
  onImport,
  onImportAll,
  onExportAll,
  onScrollToPreview,
  isUpdating = false,
  updateSuccess = false,
  onStartAgain,
  jobDescription = "",
  onJobDescriptionChange,
  defaultVersionName = "",
}: SavedVersionsProps) {
  const [newVersionName, setNewVersionName] = useState(defaultVersionName)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const existingVersion = versions.find((v) => safeLower(v.name).trim() === safeLower(newVersionName).trim())

  const handleSave = () => {
    if (newVersionName.trim()) {
      if (existingVersion) {
        if (confirm(`A version named "${existingVersion.name}" already exists. Do you want to overwrite it?`)) {
          onDelete(existingVersion.id)
          onSave(newVersionName.trim())
          setNewVersionName("")
          setIsDialogOpen(false)
          setTimeout(() => {
            onScrollToPreview()
          }, 300)
        }
      } else {
        onSave(newVersionName.trim())
        setNewVersionName("")
        setIsDialogOpen(false)
        setTimeout(() => {
          onScrollToPreview()
        }, 300)
      }
    }
  }

  const handleLoad = (version: ResumeVersion) => {
    onLoad(version)
    setIsLoadDialogOpen(false)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)

        // Check if it's the new format (with versions and jobApplications)
        if (imported.versions || imported.jobApplications) {
          let importedCount = 0
          if (imported.versions && Array.isArray(imported.versions)) {
            importedCount += imported.versions.length
          }
          if (imported.jobApplications && Array.isArray(imported.jobApplications)) {
            importedCount += imported.jobApplications.length
          }

          if (importedCount > 0) {
            onImportAll(imported)
            const versionCount = imported.versions?.length || 0
            const jobCount = imported.jobApplications?.length || 0
            alert(`Successfully imported ${versionCount} resume version(s) and ${jobCount} job application(s)`)
          } else {
            alert("No data found in file")
          }
        }
        // Fallback to old format (just versions array)
        else if (Array.isArray(imported) && imported.length > 0) {
          onImport(imported)
          alert(`Successfully imported ${imported.length} version(s)`)
        } else {
          alert("Invalid file format")
        }
      } catch (error) {
        alert("Failed to import data. Please check the file format.")
        console.error("[v0] Import error:", error)
      }
    }
    reader.readAsText(file)
    // Reset input so the same file can be imported again
    event.target.value = ""
  }

  const handleRename = (id: string, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const handleRenameSubmit = (id: string) => {
    if (editingName.trim() && editingName.trim() !== versions.find((v) => v.id === id)?.name) {
      const existingVersion = versions.find((v) => safeLower(v.name).trim() === safeLower(editingName).trim())

      if (existingVersion && existingVersion.id !== id) {
        alert(`A version named "${existingVersion.name}" already exists. Please choose a different name.`)
        return
      }

      onRename(id, editingName.trim())
    }
    setEditingId(null)
    setEditingName("")
  }

  const handleRenameCancel = () => {
    setEditingId(null)
    setEditingName("")
  }

  return (
    <div className="mb-6 flex gap-3 justify-center flex-wrap">
      {/* Save Button - only shown when no version has been saved yet */}
      {!currentVersionId && (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Button variant="default" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Save Version
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Resume Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="version-name">Version Name</Label>
              <Input
                id="version-name"
                placeholder="e.g., Software Engineer - Tech Co"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              {existingVersion && (
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  This name already exists. Saving will overwrite the existing version.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!newVersionName.trim()}>
              {existingVersion ? "Overwrite" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Preview Button - shows when no version is loaded, only on mobile */}
      {!currentVersionId && (
        <Button variant="outline" onClick={onScrollToPreview} className="lg:hidden bg-transparent">
          <FileText className="h-4 w-4 mr-2" />
          Preview
        </Button>
      )}

      <Button variant="outline" onClick={onExportAll}>
        <Download className="h-4 w-4 mr-2" />
        Export All Data
      </Button>

      <Button variant="outline" asChild className="bg-transparent">
        <label htmlFor="import-versions" className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />
          Import All Data
          <input id="import-versions" type="file" accept=".json" className="hidden" onChange={handleImport} />
        </label>
      </Button>

      {/* Start Again Button */}
      {onStartAgain && (
        <Button 
          variant="outline" 
          onClick={onStartAgain}
          className="bg-transparent transition-all hover:bg-muted/80 active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Start Again
        </Button>
      )}

      {/* Job Description Popover */}
      {onJobDescriptionChange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2 bg-transparent transition-all hover:bg-muted/80 active:scale-[0.98]"
            >
              <FileText className="h-4 w-4" />
              Job Description
              {jobDescription && <span className="w-2 h-2 rounded-full bg-green-500" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm">Job Description</h4>
                <p className="text-xs text-muted-foreground">Edit or paste the job requirements here</p>
              </div>
              <Textarea
                value={jobDescription}
                onChange={(e) => onJobDescriptionChange(e.target.value)}
                placeholder="Paste the job description here to reference while tailoring your resume..."
                className="min-h-[200px] text-sm resize-none"
              />
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
