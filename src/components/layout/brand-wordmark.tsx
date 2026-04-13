import { Abril_Fatface } from "next/font/google";

const abrilFatface = Abril_Fatface({
  subsets: ["latin"],
  weight: "400",
});

type Props = {
  className?: string;
};

export function BrandWordmark({ className = "" }: Props) {
  const mergedClassName = `${abrilFatface.className} ${className}`.trim();

  return <span className={mergedClassName}>FOGATTA</span>;
}
