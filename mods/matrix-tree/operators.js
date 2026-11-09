// Built by tools/tree/build.py from matrix-agents: the same cards, for the tree.
// OPERATORS: every agent as an operator jacked into the Construct.
// Each gets a glyph mask, a 5x5 symmetric face of flickering code made from who it is.
// Claude Code sessions show their telemetry from the `claude.stats` terminal label
// (written by ~/.config/herdr/claude-desktop.sh on each machine, so remote ones too):
//   SIGNAL  context left        POWER  the 5-hour quota left
//   UPLINK  the prompt cache    PROGRAMS  running helpers (+1 for the session while it works)
// States: working JACKED IN, blocked WAKE UP (red pill, pulsing), done ☎ RINGING
// (the exit is a ringing phone), idle STANDBY.
//
// Operators: each new session is cast as a random operator (nine original characters, one
// of them the rogue program AUDITOR), one not already on screen. They are full-body layered SVGs
// from ~/.config/herdr/matrix/ops_svg.py: a pose per state that breathes, a working effect animated
// natively (sparks, holograms, a scan beam), a red alert when they need you. A Claude session is cast once its first reply
// carries a session id (until then it shows its glyph mask: still loading the construct);
// other agents are cast per terminal. Casts live in shared "matrix.heroes", so a session
// keeps its hero across restarts; /clear starts a new session and a new casting.
// Click a hero to change it; click the rest of its card to go to that session's pane.
// The - button, shown on hover, minimises a card to one line (name, hero, status); a parent's attached sessions fold with it, to one line each.
// The button in the OPERATORS header minimises or expands every card at once.
import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { hc, notify, agents, terminals, spaces, panes, openOverlay, run, setAgentOrder, theme, layout, shared, setShared } from "herdr";
import { GLYPHS, rng, hash } from "./rain.js";

const HEROES = ["neo", "trinity", "morpheus", "niobe", "tank", "dozer", "link", "bugs", "agent-smith", "cypher", "oracle", "architect", "merovingian", "analyst"];
const HERO_NAME = Object.fromEntries(HEROES.map((hero) => [hero, hero.replaceAll("-", " ").toUpperCase()]));
const OPS = "mods/matrix-agents/ops";
// How each working effect moves: [property, loop policy] (native, about 30 fps, only while drawn).
const FX = Object.fromEntries(HEROES.map((hero) => [hero, ["opacity", { from: 0.3, to: 1, period: 900 }]]));
const CAST = "matrix.heroes";   // { <key>: { hero, at } }
const KEEP_CAST = 60;           // casts kept for sessions no longer on screen
const MIN = "cards.min";        // { <terminal address>:<created_ms>: true } for minimised cards

// A random hero, preferring ones nobody on screen is playing.
function pickHero(taken, not) {
  const free = HEROES.filter((h) => !taken.has(h) && h !== not);
  const pool = free.length ? free : HEROES.filter((h) => h !== not);
  return pool[Math.floor(Math.random() * pool.length)];
}

const STATE = {
  detached: { word: "DETACHED", frames: null },
  working: { word: "JACKED IN", frames: null },
  blocked: { word: "WAKE UP", frames: ["WAKE UP", "WAKE UP", "W4KE UP", "WAKE UP", "       "] },
  done: { word: "☎ RINGING", frames: ["☎ RINGING", "  RINGING", "☎ RINGING", "  RINGING", "☎ RINGING", "☎ RINGING"] },
  idle: { word: "STANDBY", frames: null },
};
const STALE_S = 12 * 3600;
const SUB_FRESH_S = 90;
const BAR = 10;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

function claudeStats(all, list) {
  const claude = new Set(list.filter((a) => a.app === "claude-code").map((a) => a.address));
  const out = new Map();
  for (const t of all) {
    const raw = t.labels?.["claude.stats"];
    if (!raw || !claude.has(t.address) || t.state !== "live") continue;
    try { out.set(t.address, JSON.parse(raw)); } catch {}
  }
  return out;
}

