import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

export default function BookingCTA() {
  const bookingUrl = "https://calendly.com/your-booking-link";
  
  const handleBooking = () => {
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
  };
  
  return (
    <motion.button
      onClick={handleBooking}
      className="w-full max-w-md bg-primary text-primary-foreground py-4 px-8 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 animate-subtle-pulse hover:bg-primary-hover transition-colors"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Calendar className="w-5 h-5" />
      Book a Call
    </motion.button>
  );
}
