import React from "react";

export function DealProductSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.25rem] border border-emerald-100/30 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col sm:flex-row gap-4 p-4 relative">
      <div className="flex gap-4 flex-1 min-w-0">
        {/* Image skeleton */}
        <div className="w-24 h-24 rounded-2xl flex-shrink-0 shimmer-bg" />

        {/* Content skeleton */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          <div className="space-y-2">
            {/* Title & Badge */}
            <div className="flex justify-between items-start gap-2">
              <div className="h-6 shimmer-bg rounded-lg w-[60%]" />
              <div className="h-5 shimmer-bg rounded-full w-14" />
            </div>
            {/* Subtitle / Shop */}
            <div className="h-4 shimmer-bg rounded-md w-[40%]" />
          </div>

          {/* Pricing display */}
          <div className="flex items-end justify-between mt-3">
            <div className="space-y-2">
              <div className="h-8 shimmer-bg rounded-lg w-24" />
              <div className="h-3 shimmer-bg rounded-md w-32" />
            </div>
            <div className="h-5 shimmer-bg rounded-md w-16" />
          </div>

          {/* Dates & Expiry info */}
          <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-emerald-50/50 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-4 shimmer-bg rounded-md w-20" />
              <div className="h-4 shimmer-bg rounded-md w-20" />
              <div className="h-5 shimmer-bg rounded-full w-28" />
            </div>
          </div>
        </div>
      </div>

      {/* Button skeleton */}
      <div className="w-full sm:w-40 sm:min-w-[160px] flex-shrink-0 flex flex-col justify-end mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-emerald-50/50 dark:border-gray-800 sm:pl-4">
        <div className="h-10 shimmer-bg rounded-xl w-full" />
      </div>
    </div>
  );
}