// What SIGNAL, POWER and UPLINK mean, with the numbers behind them, for their tooltips.
const tokens = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1000)}k`);
const pad2 = (n) => String(n).padStart(2, "0");
const clock = (at) => { const d = new Date(at * 1000); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const dayClock = (at) => `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(at * 1000).getDay()]} ${clock(at)}`;
const untilText = (d) => (d >= 3600 ? `${Math.floor(d / 3600)}h ${Math.floor((d % 3600) / 60)}m` : `${Math.max(1, Math.floor(d / 60))}m`);
function signalTip(s) {
  const pct = s.ctx?.pct ?? 0;
  const size = s.ctx?.size ?? 200000;
  const estimated = s.parent ? "\nThe window size is an estimate for background sessions." : "";
  return `SIGNAL: context left in this session.\n${pct}% used, about ${tokens((size * pct) / 100)} of ${tokens(size)} tokens.\nWhen it runs low, Claude compacts the conversation.${estimated}`;
}
function powerTip(s, now) {
  const who = s.profile && s.profile !== "default" ? ` (${s.profile} account)` : "";
  const five = s.rl?.five_hour;
  const week = s.rl?.seven_day;
  const current = five && five.resets_at > now
    ? `${Math.round(five.used_percentage ?? 0)}% used, resets at ${clock(five.resets_at)} (in ${untilText(five.resets_at - now)}).`
    : "No current reading: Claude reports it with its next reply.";
  const weekly = week && week.resets_at > now ? `\n7-day limit: ${Math.round(week.used_percentage ?? 0)}% used, resets ${dayClock(week.resets_at)}.` : "";
  return `POWER: your 5-hour usage limit left${who}.\n${current}${weekly}`;
}
function uplinkTip(s, now) {
  const warm = s.cache?.warm === true && s.cache.exp > now;
  return warm
    ? `UPLINK: this session's prompt cache.\nWarm for ${untilText(s.cache.exp - now)} more, until ${clock(s.cache.exp)}.\nA reply before then reuses it, which costs less.`
    : "UPLINK: this session's prompt cache.\nIt has expired.\nThe next reply rebuilds it, which costs more.";
}

// Close and Delete worktree, shown on hover. session-actions asks before doing anything.
const actionInfo = (a, s) => ({ address: a.address, name: s?.name || a.address, bg: a.bg ?? null, sid: s?.sid ?? null, profile: s?.profile ?? null, dir: s?.dir ?? null });
function actionButtons(a, s, kids, t) {
  const chip = (id, label, tip, action) => div().id(`${id}-${a.address}`).size(18).flex().items_center().justify_center().border(1).border_color(t.dim).bg(t.popover)
    .text_size(12).font_semibold().text_color(t.accent).cursor_pointer().hover((x) => x.bg(t.hover).text_color(t.blocked)).tooltip(tip)
    .on_click((_e, cx) => {
      cx.stop_propagation();
      openOverlay({ mod: "session-actions", kind: "dialog", modal: true, width: 480, height: 300, props: { action, session: actionInfo(a, s), kids: kids.map((k) => actionInfo(k, k.stats)) } });
    })
    .child(label);
  return h_flex().gap(4).child(chip("act-close", svg("mods/pane/close.svg").size(12).text_color(t.accent), "Close this session", "close"))
    .when(s?.loc === "wt" && Boolean(s?.dir), (el) => el.child(chip("act-wt", svg("mods/matrix-agents/bin.svg").size(12).text_color(t.accent), "Close this session and delete its worktree", "worktree")));
}

// An attached session's pane can lose Claude (a restart, a crash) and fall back to a shell, while
// its old labels stay. Such a card is DETACHED, and clicking it reattaches: it only types when the
// pane is at a shell prompt, so anything else running there just gets focus.
const detachedFrom = (t) => {
  const fg = t.foreground;
  return Boolean(fg) && !(fg.argv ?? []).join(" ").includes("claude") && !/^\d+\.\d+\.\d+/.test(fg.name ?? "");
};
const atShell = (t) => /^-?(zsh|bash|fish|sh|dash)$/.test(String(t.foreground?.name ?? "").split("/").pop());
async function reattach(k) {
  run("pane.focus", { terminal: k.address });
  if (!k.shell || !/^[A-Za-z0-9_-]+$/.test(k.bg ?? "")) return;
  const profile = k.stats?.profile;
  const config = profile && profile !== "default" && /^[A-Za-z0-9_-]+$/.test(profile) ? `CLAUDE_CONFIG_DIR="$HOME/.claude-${profile}" ` : "";
  await hc(["keys", k.address, "ctrl+u"]);   // anything half-typed at the prompt
  const r = await hc(["send", k.address, `${config}claude attach ${k.bg}`]);
  if (r.code !== 0) notify({ title: "Couldn't reattach", body: (r.stderr || r.stdout || "").trim(), level: "error" });
}

