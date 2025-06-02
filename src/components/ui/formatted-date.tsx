"use client";

import { useState, useEffect } from "react";

interface FormattedDateProps {
  date: Date;
  options?: Intl.DateTimeFormatOptions;
}

export function FormattedDate({ date, options }: FormattedDateProps) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    // Ensure date is a valid Date object before formatting
    if (date instanceof Date && !isNaN(date.getTime())) {
      // Format the date using toLocaleString on the client after mount
      setFormattedDate(date.toLocaleString(undefined, options)); // Use browser's default locale
    }
    // Only run this effect when the date object itself changes
  }, [date, options]);

  // Render null initially (or a placeholder) to match server render
  // Then render the formatted date once the effect runs on the client
  return <>{formattedDate}</>;
}
