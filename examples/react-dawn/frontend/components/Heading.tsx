import { clsx } from "../utils/classes";

interface HeadingProps {
  text: string;
  size?: string;
  className?: string;
}

export function Heading({ text, size = "h1", className }: HeadingProps) {
  return <h2 className={clsx(size, className)}>{text}</h2>;
}
