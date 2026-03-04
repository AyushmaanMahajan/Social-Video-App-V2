"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, useScroll, useTransform } from "framer-motion"

const reveal = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
}

const features = [
  {
    title: "Enter the Encounter Pool",
    description: "Join a live pool where people are ready to meet now.",
  },
  {
    title: "30-Second Introduction",
    description: "Get a short timed intro that keeps momentum high.",
  },
  {
    title: "Connect or Pass",
    description: "Mutual interest continues the interaction. Otherwise move on.",
  },
]

const differentiators = [
  {
    title: "No Endless Swiping",
    description: "Conversations start immediately instead of sitting in queues.",
  },
  {
    title: "Face-to-Face First",
    description: "Real-time video creates clarity and stronger trust signals.",
  },
  {
    title: "Structured by Design",
    description: "Time-boxed encounters reduce noise and improve quality.",
  },
]

const safetyChips = [
  "Verified Accounts",
  "Instant Reporting",
  "Moderated Reviews",
  "Leave Anytime Controls",
  "Consent-Based Matching",
]

function Reveal({ children, className = "" }) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const { scrollYProgress } = useScroll()
  const heroShapeY = useTransform(scrollYProgress, [0, 1], [0, -160])
  const heroShapeYReverse = useTransform(scrollYProgress, [0, 1], [0, 120])

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session")
        const data = await res.json()

        if (data?.user) {
          router.push("/encounter")
        } else {
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) return null

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white scroll-smooth">
      <motion.div
        className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(75%_65%_at_50%_0%,rgba(56,189,248,0.35),transparent_60%),radial-gradient(65%_60%_at_100%_20%,rgba(99,102,241,0.3),transparent_65%),radial-gradient(80%_70%_at_0%_100%,rgba(16,185,129,0.2),transparent_70%)] bg-[length:180%_180%]"
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-slate-900/20 via-slate-950/40 to-slate-950" />

      <section className="relative flex min-h-screen items-center px-4 py-20 sm:px-8 lg:px-16">
        <motion.div
          style={{ y: heroShapeY }}
          className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl sm:h-72 sm:w-72"
          animate={{ x: [0, 24, -18, 0], rotate: [0, 8, -6, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          style={{ y: heroShapeYReverse }}
          className="pointer-events-none absolute right-0 top-20 h-52 w-52 rounded-[38%_62%_55%_45%] bg-violet-300/20 blur-3xl sm:h-72 sm:w-72"
          animate={{ x: [0, -22, 14, 0], rotate: [0, -12, 8, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          style={{ y: heroShapeY }}
          className="pointer-events-none absolute bottom-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-[65%_35%_45%_55%] bg-emerald-300/20 blur-3xl sm:h-56 sm:w-56"
          animate={{ y: [0, -18, 12, 0], rotate: [0, 10, -8, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <Reveal className="relative z-10 max-w-2xl text-center lg:text-left">
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 backdrop-blur-xl">
              Live Encounter Platform
            </p>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-7xl">
              Meet Someone New
              <span className="block bg-gradient-to-r from-cyan-200 via-indigo-200 to-emerald-200 bg-clip-text text-transparent">
                In 30 Seconds
              </span>
            </h1>
            <p className="mt-6 text-base text-slate-200 sm:text-lg">
              Structured video encounters built for fast introductions, stronger trust, and safer interactions.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <motion.button
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02, y: -2 }}
                onClick={() => router.push("/encounter?auth=signup")}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-7 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition"
              >
                Create Account
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02, y: -2 }}
                onClick={() => router.push("/encounter?auth=login")}
                className="rounded-xl border border-white/35 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-xl transition hover:border-white/60"
              >
                Sign In
              </motion.button>
            </div>
            <p className="mt-4 text-xs text-slate-300">18+ only. Moderated and report-enabled.</p>
          </Reveal>

          <Reveal className="relative z-10 mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-2xl shadow-2xl shadow-black/30">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">Safety Snapshot</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatCard value="Email" label="Verification Required" />
                <StatCard value="18+" label="Age-gated Access" />
                <StatCard value="Instant" label="In-Call Reporting" />
                <StatCard value="1 Tap" label="Leave Encounter" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-8 lg:px-16">
        <Reveal className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">How It Works</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((item, index) => (
              <GlassCard key={item.title} index={index} title={item.title} description={item.description} />
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-4 py-20 sm:px-8 lg:px-16">
        <Reveal className="mx-auto max-w-5xl rounded-3xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-2xl sm:p-10">
          <h2 className="text-3xl font-bold sm:text-4xl">Built for Respectful Encounters</h2>
          <p className="mx-auto mt-5 max-w-3xl text-slate-200">
            Conversation quality improves when safety tools are built into the core flow, not hidden in settings.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {safetyChips.map((chip, index) => (
              <motion.div
                key={chip}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.45 }}
                className="rounded-xl border border-white/25 bg-slate-900/55 px-3 py-3 text-xs text-slate-100 backdrop-blur-xl sm:text-sm"
              >
                {chip}
              </motion.div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-4 py-20 sm:px-8 lg:px-16">
        <Reveal className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Why This Feels Different</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {differentiators.map((item, index) => (
              <GlassCard key={item.title} index={index} title={item.title} description={item.description} />
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-4 pb-24 pt-8 sm:px-8 lg:px-16">
        <Reveal className="mx-auto max-w-5xl rounded-3xl border border-white/20 bg-gradient-to-r from-cyan-400/20 via-indigo-400/20 to-emerald-400/20 p-8 text-center backdrop-blur-2xl sm:p-12">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to Meet Someone New?</h2>
          <p className="mt-3 text-slate-200">Create your account and complete onboarding in under a minute.</p>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/encounter?auth=signup")}
            className="mt-7 rounded-xl bg-white px-8 py-3 text-sm font-bold text-slate-900 shadow-xl shadow-black/30 sm:text-base"
          >
            Create Your Account
          </motion.button>
        </Reveal>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-slate-400 sm:text-sm">
        © {new Date().getFullYear()} · All rights reserved
      </footer>
    </main>
  )
}

function GlassCard({ index, title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.08, duration: 0.55 }}
      whileHover={{ y: -8, scale: 1.01 }}
      className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-2xl shadow-xl shadow-black/20"
    >
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm text-slate-200">{description}</p>
    </motion.div>
  )
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-xl border border-white/20 bg-slate-900/55 p-4 text-left backdrop-blur-xl">
      <p className="text-lg font-bold text-cyan-100">{value}</p>
      <p className="mt-1 text-xs text-slate-300">{label}</p>
    </div>
  )
}