// Attached background sessions (`claude --bg` in a child terminal labelled claude.bg), by
// their parent's address, as agent-shaped rows. Their stats label names the parent.
function bgChildren(all) {
  const out = new Map();
  for (const t of all) {
    const raw = t.labels?.["claude.stats"];
    if (!raw || !t.labels?.["claude.bg"] || t.state !== "live") continue;
    let s;
    try { s = JSON.parse(raw); } catch { continue; }
    if (!s.parent) continue;
    const machine = t.address.includes("/") ? `${t.address.split("/")[0]}/` : "";
    const key = `${machine}${s.parent}`;
    const status = detachedFrom(t) ? "detached" : s.state === "working" || s.state === "busy" ? "working" : /input|wait|block/.test(s.state ?? "") ? "blocked" : "idle";
    out.set(key, [...(out.get(key) ?? []), { address: t.address, app: "claude-code", status, shell: atShell(t), focused: false, bg: t.labels["claude.bg"], stats: s }]);
  }
  for (const kids of out.values()) kids.sort((x, y) => String(x.stats.name ?? x.address).localeCompare(String(y.stats.name ?? y.address)));
  return out;
}

// The name a row goes by: the /rename name, else a named tab, else its space.
function nameOf(a, s, sp) {
  if (s?.name) return s.name;
  for (const space of sp) for (const tab of space.tabs ?? []) if (tab.id === a.tab) return tab.named ? tab.name : space.name;
  return a.space_name || a.tab_name || a.address;
}

// ▮▮▮▮▮▮▮▯▯▯ as text, so it sits in the monospace grid.
const bar = (v) => (v == null ? "▯".repeat(BAR) : "▮".repeat(Math.round((v / 100) * BAR)) + "▯".repeat(BAR - Math.round((v / 100) * BAR)));

// Everything a minimised card is hiding, for its tooltip.
function foldedTip(a, s, name, who, word, machine, now, kids) {
  if (a.status === "detached") return `${name}\nDetached. Click to reattach.`;
  const where = machine ? ` @${machine}` : "";
  const lines = [name, [who, word].filter(Boolean).join(" · ")];
  if (s) {
    lines.push(`${s.repo || "~"}${where}`);
    if (s.branch) lines.push(`${s.loc === "wt" ? "wt" : "br"}: ${s.branch}`);
    const spend = s.tokens != null && s.cost == null ? `${Math.floor(s.tokens / 1000)}k tok` : `$${(s.cost ?? 0).toFixed(2)}`;
    lines.push(`${s.model ?? "claude"}${s.effort ? ` ${s.effort}` : ""} · ${spend}`);
    const stale = now - (s.at ?? 0) > STALE_S ? " (old)" : "";
    const five = s.rl?.five_hour;
    lines.push(`SIGNAL: ${100 - (s.ctx?.pct ?? 0)}% left${stale}`);
    lines.push(`POWER: ${five && five.resets_at > now ? `${Math.round(100 - (five.used_percentage ?? 0))}% left${stale}` : "—"}`);
    const fresh = s.subs && now - (s.subs.at ?? 0) <= SUB_FRESH_S;
    const total = (fresh ? s.subs.n ?? 0 : 0) + (a.status === "working" ? 1 : 0);
    const d = s.cache?.warm === true ? s.cache.exp - now : 0;
    const link = [
      s.cache?.warm == null ? null : d > 0 ? `uplink ${d >= 3600 ? `${Math.floor(d / 3600)}h${Math.floor((d % 3600) / 60)}m` : d >= 60 ? `${Math.floor(d / 60)}m` : "<1m"}` : "uplink lost",
      total > 0 ? `${total} program${total === 1 ? "" : "s"}` : null,
      s.rc ? "rc" : null,
    ].filter(Boolean);
    if (link.length) lines.push(link.join(" · "));
    if (fresh) for (const n of s.subs.helpers ?? s.subs.names ?? []) lines.push(`  ${n}`);
  } else {
    lines.push(`${a.app ?? a.program?.name ?? "program"}${where}`);
    lines.push(a.app === "claude-code" ? "loading the construct…" : "no telemetry");
  }
  if (kids.length) lines.push("Attached:", ...kids.map((k) => `  ${k.stats?.name || k.address}: ${STATE[k.status]?.word ?? String(k.status ?? "").toUpperCase()}`));
  return lines.join("\n");
}

