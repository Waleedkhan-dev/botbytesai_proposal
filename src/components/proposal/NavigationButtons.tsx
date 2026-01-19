import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface NavigationButtonsProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  isLastPage: boolean;
  onBooking: () => void;
}

export default function NavigationButtons({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  isLastPage,
  onBooking,
}: NavigationButtonsProps) {
  const showPrevious = currentPage > 0;
  
  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
      <div className="w-full flex items-center justify-between">
        {/* Previous Button */}
        <div className="w-32 md:w-40">
          {showPrevious && (
            <motion.button
              onClick={onPrevious}
              className="flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg font-semibold border-2 border-primary text-primary bg-background hover:bg-secondary transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden md:inline">Previous</span>
            </motion.button>
          )}
        </div>
        
        {/* Page Indicator */}
        <span className="text-sm text-muted-foreground">
          Page {currentPage + 1} of {totalPages}
        </span>
        
        {/* Next / Book a Call Button */}
        <div className="w-32 md:w-40 flex justify-end">
          {isLastPage ? (
            <motion.button
              onClick={onBooking}
              className="flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Calendar className="w-5 h-5" />
              <span className="hidden md:inline">Book a Call</span>
            </motion.button>
          ) : (
            <motion.button
              onClick={onNext}
              className="flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="hidden md:inline">Next</span>
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
