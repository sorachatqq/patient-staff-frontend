"use client";

import ErrorView from "@/components/ui/ErrorView";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-gray-50">
        <ErrorView error={error} reset={reset} />
      </body>
    </html>
  );
}
