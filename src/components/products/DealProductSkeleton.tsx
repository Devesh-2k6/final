import React from "react";

export function DealProductSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-emerald-100/40 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col sm:flex-row gap-4 p-4 relative">
      {/* Top urgency badge skeleton */}
      <div className="absolute top-3 left-3 w-20 h-5 rounded-full shimmer-bg" />

      <div className="flex gap-4 flex-1 min-w-0">
        {/* Image skeleton */}
        <div className="w-24 h-24 rounded-xl flex-shrink-0 shimmer-bg" />

        {/* Content skeleton */}
        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
          <div>
            {/* Title & Badge */}
            <div className="flex justify-between items-start gap-2">
              <div className="h-5 shimmer-bg rounded-lg w-1/2" />
              <div className="h-5 shimmer-bg rounded-full w-12" />
            </div>
            {/* Subtitle / Shop */}
            <div className="h-3.5 shimmer-bg rounded-md w-1/3 mt-2" />
          </div>

          {/* Pricing display */}
          <div className="flex items-end justify-between mt-2">
            <div className="space-y-1">
              <div className="h-6 shimmer-bg rounded-lg w-20" />
              <div className="h-3.5 shimmer-bg rounded-md w-28" />
            </div>
            <div className="h-5 shimmer-bg rounded-md w-16" />
          </div>

          {/* Dates & Expiry info */}
          <div className="flex flex-col gap-1.5 mt-3 pt-2 border-t border-emerald-100/20">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-4 shimmer-bg rounded-md w-16" />
              <div className="h-4 shimmer-bg rounded-md w-16" />
              <div className="h-4 shimmer-bg rounded-md w-24" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-4 shimmer-bg rounded-md w-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Button skeleton */}
      <div className="w-full sm:w-40 sm:min-w-[160px] flex-shrink-0 flex flex-col justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-emerald-100/40 sm:pl-4">
        <div className="h-9 shimmer-bg rounded-xl w-full" />
      </div>
    </div>
  );
}

