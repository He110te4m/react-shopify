import { Button } from "../components/Button";

interface ButtonSnippetProps {
  label: string;
  link?: string;
  style?: string;
  className?: string;
}

export default function ButtonSnippet({ label, link, style, className }: ButtonSnippetProps) {
  return <Button label={label} link={link} style={style} className={className} />;
}
