// The Matrix layout's tab bar: terminal tabs ("[1] brifin"), a blinking cursor on the
// shown one, a churning katakana spinner while an agent works, a red ! when one needs
// you, a ☎ when one finished. [files] and [changes] open the side panel, remembered per
// space as Herdr's tabs do. Derived from herdr-traveler's traveler-tabs (Apache-2.0,
// Frank Lin), itself from Herdr's tabs mod.
import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, run, openOverlay, theme, window, shared, layout, settings, appHome, readTextFile } from "herdr";

const SPIN = ["ｦ", "ｱ", "ｳ", "ｴ", "ｵ", "ｶ", "ｷ", "ｸ"];

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class Tabs extends View {
  init(_props, cx) {
    // The Workflows button opens a `workflows` mod, so it shows only once one is installed in the Herdr home.
    cx.spawn(async (cx) => { this.workflows = (await readTextFile(`${appHome()}/mods/workflows/mod.json`).catch(() => null)) !== null; cx.notify(); });
    this.pressed = null;
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
  }

  // The side panel is remembered per space (as the shipped tabs mod does).
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  render() {
    const t = theme();
    const space = spaces().find((p) => p.active);
    const shown = space?.tabs ?? [];
    const ps = panes();
    const stop = (_e, cx) => cx.stop_propagation();
    const item = (c, i) => {
      const program = ps.find((p) => p.tab === c.id && p.program?.agent)?.program ?? ps.find((p) => p.tab === c.id)?.program;
      const name = c.named ? c.name : space?.name && shown.length === 1 ? space.name : program?.name ?? `tab ${c.index}`;
      const on = c.active;
      return h_flex().id(`tab-${c.id}`).h_full().px(10).gap(6).items_center().flex_none().text_size(12)
        .border_b(2).border_color(on ? t.accent : "#00000000").bg(on ? t.selected : "#00000000")
        .text_color(on ? t.foreground : t.dim).hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: c.index });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }); })
        .child(div().text_color(on ? t.accent : t.dim).child(`[${c.index}]`))
        .child(div().max_w(180).truncate().child(c.zoomed ? `${name} (zoomed)` : name))
        .when(c.status === "working", (el) => el.child(div().w(10).text_color(t.working).font_semibold().child(SPIN[0]).frames(SPIN, 110)))
        .when(c.status === "blocked", (el) => el.child(div().text_color(t.blocked).font_bold().child("!").frames(["!", " "], 450)))
        .when(c.status === "done", (el) => el.child(div().text_color(t.done).child("☎")))
        .when(on, (el) => el.child(div().w(7).text_color(t.accent).child("▌").frames(["▌", " "], 530)))
        .when(on, (el) => el.child(div().id(`close-${c.id}`).text_color(t.dim).hover((s) => s.text_color(t.blocked))
          .on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); }).child("×")));
    };
    const root = layout(), sidebar = find(root, "sidebar"), w = window();
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(10, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 10;
    const panel = find(root, "panel"), body = find(root, "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);
    const bracket = (id, label, on, action) => div().id(id).h(24).px(8).flex_none().flex().items_center().text_size(11.5)
      .border(1).border_color(on ? t.accent : t.border).bg(on ? t.selected : "#00000000").text_color(on ? t.accent : t.muted)
      .hover((s) => s.text_color(t.accent).border_color(t.accent)).on_mouse_down("left", stop).on_click(action).child(label);
    const panelButton = (id) => {
      const on = panel && !panel.hidden && body?.active === id;
      return bracket(`panel-${id}`, `[${id}]`, on, () => {
        if (on) run("layout.hide", { id: "panel" });
        else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
      });
    };
    return h_flex().size_full().min_w(0).pr(10).pl(lightsPadding).gap(6).items_center().bg(t.chrome).border_b(1).border_color(t.border)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel((e) => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .child(div().flex_none().text_size(11).text_color(t.dim).child(`${space?.machine ?? "local"}:~$`))
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().gap(0).overflow_x_scrollbar().children(shown.map(item)))
      .child(bracket("tab-new", "[+]", false, () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 })))
      .when(Boolean(this.workflows), (el) => el.child(bracket("workflows", "[workflows]", false, () => run("mod.open", { name: "workflows" }))))
      .when(enabled.includes("files"), (el) => el.child(panelButton("files")))
      .when(enabled.includes("changes"), (el) => el.child(panelButton("changes")))
      .when(w?.buttons, (el) => el.child(bracket("minimize", "_", false, () => run("window.minimize")))
        .child(bracket("maximize", "□", false, () => run("window.maximize")))
        .child(bracket("close-window", "×", false, () => run("window.close"))));
  }
}
