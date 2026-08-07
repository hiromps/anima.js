import { Badge } from "@/components/ui/badge";
import type { TechTag } from "@/registry/schema";

const TECH: Record<TechTag, { label: string; dotClassName: string }> = {
  "css-3d": { label: "CSS 3D", dotClassName: "bg-sky-400" },
  r3f: { label: "R3F", dotClassName: "bg-violet-400" },
  "framer-motion": { label: "Motion", dotClassName: "bg-rose-400" },
};

export function TechBadge({ tag }: { tag: TechTag }) {
  const tech = TECH[tag];
  return (
    <Badge variant="secondary" className="gap-1.5 font-mono">
      <span className={`size-1.5 rounded-full ${tech.dotClassName}`} />
      {tech.label}
    </Badge>
  );
}