export class Operators {
  init(_props, cx) {
    cx.timer.every(30000, (cx) => cx.notify());   // uplink countdown and stale marks
  }

  // A 5x5 mirrored mask from the operator's identity; lit cells flicker natively.
  mask(seedText, color, t, size = 9) {
    const r = rng(hash(seedText));
    const on = [];
    for (let y = 0; y < 5; y++) {
      const row = [r() > 0.45, r() > 0.45, r() > 0.35];
      on.push([row[0], row[1], row[2], row[1], row[0]]);
    }
    on[1][1] = on[1][3] = true;   // always eyes
    const cell = size + 2;
    return v_flex().w(cell * 5 + 8).h(cell * 5 + 8).flex_none().p(4).border(1).border_color(`${color}66`).bg(`${t.canvas}e0`)
      .children(on.map((row, y) => h_flex().h(cell).children(row.map((lit, x) => {
        const glyphs = Array.from({ length: 4 }, () => GLYPHS[Math.floor(r() * GLYPHS.length)]);
        const el = div().w(cell).h(cell).text_size(size).line_height(`${cell}px`).text_center().font_family("JetBrains Mono");
        return lit
          ? el.text_color(color).font_semibold().child(glyphs[0]).frames(glyphs, 260 + Math.floor(r() * 500))
          : el.text_color(`${color}22`).child("·");
      }))));
  }

  // Who casts this agent: a Claude session by its session id (none before its first
  // reply), anything else by its terminal's life.
  castKey(a, s, term) {
    if (a.app === "claude-code") return s?.sid ? `sid:${s.sid}` : null;
    return `term:${a.address}:${term?.created_ms ?? ""}`;
  }

  // Casts new sessions and forgets old ones; writes shared state only on a change.
  castAll(list, stats, all) {
    const cast = { ...(shared(CAST) ?? {}) };
    const terms = new Map(all.map((t) => [t.address, t]));
    const keys = new Map(list.map((a) => [a.address, this.castKey(a, stats.get(a.address), terms.get(a.address))]));
    const live = new Set([...keys.values()].filter(Boolean));
    const taken = new Set([...live].map((k) => cast[k]?.hero).filter(Boolean));
    let dirty = false;
    for (const k of live) {
      if (cast[k] && HEROES.includes(cast[k].hero)) continue;
      const hero = pickHero(taken);
      cast[k] = { hero, at: Date.now() };
      taken.add(hero);
      dirty = true;
    }
    const gone = Object.keys(cast).filter((k) => !live.has(k)).sort((x, y) => (cast[y].at ?? 0) - (cast[x].at ?? 0));
    for (const k of gone.slice(KEEP_CAST)) { delete cast[k]; dirty = true; }
    if (dirty) setShared(CAST, cast);
    this.terms = terms;
    this.keys = keys;
    this.cast = cast;
    this.taken = taken;
  }

  reroll(key) {
    const cast = { ...(shared(CAST) ?? {}) };
    const now = cast[key]?.hero;
    cast[key] = { hero: pickHero(this.taken ?? new Set(), now), at: Date.now() };
    setShared(CAST, cast);
  }

