import type { ReactElement } from 'react';
import { CheckCircleFilledIcon, CircleIcon } from 'tdesign-icons-react';
import { Button, Card, Progress } from 'tdesign-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingGuideProps {
  steps: OnboardingStep[];
  onDismiss?: () => void;
}

export default function OnboardingGuide({
  steps,
  onDismiss,
}: OnboardingGuideProps): ReactElement {
  const completedCount = steps.filter(s => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <Card
      title="新手引导"
      actions={
        progress === 100 && onDismiss ? (
          <Button variant="text" size="small" onClick={onDismiss}>
            完成并隐藏
          </Button>
        ) : undefined
      }
    >
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--td-text-color-secondary)]">
            完成进度
          </span>
          <span className="text-sm font-medium">
            {completedCount}/{steps.length}
          </span>
        </div>
        <Progress percentage={progress} />
      </div>

      <div className="space-y-3">
        {steps.map(step => (
          <div
            key={step.id}
            className={`flex items-start gap-3 p-3 rounded-md transition-colors ${
              step.completed
                ? 'bg-[var(--td-success-color-1)]'
                : 'bg-[var(--td-bg-color-container)]'
            }`}
          >
            <div className="mt-0.5">
              {step.completed ? (
                <CheckCircleFilledIcon
                  size="20px"
                  style={{ color: 'var(--td-success-color)' }}
                />
              ) : (
                <CircleIcon
                  size="20px"
                  style={{ color: 'var(--td-text-color-placeholder)' }}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4
                className={`text-sm font-medium mb-1 ${
                  step.completed
                    ? 'line-through text-[var(--td-text-color-placeholder)]'
                    : ''
                }`}
              >
                {step.title}
              </h4>
              <p className="text-xs text-[var(--td-text-color-secondary)] mb-2">
                {step.description}
              </p>

              {!step.completed && step.action && (
                <Button
                  size="small"
                  theme="primary"
                  onClick={step.action.onClick}
                >
                  {step.action.label}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
