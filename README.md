# Pathway 🚀

Pathway is an AI-powered goal planning and tracking application. It transforms vague aspirations into structured, realistic roadmaps with phases, milestones, weekly objectives, and daily actionable tasks. 

By defining your goal and constraints, Pathway's intelligent generation engine breaks down complex goals into digestible steps, helping you track your progress efficiently.

---

## 🌟 Features

- **AI Roadmap Generation:** Input any goal (e.g., "Learn Spanish", "Run a Marathon") and receive a customized timeline.
- **Hierarchical Tracking:** Goals are structured into Phases ➔ Milestones ➔ Weekly Objectives ➔ Tasks.
- **Dashboard & Today's Focus:** A sleek overview of your active goals, pending tasks, and overall progress.
- **Bulk Completion:** Complete entire weeks or phases with a single click to easily manage your progress.
- **Dark/Light Mode:** Full theming support to match your preferences.

## 🛠️ Tech Stack

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database:** PostgreSQL (via Supabase)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Authentication:** [Clerk](https://clerk.com/)
- **AI Integration:** [Vercel AI SDK](https://sdk.vercel.ai/)

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/leenalshehri/pathway.git
   cd pathway
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file based on `.env.example` and add your keys for Clerk, Supabase (Database URL), and your AI provider (e.g. OpenAI/Google/Anthropic).

4. **Initialize the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 💡 Acknowledgements

Special thanks to [@SDAIAAcademy](https://github.com/SDAIAAcademy) for the inspiration, guidance, and support throughout the learning journey and development of this project!
