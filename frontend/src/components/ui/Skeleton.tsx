import React from "react";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular";
  width?: string;
  height?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  width,
  height,
  className = "",
}) => {
  const baseClass =
    "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]";

  const variantClass = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  }[variant];

  const style: React.CSSProperties = {
    width: width || (variant === "circular" ? "40px" : "100%"),
    height: height || (variant === "text" ? "16px" : "40px"),
  };

  return (
    <div
      className={`${baseClass} ${variantClass} ${className}`}
      style={style}
    />
  );
};

export const MessageSkeleton: React.FC = () => (
  <div className="flex justify-start mb-6">
    <div className="max-w-[85%] rounded-2xl p-4 bg-white border-2 border-orange-100 space-y-3">
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="95%" />
      <Skeleton variant="text" width="70%" />
      <div className="flex gap-2 mt-4">
        <Skeleton variant="rectangular" width="60px" height="20px" />
        <Skeleton variant="rectangular" width="80px" height="20px" />
      </div>
    </div>
  </div>
);

export const SessionSkeleton: React.FC = () => (
  <div className="p-3 rounded-lg border-2 border-transparent">
    <div className="space-y-2">
      <Skeleton variant="text" width="90%" height="14px" />
      <div className="flex gap-2">
        <Skeleton variant="text" width="60px" height="12px" />
        <Skeleton variant="text" width="80px" height="12px" />
      </div>
    </div>
  </div>
);

export const ResourceSkeleton: React.FC = () => (
  <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 border-2 border-orange-100">
    <div className="flex gap-3 mb-3">
      <Skeleton variant="circular" width="48px" height="48px" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" height="16px" />
        <Skeleton variant="text" width="40%" height="12px" />
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <Skeleton variant="text" width="50%" height="12px" />
      <Skeleton variant="text" width="60%" height="12px" />
    </div>
    <div className="flex gap-2">
      <Skeleton variant="rectangular" width="100%" height="36px" />
      <Skeleton variant="rectangular" width="48px" height="36px" />
    </div>
  </div>
);

export default Skeleton;