  // A minimised card belongs to its terminal's life: a reused terminal id starts expanded.
  minKey(address) {
    return `${address}:${this.terms?.get(address)?.created_ms ?? ""}`;
  }

  toggleMin(address) {
    const min = { ...(shared(MIN) ?? {}) };
    const key = this.minKey(address);
    if (min[key]) delete min[key];
    else min[key] = true;
    // a parent takes its attached sessions with it; each can still be opened on its own
    for (const k of this.allKids?.get(address) ?? []) { if (min[key]) min[this.minKey(k.address)] = true; else delete min[this.minKey(k.address)]; }
    const live = new Set([...(this.terms?.keys() ?? [])].map((k) => this.minKey(k)));
    for (const k of Object.keys(min)) if (!live.has(k)) delete min[k];
    setShared(MIN, min);
  }

  // Every card, attached sessions included. Expanding clears the lot, which also drops ended terminals.
  setAllMin(everyone, folded) {
    const min = { ...(shared(MIN) ?? {}) };
    for (const a of everyone) { if (folded) min[this.minKey(a.address)] = true; else delete min[this.minKey(a.address)]; }
    setShared(MIN, min);
  }

  // In the header: expands when every card is minimised, otherwise minimises them all.
  minAllButton(everyone, t, id) {
    const min = shared(MIN) ?? {};
    const allFolded = everyone.every((a) => min[this.minKey(a.address)]);
    return div().id(`op-min-all-${id}`).size(16).flex_none().flex().items_center().justify_center().border(1).border_color(t.dim)
      .text_size(12).font_semibold().text_color(t.muted).cursor_pointer().hover((x) => x.bg(t.hover).text_color(t.accent))
      .tooltip(allFolded ? "Expand all sessions here" : "Minimise all sessions here")
      .on_click((_e, cx) => { cx.stop_propagation(); this.setAllMin(everyone, !allFolded); })
      .child(allFolded ? "+" : "–");
  }

  // Shown while the pointer is over the card.
  minButton(a, folded, t) {
    return div().id(`op-min-${a.address}`).size(16).flex_none().flex().items_center().justify_center().border(1).border_color(t.dim)
      .text_size(12).font_semibold().text_color(t.muted).cursor_pointer().hover((x) => x.bg(t.hover).text_color(t.accent))
      .tooltip(folded ? "Expand this session" : "Minimise this session")
      .on_click((_e, cx) => { cx.stop_propagation(); this.toggleMin(a.address); })
      .child(folded ? "+" : "\u2013");
  }

  heroOf(a) {
    const key = this.keys?.get(a.address);
    return (key && this.cast?.[key]?.hero) || null;
  }

  // A minimised card's one line: avatar, name, attached sessions folded inside, status.
  // The tooltip is on the text, not the whole row, so the button keeps its own.
  foldedRow(a, name, who, status, tip, kids, t) {
    return [
      h_flex().id(`card-info-${a.address}`).flex_1().min_w(0).h_full().gap(7).items_center().tooltip(tip)
        .when(Boolean(who), (el) => el.child(div().flex_none().min_w(46).text_size(9.5).font_semibold().text_color(t.muted).child(who)))
        .child(div().flex_1().min_w(0).truncate().font_semibold().text_size(12).text_color(t.foreground).child(name))
        .child(status),
      this.hoveredCard === a.address && this.minButton(a, true, t),
    ].filter(Boolean);
  }

