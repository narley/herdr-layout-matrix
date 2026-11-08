// The Construct's chrome: the sidebar header (live digital rain behind a glitching
// HERDR, search and sidebar buttons) and, with props.footer, the footer (settings,
// add machine, and a white rabbit that takes you to the next agent).
// Click the rain to pause or resume it (shared "matrix.rain"; paused costs nothing).
import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, run, props, window, shared, setShared, updates, layout, agents } from "herdr";
import { rain } from "./rain.js";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;
function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 280) : window()?.platform === "macos" ? 76 : 44 });
}

// HERDR, mostly steady, now and then a glitch.
const TITLE = ["HERDR", "HERDR", "HERDR", "HERDR", "HERDR", "HERDR", "HERDR", "HERDR", "HΞRDR", "HERDR",
  "HERDR", "HERDR", "HERDR", "HERDR", "H3RD|2", "HERDR", "HERDR", "HERDR", "HERDR", "ﾊERDR", "HERDR", "HERDR"];

export default class Chrome extends View {
  init() { this.size = { width: 280, height: 120 }; }

  button(id, icon, action, t) {
    return div().id(id).size(24).flex_none().flex().items_center().justify_center().text_color(t.dim)
      .border(1).border_color(t.border).bg(`${t.canvas}cc`)
      .hover((s) => s.text_color(t.accent).border_color(t.accent))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action)
      .child(svg(`mods/matrix-chrome/${icon}.svg`).size(13));
  }

  footer(t, collapsed) {
    const line = (id, prompt, label, color, action) => h_flex().id(id).h(22).px(8).gap(8).items_center()
      .text_color(color).cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.accent)).on_click(action)
      .child(div().flex_none().text_color(t.dim).child(prompt)).when(!collapsed, (el) => el.child(label));
    const waiting = agents().filter((a) => a.status === "blocked" || a.status === "done").length;
    return v_flex().size_full().bg(`${t.chrome}e6`).border_t(1).border_color(t.border).px(6).py(6).gap(1).text_size(12)
      .child(line("settings", ">", "settings", t.muted, () => run("app.settings"))
        .when(Boolean(updates().app.ready), (el) => el.child(div().text_color(t.accent).child("· update"))))
      .child(line("machine", ">", "add machine", t.muted, () => run("mod.open", { name: "machine-add" })))
      .child(line("rabbit", "🐇", waiting ? `follow the white rabbit (${waiting})` : "follow the white rabbit", waiting ? t.foreground : t.dim,
        () => run("agent.next")).tooltip("Jump to the next agent"));
  }

  render() {
    const t = theme();
    const collapsed = narrow();
    if (props()?.footer) return this.footer(t, collapsed);
    const on = shared("matrix.rain") !== false;
    const mac = window()?.platform === "macos";
    const { width, height } = this.size;
    return div().id("construct").relative().size_full().overflow_hidden().bg(t.canvas)
      .on_size_change((size, cx) => { this.size = size; cx.notify(); })
      .on_click(() => setShared("matrix.rain", !on))
      .children(rain({ width, height, size: 12, seed: 3, speed: 80, still: !on,
        colors: { head: "#9fc4a8", trail: `${t.accent}cc`, tail: `${t.accent}40` } }))
      // a dark veil at the bottom so the title reads
      .child(div().absolute().left(0).right(0).bottom(0).h(54).bg(`${t.canvas}c0`))
      .when(!collapsed, (el) => el.child(v_flex().absolute().left(14).bottom(9).gap(0)
        .child(div().text_size(24).font_bold().text_color(t.accent).frames(TITLE, 140).child("HERDR"))
        .child(div().text_size(10).text_color(t.dim).child(on ? "the construct // live feed" : "the construct // feed paused"))))
      .child(h_flex().absolute().top(10).right(10).gap(6)
        .when(!collapsed, (el) => el.child(this.button("search", "search", () => run("mod.open", { name: "picker" }), t)))
        .when(!(collapsed && mac), (el) => el.child(this.button("sidebar-toggle", "sidebar", toggleSidebar, t))));
  }
}
