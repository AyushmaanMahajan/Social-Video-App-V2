"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { motionEase } from "@/lib/motion"
import { useThemePreference } from "@/lib/useThemePreference"
import { MoonIcon, SunIcon } from "@/components/UiIcons"

const steps = [
  {
    number: "01",
    title: "Introduce Yourself",
    description:
      "Create a simple profile so others know who's joining the conversation.",
  },
  {
    number: "02",
    title: "Connect With People You Like",
    description:
      "Look through profiles and choose someone who seems interesting.",
  },
  {
    number: "03",
    title: "Have a Real Conversation",
    description:
      "Start a video chat and enjoy the moment.",
  },
]

const signals = [
  "Quick leave controls",
  "Lightweight moderation",
  "In-call reporting tools",
  "Respectful community guidelines",
]

function FadeUp({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, ease: motionEase, delay }}
    >
      {children}
    </motion.div>
  )
}

function BrandVisual({ isDark }) {
  return (
    <div className="landing-brand-visual">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            inset: `${i * 20}px`,
            borderRadius: "32px",
            border: `1px solid ${isDark
              ? `rgba(255,200,87,${0.16 - i * 0.04})`
              : `rgba(255,140,66,${0.16 - i * 0.04})`}`,
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 20 + i * 8, repeat: Infinity, ease: "linear" }}
        />
      ))}

      <motion.div
        className="landing-brand-panel"
        animate={{ y: [0, -12, 0], rotate: [-1, 1, -1] }}
        transition={{ duration: 6, repeat: Infinity, ease: motionEase }}
      >
        <div className="landing-brand-glow" aria-hidden="true" />
        <img src="/jellyfishLogo.png" alt="CNXR logo" className="landing-brand-panel-mark" />
      </motion.div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const { isDark, toggleTheme } = useThemePreference()
  const [loading, setLoading] = useState(true)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 40, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 40, damping: 20 })

  useEffect(() => {
    const move = (e) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 30)
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 30)
    }

    window.addEventListener("mousemove", move)
    return () => window.removeEventListener("mousemove", move)
  }, [mouseX, mouseY])

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session")
        const data = await res.json()

        if (data?.user) router.push("/encounter")
        else setLoading(false)
      } catch {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) return null

  return (
    <main className="landing-home">
      <nav className="landing-nav">
        <div className="landing-brand" aria-label="CNXR">
          <img src="/jellyfishLogo.png" alt="" aria-hidden="true" className="landing-brand-mark" />
          <span className="display heading-md landing-brand-wordmark">CNXR</span>
        </div>

        <div className="landing-nav-links">
          <a href="#how">How it works</a>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <SunIcon className="button-icon" /> : <MoonIcon className="button-icon" />}
            <span className="theme-toggle-label">{isDark ? "Light" : "Dark"}</span>
          </button>
          <motion.button
            className="btn btn-ghost"
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push("/encounter?auth=login")}
            transition={{ ease: motionEase }}
          >
            SIGN IN
          </motion.button>
        </div>
      </nav>

      <section className="section landing-hero">
        <div className="container landing-hero-grid">
          <FadeUp>
            <p className="landing-kicker">CNXR</p>
            <h1 className="display heading-xl">
              CNXR
              <br />
              STEP IN
              <br />
              <span className="text-accent">SEE WHERE IT GOES</span>
            </h1>

            <p className="landing-copy text-muted">
              CNXR is built for spontaneous conversations. Drop in, meet someone
              new, talk for a minute, and move on whenever you want. No endless
              feeds. No pressure. Just people who mutually want to connect.
            </p>

            <div className="landing-hero-actions">
              <motion.button
                className="btn btn-primary"
                whileHover={{ scale: 1.03 }}
                onClick={() => router.push("/encounter?auth=signup")}
                transition={{ ease: motionEase }}
              >
                START TALKING
              </motion.button>

              <motion.button
                className="btn btn-ghost"
                whileHover={{ scale: 1.03 }}
                onClick={() => router.push("/encounter?auth=login")}
                transition={{ ease: motionEase }}
              >
                SIGN IN
              </motion.button>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <motion.div style={{ x: springX, y: springY }}>
              <BrandVisual isDark={isDark} />
            </motion.div>
          </FadeUp>
        </div>
      </section>

      <section id="how" className="section">
        <div className="container">
          <FadeUp>
            <div className="accent-line" />
            <h2 className="display heading-lg landing-how-title">
              HOW IT WORKS
            </h2>
          </FadeUp>

          <div className="landing-steps-grid">
            {steps.map((step, i) => (
              <FadeUp key={step.number} delay={i * 0.1}>
                <article className="card landing-step-card">
                  <div className="display landing-step-number">{step.number}</div>
                  <h3 className="heading-md landing-step-title">
                    {step.title}
                  </h3>
                  <p className="landing-step-description text-muted">
                    {step.description}
                  </p>
                </article>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      <section className="section landing-signals-section">
        <div className="container landing-signals-grid">
          <FadeUp>
            <div className="accent-line" />
            <h2 className="display heading-lg">
              A BETTER
              <br />
              WAY TO SOCIALIZE
            </h2>

            <p className="landing-signals-copy text-muted">
              Designed to keep conversations easy and comfortable. Simple
              controls and thoughtful moderation help people interact without
              the noise of typical social platforms.
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div className="landing-signals-list">
              {signals.map((signal) => (
                <div key={signal} className="surface landing-signal-item">
                  {signal}
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="section landing-cta">
        <div className="container">
          <FadeUp>
            <h2 className="display heading-xl">
              READY TO
              <br />
              STEP IN?
            </h2>

            <p className="landing-cta-copy text-muted">
              Join the conversation and see who you meet.
            </p>

            <motion.button
              className="btn btn-primary landing-cta-btn"
              whileHover={{ scale: 1.05 }}
              onClick={() => router.push("/encounter?auth=signup")}
              transition={{ ease: motionEase }}
            >
              START TALKING
            </motion.button>
          </FadeUp>
        </div>
      </section>

      <footer className="landing-footer text-muted">
        &copy; {new Date().getFullYear()} CNXR
      </footer>
    </main>
  )
}
