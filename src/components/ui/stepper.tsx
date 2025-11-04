"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  name: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("mx-auto w-full", className)}>
      <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
        {steps.map((step, index) => (
          <li key={step.name} className="md:flex-1">
            <div
              className={cn(
                "group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4",
                index < currentStep
                  ? "border-primary"
                  : index === currentStep
                  ? "border-primary"
                  : "border-gray-200"
              )}
            >
              <span className="text-sm font-medium">
                <span className="flex items-center gap-2">
                  {index < currentStep ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                        index === currentStep
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-gray-600"
                      )}
                    >
                      {step.id}
                    </span>
                  )}
                  <span
                    className={cn(
                      index < currentStep
                        ? "text-primary"
                        : index === currentStep
                        ? "text-primary"
                        : "text-gray-500"
                    )}
                  >
                    {step.name}
                  </span>
                </span>
              </span>
              {step.description && (
                <span className="text-sm text-gray-500">
                  {step.description}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
