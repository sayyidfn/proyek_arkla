interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const percentage = currentStep * 20;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-xs sm:text-sm text-gray-500">
        Step {currentStep}/4
      </span>
      <span className="text-base sm:text-lg font-semibold text-[#2C5F6F]">
        {percentage}%
      </span>
      <div className="w-20 sm:w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#2C5F6F] rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
