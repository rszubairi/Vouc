import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { StoreBadges } from "../components/StoreBadges";

export const metadata: Metadata = {
  title: "Vouch — Connect. Learn. Grow.",
  description:
    "VOUCH is a trusted community platform for meaningful professional relationships, knowledge sharing and new opportunities.",
};

const FEATURES: {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "discussions",
    title: "Discussions",
    description:
      "Start topic-based discussions, ask questions, exchange ideas, seek recommendations and participate in meaningful conversations — organized by subject rather than endless chat streams.",
    icon: (
      <>
        <path d="M9 12h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H15l-5 4v-4H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
        <path d="M31 6H14a2 2 0 0 0-2 2v3" strokeOpacity="0.55" />
      </>
    ),
  },
  {
    key: "directory",
    title: "Directory",
    description:
      "Discover professionals, businesses and organizations through a searchable directory organized by industry and expertise.",
    icon: (
      <>
        <circle cx="17" cy="16" r="5" />
        <path d="M8 30c0-5 4-8 9-8s9 3 9 8" />
        <circle cx="30" cy="30" r="8" strokeOpacity="0.55" />
        <path d="M33 33l4 4" strokeOpacity="0.55" />
      </>
    ),
  },
  {
    key: "knowledge",
    title: "Knowledge Hub",
    description:
      "Access articles, guides, seminars, webinars, training resources, videos and practical tools shared by the community.",
    icon: (
      <>
        <path d="M8 10a3 3 0 0 1 3-3h9v26h-9a3 3 0 0 1-3-3Z" />
        <path d="M32 10a3 3 0 0 0-3-3h-9v26h9a3 3 0 0 0 3-3Z" strokeOpacity="0.55" />
      </>
    ),
  },
  {
    key: "events",
    title: "Global Events",
    description:
      "Explore networking events, seminars, workshops, webinars and conferences from around the world — online or in person, wherever your business or travels may take you.",
    icon: (
      <>
        <rect x="7" y="9" width="26" height="23" rx="2.5" />
        <path d="M7 16h26" />
        <path d="M13 5v6M27 5v6" strokeOpacity="0.55" />
        <circle cx="20" cy="24" r="3" strokeOpacity="0.55" />
      </>
    ),
  },
  {
    key: "network",
    title: "My Network",
    description:
      "Build trusted professional relationships and expand your network through meaningful introductions and community engagement.",
    icon: (
      <>
        <circle cx="20" cy="10" r="4" />
        <circle cx="9" cy="28" r="4" strokeOpacity="0.55" />
        <circle cx="31" cy="28" r="4" strokeOpacity="0.55" />
        <path d="M20 14v6m0 0-9 6m9-6 9 6" />
      </>
    ),
  },
  {
    key: "notifications",
    title: "Notifications",
    description:
      "Stay informed about discussions, upcoming events, new resources and important community updates.",
    icon: (
      <>
        <path d="M20 6a8 8 0 0 0-8 8v6l-3 5h22l-3-5v-6a8 8 0 0 0-8-8Z" />
        <path d="M17 29a3 3 0 0 0 6 0" strokeOpacity="0.55" />
      </>
    ),
  },
];

const ROADMAP = [
  "Premium training",
  "Online courses",
  "Certification programs",
  "AI-assisted learning",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FBF6E9] text-black">
      <SiteHeader />
      <Hero />
      <SocialProofStrip />
      <FeatureGrid />
      <RoadmapSection />
      <DownloadSection />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-[#FBF6E9]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/vouch-icon.png"
            alt="Vouch"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-lg font-bold tracking-tight">Vouch</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-black/60">
          <a href="#features" className="hover:text-black transition-colors">
            Features
          </a>
          <a href="#roadmap" className="hover:text-black transition-colors">
            What&apos;s Next
          </a>
          <a href="#download" className="hover:text-black transition-colors">
            Download
          </a>
        </nav>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 bg-black text-white text-sm font-semibold rounded-full px-4 py-2 hover:bg-neutral-800 transition-colors"
        >
          Secure Login
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift-a absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#F2650C]/20 blur-3xl" />
        <div className="animate-drift-b absolute top-0 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#F5EFE0] blur-3xl" />
        <div className="animate-drift-c absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-[#F2650C]/10 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-in-up">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-[#F2650C] bg-[#F2650C]/10 rounded-full px-3 py-1 mb-5">
            A trusted community platform
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5">
            Connect. Learn.
            <br />
            <span className="text-[#F2650C]">Grow.</span>
          </h1>
          <p className="text-base md:text-lg text-black/65 leading-relaxed mb-8 max-w-md">
            VOUCH helps you build meaningful professional relationships,
            exchange knowledge, discover opportunities and grow — together.
            Structured, searchable, and organized around what matters.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-black text-white font-semibold rounded-full px-6 py-3 hover:bg-neutral-800 transition-colors"
            >
              Secure Login
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <a
              href="#download"
              className="inline-flex items-center gap-2 border border-black/15 font-semibold rounded-full px-6 py-3 hover:border-black/40 transition-colors"
            >
              Get the App
            </a>
          </div>
        </div>

        <div className="animate-fade-in-up [animation-delay:150ms]">
          <NetworkGraphic />
        </div>
      </div>
    </section>
  );
}

