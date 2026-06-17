/**
 * Helper functions for managing onboarding progress.
 * Progress is stored per-account in localStorage, keyed by user ID.
 */

const ONBOARDING_STORAGE_KEY_PREFIX = 'ferdium_onboarding_progress';

/**
 * Get the current logged-in user ID from the Ferdium stores.
 * Falls back to 'anonymous' if no user is logged in or stores are unavailable.
 */
function getCurrentUserId(): string {
  try {
    const userId = (window as any).ferdium?.stores?.user?.id;
    if (userId) return String(userId);
  } catch {
    // stores not available
  }
  return 'anonymous';
}

function getStorageKey(): string {
  return `${ONBOARDING_STORAGE_KEY_PREFIX}_${getCurrentUserId()}`;
}

export interface OnboardingProgress {
  step1Completed: boolean; // Bind social media account
  step2Completed: boolean; // Create persona profile
  step3Completed: boolean; // Set alert rules (optional)
  step4Completed: boolean; // Bind persona to account
}

/**
 * Get onboarding progress from localStorage (per-account)
 */
export function getOnboardingProgress(): OnboardingProgress {
  try {
    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse onboarding progress:', error);
  }

  // Default: all steps not completed
  return {
    step1Completed: false,
    step2Completed: false,
    step3Completed: false,
    step4Completed: false,
  };
}

/**
 * Save onboarding progress to localStorage (per-account)
 */
export function saveOnboardingProgress(progress: OnboardingProgress): void {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save onboarding progress:', error);
  }
}

/**
 * Update a specific step's completion status
 */
export function updateOnboardingStep(
  stepNumber: 1 | 2 | 3 | 4,
  completed: boolean,
): void {
  const progress = getOnboardingProgress();
  const stepKey = `step${stepNumber}Completed` as keyof OnboardingProgress;
  progress[stepKey] = completed;
  saveOnboardingProgress(progress);
}

/**
 * Calculate overall progress percentage (0, 25, 50, 75, 100)
 */
export function calculateOnboardingProgress(
  progress: OnboardingProgress,
): number {
  const completedSteps = [
    progress.step1Completed,
    progress.step2Completed,
    progress.step3Completed,
    progress.step4Completed,
  ].filter(Boolean).length;

  return (completedSteps / 4) * 100;
}

/**
 * Get the current active step number (1-4)
 * Returns the first incomplete step, or 4 if all completed
 */
export function getCurrentStep(progress: OnboardingProgress): number {
  if (!progress.step1Completed) return 1;
  if (!progress.step2Completed) return 2;
  if (!progress.step3Completed) return 3;
  if (!progress.step4Completed) return 4;
  return 4; // All completed
}

/**
 * Get step status for rendering
 */
export function getStepStatus(
  stepNumber: number,
  progress: OnboardingProgress,
): 'completed' | 'current' | 'pending' {
  const stepKey = `step${stepNumber}Completed` as keyof OnboardingProgress;
  const isCompleted = progress[stepKey];

  if (isCompleted) {
    return 'completed';
  }

  const currentStep = getCurrentStep(progress);
  if (stepNumber === currentStep) {
    return 'current';
  }

  return 'pending';
}

/**
 * Reset onboarding progress for the current account (for testing or admin purposes)
 *
 * Usage in browser DevTools console:
 * ```javascript
 * // Replace <userId> with the actual user ID, e.g.:
 * localStorage.removeItem('ferdium_onboarding_progress_abc123');
 * window.location.reload();
 * ```
 *
 * Or programmatically:
 * ```typescript
 * import { resetOnboardingProgress } from './helpers/onboarding-helpers';
 * resetOnboardingProgress();
 * ```
 */
export function resetOnboardingProgress(): void {
  localStorage.removeItem(getStorageKey());
}
