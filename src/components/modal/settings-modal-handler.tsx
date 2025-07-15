"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import SettingsModal from "./settings-modal";

export type SettingsPage = "general";

export default function SettingsModalHandler() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<SettingsPage | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const closeModalAndClearHash = useCallback(() => {
    const currentSearchParams = searchParams.toString();
    const newUrl = `${pathname}${currentSearchParams ? "?" + currentSearchParams : ""}`;
    router.push(newUrl, { scroll: false });
    setIsModalOpen(false);
    setCurrentPage(null);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash === "#settings") {
        setIsModalOpen(true);
        setCurrentPage("general");
      } else {
        if (isModalOpen) {
          setIsModalOpen(false);
          setCurrentPage(null);
        }
      }
    };

    checkHash();

    window.addEventListener("hashchange", checkHash, false);
    return () => {
      window.removeEventListener("hashchange", checkHash, false);
    };
  }, [pathname, searchParams]);

  return (
    <SettingsModal
      open={isModalOpen}
      currentPage={currentPage}
      onClose={closeModalAndClearHash}
    />
  );
}
