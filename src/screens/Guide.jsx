import { useEffect, useRef, useState } from "react";
import { C, S } from "../styles.js";

// The in-app guide.
//
// Written against the code as it actually behaves, so when something changes,
// update the matching section here. The section ids are what the small "?"
// links elsewhere in the app point at.

// ── Building blocks ──────────────────────────────────────────────────────────

const P = ({ children }) => (
  <p style={{ fontSize: 14, lineHeight: 1.65, margin: "0 0 12px", color: C.text }}>{children}</p>
);

const Muted = ({ children }) => (
  <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 12px", color: C.muted }}>{children}</p>
);

const H = ({ children }) => (
  <div
    style={{
      fontFamily: C.mono,
      fontSize: 11,
      letterSpacing: 1.5,
      color: C.accent,
      margin: "18px 0 8px",
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

function Steps({ items }) {
  return (
    <ol style={{ margin: "0 0 12px", paddingLeft: 0, listStyle: "none" }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: "flex", gap: 10, marginBottom: 9, fontSize: 14, lineHeight: 1.6 }}>
          <span
            style={{
              flexShrink: 0,
              width: 22,
              height: 22,
              borderRadius: 11,
              background: C.accentDim,
              color: C.accent,
              fontFamily: C.mono,
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            {i + 1}
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

function Points({ items }) {
  return (
    <ul style={{ margin: "0 0 12px", paddingLeft: 0, listStyle: "none" }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 14, lineHeight: 1.6 }}>
          <span style={{ color: C.accent, flexShrink: 0 }}>•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

const B = ({ children }) => <b style={{ color: C.text, fontWeight: 600 }}>{children}</b>;

const Chip = ({ tone, children }) => {
  const t = {
    hit: [C.hitBg, C.accent],
    ok: ["#2a2010", C.warn],
    miss: [C.missBg, C.danger],
    muted: [C.sunken, C.muted],
  }[tone];
  return (
    <span
      style={{
        display: "inline-block",
        background: t[0],
        color: t[1],
        fontFamily: C.mono,
        fontSize: 12,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 4,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

function Legend({ rows }) {
  return (
    <div style={{ ...S.panel, marginBottom: 12 }}>
      {rows.map(([chip, text], i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: "7px 0",
            borderTop: i ? `1px solid ${C.border}` : "none",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <span style={{ flexShrink: 0, minWidth: 64 }}>{chip}</span>
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}

function QA({ q, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{q}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: C.muted }}>{children}</div>
    </div>
  );
}

// ── Content ──────────────────────────────────────────────────────────────────

export const SECTIONS = [
  {
    id: "start",
    title: "Getting started",
    summary: "What IRONLOG does, and putting it on your phone",
    body: (
      <>
        <P>
          IRONLOG is a training log built around one heavy <B>top set</B> per exercise, followed by
          lighter <B>back-off sets</B>. You enter the top set's weight, and the app works out your
          warm-ups and back-offs from it.
        </P>
        <P>
          The basic loop: set up your workouts once, tap <B>Start</B> at the gym, enter what you lift,
          tap <B>Finish</B>. Progress, streaks and stall alerts are all worked out from what you log —
          there's nothing else to maintain.
        </P>
        <H>Put it on your phone</H>
        <Points
          items={[
            <>
              <B>iPhone</B> — open the link in Safari, tap Share, then <B>Add to Home Screen</B>. It
              has to be Safari; other browsers on iPhone can't do this.
            </>,
            <>
              <B>Android</B> — open it in Chrome, tap ⋮, then <B>Add to Home Screen</B>.
            </>,
          ]}
        />
        <H>Your data</H>
        <P>
          Everything is stored in your account, not on your phone, so it's the same on every device you
          sign into. Nobody else can see it — not other testers, and not the person who set up the app.
        </P>
      </>
    ),
  },

  {
    id: "workout",
    title: "Setting up a workout",
    summary: "Exercises, warm-ups, and working sets",
    body: (
      <>
        <P>
          On the home screen, tap <B>+ New workout</B>, or <B>Edit</B> on one you already have. Each
          exercise has:
        </P>
        <Points
          items={[
            <>
              <B>Name.</B> When a lift already exists, pick it from the suggestions rather than typing
              it. History is tracked by exact name, so "Bench Press" and "bench press" would count as
              two different lifts.
            </>,
            <>
              <B>Apply template</B> fills in the warm-up and set structure in one tap. You can change
              anything afterwards.
            </>,
            <>
              <B>Warm-up scheme.</B> The preview underneath lists each warm-up set.
            </>,
            <>
              <B>Starting top set weight.</B> Only used the very first time. After that, the app fills
              in whatever you lifted last time.
            </>,
            <>
              <B>Working sets</B> — the top set, then back-offs. Each has a rep range. Back-offs also
              have a <B>% off top</B> range, which works out their weight from the top set.
            </>,
            <>
              <B>Rest</B> times are reminders only. The app doesn't time you — use your phone's timer.
            </>,
            <>
              <B>BW</B> marks a set as bodyweight, so there's no weight to enter.
            </>,
          ]}
        />
        <P>
          <B>↑ ↓</B> reorders exercises and <B>✕</B> removes one. Tap <B>Save</B> when you're done.
        </P>
      </>
    ),
  },

  {
    id: "logging",
    title: "Logging a session",
    summary: "What to do at the gym, step by step",
    body: (
      <>
        <P>
          Tap <B>Start</B>. Everything saves as you go, so you can leave mid-workout: tap{" "}
          <B>← Save &amp; exit</B> and the button on the home screen becomes <B>Resume</B>. Resume picks up
          exactly where you left off; <B>Start fresh</B> throws the half-finished session away.
        </P>
        <H>For each exercise, top to bottom</H>
        <Steps
          items={[
            <>
              <B>Last time</B> — what you did last session, and whether to go up, stay or come down. If
              the lift is on more than one day, you'll see the most recent time you did it anywhere,
              plus the last time on this day.
            </>,
            <>
              <B>Top set weight</B> — filled in from last time. Change it and every warm-up and back-off
              weight recalculates.
            </>,
            <>
              <B>Warm-ups</B> — each shows the prescribed % and the weight it works out to. If you can't
              load that exactly (dumbbells jump in 5s), type what you actually used, and it shows what %
              that really was. Warm-up reps aren't recorded.
            </>,
            <>
              <B>Working sets</B> — enter the weight and reps. Once reps are in, a <B>vs last session</B>{" "}
              line compares the set with the same set last time.
            </>,
            <>
              <B>Notes</B> — one box per exercise, plus a session note at the bottom.
            </>,
          ]}
        />
        <H>Changing things mid-workout</H>
        <P>
          You can switch an exercise's warm-up scheme, add or remove warm-up and working sets, or remove
          an exercise. These changes are for today only — your saved workout stays as it was.
        </P>
        <H>Logging a past workout</H>
        <P>
          <B>Session date</B> at the top defaults to today. Change it to record a workout you did earlier
          — it's then compared only against sessions from before that date.
        </P>
        <P>
          Tap <B>Finish</B> when you're done. A summary follows with anything worth knowing.
        </P>
      </>
    ),
  },

  {
    id: "colours",
    title: "Reading the colours",
    summary: "Green, amber and red, and what they're telling you",
    body: (
      <>
        <H>Reps</H>
        <Legend
          rows={[
            [<Chip tone="hit">green</Chip>, <>At or above the top of the rep range. Add weight next time.</>],
            [<Chip tone="ok">amber</Chip>, <>Inside the range. Keep the weight.</>],
            [<Chip tone="miss">red</Chip>, <>Below the bottom of the range. Drop the weight.</>],
          ]}
        />
        <Muted>
          The Last time panel says it in words: ↑ Increase weight, → Same weight, ↓ Decrease weight.
        </Muted>
        <H>Percentages</H>
        <P>
          On warm-ups and back-offs, <Chip tone="hit">green</Chip> means the weight you used lands where
          the plan says. <Chip tone="ok">amber</Chip> means it's off — usually fine when plates or
          dumbbells don't allow the exact number. A warm-up counts as on target within 3 percentage
          points.
        </P>
        <H>vs last session</H>
        <Legend
          rows={[
            [<Chip tone="hit">+6</Chip>, <>Better than the same set last time.</>],
            [<Chip tone="miss">−4</Chip>, <>Worse than last time.</>],
            [<Chip tone="muted">same as last</Chip>, <>Identical to last time.</>],
          ]}
        />
        <Muted>
          The number is the change in estimated one-rep max — see Progress, PRs and stalls. For
          bodyweight sets it's the change in reps.
        </Muted>
      </>
    ),
  },

  {
    id: "progress",
    title: "Progress, PRs and stalls",
    summary: "How the app decides whether you're improving",
    body: (
      <>
        <H>One score per set</H>
        <P>
          Every set gets an <B>estimated one-rep max</B> (e1RM): weight × (1 + reps ÷ 30). It lets a
          heavier set with fewer reps be compared fairly with a lighter set with more.
        </P>
        <div style={{ ...S.panel, fontFamily: C.mono, fontSize: 13, lineHeight: 1.9, marginBottom: 12 }}>
          <div>200 × 8 → e1RM 253</div>
          <div>
            210 × 6 → e1RM 252 <span style={{ color: C.muted }}>— heavier, but not better</span>
          </div>
        </div>
        <H>Beating the log</H>
        <P>
          A session <B>beats the log</B> when its top set's e1RM is higher than your best top set since
          the baseline started. A tie doesn't count.
        </P>
        <H>Stall alerts</H>
        <P>
          Straight after you enter your top set's reps and move on, the app checks. The{" "}
          <Chip tone="ok">2nd</Chip> session in a row without beating the log gets a heads-up; the{" "}
          <Chip tone="miss">3rd</Chip> is marked <B>stalled</B>. You tap <B>Got it</B> to carry on, and
          it's listed again in the summary at the end.
        </P>
        <Muted>
          Only the top set counts. Back-off weight depends on how the top set went that day, so it's
          shown but never judged.
        </Muted>
        <H>The baseline</H>
        <P>What you're compared against. It starts fresh when:</P>
        <Points
          items={[
            <>a new <B>training block</B> starts — set on the Goals screen</>,
            <>
              you <B>reset the baseline</B> for one exercise — a different machine or a new gym. Do this
              from the exercise library
            </>,
            <>you switch to a differently named exercise, which has no history of its own</>,
          ]}
        />
        <P>
          It does <B>not</B> restart after a deload. Deload and calibration weeks are left out of the
          count entirely, so coming back strong shows up as a new best.
        </P>
        <H>All-time PRs</H>
        <P>
          Kept separately and never reset. Find them at the top of each lift's page in the exercise
          library.
        </P>
      </>
    ),
  },

  {
    id: "history",
    title: "History and the exercise library",
    summary: "Charts, past sessions, and fixing mistakes",
    body: (
      <>
        <H>History</H>
        <P>
          Tap <B>History</B> on a workout card. It has two views:
        </P>
        <Points
          items={[
            <>
              <B>Progress</B> — a chart and table for each exercise. The solid line is your top set,
              the dashed line your back-off, and each dot is coloured by the rep result.
            </>,
            <>
              <B>Session log</B> — every session, each shown next to the previous time you did those
              lifts, with the weight change. <B>Edit</B> fixes a mistyped number; <B>Delete</B> removes a
              session you didn't actually do.
            </>,
          ]}
        />
        <H>Exercise library</H>
        <P>
          On the home screen. Lists every lift you've logged, across all your workouts. Tap one to see
          its <B>all-time PR</B>, its <B>baseline for stalls</B> with the option to reset it, and every
          session you've done it. <B>Rename</B> fixes a spelling everywhere at once — history, PRs and
          all — instead of starting a new lift under the new name. <B>Delete</B> removes it from every
          workout and session that mentions it, without touching anything else in those sessions.
        </P>
      </>
    ),
  },

  {
    id: "goals",
    title: "Weekly goal and streaks",
    summary: "The week strip, streaks and the summary",
    body: (
      <>
        <P>
          Tap <B>Goals</B> on the week strip at the top of the home screen.
        </P>
        <H>Sessions per week</H>
        <P>
          A week runs Monday to Sunday, and counts as complete once you've logged this many sessions,
          whichever workouts they were. The week strip shows how far along you are.
        </P>
        <P>
          In the last three days of the week, if you're short, the strip says how many sessions are left
          and how many days you have.
        </P>
        <H>Streaks</H>
        <Points
          items={[
            <>complete weeks in a row</>,
            <>weeks you trained at all, in a row</>,
            <>weeks in a row on each particular workout</>,
          ]}
        />
        <Muted>
          A streak doesn't break on Monday just because this week has barely started — it's measured
          from last week until this one is done.
        </Muted>
        <H>After each session</H>
        <P>
          The summary shows personal bests, anything up on last time, completed weeks, streaks and
          milestone session counts. The app only ever celebrates — it never mentions a missed week.
        </P>
      </>
    ),
  },

  {
    id: "pauses",
    title: "Deloads, calibration and other pauses",
    summary: "Planned time off without losing a streak",
    body: (
      <>
        <P>
          Goals → <B>Pauses</B>. Deloads, injury and illness are part of training, and a pause stops them
          costing you a streak.
        </P>
        <Points
          items={[
            <>
              A paused week <B>bridges</B> a streak: it doesn't break it, and doesn't add to it, so the
              count still means weeks actually completed.
            </>,
            <>
              <B>Deload</B> and <B>calibration</B> pauses also leave those sessions out of the stall
              count, since those weeks are held back on purpose.
            </>,
            <>
              <B>Injury</B>, <B>illness</B>, <B>travel</B> and <B>other</B> protect streaks only.
            </>,
          ]}
        />
        <P>
          Add one with a reason, dates and optional notes. Tap <B>Edit</B> on any pause to move its
          dates. Upcoming pauses are listed first, soonest at the top.
        </P>
      </>
    ),
  },

  {
    id: "blocks",
    title: "Training blocks and archiving",
    summary: "Moving to a new program without losing the old one",
    body: (
      <>
        <H>Training blocks</H>
        <P>
          Goals → <B>Training blocks</B> holds the date your current block started. A new block gives
          every exercise a fresh baseline for the stall counter. Use it for a new program or after a cut
          — not for a deload, which should be a pause instead.
        </P>
        <P>
          You can set a block ahead of time. Until its start date it shows as <B>Next block</B>; after
          that it becomes the current one on its own.
        </P>
        <H>Starting a new block</H>
        <P>
          On the home screen, <B>Start a new block</B> is for moving on from a program:
        </P>
        <Steps
          items={[
            <>Name the block you're finishing.</>,
            <>Set the date the new one starts.</>,
            <>Choose which workouts to archive — or untick them all to keep training the same ones.</>,
            <>
              <B>Keep copies</B> puts fresh editable versions back on your home screen, as a starting
              point for the new block. Untick it to start from nothing.
            </>,
          ]}
        />
        <H>The archive</H>
        <P>Every archived workout, grouped by block. Each one offers:</P>
        <Points
          items={[
            <>
              <B>History</B> — still all there
            </>,
            <>
              <B>Copy to active</B> — a fresh editable version, leaving the archived one as it was
            </>,
            <>
              <B>Restore</B> — brings the original back
            </>,
            <>
              <B>Delete</B> — removes the workout, but keeps its sessions
            </>,
          ]}
        />
        <Muted>
          You can also archive a single workout from its Edit screen. Archiving never touches your
          logged sessions or exercise history.
        </Muted>
      </>
    ),
  },

  {
    id: "setup",
    title: "Warm-up schemes and templates",
    summary: "Reusable building blocks for your workouts",
    body: (
      <>
        <H>Warm-up schemes</H>
        <P>
          Each warm-up set has reps, a % of the top set, and rest. Tap <B>range</B> on any field to turn
          it into a range, like 85–90%. <B>Duplicate</B> makes a variation without touching the
          original.
        </P>
        <H>Exercise templates</H>
        <P>
          A warm-up scheme plus a set of working sets, saved as a one-tap preset for setting up
          exercises.
        </P>
        <H>The one difference worth knowing</H>
        <Points
          items={[
            <>
              Editing a <B>warm-up scheme</B> changes it for every exercise that uses it.
            </>,
            <>
              Editing a <B>template</B> doesn't change exercises you've already set up with it — applying
              one copies its settings in.
            </>,
          ]}
        />
      </>
    ),
  },

  {
    id: "backup",
    title: "Backups",
    summary: "A spare copy of everything",
    body: (
      <>
        <P>
          Your data is already safe in your account. A backup is a spare copy you keep yourself.
        </P>
        <Points
          items={[
            <>
              <B>Export backup</B> downloads everything as a file.
            </>,
            <>
              <B>Import backup</B> loads one back in. It adds and updates, and never deletes anything.
            </>,
          ]}
        />
      </>
    ),
  },

  {
    id: "faq",
    title: "Common questions",
    summary: "Quick answers",
    body: (
      <>
        <QA q="I was told about a change but can't see it.">
          Fully close the app — swipe it away in the app switcher — and reopen it. An app added to your
          home screen holds on to the old version until then.
        </QA>
        <QA q="Why is the weight already filled in?">
          It's what you lifted the last time you did that exercise, in any workout.
        </QA>
        <QA q="One lift has two separate histories.">
          It was logged under two slightly different names. When naming an exercise, pick from the
          suggestions so it stays as one.
        </QA>
        <QA q="Why didn't I get a stall alert?">
          It's your first session since the baseline started, it's a deload or calibration week, or you
          beat the log.
        </QA>
        <QA q="I tapped something and nothing seemed to happen.">
          Check the bottom of the screen for a message explaining why.
        </QA>
        <QA q="Can I log a workout I did yesterday?">Yes — change the session date at the top.</QA>
        <QA q="Kilos?">Pounds only, for now. Calculated weights are rounded to the nearest 5 lb.</QA>
        <QA q="Is there a rest timer?">No. Rest times are reminders; use your phone's timer.</QA>
      </>
    ),
  },
];

// ── Screen ───────────────────────────────────────────────────────────────────

export default function Guide({ initialSection, onBack }) {
  const [open, setOpen] = useState(() => new Set(initialSection ? [initialSection] : []));
  const refs = useRef({});

  // Coming from a "?" link: open that section and bring it into view
  useEffect(() => {
    if (!initialSection) return;
    const el = refs.current[initialSection];
    if (el) {
      setTimeout(() => el.scrollIntoView({ block: "start" }), 50);
    }
  }, [initialSection]);

  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.btnBack} onClick={onBack}>
          ← Back
        </button>
        <span style={S.headerTitle}>How IRONLOG works</span>
        <span style={{ width: 40 }} />
      </div>

      {!initialSection && (
        <div style={{ padding: "16px 16px 6px" }}>
          <Muted>
            New here? Start with <B>Getting started</B>, then <B>Logging a session</B> — that's enough
            for your first workout. The rest is here when you need it.
          </Muted>
        </div>
      )}

      <div style={{ paddingTop: initialSection ? 12 : 4 }}>
        {SECTIONS.map((sec) => {
          const isOpen = open.has(sec.id);
          return (
            <div
              key={sec.id}
              ref={(el) => (refs.current[sec.id] = el)}
              style={{
                ...S.exCard,
                scrollMarginTop: "calc(70px + env(safe-area-inset-top))",
                borderColor: isOpen ? "#2a4a2f" : C.border,
              }}
            >
              <button style={{ ...S.exHeader, alignItems: "flex-start" }} onClick={() => toggle(sec.id)}>
                <span>
                  <span style={{ ...S.exName, display: "block" }}>{sec.title}</span>
                  <span style={{ color: C.muted, fontSize: 12, fontWeight: 400 }}>{sec.summary}</span>
                </span>
                <span style={{ ...S.exToggle, marginTop: 3 }}>{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && <div style={{ padding: "4px 16px 16px" }}>{sec.body}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "12px 16px 40px", color: C.muted, fontSize: 12, textAlign: "center" }}>
        Something not covered? Ask whoever sent you the link.
      </div>
    </div>
  );
}
