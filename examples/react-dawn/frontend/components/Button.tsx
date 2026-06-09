import { clsx } from "../utils/classes";

interface ButtonProps {
  label: string;
  link?: string;
  style?: string;
  className?: string;
}

export function Button({ label, link, style = "button--primary", className }: ButtonProps) {
  return (
    <a href={link || "#"} className={clsx("button", style, className)}>
      {label}
    </a>
  );
}
