// components/ScrollShowcase.jsx
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function ScrollShowcase({ variant = "upload" }) {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 20%"],
  });

  // crank these so movement is obvious
  const receiptY = useTransform(scrollYProgress, [0, 1], [220, -220]);
  const receiptX = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const receiptRotate = useTransform(scrollYProgress, [0, 1], [18, -18]);
  const receiptOpacity = useTransform(
    scrollYProgress,
    [0, 0.1, 0.9, 1],
    [0, 1, 1, 0]
  );
  const dashScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.9, 1.07, 0.95]
  );
  const glowOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.1, 0.9, 0.2]
  );

  const isUpload = variant === "upload";

  const heading = isUpload
    ? "Drag, drop, done."
    : "Spot spend patterns instantly.";

  const subheading = isUpload
    ? "Upload a messy receipt and watch it become structured, exportable data — line items, vendor, taxes and totals all mapped automatically."
    : "See where money flows by vendor, team or project. Zoom from high-level trends down to individual receipts in a single dashboard.";

  const bullets = isUpload
    ? [
        "Forward email receipts straight into your workspace.",
        "Auto-detect currency, date and vendor with no templates.",
        "Flag duplicates before they ever hit your books.",
      ]
    : [
        "Drill into categories, vendors and time periods in one view.",
        "Surface outliers like unusual spend spikes or new vendors.",
        "Export filtered views directly to CSV or your accounting tools.",
      ];

  return (
    <section
      ref={ref}
      className="relative bg-[#020617] border-t border-white/10 py-32 md:py-40 min-h-[120vh]"
    >
      {/* background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent" />
        <motion.div
          style={{ opacity: glowOpacity }}
          className="absolute right-[-200px] top-10 w-[420px] h-[420px] rounded-full bg-purple-500/40 blur-[140px]"
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 md:px-8 grid md:grid-cols-2 gap-12 md:gap-20 items-start">
        {/* TEXT */}
        <div className="space-y-5 pt-6 md:pt-10">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-400">
            {isUpload ? "Receipt → structured record" : "From noise to insight"}
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold">{heading}</h2>
          <p className="text-gray-300 text-sm md:text-base max-w-lg">
            {subheading}
          </p>

          <ul className="mt-4 space-y-2 text-sm text-gray-300">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* STICKY VISUAL */}
        <div className="relative md:h-[420px] flex items-center justify-center md:sticky md:top-32">
          <motion.div
            style={{ scale: dashScale }}
            className="relative w-full max-w-md rounded-[28px] bg-[#020617] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.75)] px-6 py-5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <p className="text-xs text-gray-400">
                {isUpload ? "Inbox • New receipt" : "Insights • This quarter"}
              </p>
            </div>

            <div className="h-28 rounded-2xl bg-gradient-to-tr from-purple-500/25 via-indigo-500/25 to-sky-400/20 border border-white/10 flex items-end gap-2 p-3 mb-5">
              <div className="flex-1 h-8 bg-white/20 rounded-lg" />
              <div className="flex-1 h-14 bg-white/35 rounded-lg" />
              <div className="flex-1 h-10 bg-white/15 rounded-lg" />
              <div className="flex-1 h-16 bg-white/30 rounded-lg" />
              <div className="flex-1 h-6 bg-white/15 rounded-lg" />
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-left">
                <p className="text-gray-400">This month</p>
                <p className="text-sm font-semibold">$12,430</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-left">
                <p className="text-gray-400">Receipts</p>
                <p className="text-sm font-semibold">128</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-left">
                <p className="text-gray-400">Vendors</p>
                <p className="text-sm font-semibold">34</p>
              </div>
            </div>

            {/* SCROLL-LINKED RECEIPT */}
            <motion.div
              style={{
                y: receiptY,
                x: receiptX,
                rotate: receiptRotate,
                opacity: receiptOpacity,
              }}
              className="absolute right-[-10px] bottom-6 w-44 rounded-2xl bg-white text-black shadow-[0_18px_50px_rgba(0,0,0,0.6)] border border-black/5 p-3 text-[11px]"
            >
              {isUpload ? (
                <>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">Coffee Co.</span>
                    <span className="text-gray-600">$12.40</span>
                  </div>
                  <div className="h-px bg-gray-200 my-1" />
                  <p className="text-[10px] text-gray-600">
                    Auto-captured from photo.
                    <br />
                    2x Latte • 1x Croissant.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">Marketing</span>
                    <span className="text-emerald-600">-18%</span>
                  </div>
                  <div className="h-px bg-gray-200 my-1" />
                  <p className="text-[10px] text-gray-600">
                    Spend down vs last quarter.
                    <br />
                    Largest drop: SaaS tools.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
