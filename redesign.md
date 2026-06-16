# Antigrafity IDE Prompt: Next.js Website Redesign

**Role:** Expert Next.js Frontend Developer and UI/UX Designer

**Context:** We are completely overhauling the current Next.js project's user interface to match a new, high-contrast, modern dark-mode aesthetic with vibrant orange accents, inspired by the reference design (Stacks Bitcoin L2 website).

**Tech Stack:** Next.js (App Router preferred), React, Tailwind CSS, Framer Motion (for animations/glows).

---

## 🎨 Design System & Theming Instructions

Please update the `tailwind.config.js` and global CSS to strictly adhere to the following design system:

### 1. Color Palette
* **Backgrounds:** Deep Black (`#000000`), Dark Gray (`#0F0F0F`), and clean White (`#FFFFFF`) for contrasting light sections.
* **Primary Accent:** Vibrant/Neon Orange (e.g., `#FF4500` to `#FF8C00` gradient).
* **Text Colors:** Pure White (`#FFFFFF`) for dark sections, Black (`#000000`) for light cards, and muted grays (`#A3A3A3`) for secondary text.

### 2. Effects & Visuals
* **Glow Effects:** The design heavily relies on glowing elements. Create utility classes for orange box-shadow glows (e.g., `shadow-[0_0_15px_rgba(255,69,0,0.5)]`) applied to primary buttons and background abstract waves.
* **Border Radius:** Rounded corners on all cards and buttons (approx `rounded-2xl` for cards, `rounded-full` for pill buttons).
* **Bento Box Layout:** Utilize CSS Grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) with varying row/col spans to create asymmetrical, engaging card layouts.

---

## 🏗️ Structural Implementation Steps

Please implement the following sections sequentially:

### Step 1: Global Navigation (Header)
* **Layout:** Sticky or fixed top navigation, transparent with a slight blur (glassmorphism) on scroll.
* **Left:** Logo and Brand Name text ("STACKS").
* **Center:** Clean, minimal navigation links ("LEARN", "BUILD", "EXPLORE") with subtle hover states.
* **Right:** "START BUILDING" CTA button. Pill-shaped, transparent background, solid orange border, and a distinct orange drop-shadow/glow effect.

### Step 2: Hero Section
* **Background:** Dark background with a large, sweeping, abstract orange gradient wave.
* **Typography:** Massive, sans-serif headline ("Activate the Bitcoin economy..."). Subtitle below it in a lighter gray.
* **Watermark:** Huge, partially hidden text at the bottom right of the hero section ("*STACKS") in an outlined or semi-transparent bold font.
* **Action:** Primary "START BUILDING ->" button with a solid orange gradient and heavy glow.

### Step 3: Latest News (Horizontal Ticker/Grid)
* **Layout:** A row of rounded rectangular cards.
* **Styling:** Light gray/white backgrounds for contrast against the dark hero. Include small orange icons, date, and concise headline text.

### Step 4: Bento Box Feature Grid
* **Layout:** A masonry or bento-style CSS Grid.
* **Cards:**
    * Large vibrant orange card ("Meet the 'Satoshi Upgrades'").
    * Light theme card ("Beautiful Bitcoin DeFi") with subtle gray accents.
    * Dark theme card with minimal text and an icon.
* **Styling:** Ensure high padding (`p-8` or `p-10`), smooth border radii, and hover effects (slight scale or border highlight).

### Step 5: "Why Bitcoin?" Timeline/Feature List
* **Background:** Dark section.
* **Visual Element:** A vertical timeline or interconnected nodes ("Secure", "Adopted", "Untapped") linked by a glowing orange swoosh/line in the background.

### Step 6: "Build on Bitcoin" Section
* **Background:** Light section for contrast.
* **Content:** Left-aligned text listing features (Secured by Bitcoin, Network effects) and right-aligned UI elements showing floating app icons or sub-cards.

### Step 7: Footer & Community
* **Pre-footer:** Dark "Join the community" banner with social icons (X, Discord, Telegram).
* **Footer:** Standard multi-column layout with links, copyright, and a final subtle glowing orange background wave at the very bottom.

---

## 🛠️ Execution Commands
1. Start by defining the color palette in `tailwind.config.ts`.
2. Scaffold the layout using Next.js App Router (`layout.tsx`, `page.tsx`).
3. Build reusable components for `Button`, `BentoCard`, and `SectionHeading`.
4. Assemble the page following the structural steps above. Use placeholder images if necessary but focus primarily on CSS-driven gradients and layouts.