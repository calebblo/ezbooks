// pages/HomePage.jsx
import { motion } from "framer-motion";
import Navbar from "../components/Navbar.jsx";
import ScrollShowcase from "../components/ScrollShowcase.jsx";
import ScrollProgress from "../components/ScrollProgress.jsx";


const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HomePage() {
  return (
    <main className="bg-[#050816] text-white w-full overflow-x-hidden">
      <Navbar />
      <ScrollProgress />

      {/* ===== HERO ===== */}
      <section className="relative min-h-[90vh] pt-28 md:pt-32 overflow-hidden">
        {/* Video background */}
        <div className="absolute inset-0 overflow-hidden">
          <video
            className="h-full w-full object-cover opacity-40"
            autoPlay
            muted
            loop
            playsInline
          >
            {/* put your mp4 at public/media/hero-loop.mp4 */}
            <source src="/media/hero-loop.mp4" type="video/mp4" />
          </video>
          {/* dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-[#050816]/85 to-[#020617]/95" />
        </div>

        {/* Glow blobs */}
        <div className="pointer-events-none absolute -right-40 top-10 w-[550px] h-[550px] rounded-full bg-purple-500/40 blur-[130px] opacity-70" />
        <div className="pointer-events-none absolute -left-40 bottom-[-200px] w-[450px] h-[450px] rounded-full bg-sky-400/30 blur-[140px] opacity-60" />

        <div className="relative max-w-6xl mx-auto px-6 md:px-8 grid md:grid-cols-2 gap-16 md:gap-20 items-center">
          {/* LEFT CONTENT */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/10 border border-white/10 text-xs uppercase tracking-[0.2em] mb-6"
              variants={fadeUp}
              custom={0.1}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              AI-powered receipt parsing
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight"
              variants={fadeUp}
              custom={0.2}
            >
              <span className="bg-gradient-to-r from-white via-white to-purple-200 bg-clip-text text-transparent">
                Automate your expense tracking.
              </span>
              <br />
              <span className="text-gray-200">Just upload receipts.</span>
            </motion.h1>

            <motion.p
              className="mt-6 md:mt-8 text-base md:text-lg text-gray-300 max-w-xl leading-relaxed"
              variants={fadeUp}
              custom={0.35}
            >
              Turn messy invoices and receipts into clean structured reports.
              Our AI extracts line items, totals, and vendors instantly — ready
              to review, export, or sync to your accounting stack.
            </motion.p>

            <motion.div
              className="mt-8 md:mt-10 flex flex-wrap gap-4"
              variants={fadeUp}
              custom={0.45}
            >
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97, y: 0 }}
                className="px-7 md:px-8 py-3.5 md:py-4 bg-white text-black rounded-2xl text-sm md:text-base font-medium shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
              >
                Get Started
              </motion.button>

              <motion.a
                href="#pricing"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97, y: 0 }}
                className="px-7 md:px-8 py-3.5 md:py-4 bg-white/5 text-gray-100 rounded-2xl text-sm md:text-base font-medium border border-white/10 hover:bg-white/10 transition-all duration-200"
              >
                View Pricing
              </motion.a>
            </motion.div>

            <motion.p
              className="mt-5 text-xs md:text-sm text-gray-400"
              variants={fadeUp}
              custom={0.6}
            >
              No credit card required. Get set up in under 2 minutes.
            </motion.p>
          </motion.div>

          {/* HERO PREVIEW WITH RECEIPT ANIMATION */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                delay: 0.4,
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
          >
            <motion.div
              className="relative w-full max-w-md"
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Glow behind card */}
              <div className="absolute -inset-3 rounded-[38px] bg-gradient-to-tr from-purple-500/40 via-indigo-400/30 to-sky-400/30 blur-3 opacity-80" />

              <div className="relative rounded-[32px] bg-[#020617]/95 border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.75)] px-6 py-5 overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-xs text-gray-400">Dashboard • This month</p>
                </div>

                {/* Main chart area */}
                <div className="relative space-y-4">
                  <div className="h-32 rounded-2xl bg-gradient-to-tr from-purple-500/25 via-indigo-500/25 to-sky-400/20 border border-white/10 flex items-end gap-2 p-3">
                    <div className="flex-1 h-10 bg-white/20 rounded-lg" />
                    <div className="flex-1 h-16 bg-white/30 rounded-lg" />
                    <div className="flex-1 h-8 bg-white/10 rounded-lg" />
                    <div className="flex-1 h-20 bg-white/40 rounded-lg" />
                    <div className="flex-1 h-14 bg-white/25 rounded-lg" />
                  </div>

                  {/* Animated receipt flying in (looping) */}
                  <motion.div
                    className="absolute -top-6 -left-10 w-40 rounded-2xl bg-white text-black shadow-[0_20px_60px_rgba(0,0,0,0.55)] border border-black/5 p-3 text-xs"
                    initial={{ opacity: 0, x: -80, y: -40, rotate: -8, scale: 0.8 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      x: [-80, 0, 10, 40],
                      y: [-40, -10, 5, 20],
                      rotate: [-8, -2, 0, 4],
                      scale: [0.8, 1, 1, 0.9],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2.5,
                      ease: "easeInOut",
                    }}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-[11px]">Coffee Co.</span>
                      <span className="text-[11px] text-gray-600">$12.40</span>
                    </div>
                    <div className="h-px bg-gray-200 my-1" />
                    <p className="text-[10px] text-gray-500">
                      2x Latte • 1x Croissant
                      <br />
                      Tax: $1.04 • Total: $12.40
                    </p>
                  </motion.div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 text-xs mt-6">
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
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== SCROLL SHOWCASE 1 (between Hero & How it Works) ===== */}
      <ScrollShowcase variant="upload" />

      {/* ===== HOW IT WORKS ===== */}
      <motion.section
        className="py-24 bg-[#020617] border-t border-white/10"
        id="how-it-works"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-8 text-center">
          <motion.h2
            className="text-3xl md:text-4xl font-semibold mb-4"
            variants={fadeUp}
            custom={0}
          >
            How it Works
          </motion.h2>
          <motion.p
            className="text-gray-400 mb-14 max-w-2xl mx-auto"
            variants={fadeUp}
            custom={0.15}
          >
            Go from paper chaos to clean, queryable data in three simple steps.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8 md:gap-10">
            {[
              {
                step: "1",
                title: "Upload your receipts",
                desc: "Drag & drop photos or PDFs, or forward email receipts directly to your unique inbox.",
                color: "bg-purple-500/20 text-purple-200 border-purple-500/30",
              },
              {
                step: "2",
                title: "AI parses everything",
                desc: "Vendor, date, taxes, totals, and individual line items — parsed and cleaned automatically.",
                color: "bg-indigo-500/20 text-indigo-200 border-indigo-500/30",
              },
              {
                step: "3",
                title: "Dashboard autofilled",
                desc: "See categorized spend by vendor, team, or project — and export to CSV or your accounting tools.",
                color: "bg-sky-500/20 text-sky-200 border-sky-500/30",
              },
            ].map((card, i) => (
              <motion.div
                key={card.step}
                className="p-8 rounded-3xl bg-white/5 border border-white/10 text-left hover:bg-white/[0.07] transition-colors duration-200"
                variants={fadeUp}
                custom={0.2 + i * 0.12}
                whileHover={{ y: -6, scale: 1.01 }}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center mb-5 text-xs border ${card.color}`}
                >
                  {card.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
                <p className="text-gray-300 text-sm">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ===== SCROLL SHOWCASE 2 (between How it Works & Pricing) ===== */}
      <ScrollShowcase variant="insights" />

      {/* ===== PRICING ===== */}
      <motion.section
        id="pricing"
        className="py-24 bg-[#020617] border-t border-white/10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-8 text-center">
          <motion.h2
            className="text-3xl md:text-4xl font-semibold mb-3"
            variants={fadeUp}
            custom={0}
          >
            Simple, transparent pricing.
          </motion.h2>
          <motion.p
            className="text-gray-400 mb-14"
            variants={fadeUp}
            custom={0.15}
          >
            Start free. Upgrade only when you’re ready.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free */}
            <motion.div
              className="p-8 rounded-[28px] bg-white/5 border border-white/10 text-left flex flex-col justify-between"
              variants={fadeUp}
              custom={0.2}
              whileHover={{ y: -6, scale: 1.01 }}
            >
              <div>
                <h3 className="text-lg font-semibold mb-2">Free</h3>
                <p className="text-4xl font-bold my-4">$0</p>
                <p className="text-gray-300 text-sm mb-4">
                  For founders testing the waters.
                </p>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li>• 20 receipts / month</li>
                  <li>• Basic OCR</li>
                  <li>• Email support</li>
                </ul>
              </div>
              <motion.button
                className="mt-8 w-full py-3.5 bg-white text-black rounded-xl text-sm font-medium"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97, y: 0 }}
              >
                Get Started
              </motion.button>
            </motion.div>

            {/* Pro */}
            <motion.div
            className="p-8 rounded-[28px] bg-gradient-to-br from-purple-500 via-indigo-500 to-sky-400 text-left shadow-[0_24px_80px_rgba(0,0,0,0.6)] border border-white/30 scale-[1.02]"
            variants={fadeUp}
            custom={0.3}
            whileHover={{ y: -10, scale: 1.04 }}
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >

              <span className="px-3 py-1 bg-white/15 text-xs rounded-full">
                Most Popular
              </span>
              <h3 className="text-lg font-semibold mt-3 mb-2">Pro</h3>
              <p className="text-4xl font-bold my-4">$19</p>
              <p className="text-sm text-white/90 mb-4">
                For growing teams that live in their expense reports.
              </p>
              <ul className="text-sm text-white/90 space-y-2 mb-6">
                <li>• Unlimited receipts</li>
                <li>• AI-powered parsing</li>
                <li>• Auto-categorization</li>
                <li>• CSV export</li>
              </ul>
              <motion.button
                className="w-full py-3.5 bg-white text-black rounded-xl text-sm font-medium"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97, y: 0 }}
              >
                Start Free Trial
              </motion.button>
            </motion.div>

            {/* Enterprise */}
            <motion.div
              className="p-8 rounded-[28px] bg-white/5 border border-white/10 text-left flex flex-col justify-between"
              variants={fadeUp}
              custom={0.4}
              whileHover={{ y: -6, scale: 1.01 }}
            >
              <div>
                <h3 className="text-lg font-semibold mb-2">Enterprise</h3>
                <p className="text-4xl font-bold my-4">Custom</p>
                <p className="text-gray-300 text-sm mb-4">
                  For finance teams with complex workflows.
                </p>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li>• Team accounts & roles</li>
                  <li>• Priority processing pipeline</li>
                  <li>• Dedicated support & onboarding</li>
                </ul>
              </div>
              <motion.button
                className="mt-8 w-full py-3.5 bg-white/10 text-white rounded-xl text-sm font-medium border border-white/20"
                whileHover={{
                  scale: 1.03,
                  y: -2,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
                whileTap={{ scale: 0.97, y: 0 }}
              >
                Contact Sales
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 bg-[#020617] border-t border-white/10 text-center text-gray-500 text-xs">
        © {new Date().getFullYear()} ReceiptAI — All rights reserved.
      </footer>
    </main>
  );
}
