import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin, ShoppingCart, ArrowRight } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/about")({
  component: About,
  async beforeLoad() {
    const session = await authClient.getSession();
    if (session.error || !session.data) {
      const { error } = await authClient.signIn.anonymous();
      if (error) throw new Error("Failed to do create anonymous session");
    }
  },
});

const DAYS = [
  { short: "MON", long: "Monday" },
  { short: "TUE", long: "Tuesday" },
  { short: "WED", long: "Wednesday" },
  { short: "THU", long: "Thursday" },
  { short: "FRI", long: "Friday" },
] as const;

function About() {
  return (
    <div
      className="relative min-h-screen overflow-hidden font-serif"
      style={{
        background:
          "radial-gradient(1200px 600px at 90% -10%, #F9C74F 0%, transparent 60%), radial-gradient(900px 500px at -10% 30%, #B8E3EC 0%, transparent 55%), linear-gradient(180deg, #FFF4E6 0%, #FDE6D3 100%)",
        color: "#1a1208",
      }}
    >
      {/* Grain / paper texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.6  0 0 0 0 0.3  0 0 0 0 0.1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 pt-8 pb-24 md:px-10 md:pt-12">
        {/* Top nav crumb */}
        <nav className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border-2 border-black/80 bg-white/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
          >
            ← Back to menu
          </Link>
        </nav>

        {/* HERO */}
        <header className="relative mt-10 md:mt-16">
          <p
            className="mb-4 inline-block rotate-[-2deg] rounded-full px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-white"
            style={{ background: "#E8573F", boxShadow: "3px 3px 0 0 #000" }}
          >
            • About Saangee's Kitchen •
          </p>

          <h1
            className="relative leading-[0.82] tracking-tight"
            style={{ fontFamily: "'MoreSugar', serif" }}
          >
            <span
              className="block text-[18vw] md:text-[11rem]"
              style={{ color: "#E8573F" }}
            >
              Home food,
            </span>
            <span
              className="-mt-2 block pl-[6%] text-[18vw] italic md:text-[11rem]"
              style={{ color: "#0E5A66", transform: "rotate(-1.5deg)", display: "inline-block" }}
            >
              with masala.
            </span>
          </h1>

          <div className="mt-10 grid gap-8 md:grid-cols-12">
            <p className="md:col-span-7 md:col-start-2 text-xl md:text-2xl leading-[1.5]">
              We're a tiny neighborhood kitchen in Livingston, NJ, cooking{" "}
              <em className="not-italic font-bold" style={{ color: "#E8573F" }}>
                Indian food
              </em>{" "}
              plus Indian-leaning versions of whatever else we're craving,
              fresh every weekday. One rotating menu. Three to five dishes a
              day. No mystery, no fuss, just dinner that tastes like somebody
              loved you today.
            </p>
          </div>
        </header>

        {/* RITUAL STRIP */}
        <section className="relative mt-24">
          <div className="mb-6 flex items-baseline justify-between">
            <h2
              className="text-3xl md:text-5xl"
              style={{ fontFamily: "'MoreSugar', serif", color: "#1a1208" }}
            >
              The weekly ritual
            </h2>
            <span
              className="hidden text-xs font-bold uppercase tracking-[0.3em] md:inline"
              style={{ color: "#0E5A66" }}
            >
              Mon → Fri / 3–5 dishes daily
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
            {DAYS.map((d, i) => {
              const rotations = ["-2deg", "1.5deg", "-1deg", "2.5deg", "-2deg"];
              const bg = i % 2 === 0 ? "#B8E3EC" : "#FFE3A3";
              return (
                <div
                  key={d.short}
                  className="group relative border-[3px] border-black p-4 transition-transform hover:-translate-y-1"
                  style={{
                    background: bg,
                    transform: `rotate(${rotations[i]})`,
                    boxShadow: "6px 6px 0 0 #1a1208",
                  }}
                >
                  <div
                    className="text-3xl md:text-4xl"
                    style={{ fontFamily: "'MoreSugar', serif", color: "#E8573F" }}
                  >
                    {d.short}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{d.long}</div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 max-w-2xl text-base md:text-lg opacity-85">
            Menus drop weekly. You order a day (or a few) in advance, we cook it
            that morning, and at pickup you get it warm, boxed, and labeled.
            Nothing sits overnight.
          </p>
        </section>

        {/* MANIFESTO */}
        <section className="relative mt-28">
          <div className="grid gap-6 md:grid-cols-12">
            <div
              className="relative md:col-span-8 md:col-start-1 border-[3px] border-black p-8 md:p-12"
              style={{
                background: "#E8573F",
                color: "#FFF4E6",
                boxShadow: "10px 10px 0 0 #0E5A66",
              }}
            >
              <span
                className="absolute -top-5 left-6 rotate-[-4deg] border-2 border-black bg-[#FFE3A3] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ color: "#1a1208" }}
              >
                the house rules
              </span>
              <h3
                className="text-4xl md:text-6xl leading-[0.95]"
                style={{ fontFamily: "'MoreSugar', serif" }}
              >
                Small batch.<br />
                Hand-ground masala.<br />
                <span className="italic" style={{ color: "#FFE3A3" }}>
                  Zero shortcuts.
                </span>
              </h3>
              <p className="mt-6 max-w-xl text-lg leading-relaxed opacity-95">
                Our dals are tempered, not stirred from a jar. Our paneer shows
                up crumbling into curries because someone actually cubed it.
                When we do an Indian-style take on Thai curry or a Mexican
                bowl, it's because we love both, not because it's trendy.
              </p>
            </div>

            <div
              className="md:col-span-4 md:col-start-9 md:-mt-10 border-[3px] border-black p-6"
              style={{
                background: "#FFF4E6",
                transform: "rotate(2deg)",
                boxShadow: "6px 6px 0 0 #000",
              }}
            >
              <div
                className="text-[11px] font-bold uppercase tracking-[0.3em]"
                style={{ color: "#E8573F" }}
              >
                Serving
              </div>
              <div
                className="mt-2 text-5xl leading-none"
                style={{ fontFamily: "'MoreSugar', serif" }}
              >
                Livingston
              </div>
              <div className="mt-1 text-sm font-semibold opacity-80">
                & close-by towns
              </div>
              <div className="mt-5 h-px w-full bg-black/20" />
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-block h-2 w-2 rounded-full"
                    style={{ background: "#E8573F" }}
                  />
                  <span>
                    <strong>Pickup</strong> at the kitchen, always free
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-block h-2 w-2 rounded-full"
                    style={{ background: "#0E5A66" }}
                  />
                  <span>
                    <strong>Delivery</strong> if you're in the neighborhood
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-block h-2 w-2 rounded-full"
                    style={{ background: "#F9C74F" }}
                  />
                  <span>
                    <strong>Order ahead</strong>, we cook to the count
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT STAMPS */}
        <section className="relative mt-28">
          <h2
            className="mb-10 text-4xl md:text-6xl"
            style={{ fontFamily: "'MoreSugar', serif" }}
          >
            Come say <span style={{ color: "#E8573F" }}>hi</span>.
          </h2>

          <div className="grid gap-5 md:grid-cols-3">
            <a
              href="tel:+17325892069"
              className="group relative block border-[3px] border-black bg-white p-6 transition-all hover:-translate-y-1 hover:rotate-[-1deg]"
              style={{ boxShadow: "8px 8px 0 0 #E8573F" }}
            >
              <Phone
                className="mb-4 h-7 w-7"
                style={{ color: "#E8573F" }}
                strokeWidth={2.5}
              />
              <div
                className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-60"
              >
                Call the kitchen
              </div>
              <div
                className="mt-1 text-3xl"
                style={{ fontFamily: "'MoreSugar', serif" }}
              >
                732 · 589 · 2069
              </div>
              <ArrowRight
                className="absolute right-5 top-5 h-5 w-5 transition-transform group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </a>

            <a
              href="mailto:support@saangeeskitchen.com"
              className="group relative block border-[3px] border-black p-6 transition-all hover:-translate-y-1 hover:rotate-[1deg]"
              style={{ background: "#B8E3EC", boxShadow: "8px 8px 0 0 #0E5A66" }}
            >
              <Mail
                className="mb-4 h-7 w-7"
                style={{ color: "#0E5A66" }}
                strokeWidth={2.5}
              />
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-60">
                Write us a note
              </div>
              <div
                className="mt-1 break-all text-2xl md:text-[1.7rem]"
                style={{ fontFamily: "'MoreSugar', serif" }}
              >
                support@<br />saangeeskitchen.com
              </div>
              <ArrowRight
                className="absolute right-5 top-5 h-5 w-5 transition-transform group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </a>

            <a
              href="https://maps.google.com/?q=19+Cornell+Drive+Livingston+NJ+07039"
              target="_blank"
              rel="noreferrer"
              className="group relative block border-[3px] border-black p-6 transition-all hover:-translate-y-1 hover:rotate-[-1deg]"
              style={{ background: "#FFE3A3", boxShadow: "8px 8px 0 0 #1a1208" }}
            >
              <MapPin
                className="mb-4 h-7 w-7"
                style={{ color: "#1a1208" }}
                strokeWidth={2.5}
              />
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-60">
                Pick up at
              </div>
              <div
                className="mt-1 text-3xl leading-[1.05]"
                style={{ fontFamily: "'MoreSugar', serif" }}
              >
                19 Cornell Drive<br />
                <span style={{ color: "#E8573F" }}>Livingston, NJ 07039</span>
              </div>
              <ArrowRight
                className="absolute right-5 top-5 h-5 w-5 transition-transform group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="relative mt-28">
          <div
            className="relative overflow-hidden border-[3px] border-black p-10 md:p-16"
            style={{
              background:
                "repeating-linear-gradient(135deg, #1a1208 0 14px, #0E5A66 14px 28px)",
              color: "#FFF4E6",
              boxShadow: "12px 12px 0 0 #E8573F",
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] opacity-80">
              This week's menu is live
            </p>
            <h3
              className="mt-3 text-5xl md:text-7xl leading-[0.95]"
              style={{ fontFamily: "'MoreSugar', serif" }}
            >
              Hungry already?
            </h3>
            <p className="mt-4 max-w-xl text-lg opacity-90">
              See what we're cooking Monday through Friday and get your order
              in before the pot empties.
            </p>
            <Link
              to="/"
              className="mt-8 inline-flex items-center gap-3 border-[3px] border-black bg-[#FFE3A3] px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-[#1a1208] transition-all hover:-translate-y-0.5 hover:bg-white"
              style={{ boxShadow: "6px 6px 0 0 #000" }}
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={3} />
              Take me to the menu
            </Link>
          </div>
        </section>

        {/* Footer stamp */}
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-black/15 pt-6 text-[11px] font-bold uppercase tracking-[0.3em] opacity-70">
          <span>Made by hand · Cooked to order</span>
          <span>Saangee's Kitchen · Livingston, NJ</span>
        </footer>
      </div>
    </div>
  );
}
