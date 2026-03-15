"use client";

import { useEffect, useRef } from "react";
import twemoji from "@twemoji/api";

export default function Twemoji({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      twemoji.parse(ref.current, {
        folder: "svg",
        ext: ".svg",
        base: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/",
        className: "inline-block w-[1em] h-[1em] align-[-0.125em]",
      });
    }
  });

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}
