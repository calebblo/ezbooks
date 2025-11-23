import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-30 flex justify-center pointer-events-none"
    >
      <div
        className={[
          "mt-4 flex w-full max-w-6xl items-center justify-between rounded-2xl px-4 py-2 md:px-6 md:py-3",
          "border border-white/10 backdrop-blur-xl pointer-events-auto transition-all duration-300",
          scrolled
            ? "bg-black/50 shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
            : "bg-black/20 shadow-[0_10px_40px_rgba(0,0,0,0.25)]",
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-purple-400 to-sky-400 shadow-lg shadow-purple-500/40" />
          <span className="text-sm md:text-base font-semibold tracking-tight">
            EzBooks
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">
          <a href="#how-it-works" className="hover:text-white transition">
            How it works
          </a>
          <a href="#pricing" className="hover:text-white transition">
            Pricing
          </a>
          <Link to="/login" className="hover:text-white transition">
            Login
          </Link>
          <Link
            to="/login?signup=true"
            className="ml-2 rounded-full bg-white text-black px-4 py-1.5 text-xs font-medium hover:scale-[1.03] active:scale-[0.97] transition-transform"
          >
            Get started
          </Link>
        </div>

        {/* Mobile dot / menu placeholder */}
        <div className="md:hidden w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
        </div>
      </div>
    </motion.nav>
  );
}
