import { NotepadText } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 24 }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <NotepadText size={size} className="text-primary" />
      <span className="font-semibold text-lg">MarkSight</span>
    </div>
  );
}
