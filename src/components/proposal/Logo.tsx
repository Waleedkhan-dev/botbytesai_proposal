import { motion } from "framer-motion";

export default function Logo() {
  return (
    <motion.div 
      className="flex items-center gap-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">B</span>
      </div>
      <span className="font-bold text-lg text-foreground tracking-tight">
        BOTBYTES
      </span>
    </motion.div>
  );
}
