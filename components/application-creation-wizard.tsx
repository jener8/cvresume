"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { GettingStartedGuide } from "@/components/getting-started-guide"
import { ArrowLeft, ArrowRight, Check, Briefcase, BookOpen, FileText } from "lucide-react"

interface ApplicationCreationWizardProps {
  onComplete: (applicationName: string, resumeContent: string) => void
  onCancel: () => void
}

export function ApplicationCreationWizard({ onComplete, onCancel }: ApplicationCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [applicationName, setApplicationName] = useState("")
  
  const steps = [
    { number: 1, title: "Name Your Application", icon: Briefcase },
    { number: 2, title: "Getting Started", icon: BookOpen },
  ]

  const handleNext = () => {
    if (currentStep === 1 && !applicationName.trim()) {
      return
    }
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      onCancel()
    }
  }

  // Called when user clicks "See Resume" from the Getting Started guide
  const handleOpenResumeBuilder = (resumeContent: string) => {
    onComplete(applicationName.trim(), resumeContent)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Steps */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <Button onClick={onCancel} variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create New Application</h1>
              <p className="text-muted-foreground">Follow the steps to create your tailored resume</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isCompleted
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        Step {step.number}
                      </p>
                      <p className={`text-xs ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${
                        currentStep > step.number ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Name Your Application
              </CardTitle>
              <CardDescription>
                Give your application a name to help you identify it later. Use the company name or job title.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="applicationName">Application Name</Label>
                <Input
                  id="applicationName"
                  placeholder="e.g., Google - Software Engineer, Meta - Product Manager"
                  value={applicationName}
                  onChange={(e) => setApplicationName(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  Tip: Include the company name and job title for easy reference
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Getting Started Guide
                </CardTitle>
                <CardDescription>
                  Follow these steps to prepare your tailored resume for: <strong>{applicationName}</strong>
                </CardDescription>
              </CardHeader>
            </Card>
            <GettingStartedGuide 
              defaultExpanded={true} 
              onOpenResumeBuilder={handleOpenResumeBuilder}
            />
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>
          {currentStep === 1 && (
            <Button 
              onClick={handleNext}
              disabled={!applicationName.trim()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
