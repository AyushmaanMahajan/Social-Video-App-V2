"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { motionEase } from "@/lib/motion"

const steps = [
  {
    number: "01",
    title: "Enter the Room",
    description:
      "Join a live pool of people who are ready to talk right now.",
  },
  {
    number: "02",
    title: "30 Second Intro",
    description:
      "A short introduction window lets both people get a quick feel for the interaction.",
  },
  {
    number: "03",
    title: "Continue or Move On",
    description:
      "If both people want to keep talking, the conversation continues. Otherwise you move on.",
  },
]

const signals = [
  "Real-time moderation",
  "Easy in-call reporting",
  "Quick leave controls",
  "Identity signal checks",
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

function Orb() {
  return (
    <div className="landing-orb">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            inset: `${i * 26}px`,
            borderRadius: "50%",
            border: `1px solid rgba(147,210,255,${0.15 - i * 0.04})`,
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 20 + i * 8, repeat: Infinity, ease: "linear" }}
        />
      ))}

      <motion.div
        style={{
          position: "absolute",
          inset: "80px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(147,210,255,0.25) 0%, rgba(147,210,255,0.04) 60%, transparent 100%)",
        }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: motionEase }}
      />
    </div>
  )
}

export default function Home() {
  const router = useRouter()
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
        <div className="display heading-md landing-brand">ENCOUNTER</div>

        <div className="landing-nav-links">
          <a href="#how">How it works</a>
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
            <h1 className="display heading-xl">
              TALK TO
              <br />
              SOMEONE
              <br />
              <span className="text-accent">RIGHT NOW</span>
            </h1>

            <p className="landing-copy text-muted">
              A space designed for spontaneous conversations. Drop in, meet
              someone new, talk for a moment, and see where it goes. No endless
              feeds. Just people.
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
              <Orb />
            </motion.div>
          </FadeUp>
        </div>
      </section>

      <section id="how" className="section">
        <div className="container">
          <FadeUp>
            <div className="accent-line" />
            <h2 className="display heading-lg landing-how-title">HOW IT WORKS</h2>
          </FadeUp>

          <div className="landing-steps-grid">
            {steps.map((step, i) => (
              <FadeUp key={step.number} delay={i * 0.1}>
                <article className="card landing-step-card">
                  <div className="display landing-step-number">{step.number}</div>
                  <h3 className="heading-md landing-step-title">{step.title}</h3>
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
              BUILT FOR
              <br />
              REAL CONVERSATIONS
            </h2>

            <p className="landing-signals-copy text-muted">
              Simple controls and lightweight moderation keep interactions
              comfortable without getting in the way of the conversation.
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
              JOIN THE
              <br />
              CONVERSATION
            </h2>

            <p className="landing-cta-copy text-muted">
              It takes less than a minute to start.
            </p>

            <motion.button
              className="btn btn-primary landing-cta-btn"
              whileHover={{ scale: 1.05 }}
              onClick={() => router.push("/encounter?auth=signup")}
              transition={{ ease: motionEase }}
            >
              START NOW
            </motion.button>
          </FadeUp>
        </div>
      </section>

      <footer className="landing-footer text-muted">
        (c) {new Date().getFullYear()} Encounter
      </footer>
    </main>
  )
}
