"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, useMotionValue, useSpring } from "framer-motion"

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
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

function Orb() {
  return (
    <div
      style={{
        position: "relative",
        width: "320px",
        height: "320px",
        margin: "0 auto",
      }}
    >
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
        transition={{ duration: 3, repeat: Infinity }}
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
  }, [])

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
  }, [])

  if (loading) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:wght@300;600&family=DM+Sans:wght@300;400;500&display=swap');

        :root{
          --void:#03040A;
          --deep:#070A12;
          --surface:#0C1018;
          --blue:#93D2FF;
          --border:rgba(147,210,255,0.09);
          --muted:rgba(240,244,255,0.4);
          --white:#F0F4FF;
        }

        body{
          font-family:'DM Sans',sans-serif;
          background:var(--void);
          color:var(--white);
          overflow-x:hidden;
        }

        .btn-primary{
          font-family:'Bebas Neue';
          letter-spacing:0.14em;
          background:var(--blue);
          color:black;
          padding:0 42px;
          height:54px;
          border:none;
          cursor:pointer;
        }

        .btn-ghost{
          font-family:'Bebas Neue';
          letter-spacing:0.14em;
          background:transparent;
          border:1px solid var(--border);
          color:var(--blue);
          padding:0 36px;
          height:54px;
        }

        .step-card{
          background:var(--surface);
          border:1px solid var(--border);
          padding:48px 36px;
          min-height:260px;
        }
      `}</style>

      <main style={{ minHeight: "100vh" }}>

        {/* NAV */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            padding: "22px 56px",
            display: "flex",
            justifyContent: "space-between",
            backdropFilter: "blur(18px)",
            borderBottom: "1px solid var(--border)",
            background: "rgba(3,4,10,0.8)",
            zIndex: 100,
          }}
        >
          <div style={{ fontFamily: "Bebas Neue", letterSpacing: "0.2em" }}>
            ENCOUNTER
          </div>

          <div style={{ display: "flex", gap: "30px", alignItems: "center" }}>
            <a href="#how">How it works</a>

            <motion.button
              className="btn-ghost"
              whileHover={{ scale: 1.02 }}
              onClick={() => router.push("/encounter?auth=login")}
            >
              SIGN IN
            </motion.button>
          </div>
        </nav>

        {/* HERO */}
        <section
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            padding: "0 56px",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "80px",
              alignItems: "center",
              paddingTop: "100px",
            }}
          >
            <FadeUp>
              <h1
                style={{
                  fontFamily: "Bebas Neue",
                  fontSize: "clamp(70px,8vw,110px)",
                  lineHeight: 0.95,
                  letterSpacing: "0.05em",
                }}
              >
                TALK TO
                <br />
                SOMEONE
                <br />
                <span style={{ color: "var(--blue)" }}>RIGHT NOW</span>
              </h1>

              <p
                style={{
                  marginTop: "28px",
                  maxWidth: "420px",
                  lineHeight: 1.8,
                  color: "var(--muted)",
                }}
              >
                A space designed for spontaneous conversations. Drop in,
                meet someone new, talk for a moment, and see where it goes.
                No endless feeds. Just people.
              </p>

              <div style={{ display: "flex", gap: "14px", marginTop: "40px" }}>
                <motion.button
                  className="btn-primary"
                  whileHover={{ scale: 1.03 }}
                  onClick={() => router.push("/encounter?auth=signup")}
                >
                  START TALKING
                </motion.button>

                <motion.button
                  className="btn-ghost"
                  whileHover={{ scale: 1.03 }}
                  onClick={() => router.push("/encounter?auth=login")}
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

        {/* HOW IT WORKS */}
        <section
          id="how"
          style={{
            padding: "120px 56px",
            maxWidth: "1180px",
            margin: "0 auto",
          }}
        >
          <FadeUp>
            <h2
              style={{
                fontFamily: "Bebas Neue",
                fontSize: "clamp(50px,5vw,70px)",
                marginBottom: "60px",
              }}
            >
              HOW IT WORKS
            </h2>
          </FadeUp>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: "1px",
              background: "var(--border)",
            }}
          >
            {steps.map((step, i) => (
              <FadeUp key={step.number} delay={i * 0.1}>
                <div className="step-card">
                  <div
                    style={{
                      fontFamily: "Bebas Neue",
                      fontSize: "64px",
                      color: "rgba(147,210,255,0.08)",
                    }}
                  >
                    {step.number}
                  </div>

                  <h3 style={{ marginTop: "10px" }}>{step.title}</h3>

                  <p
                    style={{
                      marginTop: "10px",
                      color: "var(--muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* SIGNALS */}
        <section
          style={{
            padding: "120px 56px",
            background: "var(--deep)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "80px",
            }}
          >
            <FadeUp>
              <h2
                style={{
                  fontFamily: "Bebas Neue",
                  fontSize: "clamp(42px,4vw,60px)",
                }}
              >
                BUILT FOR
                <br />
                REAL CONVERSATIONS
              </h2>

              <p style={{ marginTop: "20px", color: "var(--muted)" }}>
                Simple controls and lightweight moderation keep interactions
                comfortable without getting in the way of the conversation.
              </p>
            </FadeUp>

            <FadeUp delay={0.2}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {signals.map((s) => (
                  <div
                    key={s}
                    style={{
                      padding: "16px 20px",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            padding: "140px 56px",
            textAlign: "center",
          }}
        >
          <FadeUp>
            <h2
              style={{
                fontFamily: "Bebas Neue",
                fontSize: "clamp(60px,7vw,90px)",
              }}
            >
              JOIN THE
              <br />
              CONVERSATION
            </h2>

            <p style={{ marginTop: "24px", color: "var(--muted)" }}>
              It takes less than a minute to start.
            </p>

            <motion.button
              className="btn-primary"
              style={{ marginTop: "40px", fontSize: "20px", height: "58px" }}
              whileHover={{ scale: 1.05 }}
              onClick={() => router.push("/encounter?auth=signup")}
            >
              START NOW
            </motion.button>
          </FadeUp>
        </section>

        <footer
          style={{
            borderTop: "1px solid var(--border)",
            padding: "26px 56px",
            background: "var(--deep)",
            textAlign: "center",
            fontSize: "12px",
            color: "var(--muted)",
          }}
        >
          © {new Date().getFullYear()} Encounter
        </footer>
      </main>
    </>
  )
}