  // The hero in a frame with their name; before casting, the glyph mask.
  avatar(a, s, color, t) {
    const key = this.keys?.get(a.address);
    const hero = this.heroOf(a);
    if (!hero) return this.mask(`${s?.sid ?? a.address}`, color, t);
    const [prop, policy] = FX[hero] ?? ["opacity", { from: 0.4, to: 1, period: 1000 }];
    const layer = (src) => image(src).absolute().top(0).left(0).w(72).h(96);
    return v_flex().id(`hero-${a.address}`).w(74).flex_none().border(1).border_color(`${color}66`).bg(`${t.canvas}e0`).overflow_hidden()
      .tooltip(`${HERO_NAME[hero]} · click to change`)
      .on_click((_e, cx) => { cx.stop_propagation(); this.reroll(key); })
      .child(div().relative().w(72).h(96).overflow_hidden()
        // the portrait breathes; the working effect plays; a red alert pulses when they need you
        .child(layer(`${OPS}/${hero}-${a.status === "working" ? "work" : a.status === "blocked" ? "blocked" : "rest"}.svg`)
          .when(a.status !== "blocked", (el) => el.loop("top", { from: 0, to: 1.5, period: 3400 })))
        .when(a.status === "working", (el) => el.child(layer(`${OPS}/${hero}-fx.svg`).loop(prop, policy)))
        .when(a.status === "blocked", (el) => el.child(layer(`${OPS}/alert.svg`).loop("opacity", { from: 0.25, to: 1, period: 700 }))))
      .child(div().w_full().h(14).flex().items_center().justify_center().bg(`${color}1f`).border_t(1).border_color(`${color}44`)
        .text_size(8.5).font_semibold().text_color(color).child(HERO_NAME[hero]));
  }

