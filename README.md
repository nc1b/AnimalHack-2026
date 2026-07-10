# 🐾 PawFinder — Hero Landing (Next.js + shadcn/ui)

A polished marketing landing page for **PawFinder**, a community lost & found pet
network, built for **[AnimalHack 2026](https://animalhack2026.devpost.com/)**.

Built with **Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · lucide-react**.

**🔗 Live:** https://pawfinder-animalhack.vercel.app

## Project structure

This is a shadcn-style project. Components live under `@/components/ui` and shared
utilities under `@/lib`, with the `@/*` path alias configured in `tsconfig.json`.

```
app/
  layout.tsx          # root layout (dark theme), metadata
  page.tsx            # renders <HeroSection />
  globals.css         # Tailwind + shadcn CSS variables (light/dark)
components/ui/
  hero-section-1.tsx  # the hero + sticky header (the integrated component)
  button.tsx          # shadcn Button
  animated-group.tsx  # Framer Motion staggered reveal wrapper
  text-effect.tsx     # Framer Motion text animation helper
lib/utils.ts          # cn() class-merge helper
components.json        # shadcn config
tailwind.config.ts     # Tailwind + shadcn theme tokens
```

### Why `/components/ui`

shadcn/ui installs primitives into `components/ui` by convention, and the alias
`@/components/ui` in `components.json` + `tsconfig.json` points there. Keeping this
exact path means any component pasted from the shadcn registry (and its imports
like `@/components/ui/button`) resolves without edits, and future
`npx shadcn@latest add <component>` commands drop files in the right place.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

## Dependencies

Runtime: `next`, `react`, `react-dom`, `framer-motion`, `lucide-react`,
`@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`,
`tailwindcss-animate`.

## Notes on the integration

- The pasted component targeted Tailwind v4; a few v4-only utilities were adapted
  for the Tailwind v3.4 setup here (`aspect-[15/8]`, standard rings/shadows,
  `group-data-*` variants).
- Copy was adapted to the PawFinder theme, the brand mark uses a lucide
  `PawPrint` icon, and imagery uses real Unsplash photos.
- The mismatched tech-logo cloud from the template was replaced with an on-brand
  stats band.

Built for AnimalHack 2026. 🐾
