"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

const reveal = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
  },
}

const steps = [
  {
    title: "Enter the Pool",
    description: "Step into a live queue of people ready for real-time conversation.",
  },
  {
    title: "30 Second Intro",
    description: "Get a fast first impression with a structured, time-boxed encounter.",
  },
  {
    title: "Connect or Pass",
    description: "Continue only when interest is mutual. No endless swiping loops.",
  },
]

const safetyPoints = [
  "Verified identity signals",
  "Instant in-call reporting",
  "Fast block and leave controls",
  "Active moderation review",
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
    <main className="relative min-h-screen overflow-x-hidden bg-[#06080F] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-[0.04] bg-[url('/noise.png')] mix-blend-overlay" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />

      <motion.div
        className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(70%_60%_at_20%_15%,rgba(168,85,247,0.28),transparent_65%),radial-gradient(68%_62%_at_85%_20%,rgba(91,140,255,0.26),transparent_68%),radial-gradient(60%_55%_at_50%_90%,rgba(168,85,247,0.16),transparent_70%)] bg-[length:160%_160%]"
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#06080F]/30 via-[#06080F]/70 to-[#06080F]" />

      {/* HERO */}
      <section className="bg-[#06080F] px-4 py-32 sm:px-8 lg:px-16">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <Reveal className="relative text-center lg:text-left">
            <div className="absolute left-1/2 top-40 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#A855F7]/20 blur-[160px]" />

            <p className="relative inline-flex rounded-full bg-[#0B0F1A]/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#C6D7FF] shadow-[0_10px_40px_rgba(91,140,255,0.12)] backdrop-blur-xl">
              Future of Video Encounters
            </p>
            <h1 className="relative mt-6 text-5xl font-black leading-[1.05] sm:text-6xl lg:text-[82px]">
              Meet Someone
              <span className="block bg-gradient-to-r from-[#5B8CFF] to-[#A855F7] bg-clip-text text-transparent">
                In 30 Seconds
              </span>
            </h1>
            <p className="relative mt-6 max-w-xl text-base text-slate-200 sm:text-lg">
              A futuristic encounter flow designed for fast connection, stronger trust, and safer conversations.
            </p>

            <div className="relative mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(168,85,247,0.2)",
                    "0 0 40px rgba(168,85,247,0.6)",
                    "0 0 20px rgba(168,85,247,0.2)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                onClick={() => router.push("/encounter?auth=signup")}
                className="rounded-xl bg-gradient-to-r from-[#5B8CFF] to-[#A855F7] px-10 py-4 text-base font-bold text-white"
              >
                Create Account
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/encounter?auth=login")}
                className="rounded-xl bg-[#0B0F1A]/90 px-10 py-4 text-base font-semibold text-slate-100 shadow-[0_10px_40px_rgba(91,140,255,0.12)] backdrop-blur-xl"
              >
                Sign In
              </motion.button>
            </div>
          </Reveal>

          <Reveal className="mx-auto w-full max-w-md">
            <div className="relative mx-auto h-[420px] w-[420px] max-w-full">
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-[#5B8CFF] to-[#A855F7] opacity-60 blur-[120px]"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 6, repeat: Infinity }}
              />

              <motion.div
                className="absolute inset-0 rounded-full border border-[#5B8CFF]/40"
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              />

              <motion.div
                className="absolute inset-16 rounded-full border border-[#A855F7]/40"
                animate={{ rotate: -360 }}
                transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              />

              <motion.div
                className="absolute inset-32 rounded-full bg-[#5B8CFF]/30 blur-xl"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* SIGNAL */}
      <section className="bg-[#0B0F1A] px-4 py-32 sm:px-8 lg:px-16">
        <Reveal className="mx-auto max-w-5xl rounded-3xl bg-[#0B0F1A]/90 p-8 backdrop-blur-2xl shadow-[0_10px_40px_rgba(91,140,255,0.12)]">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Signal Connection</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-200">
            Real-time handshake and matching is designed to be fast, transparent, and resilient.
          </p>

          <div className="relative mx-auto mt-10 h-36 w-full max-w-3xl">
            <div className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#5B8CFF] shadow-[0_0_20px_#5B8CFF]" />
            <div className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#A855F7] shadow-[0_0_20px_#A855F7]" />
            <div className="absolute left-6 right-6 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-[#5B8CFF]/20 via-[#A855F7] to-[#A855F7]/20" />

            <motion.div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#5B8CFF]"
              style={{ left: "1.5rem" }}
              animate={{ left: ["1.5rem", "calc(100% - 1.75rem)", "1.5rem"], opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#A855F7]"
              style={{ right: "1.5rem" }}
              animate={{ right: ["1.5rem", "calc(100% - 1.75rem)", "1.5rem"], opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#06080F] px-4 py-32 sm:px-8 lg:px-16">
        <Reveal className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">How It Works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                className="rounded-2xl bg-[#0B0F1A] p-7 shadow-[0_10px_40px_rgba(91,140,255,0.12)]"
              >
                <div className="mb-3 text-sm font-bold text-[#A855F7]">Step {index + 1}</div>
                <h3 className="text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 text-sm text-slate-300">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* SAFETY + PHILOSOPHY */}
      <section className="bg-[#0B0F1A] px-4 py-32 sm:px-8 lg:px-16">
        <Reveal className="mx-auto max-w-5xl rounded-3xl bg-[#0B0F1A]/90 p-8 text-center backdrop-blur-2xl shadow-[0_10px_40px_rgba(168,85,247,0.14)] sm:p-10">
          <div className="mx-auto mb-8 h-24 w-24 rounded-full bg-[#A855F7]/30 blur-2xl" />
          <h2 className="text-3xl font-bold sm:text-4xl">Safety by Default</h2>
          <p className="mx-auto mt-4 max-w-3xl text-slate-200">
            The experience is designed so users can stay in control from first contact to final decision.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {safetyPoints.map((point, index) => (
              <motion.div
                key={point}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.45 }}
                className="rounded-xl bg-[#06080F]/80 px-4 py-3 text-sm text-slate-100 shadow-[0_10px_40px_rgba(91,140,255,0.08)]"
              >
                {point}
              </motion.div>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            “Technology should reduce noise, not attention. The best connections happen when design protects time,
            intent, and safety.”
          </p>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="bg-[#06080F] px-4 pb-24 pt-8 sm:px-8 lg:px-16">
        <Reveal className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-[#5B8CFF]/25 via-[#0B0F1A]/90 to-[#A855F7]/25 p-8 text-center backdrop-blur-2xl shadow-[0_10px_40px_rgba(168,85,247,0.14)] sm:p-12">
          <h2 className="text-5xl font-bold">Ready to Connect?</h2>
          <p className="mt-3 text-slate-200">Create your account and step into your first 30-second encounter.</p>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              boxShadow: [
                "0 0 20px rgba(168,85,247,0.3)",
                "0 0 50px rgba(168,85,247,0.7)",
                "0 0 20px rgba(168,85,247,0.3)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            onClick={() => router.push("/encounter?auth=signup")}
            className="mt-7 rounded-xl bg-gradient-to-r from-[#5B8CFF] to-[#A855F7] px-10 py-4 text-base font-bold text-white"
          >
            Create Account
          </motion.button>
          <p className="mt-3 text-xs text-slate-400">Takes less than 60 seconds · 18+ community</p>
        </Reveal>
      </section>
    </main>
  )
}
