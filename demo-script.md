# Demo script — Pulse / Lead Radar

A word-for-word script for the 1–3 minute submission video, with the click cues interleaved.
Target length **2:40**. Read the "SAY" lines out loud; they're written to be spoken, not read.

Everything below assumes the **live URL**, https://pulse-app-navy-ten.vercel.app, so the recording
doubles as proof the deployment works.

---

## Before you hit record (5 minutes, do not skip)

The pipeline board lives in the recording browser's `localStorage`. If you skip this, the
dashboard beat opens empty and the best part of the demo has nothing in it.

1. Open https://pulse-app-navy-ten.vercel.app/lead-radar and enter the passcode.
2. Confirm the toggle in the top right reads **EN** (black pill on EN, not ES).
3. Click **Run today's scan**. Wait for results (~25–30s).
4. Click **Run today's scan** a second time. This gives you a scan history and makes the
   "seen in 2 scans" line on the board true.
5. Go to **Pipeline →**. Confirm you see signals on the board and the counters read
   `Signals on file: 14` (or whatever today's number is) with everything in **Detected**.
6. Find the **Declaración especial de ausencia** row — it should be at or near the top with the
   highest score. Click **Start execution**, wait ~30s for the research to land, then close the
   drawer. The button on that row now says **Open execution**, and it will reopen instantly on
   camera with no dead air.
7. Leave the language on **EN** and don't clear the browser between now and recording.

**Camera hygiene:** the passcode is `PULSE_ACCESS_CODE` in `.env.local`. Do not read it aloud and
do not show the keyboard. If the gate appears mid-recording, cut away or paste it off-screen.

---

## The script

### 0:00–0:15 · The problem

> **SAY:** "My family runs a notaría — a notary public's office — in Huayacocotla, Veracruz. It
> covers four small rural municipios. And today, every single client arrives unprompted, or by
> referral. Nobody is prospecting for work. So I built something that goes looking."

*No screen action yet — this can play over the Lead Radar page sitting idle.*

### 0:15–0:35 · Pulse chat, fast

**DO:** Open `/`. Click one of the suggestion chips, or type a question. Let the answer land.

> **SAY:** "The simple surface first. One question, one You.com Research call, and a synthesized
> answer that comes back with its sources attached and clickable. There is no chat model anywhere
> in this app — You.com is the entire intelligence layer. That matters in a minute."

*Don't linger. This is the warm-up.*

### 0:35–1:30 · Lead Radar — the main event

**DO:** Navigate to `/lead-radar`. Click **Run today's scan**. Keep talking while it runs.

> **SAY:** "This is the real problem. It's a goal-directed agent written in code. Right now it's
> running four discovery specialists concurrently: property listings through You.com Search,
> two different legal-notice sources through You.com Research with a strict output schema, and a
> deterministic scrape of the state court's edictos page through You.com Contents.
>
> Then it observes its own coverage — which of the four municipios did I actually find anything
> for? — and adapts, firing bounded follow-up searches at the ones it missed, and stops.
>
> Here's the part I most want to say out loud: **no language model makes the relevance call.**
> A geo-gate rejects out-of-jurisdiction lookalikes — there are towns with these same names in
> other states. A notice-evidence rule stops an index page from being badged as a real legal
> notice. And a rule-based score ranks what's left. On the last run it kept 16 signals out of 42
> candidates and threw out 26 as outside the jurisdiction."

**DO:** Results land. Point at one lead's reason line.

> **SAY:** "Every score comes with a sentence saying exactly why it scored that way. You can argue
> with it. You can't argue with a black box."

**DO:** Scroll to a legal notice with an old date (there's a succession edict from 2013).

> **SAY:** "And look at this one — a real succession edict, correctly found, correctly identified,
> and deliberately pushed *down* the list because it's from 2013. It's a historical record, not a
> live opportunity. The system knows the difference."

**DO:** Click **ES** on the toggle. Let the interface flip. Then click **EN** and leave it there.

> **SAY:** "The whole interface is bilingual — I'm demoing in English, it ships in Spanish. One
> thing that doesn't flip: the WhatsApp digest at the top stays Spanish in both modes, because the
> notary's clients are Spanish speakers and that message is what actually gets sent."

### 1:30–2:05 · Pipeline and agentic execution

**DO:** Click **Pipeline →**.

> **SAY:** "Every signal the radar has ever found is on this board. It fills itself from each scan
> — and nothing on it moves without the notary clicking. Detected, outreach made, engaged with a
> file opened, dismissed. The agent finds; the human decides."

**DO:** Click **Open execution** on the *Declaración especial de ausencia* row. The drawer opens
with the stored result already in it.

> **SAY:** "This is the part I added last: agentic execution. Starting it on a signal answers the
> question 'okay, so what do I actually do with this?'
>
> Two halves. On top, the notarial procedure for this matter type — a fixed checklist, written
> once, identical on every single run. No model decides these steps, because the steps for a
> declaration of absence don't change.
>
> Below it, live You.com Research scoped to this one case. And it found the docket number —
> expediente 183/2025-III — the specific court, the Juzgado Mixto de Primera Instancia del Cuarto
> Distrito Judicial, the parties, and the deadline that actually matters: interested parties have
> three months from the last publication to appear. That's a real, dated, actionable window on a
> real case."

**DO:** Close the drawer. Click **Outreach made** on that row. The counters at the top move.

> **SAY:** "And the notary moves it along by hand."

### 2:05–2:25 · The honesty beat

> **SAY:** "One thing I want to be straight about. These are four small rural municipios. Some days
> there is genuinely nothing new published. When that happens the app says so — an explicit empty
> state — instead of padding the list to look busy. An empty result is a correct result. I'd rather
> ship something a notary can trust than something that always looks productive."

### 2:25–2:40 · Close

> **SAY:** "Everything runs on You.com — Search, Research with structured output, and Contents.
> Twenty offline acceptance checks cover the geo-gate and the scoring rules, so the deterministic
> half is testable without touching an API. WhatsApp auto-send is deliberately not wired; the
> notary copies the message. It's live at the URL on screen, and the repo's public."

**DO:** Have the live URL and the GitHub URL visible on the final frame.

---

## If something goes wrong on camera

| What breaks | What to do |
|---|---|
| Scan returns very few signals | Lean into it — that's the honesty beat, just move it earlier. |
| Scan returns **zero** | Open **View scan history** and show a previous run. History is stored locally. |
| A run takes >40s | Keep narrating the architecture; you have ~60s of material for that window. |
| Execution drawer research fails | It degrades to the checklist with a visible notice. Say so — "the procedure half never depends on the API." That's a feature, demonstrated. |
| Gate appears unexpectedly | Cut. Do not type the passcode on camera. |

---

## Numbers you can quote (all verified)

- **4** municipios: Huayacocotla, Ilamatlán, Texcatepec, Zacualpan — the Cuarta Demarcación
  Notarial, which is the same territory as the Cuarto Distrito Judicial.
- **4** discovery specialists running concurrently.
- Last live run: **26.4s**, kept **16 of 42** candidates, dropped **26** as out-of-jurisdiction.
- **20** offline acceptance checks (`npm run gate-check`), no API key needed.
- The absence case: expediente **183/2025-III**, **three-month** appearance window.
- **Zero** chat models in the runtime.

---

## Submission checklist

- [x] Public repo, deployed, `YDC_API_KEY` and `PULSE_ACCESS_CODE` set on the host
- [x] Live conversion-agent run verified against production
- [x] Project description drafted — see [submission.md](submission.md)
- [ ] Video recorded (1–3 min) and uploaded
- [ ] **Judges need the passcode to open the live app** — include it in the submission form's
      notes field, or the deployment reads as broken. Do not put it in the README or the video.
- [ ] Submission form filed before the deadline
