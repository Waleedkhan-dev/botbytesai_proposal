"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseProposalHTML } from "@/lib/parseProposal";
import SlideContent from "./SlideContent";
import NavigationButtons from "./NavigationButtons";
import ProgressBar from "./ProgressBar";
import Logo from "./Logo";
import { ProposalViewerProps } from "@/types/proposal";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 500 : -500,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 500 : -500,
    opacity: 0,
  }),
};

const slideTransition = {
  x: { type: "spring" as const, stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
};

export default function ProposalViewer({ proposalData }: ProposalViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  const pages = parseProposalHTML(proposalData);
  const bookingUrl = "https://calendly.com/your-booking-link";
  
  const goToNext = useCallback(() => {
    if (currentPage < pages.length - 1) {
      setDirection(1);
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, pages.length]);
  
  const goToPrevious = useCallback(() => {
    if (currentPage > 0) {
      setDirection(-1);
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);
  
  const handleBooking = () => {
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
  };
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious]);
  
  // Touch/swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    // Minimum swipe distance
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
    
    setTouchStart(null);
  };
  
  if (pages.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No content available</p>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <header className="border-b border-border px-4 md:px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo />
          <ProgressBar current={currentPage + 1} total={pages.length} />
        </div>
      </header>
      
      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="absolute inset-0 overflow-y-auto"
          >
            <SlideContent
              page={pages[currentPage]}
              isLastPage={currentPage === pages.length - 1}
            />
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Navigation Footer */}
      <footer className="border-t border-border px-4 md:px-6 py-4 flex-shrink-0">
        <NavigationButtons
          currentPage={currentPage}
          totalPages={pages.length}
          onPrevious={goToPrevious}
          onNext={goToNext}
          isLastPage={currentPage === pages.length - 1}
          onBooking={handleBooking}
        />
      </footer>
    </div>
  );
}
