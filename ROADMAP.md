# Roadmap

Agreed with Jeremy on Sep 25, 2026. The aim: stop splitting his training and
nutrition across several tools. Today he plans programs and diet in conversations
with Claude, trains in IRONLOG, and tracks food, weekly weight and progress
photos with Gemini. Tracking should come together in IRONLOG; planning stays in
conversation, with the handoff into the app made painless.

## Before building anything

1. **Check the repo is current.** Jeremy has sometimes uploaded code through
   GitHub's web page from a separate chat, and may also have made changes in an
   earlier Claude Code session. Look through `git log` for anything unexpected.
   The latest chat-made changes should be present: `src/screens/Guide.jsx`
   exists, `Goals.jsx` shows a "Next block" card, and `Log.jsx` flushes its draft
   when the screen closes. If a web upload overwrote earlier Claude Code work, find
   it in the history and ask him before restoring anything.
2. **Set the safety net.** Tag current `main` (e.g. `v1-before-tracking`) and ask
   him to use **Export backup** on the home screen.
3. **Build on a branch.** Vercel gives it a preview URL, so he can try the new
   version on his phone while the real app carries on untouched from `main`. Merge
   when he's happy; delete the branch if not. He may need to be signed into Vercel
   to open a preview.
4. **Additive migrations only.** The preview and live app share one database, so
   during a trial, new features may add tables but must not alter or drop
   existing ones. If something genuinely needs to, stop and see "Decisions
   already made" below.

## The plan, in order

### 1. Bodyweight and waist measurements
Log whenever he likes. Show a smoothed trend line, weekly averages (Monday to
Sunday, matching the streak weeks), longer-term averages, and rate of change per
week. His current plan is a bulk judged on weekly average weight, so this
replaces that part of his Gemini routine straight away. Waist is the more reliable
fat-versus-water signal and belongs alongside weight.

Confirm units with him before building — weight is in lb elsewhere, but ask about
waist.

### 2. Calorie and macro targets
Separate training-day and rest-day targets, set from his plan rather than
calculated for him — his numbers come out of his planning conversations. Decide
with him how the app knows a day is a training day: a logged session, or a weekly
schedule. For testers, a standard estimate (e.g. Mifflin–St Jeor plus activity
and goal) is fine, with guardrails: a calorie floor, no aggressive deficits, and
no targets for under-18s.

### 3. Progress photos
Private Supabase Storage bucket, files under the user's id, with storage policies
matching the table RLS. Shrink photos on the phone before upload to stay within
the free storage tier. Show them side by side by week, next to that week's
average weight and waist.

**No AI analysis of the photos.** Lighting, time of day, pump, pose and camera
angle swamp the difference between fat and water, so anything that claims to
tell them apart would be overclaiming. Consistent photos plus weight trend plus
waist is the sound approach, and what the feature should support.

### 4. Food logging
The biggest piece, and the one that lets him drop Gemini for tracking. He should
be able to type "200g chicken breast, 250g rice" and see it logged and taken off
what's left for the day.

- **AI understands, a database supplies the numbers.** A server-side function
  sends the text to Claude to turn it into foods and amounts, then looks each one
  up in USDA FoodData Central (free). AI-generated nutrition figures are too
  unreliable to use directly.
- The AI key lives only in server-side environment variables — a Supabase Edge
  Function or a Vercel function — never in the app, where anyone could read it.
- Raw versus cooked matters: cooked rice is roughly a third of the calories per
  gram of dry. Ask when it's ambiguous.
- Show what was understood and let him confirm or fix it before it's saved.
- Remember recent foods and saved meals, since logging friction is why people
  give up on food tracking.
- Barcode scanning (Open Food Facts) can come later.

Cost is a fraction of a cent per entry — a few cents a month for one person.

### 5. Program import
The v4 program went in via hand-built SQL, with several rounds of matching
exercise names. Replace that with an import inside the app: a program file (JSON)
of schemes, templates and workouts. Match exercise names case-insensitively
against his history, use the stored spelling, and show a preview of which lifts
link to existing history and which start fresh — as the v4 SQL's final report
did — before anything is saved.

## Not doing, for now

These mostly matter for strangers, and IRONLOG is for Jeremy and a few friends:

- A questionnaire that generates programs. His programs come from detailed
  conversations, which a questionnaire won't match. If testers need programs
  later, a small library of well-designed templates picked by a short
  questionnaire is the better route — it reuses the program-import machinery.
- A recipe library, or meals planned around food preferences. Allergy mistakes
  there are a real harm, not a bug.
- Onboarding for users he hasn't talked to.

Meal distribution and training-day timing (pre, intra and post workout) are worth
revisiting once targets and food logging exist.

## Decisions already made

- **Build on a branch of IRONLOG, not as a separate replacement app.** Jeremy
  considered building a new app that does everything IRONLOG does plus the new
  features, then retiring IRONLOG if it worked out. Every item above only *adds*
  tables, so a branch already leaves IRONLOG untouched until he merges — while a
  separate app would add a data migration at switchover, moving testers over,
  two apps to maintain in the meantime, and the risk of losing fixes in a rebuild.
- **Revisit that if a feature needs to change existing tables.** Branch previews
  share IRONLOG's database, so that's where a separate copy (its own Supabase
  project, seeded from a backup export) becomes the safer way to trial it. Raise
  it with Jeremy before starting any such change.
- **Planning stays in conversation.** The friction is the handoff, which item 5
  fixes.
- **Features used by other people need guardrails** for health, allergies and
  privacy, even though this isn't going to be marketed.
