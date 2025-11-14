# Cursor Rules

## Instructions

- Record fixes for mistakes or corrections to avoid repetition in the `Lessons` section.
- Organize thoughts and plan steps before starting a task in the `Scratchpad` section.
- Clear old tasks if necessary.
- Use todo markers for progress tracking:
  - `[X]` Completed tasks
  - `[ ]` Pending tasks
- Update Scratchpad after completing subtasks.
- Reflect and plan after milestones for better task management.
- Always refer to Scratchpad before planning the next step.
- Take a database backup before each edit that will change the database.

## Lessons

1. Use `npx shadcn@latest add [component]` instead of `npx shadcn-ui@latest add [component]` when installing Shadcn UI components.
2. In Next.js 14+, page props params must be typed as a Promise. Example:
   ```typescript
   type tParams = Promise<{ id: string }>;
   interface PageProps {
     params: tParams;
   }
   ```
   Then await the params in the component:
   ```typescript
   export default async function Page(props: PageProps) {
     const { id } = await props.params;
   }
   ```
3. Use `const session = await auth()` instead of `const session = await getServerSession(authOptions)` for Next.js authentication. The new `auth()` function is the recommended way to get the session in Next.js Auth v5.
4. When importing `useRouter` from 'next/navigation', the component must be marked as a client component using the `'use client'` directive at the top of the file, as this hook only works on the client side.