  // One operator's row; a parent's box also holds its attached sessions, nested below it.
  card(a, s, now, t, sp, stats, kids = [], nested = false) {
    const st = STATE[a.status] ?? { word: String(a.status ?? "").toUpperCase() };
    const color = t[a.status] ?? t.dim;
    const blocked = a.status === "blocked";
    const name = nameOf(a, s, sp);
    const machine = a.address.includes("/") ? a.address.split("/")[0] : "local";
    const old = s && now - (s.at ?? 0) > STALE_S;
    const folded = Boolean(shared(MIN)?.[this.minKey(a.address)]);
    const row = (key, kids) => h_flex().id(`op-${key}-${a.address}`).w_full().min_w(0).h(15).items_center().overflow_hidden().whitespace_nowrap().text_size(11).children(kids.filter(Boolean));
    const span = (text, c, bold) => div().flex_none().text_color(c).when(Boolean(bold), (e) => e.font_semibold()).child(text);
    const grow = (text, c) => div().flex_1().min_w(0).truncate().text_color(c).child(text);
    const status = () => div().flex_none().text_size(10).font_semibold().text_color(color)
      .child(st.word).when(Boolean(st.frames), (e) => e.frames(st.frames, 380));
    const rows = [
      h_flex().w_full().min_w(0).gap(6).items_center()
        .child(div().flex_1().min_w(0).truncate().font_semibold().text_size(12.5).text_color(t.foreground).child(name.toUpperCase()))
        .child(status())
        .when(this.hoveredCard === a.address, (el) => el.child(this.minButton(a, false, t))),
    ];

    if (a.status === "detached") {
      rows.push(row("detached", [grow("Click to reattach", t.accent)]));
    } else if (s) {
      rows.push(row("where", [grow(s.repo || "~", t.muted), span(`@${machine}`, t.dim)]));
      if (s.branch) rows.push(row("branch", [grow(`${s.loc === "wt" ? "wt" : "br"}: ${s.branch}`, t.muted)]));
      const spend = s.tokens != null && s.cost == null ? `${Math.floor(s.tokens / 1000)}k tok` : `$${(s.cost ?? 0).toFixed(2)}`;
      rows.push(row("model", [grow(`${s.model ?? "claude"}${s.effort ? ` ${s.effort}` : ""}`, t.muted), span(spend, t.foreground, true)]));
      const signal = 100 - (s.ctx?.pct ?? 0);
      const five = s.rl?.five_hour;
      const power = five && five.resets_at > now ? 100 - (five.used_percentage ?? 0) : null;
      const level = (v) => (v == null ? t.dim : v < 10 ? t.blocked : v < 25 ? t.ansi3 : t.accent);
      const meter = (key, label, v) => row(key, [span(label, t.dim), span(bar(v), level(v)), span(v == null ? "  —" : ` ${String(Math.round(v)).padStart(3)}%${old ? " old" : ""}`, v != null && v < 25 ? level(v) : t.muted)]);
      rows.push(meter("signal", "SIGNAL ", signal).tooltip(signalTip(s)));
      rows.push(meter("power", "POWER  ", power).tooltip(powerTip(s, now)));
      // uplink · programs · rc
      let uplink = null;
      if (s.cache?.warm === true && s.cache.exp > now) {
        const d = s.cache.exp - now;
        uplink = span(`uplink ${d >= 3600 ? `${Math.floor(d / 3600)}h${Math.floor((d % 3600) / 60)}m` : d >= 60 ? `${Math.floor(d / 60)}m` : "<1m"}`, d < 60 ? t.blocked : t.dim);
      } else if (s.cache?.warm != null) uplink = span("uplink lost", t.blocked);
      if (uplink) uplink = uplink.id(`op-uplink-${a.address}`).tooltip(uplinkTip(s, now));
      const fresh = s.subs && now - (s.subs.at ?? 0) <= SUB_FRESH_S;
      const helpers = fresh ? s.subs.n ?? 0 : 0;
      const total = helpers + (a.status === "working" ? 1 : 0);
      const bits = [uplink, total > 0 && span(`${total} program${total === 1 ? "" : "s"}`, t.muted), s.rc && span("rc", t.ansi4)].filter(Boolean);
      if (bits.length) rows.push(row("link", bits.flatMap((b, i) => (i ? [span(" · ", t.dim), b] : [b]))));
      // helpers only: attached sessions get their own nested cards
      if (fresh) (s.subs.helpers ?? s.subs.names ?? []).slice(0, 3).forEach((n, i, arr) =>
        rows.push(row(`sub${i}`, [grow(`${i === arr.length - 1 && (s.subs.hn ?? helpers) <= arr.length ? "└" : "├"} ${n}`, t.dim)])));
    } else {
      rows.push(row("where", [grow(a.app ? `${a.app}` : a.program?.name ?? "program", t.muted), span(`@${machine}`, t.dim)]));
      rows.push(row("wait", [span(a.app === "claude-code" ? "loading the construct…" : "no telemetry", t.dim)]));
    }

    const head = h_flex()
      .id(`operator-head-${a.address}`)
      .relative()
      .w_full()
      .flex_none()
      .when(folded, (el) => el.h(26).px(7).gap(7).items_center())
      .when(!folded, (el) => el.p(7).gap(9).items_start())
      .when(nested && blocked, (el) => el.bg(`${t.blocked}1a`))
      // inside a group, a lighter border marks the selected session
      .when(nested || kids.length > 0, (el) => el.border(1).border_color(this.focusedTerm === a.address ? t.foreground : "#00000000"))
      .cursor_pointer()
      .hover((x) => x.bg(t.hover))
      .on_click(() => a.status === "detached" ? reattach(a) : run(nested ? "pane.focus" : "agent.focus", { terminal: a.address }))
      .on_hover((on, cx) => {
        if (on) this.hoveredCard = a.address;
        else if (this.hoveredCard === a.address) this.hoveredCard = null;
        cx.notify();
      })
      // the red pill: a blocked card's glow pulses
      .when(blocked, (el) => el.child(div().absolute().top(0).left(0).right(0).bottom(0).bg(`${t.blocked}24`).loop("opacity", { from: 0, to: 1, period: 1400 })))
      .when(folded, (el) => {
        const hero = this.heroOf(a);
        const who = hero ? HERO_NAME[hero] : null;
        return el.children(this.foldedRow(a, name.toUpperCase(), who, status(), foldedTip(a, s, name.toUpperCase(), who, st.word, machine, now, kids), kids, t));
      })
      .when(!folded, (el) => el.child(this.avatar(a, s, color, t))
        .child(v_flex().flex_1().min_w(0).gap(1).children(rows))
        .when(this.hoveredCard === a.address, (e) => e.child(actionButtons(a, s, kids, t).absolute().right(6).bottom(6))));
    if (nested) return head;

    const alarm = blocked || kids.some((k) => k.status === "blocked");
    // the group stays highlighted while the parent or any of its sessions is selected
    const active = a.focused || this.focusedTerm === a.address || kids.some((k) => k.address === this.focusedTerm);
    return v_flex()
      .id(`operator-${a.address}`)
      .w_full()
      .flex_none()
      .bg(blocked ? `${t.blocked}1a` : active ? t.selected : `${t.surface}e6`)
      .border(1)
      .border_color(alarm ? t.blocked : active ? t.accent : t.border)
      .border_l(3)
      .child(head)
      .children(kids.map((k, i) => h_flex().id(`operator-kid-${k.address}`).w_full().min_w(0).items_start().border_t(1).border_color(t.border)
        .child(div().flex_none().w(14).pt(6).text_center().text_size(11).text_color(t.dim).child(i === kids.length - 1 ? "└" : "├"))
        .child(div().flex_1().min_w(0).child(this.card(k, stats.get(k.address), now, t, sp, stats, [], true)))));
  }

