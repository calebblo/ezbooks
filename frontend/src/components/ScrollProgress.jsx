// components/ScrollProgress.jsx
import { motion, useScroll } from "framer-motion";

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 h-[3px] z-[60] origin-left bg-gradient-to-r from-purple-400 via-sky-400 to-emerald-400"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