function NetworkGraphic() {
  const nodes = [
    { cx: 200, cy: 60, r: 4, delay: "0s" },
    { cx: 90, cy: 130, r: 4, delay: "0.4s" },
    { cx: 310, cy: 130, r: 4, delay: "0.8s" },
    { cx: 60, cy: 250, r: 4, delay: "1.2s" },
    { cx: 200, cy: 300, r: 4, delay: "1.6s" },
    { cx: 340, cy: 250, r: 4, delay: "2s" },
  ];
  const lines = [
    "M200,60 L90,130",
    "M200,60 L310,130",
    "M90,130 L60,250",
    "M90,130 L200,300",
    "M310,130 L340,250",
    "M310,130 L200,300",
    "M60,250 L200,300",
    "M340,250 L200,300",
  ];

  return (
    <div className="relative mx-auto w-full max-w-md aspect-square animate-float-y">
      <svg viewBox="0 0 400 360" className="w-full h-full" fill="none">
        {lines.map((d, i) => (
          <path
            key={d}
            d={d}
            pathLength={1}
            stroke="#F2650C"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="animate-line-draw"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        ))}
        {nodes.map((n) => (
          <g key={`${n.cx}-${n.cy}`}>
            <circle
              cx={n.cx}
              cy={n.cy}
              r={n.r + 8}
              fill="#F2650C"
              opacity="0.12"
            />
            <circle
              cx={n.cx}
              cy={n.cy}
              r={n.r}
              fill="#F2650C"
              className="animate-node-pulse"
              style={{ animationDelay: n.delay }}
            />
          </g>
        ))}
        <circle
          cx="200"
          cy="180"
          r="34"
          fill="#000"
        />
        <text
          x="200"
          y="186"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill="#F5EFE0"
        >
          V
        </text>
      </svg>
    </div>
  );
}

function SocialProofStrip() {
  const items = [
    "Entrepreneurs",
    "Professionals",
    "Business Owners",
    "Creators",
    "Students",
    "Organizations",
  ];
  return (
    <section className="border-y border-black/5 bg-white/50">
      <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-medium text-black/50">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
          Everything a community needs, in one place
        </h2>
        <p className="text-black/60 leading-relaxed">
          Unlike traditional social media, VOUCH organizes conversations,
          resources and events into a structured, searchable experience —
          making it easier to connect with the right people and access what
          matters.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f) => (
          <div
            key={f.key}
            className="group relative bg-white border border-black/8 rounded-2xl p-6 hover:border-[#F2650C]/40 hover:shadow-lg hover:shadow-[#F2650C]/5 transition-all"
          >
            <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
              <svg
                viewBox="0 0 64 64"
                className="absolute inset-0 w-full h-full text-[#F2650C]/25 animate-spin-slow"
                fill="none"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="27"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="5 9"
                  strokeLinecap="round"
                />
              </svg>
              <svg
                viewBox="0 0 40 40"
                className="relative w-8 h-8 text-black group-hover:text-[#F2650C] transition-colors"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {f.icon}
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
            <p className="text-sm text-black/60 leading-relaxed">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoadmapSection() {
  return (
    <section id="roadmap" className="bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-[#F2650C] bg-[#F2650C]/15 rounded-full px-3 py-1 mb-5">
            Looking Ahead
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-5">
            Built for lifelong learning
          </h2>
          <p className="text-white/60 leading-relaxed max-w-md">
            VOUCH continues to evolve with new features designed to support
            lifelong learning and professional growth — helping members and
            organizations build stronger communities.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {ROADMAP.map((item, i) => (
            <div
              key={item}
              className="animate-fade-in-up border border-white/10 bg-white/5 rounded-xl px-5 py-6 text-center hover:border-[#F2650C]/50 transition-colors"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span className="text-sm font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadSection() {
  return (
    <section id="download" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift-a absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[#F2650C]/10 blur-3xl" />
      </div>
      <div className="relative max-w-3xl mx-auto px-6 py-20 md:py-28 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
          Join VOUCH today
        </h2>
        <p className="text-black/60 leading-relaxed mb-10 max-w-lg mx-auto">
          Become part of a community where meaningful connections, knowledge
          sharing and new opportunities come together.
        </p>
        <div className="flex justify-center mb-4">
          <StoreBadges />
        </div>
        <p className="text-xs text-black/40">
          Already have an account?{" "}
          <Link href="/login" className="text-[#F2650C] font-semibold hover:underline">
            Sign in securely
          </Link>
        </p>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-black/5 bg-white/50">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image
            src="/vouch-icon.png"
            alt="Vouch"
            width={22}
            height={22}
            className="rounded-md"
          />
          <span className="text-sm font-semibold">Vouch</span>
        </div>
        <p className="text-xs text-black/40 flex items-center gap-3">
          <Link href="/privacy-policy" className="hover:text-black transition-colors">
            Privacy Policy
          </Link>
          <span>&middot;</span>
          <Link href="/terms-of-service" className="hover:text-black transition-colors">
            Terms &amp; Conditions
          </Link>
        </p>
      </div>
    </footer>
  );
}