  // Everything one render needs, read once: each host read copies the whole list into JS.
  prepare(sp) {
    const all = terminals();
    this.kids = bgChildren(all);
    this.allKids = this.kids;
    const flatKids = [...this.kids.values()].flat();
    const nestedAt = new Set(flatKids.map((k) => k.address));
    const list = agents().filter((a) => !nestedAt.has(a.address));
    const paneList = panes();
    this.focusedTerm = paneList.find((p) => p.focused)?.terminal ?? null;
    this.stats = claudeStats(all, list);
    for (const k of flatKids) this.stats.set(k.address, k.stats);
    this.sp = sp;
    this.castAll([...list, ...flatKids], this.stats, all);

    // Which sector each operator sits in: by its tab, which says so on any machine.
    const spaceOfTab = new Map(sp.flatMap((s) => (s.tabs ?? []).map((tab) => [tab.id, s.id])));
    this.bySpace = new Map();
    const entry = (id) => {
      if (!this.bySpace.has(id)) this.bySpace.set(id, { parents: [], orphans: [] });
      return this.bySpace.get(id);
    };
    for (const a of list) entry(spaceOfTab.get(a.tab) ?? a.space ?? null).parents.push(a);
    // An attached session whose parent has gone still has a pane, so it stays in its sector.
    const parents = new Set(list.map((a) => a.address));
    const tabOf = new Map(paneList.filter((p) => p.terminal).map((p) => [p.terminal, p.tab]));
    for (const [parent, kids] of this.kids) {
      if (parents.has(parent)) continue;
      for (const k of kids) entry(spaceOfTab.get(tabOf.get(k.address)) ?? null).orphans.push(k);
    }
    setAgentOrder([...sp.map((s) => s.id), null].flatMap((id) => this.bySpace.get(id)?.parents ?? []).map((a) => a.address));
  }

  // Everyone in one sector, attached sessions included.
  members(id) {
    const e = this.bySpace.get(id);
    if (!e) return [];
    return [...e.parents, ...e.parents.flatMap((a) => this.kids.get(a.address) ?? []), ...e.orphans];
  }

  count(id) {
    return this.members(id).length;
  }

  // The most urgent state in a sector, for its folded row.
  topStatus(id) {
    const rank = { blocked: 4, done: 3, working: 2, idle: 1 };
    return this.members(id).reduce((top, a) => ((rank[a.status] ?? 0) > (rank[top] ?? 0) ? a.status : top), null);
  }

  // The same words the cards use.
  word(status) {
    return STATE[status]?.word ?? "";
  }

  waiting(ids) {
    return ids.flatMap((id) => this.members(id)).filter((a) => a.status === "blocked" || a.status === "done").length;
  }

  // Sectors with operators the tree isn't drawing, on this machine (null: this computer).
  elsewhere(known, machine) {
    const mine = (a) => (a.address.includes("/") ? a.address.split("/")[0] : null) === machine;
    return [...this.bySpace.keys()].filter((id) => !known.has(id) && this.members(id).some(mine));
  }

  rowsFor(id, t) {
    const e = this.bySpace.get(id);
    if (!e) return [];
    const now = Math.floor(Date.now() / 1000);
    return [
      ...e.parents.map((a) => this.card(a, this.stats.get(a.address), now, t, this.sp, this.stats, this.kids.get(a.address) ?? [])),
      ...e.orphans.map((k) => this.card(k, this.stats.get(k.address), now, t, this.sp, this.stats, [], true)),
    ];
  }
}
