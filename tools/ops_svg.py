#!/usr/bin/env python3
"""Full-body vector operators for the Matrix Herdr layout: nine original characters as SVG
(viewBox 0 0 120 160, shown at 72x96). Writes mods/matrix-agents/ops/:
  <name>-rest.svg  <name>-work.svg  <name>-blocked.svg   poses
  <name>-fx.svg                                       the working effect (animated by the mod)
  alert.svg                                           the needs-you overlay
"""
import os, sys

OUT = os.path.join(sys.argv[1], "mods/matrix-agents/ops")
GREEN = "#22d65c"


def mix(c, k):
    c = c.lstrip("#")
    r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    f = (lambda v: int(v + (255 - v) * (k - 1))) if k > 1 else (lambda v: int(v * k))
    return "#%02x%02x%02x" % tuple(max(0, min(255, f(v))) for v in (r, g, b))


def lin(id, c1, c2, x1=0, y1=0, x2=0, y2=1):
    return (f'<linearGradient id="{id}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{c1}"/>'
            f'<stop offset="1" stop-color="{c2}"/></linearGradient>')


def rad(id, c, a1, a2=0, cx=0.5, cy=0.5, r=0.5):
    return (f'<radialGradient id="{id}" cx="{cx}" cy="{cy}" r="{r}"><stop offset="0" stop-color="{c}" stop-opacity="{a1}"/>'
            f'<stop offset="1" stop-color="{c}" stop-opacity="{a2}"/></radialGradient>')


def wrap(body, defs=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160"><defs>{defs}</defs>{body}</svg>\n'


CAST = {
    "kestrel": dict(skin="#e9bf9c", hair="#2fc4b6", iris="#3a7d8c", jacket="#4a4f5a", top="#22252b", pants="#2c3038", boots="#16181c", hairstyle="undercut", eyes="visor"),
    "rook":    dict(skin="#c48a62", hair="#8f3b28", iris="#4a3020", jacket="#5c6640", top="#3e352c", pants="#4a4234", boots="#2e2218", hairstyle="beanie", beard="#4a2e1c"),
    "vega":    dict(skin="#f2d0b8", hair="#c94a2a", iris="#3d8a58", jacket="#2f6b52", top="#1e1f24", pants="#262a36", boots="#18161a", hairstyle="braid", headset=True),
    "juno":    dict(skin="#7d5038", hair="#1d1614", iris="#3a2414", jacket="#e2b938", top="#3a3d4a", pants="#2c3250", boots="#1c1c22", hairstyle="puffs", stripes=True),
    "pike":    dict(skin="#e0b394", hair="#e4e2dc", iris="#5a6a7a", jacket="#6e4c34", top="#d8d2c0", pants="#4a403a", boots="#2a2018", hairstyle="fringe", beard="#e4e2dc", eyes="specs", lines=True),
    "echo":    dict(skin="#d6ae92", hair="#3c3f47", iris="#2a2a30", jacket="#43464f", top="#43464f", pants="#202126", boots="#121316", hairstyle="hood"),
    "bolt":    dict(skin="#93644a", hair="#9a55e6", iris="#2a1c14", jacket="#1d1e22", top="#8c2a36", pants="#24252a", boots="#101012", hairstyle="mohawk", cyber=True),
    "wren":    dict(skin="#f0c9a6", hair="#e3b24a", iris="#4a7ab0", jacket="#d75a8c", top="#f2f2ee", pants="#3d5a86", boots="#e8e8e2", hairstyle="bowl", phones=True),
}
SH_L, SH_R = (46, 60), (74, 60)


def arm(shoulder, hand, sleeve, skin, bend=1, metal=False):
    (sx, sy), (hx, hy) = shoulder, hand
    mx, my = (sx + hx) / 2, (sy + hy) / 2
    ex, ey = mx + bend * (hy - sy) * 0.18, my - bend * (hx - sx) * 0.18
    if metal:
        return (f'<path d="M{sx},{sy} Q{ex:.1f},{ey:.1f} {hx},{hy}" fill="none" stroke="#8a94a0" stroke-width="8" stroke-linecap="round"/>'
                f'<path d="M{sx},{sy} Q{ex:.1f},{ey:.1f} {hx},{hy}" fill="none" stroke="#59e3f0" stroke-width="1.3" stroke-dasharray="3 4"/>'
                f'<circle cx="{hx}" cy="{hy}" r="4.4" fill="#6a7480" stroke="#3e4650"/>')
    return (f'<path d="M{sx},{sy} Q{ex:.1f},{ey:.1f} {hx},{hy}" fill="none" stroke="{sleeve}" stroke-width="8" stroke-linecap="round"/>'
            f'<circle cx="{hx}" cy="{hy}" r="4.2" fill="{skin}" stroke="{mix(skin, 0.75)}" stroke-width="0.8"/>')


def head(c, mouth="flat", eyes="open"):
    s, hs = c["skin"], c["hairstyle"]
    b = []
    # back hair / hood
    if hs == "braid":
        b.append(f'<path d="M45,26 C42,44 46,54 50,56 L52,34 Z" fill="url(#hair)"/>')
    if hs == "hood":
        b.append(f'<path d="M40,52 C36,22 48,10 60,10 C72,10 84,22 80,52 C76,60 44,60 40,52 Z" fill="{mix(c["hair"], 0.8)}"/>'
                 '<path d="M45,48 C43,26 51,16 60,16 C69,16 77,26 75,48 C70,54 50,54 45,48 Z" fill="#141519"/>')
    # ears, head, cheeks
    b.append(f'<ellipse cx="45" cy="34" rx="2.8" ry="4.4" fill="{mix(s, 0.86)}"/><ellipse cx="75" cy="34" rx="2.8" ry="4.4" fill="{mix(s, 0.86)}"/>')
    b.append('<path d="M45.5,30 C45.5,19 52,15 60,15 C68,15 74.5,19 74.5,30 C74.5,41 69,49 60,49 C51,49 45.5,41 45.5,30 Z" fill="url(#skin)"/>')
    if hs == "hood":
        b.append('<path d="M45.5,30 C45.5,19 52,15 60,15 C68,15 74.5,19 74.5,30 C68,26 52,26 45.5,30 Z" fill="#000" opacity="0.35"/>')
    # eyes
    ex = (54, 66)
    if c.get("eyes") == "visor":
        b.append('<rect x="46" y="29" width="28" height="6.5" rx="3.2" fill="#0c2a2e"/><rect x="47.5" y="30" width="25" height="4.4" rx="2.2" fill="#59e3f0"/>'
                 '<rect x="49" y="30.6" width="9" height="1.4" rx="0.7" fill="#e8feff"/>')
    else:
        for x in ex:
            if eyes == "closed":
                b.append(f'<path d="M{x - 3},33 Q{x},35 {x + 3},33" fill="none" stroke="#2a1c18" stroke-width="1.2"/>')
            else:
                b.append(f'<path d="M{x - 3.6},33 C{x - 2},30.6 {x + 2},30.6 {x + 3.6},33 C{x + 2},35 {x - 2},35 {x - 3.6},33 Z" fill="#f7f4ee"/>'
                         f'<circle cx="{x}" cy="33" r="1.9" fill="{c["iris"]}"/><circle cx="{x}" cy="33" r="0.9" fill="#0c0c0e"/><circle cx="{x + 0.7}" cy="32.3" r="0.5" fill="#fff"/>')
        if c.get("eyes") == "specs":
            for x in ex:
                b.append(f'<rect x="{x - 4.6}" y="29.6" width="9.2" height="6.6" rx="1.6" fill="#cfe6ff" fill-opacity="0.18" stroke="#c9ccd2" stroke-width="1"/>')
    brow = c.get("beard") if c["hairstyle"] == "fringe" else mix(c["hair"], 0.7) if hs != "hood" else "#2a2420"
    for x in ex:
        b.append(f'<path d="M{x - 4},28 Q{x},26 {x + 4},28" fill="none" stroke="{brow}" stroke-width="1.6" stroke-linecap="round"/>')
    b.append(f'<path d="M60,34 C58.6,38 58,40 61,40.6" fill="none" stroke="{mix(s, 0.68)}" stroke-width="1.1" stroke-linecap="round"/>')
    if c.get("lines"):
        b.append(f'<path d="M48.5,37 Q50,39 49.5,41 M71.5,37 Q70,39 70.5,41" fill="none" stroke="{mix(s, 0.76)}" stroke-width="0.8"/>')
    lips = mix(s, 0.55)
    if c.get("beard"):
        b.append(f'<path d="M46,37 C47,50 54,54 60,54 C66,54 73,50 74,37 C70,44 66,46 60,46 C54,46 50,44 46,37 Z" fill="{c["beard"]}"/>'
                 f'<path d="M54.5,43 C57,41 63,41 65.5,43 C63,44 57,44 54.5,43 Z" fill="{mix(c["beard"], 0.8)}"/>')
    if mouth == "open":
        b.append('<path d="M56,44 Q60,49 64,44 Z" fill="#5a1e1e"/>')
    elif mouth == "smile":
        b.append(f'<path d="M56,43.5 Q60,46.5 64,43.5" fill="none" stroke="{lips}" stroke-width="1.6" stroke-linecap="round"/>')
    elif not c.get("beard"):
        b.append(f'<path d="M56.5,44 Q60,45.5 63.5,44" fill="none" stroke="{lips}" stroke-width="1.5" stroke-linecap="round"/>')
    # front hair and headgear
    h2 = mix(c["hair"], 1.5)
    if hs == "undercut":
        b.append('<path d="M48,26 C47,14 58,8 68,10 C78,12 81,22 75,28 C72,21 66,19 60,20 C55,21 51,23 48,26 Z" fill="url(#hair)"/>'
                 '<path d="M62,10 C72,7 84,12 82,20 C79,15 73,14 68,14 Z" fill="url(#hair)"/>'
                 f'<path d="M53,16 C59,11 68,11 74,14" fill="none" stroke="{h2}" stroke-width="1.1" opacity="0.8"/>')
    elif hs == "beanie":
        b.append('<path d="M44,28 C42,8 78,8 76,28 Z" fill="url(#hair)"/>'
                 f'<rect x="43.5" y="22" width="33" height="7.5" rx="3" fill="{mix(c["hair"], 0.75)}"/>'
                 + "".join(f'<path d="M{x},23 L{x},28.5" stroke="{mix(c["hair"], 0.6)}" stroke-width="1"/>' for x in range(47, 75, 4))
                 + f'<circle cx="60" cy="9" r="3.4" fill="{mix(c["hair"], 1.2)}"/>')
    elif hs == "braid":
        b.append('<path d="M45,29 C43,13 52,9 61,9 C71,9 77,16 75,29 C71,21 66,19 59,19 C53,19 48,23 45,29 Z" fill="url(#hair)"/>'
                 '<path d="M72,20 C78,28 79,40 76,50" fill="none" stroke="url(#hair)" stroke-width="5"/>'
                 + "".join(f'<ellipse cx="{77 + (i % 2) * 1.5}" cy="{50 + i * 7}" rx="3.8" ry="4.2" fill="url(#hair)" stroke="{mix(c["hair"], 0.6)}" stroke-width="0.7"/>' for i in range(5))
                 + f'<rect x="75" y="84" width="7" height="2.4" rx="1.2" fill="{GREEN}"/>')
    elif hs == "puffs":
        b.append('<circle cx="46" cy="14" r="8.5" fill="url(#hair)"/><circle cx="74" cy="14" r="8.5" fill="url(#hair)"/>'
                 '<path d="M45.5,28 C45,15 52,12 60,12 C68,12 75,15 74.5,28 C71,21 65,19 60,19 C55,19 49,21 45.5,28 Z" fill="url(#hair)"/>'
                 '<path d="M50,20 L70,20" stroke="#e2b938" stroke-width="2" stroke-linecap="round"/>')
    elif hs == "fringe":
        b.append(f'<path d="M45,30 C43.5,24 45,19 48,18 L48.5,32 Z M75,30 C76.5,24 75,19 72,18 L71.5,32 Z" fill="{c["hair"]}"/>')
    elif hs == "hood":
        b.append(f'<path d="M45,48 C43,26 51,16 60,16 C69,16 77,26 75,48" fill="none" stroke="{mix(c["hair"], 1.3)}" stroke-width="1.6"/>')
    elif hs == "mohawk":
        b.append('<path d="M54,20 L52,3 L57.5,11 L60,-1 L63,10 L68.5,2 L66.5,20 C63,17 57,17 54,20 Z" fill="url(#hair)"/>'
                 '<path d="M74,36 L75.5,38.5" stroke="#c9ccd2" stroke-width="1.6" stroke-linecap="round"/>')
    elif hs == "bowl":
        b.append('<path d="M44,32 C41,12 51,8 60,8 C69,8 79,12 76,32 C74,24 72,22 69,22 L51,22 C48,22 46,24 44,32 Z" fill="url(#hair)"/>'
                 f'<path d="M51,22 L54,27 L57,22 L60,28 L63,22 L66,27 L69,22" fill="url(#hair)" stroke="{mix(c["hair"], 0.85)}" stroke-width="0.5"/>')
    if c.get("headset"):
        b.append('<path d="M43,34 C42,14 78,14 77,34" fill="none" stroke="#25262c" stroke-width="2.4"/>'
                 '<rect x="40" y="30" width="6" height="10" rx="2.4" fill="#25262c"/><path d="M43,39 C44,46 50,48 54,48" fill="none" stroke="#25262c" stroke-width="1.6"/>'
                 '<circle cx="55" cy="48" r="1.9" fill="#ff5a5a"/>')
    if c.get("phones"):
        b.append('<path d="M42,35 C40,6 80,6 78,35" fill="none" stroke="#2c2d33" stroke-width="4"/>'
                 '<rect x="38" y="28" width="9" height="15" rx="4" fill="#2c2d33"/><rect x="73" y="28" width="9" height="15" rx="4" fill="#2c2d33"/>'
                 f'<rect x="39.5" y="31" width="2.4" height="9" rx="1.2" fill="{GREEN}"/><rect x="78.1" y="31" width="2.4" height="9" rx="1.2" fill="{GREEN}"/>')
    # the code's glow along the right of the face
    b.append(f'<path d="M74.5,26 C75.5,38 71,47 62,49" fill="none" stroke="{GREEN}" stroke-width="1.3" opacity="0.6" stroke-linecap="round"/>')
    return "".join(b)


def figure(name, pose, behind="", front=""):
    c = CAST[name]
    d = (lin("skin", mix(c["skin"], 1.12), mix(c["skin"], 0.82), 0.2, 0, 0.8, 1) + lin("jacket", mix(c["jacket"], 1.15), mix(c["jacket"], 0.62))
         + lin("hair", mix(c["hair"], 1.25), mix(c["hair"], 0.7), 0, 0, 0.6, 1) + lin("pants", mix(c["pants"], 1.2), mix(c["pants"], 0.75))
         + rad("glow", GREEN, 0.2, 0, 0.5, 0.55, 0.55))
    b = ['<ellipse cx="60" cy="86" rx="56" ry="74" fill="url(#glow)"/>', '<ellipse cx="60" cy="153" rx="24" ry="4" fill="#000" opacity="0.45"/>', behind]
    # legs and boots
    b.append('<path d="M47,96 L58,96 L57.5,142 L48,142 Z" fill="url(#pants)"/><path d="M62,96 L73,96 L72,142 L62.5,142 Z" fill="url(#pants)"/>')
    b.append(f'<path d="M58,104 L58,142" stroke="{mix(c["pants"], 0.6)}" stroke-width="1"/>')
    boot = c["boots"]
    b.append(f'<path d="M46,138 L58,138 L58.5,149 L43,149 C42,149 42,144 46,141 Z" fill="{boot}"/><path d="M62,138 L74,138 L77,141 C78,144 78,149 77,149 L61.5,149 Z" fill="{boot}"/>'
             f'<rect x="42.5" y="148" width="16.5" height="2.6" rx="1.3" fill="{mix(boot, 0.6) if boot < "#808080" else "#b8b8b2"}"/><rect x="61" y="148" width="16.5" height="2.6" rx="1.3" fill="{mix(boot, 0.6) if boot < "#808080" else "#b8b8b2"}"/>')
    # torso: an open jacket over a top, a belt
    b.append(f'<path d="M44,60 C44,54 76,54 76,60 L78,100 L42,100 Z" fill="url(#jacket)"/>')
    b.append(f'<path d="M54,55 L66,55 L65,98 L55,98 Z" fill="{c["top"]}"/>')
    b.append(f'<path d="M53,55 L51,98 M67,55 L69,98" stroke="{mix(c["jacket"], 0.5)}" stroke-width="1.6"/>')
    b.append(f'<path d="M53,55 L57,66 L60,56 L63,66 L67,55" fill="none" stroke="{mix(c["jacket"], 0.5)}" stroke-width="1.4"/>')
    b.append(f'<rect x="43" y="94" width="34" height="5" rx="1.5" fill="#15161a"/><rect x="57.5" y="94" width="5" height="5" rx="1" fill="#9aa2ad"/>')
    if c.get("stripes"):
        b.append('<path d="M45,84 L77,84" stroke="#e8ecef" stroke-width="3" opacity="0.85"/>')
    if c.get("cyber"):
        b.append('<path d="M70,56 C80,56 84,62 84,70 L74,70 Z" fill="#8a94a0" stroke="#5a6470" stroke-width="1"/><circle cx="78" cy="62" r="1.8" fill="#59e3f0"/>')
    if name == "rook":
        b.append('<rect x="46" y="72" width="7" height="8" rx="1.5" fill="none" stroke="#3e4428" stroke-width="1.2"/>')
    # arms
    sleeve = mix(c["jacket"], 0.92)
    b.append(arm(SH_L, pose.get("l", (42, 96)), sleeve, c["skin"], pose.get("lb", 1)))
    b.append(arm(SH_R, pose.get("r", (78, 96)), sleeve, c["skin"], pose.get("rb", -1), metal=bool(c.get("cyber"))))
    # neck, head
    b.append(f'<rect x="56" y="46" width="8" height="10" rx="3" fill="{mix(c["skin"], 0.8)}"/>')
    b.append(head(c, pose.get("mouth", "flat"), pose.get("eyes", "open")))
    b.append(f'<path d="M77,64 C79,80 79,92 78,100" fill="none" stroke="{GREEN}" stroke-width="1.4" opacity="0.5" stroke-linecap="round"/>')
    b.append(front)
    return d, "".join(b)


def auditor(pose, front=""):
    """The rogue program: a faceless chrome mask with a red slit, a black cowl, a long coat
    traced with circuitry, gloved hands."""
    d = (lin("coat", "#3a3d44", "#101115") + lin("chrome", "#f2f4f7", "#7c838d", 0.2, 0, 0.8, 1)
         + rad("glow", "#ff3b3b", 0.15, 0, 0.5, 0.5, 0.55) + lin("slit", "#ff8080", "#ff1f1f", 0, 0, 1, 0))
    b = ['<ellipse cx="60" cy="86" rx="56" ry="74" fill="url(#glow)"/>', '<ellipse cx="60" cy="153" rx="24" ry="4" fill="#000" opacity="0.5"/>',
         '<rect x="49" y="130" width="9" height="18" fill="#0d0e11"/><rect x="62" y="130" width="9" height="18" fill="#0d0e11"/>',
         '<rect x="45" y="146" width="14" height="4" rx="2" fill="#050506"/><rect x="61" y="146" width="14" height="4" rx="2" fill="#050506"/>',
         '<path d="M44,58 C44,52 76,52 76,58 L84,138 L36,138 Z" fill="url(#coat)"/>',            # a long coat to the shins
         '<path d="M60,58 L60,138" stroke="#08080a" stroke-width="1.6"/>',
         f'<path d="M50,138 L50,118 L56,110 L56,98 M70,138 L70,120 L64,112 L64,98" fill="none" stroke="{GREEN}" stroke-width="1.2" opacity="0.75"/>',
         f'<circle cx="56" cy="98" r="1.7" fill="{GREEN}"/><circle cx="64" cy="98" r="1.7" fill="{GREEN}"/><circle cx="60" cy="88" r="1.8" fill="#ff3b3b"/>']
    b.append(arm(SH_L, pose.get("l", (40, 104)), "#24262c", "#1a1b1f", pose.get("lb", 1)))
    b.append(arm(SH_R, pose.get("r", (80, 104)), "#24262c", "#1a1b1f", pose.get("rb", -1)))
    b += ['<path d="M42,58 C38,26 48,6 60,5 C72,6 82,26 78,58 C72,64 48,64 42,58 Z" fill="#1b1c21"/>',          # cowl
          '<path d="M46,54 C44,30 51,12 60,11 C69,12 76,30 74,54 C68,58 52,58 46,54 Z" fill="#09090b"/>',
          '<path d="M48.5,32 C48.5,20 53,15 60,15 C67,15 71.5,20 71.5,32 C71.5,44 67,51 60,52 C53,51 48.5,44 48.5,32 Z" fill="url(#chrome)"/>',
          '<path d="M53,20 C56,17.5 60,17 63,17.6" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.8" stroke-linecap="round"/>',
          '<rect x="50.5" y="31.5" width="19" height="3.6" rx="1.8" fill="#2a0c0c"/><rect x="51.3" y="32.2" width="17.4" height="2.2" rx="1.1" fill="url(#slit)"/>',
          '<path d="M60,37 L60,48" stroke="#8d949e" stroke-width="0.8" opacity="0.7"/>',
          '<path d="M76,28 C79,38 79,50 75,58" fill="none" stroke="#ff3b3b" stroke-width="1.3" opacity="0.5"/>', front]
    return d, "".join(b)


# ── poses and effects ─────────────────────────────────────────────────────────
UP = dict(r=(78, 12), rb=1, mouth="open")


def plan(name):
    """{rest, work, blocked: (pose, behind, front)}, fx svg body."""
    if name == "kestrel":
        dev = '<rect x="44" y="86" width="8" height="5" rx="1.5" fill="#2a3036" stroke="#59e3f0" stroke-width="0.9"/>'
        return dict(rest=(dict(l=(46, 92)), "", dev.replace('x="44" y="86"', 'x="42" y="90"')),
                    work=(dict(l=(50, 80), r=(62, 82), lb=-1, eyes="open"), "", dev.replace('x="44" y="86"', 'x="46" y="76"')),
                    blocked=(UP, "", "")), \
            ('<rect x="14" y="52" width="34" height="24" rx="3" fill="#59e3f0" fill-opacity="0.16" stroke="#59e3f0" stroke-width="1.1"/>'
             + "".join(f'<rect x="18" y="{57 + i * 4.5}" width="{8 + (i * 7) % 20}" height="1.8" rx="0.9" fill="#9ff3f9"/>' for i in range(4))
             + '<path d="M38,76 L48,78" stroke="#59e3f0" stroke-width="0.8" opacity="0.7"/>')
    if name == "rook":
        bench = '<rect x="84" y="112" width="32" height="5" rx="1.5" fill="#6a5a44"/><rect x="88" y="117" width="4" height="30" fill="#4a3e30"/><rect x="108" y="117" width="4" height="30" fill="#4a3e30"/><rect x="88" y="106" width="22" height="6" rx="1" fill="#1e5a32"/><circle cx="94" cy="109" r="1.2" fill="#c88a4a"/><circle cx="104" cy="109" r="1.2" fill="#c88a4a"/>'
        return dict(rest=(dict(), bench, ""),
                    work=(dict(r=(90, 100), rb=1), bench, '<path d="M86,96 L98,106" stroke="#9aa2ad" stroke-width="2.6" stroke-linecap="round"/><path d="M84,94 L88,98" stroke="#c9563a" stroke-width="4" stroke-linecap="round"/>'),
                    blocked=(UP, bench, "")), \
            "".join(f'<path d="M99,106 L{99 + dx},{106 + dy}" stroke="#ffd36a" stroke-width="1.3" stroke-linecap="round"/>' for dx, dy in ((7, -6), (9, 1), (3, -10), (-5, -8), (11, -3))) + '<circle cx="99" cy="106" r="2.6" fill="#fff4c4"/>'
    if name == "vega":
        return dict(rest=(dict(), "", ""), work=(dict(r=(72, 46), rb=1, mouth="open"), "", ""), blocked=(UP, "", "")), \
            "".join(f'<rect x="{84 + i * 4.2}" y="{38 - h}" width="2.6" height="{h * 2}" rx="1.3" fill="{GREEN}"/>' for i, h in enumerate((3, 8, 12, 7, 10, 4, 2)))
    if name == "juno":
        return dict(rest=(dict(), "", ""), work=(dict(l=(50, 70), r=(70, 70), lb=-1, rb=1, mouth="smile"), "", ""), blocked=(UP, "", "")), \
            ('<g transform="translate(60,56)"><path d="M0,-11 L10,-5.5 L10,5.5 L0,11 L-10,5.5 L-10,-5.5 Z" fill="#a878ff" fill-opacity="0.38" stroke="#c9aaff" stroke-width="1.2"/>'
             '<path d="M0,-11 L0,0 L10,-5.5 M0,0 L-10,-5.5 M0,0 L0,11" stroke="#e4d6ff" stroke-width="0.9"/><circle r="2" fill="#fff"/></g>')
    if name == "pike":
        board = "".join(f'<rect x="{82 + (i % 4) * 8}" y="{104 + (i // 4) * 5}" width="8" height="5" fill="{GREEN}" fill-opacity="{0.4 if (i + i // 4) % 2 else 0.12}"/>' for i in range(8))
        return dict(rest=(dict(), board, ""), work=(dict(r=(88, 96), rb=1), board, ""), blocked=(UP, board, "")), \
            f'<path d="M94,100 L104,100 L102.5,95 C106,92 104.5,85 99,83.5 C102.5,80 101,75 99,73 C97,75 95.5,77 97,80 C92,82 90.5,88.5 95.5,93.5 Z" fill="{GREEN}" fill-opacity="0.32" stroke="{GREEN}" stroke-width="1.1"/>'
    if name == "echo":
        phone = '<rect x="55" y="70" width="11" height="17" rx="2.4" fill="#15171b" stroke="#3a3e46" stroke-width="0.9"/><rect x="56.6" y="72.2" width="7.8" height="12" rx="1" fill="#06240f"/>'
        return dict(rest=(dict(r=(78, 96)), "", ""), work=(dict(l=(56, 82), r=(65, 82), lb=-1, rb=1), "", phone), blocked=(UP, "", "")), \
            ('<path d="M52,48 L68,48 L72,74 L48,74 Z" fill="#22d65c" opacity="0.12"/>'
             + "".join(f'<rect x="{57.5 + (i % 3) * 2.3}" y="{73 + i * 2}" width="1.6" height="1.2" fill="#7cf2a1"/>' for i in range(6)))
    if name == "bolt":
        return dict(rest=(dict(), "", ""), work=(dict(r=(84, 40), rb=1, mouth="smile"), "", ""), blocked=(UP, "", "")), \
            ('<path d="M78,58 L82,50 L80,46 L84,40" fill="none" stroke="#b8fbff" stroke-width="2.2" stroke-linecap="round"/>'
             '<path d="M90,36 L96,30 M92,44 L100,42 M86,30 L88,22" stroke="#59e3f0" stroke-width="1.4" stroke-linecap="round"/><circle cx="84" cy="40" r="6" fill="#59e3f0" fill-opacity="0.3"/>')
    if name == "wren":
        def note(x, y, c):
            return (f'<g fill="{c}"><ellipse cx="{x}" cy="{y + 8}" rx="2.9" ry="2.2"/><rect x="{x + 2}" y="{y}" width="1.3" height="8"/>'
                    f'<path d="M{x + 3.3},{y} Q{x + 7.5},{y + 2} {x + 5.5},{y + 5.5}" fill="none" stroke="{c}" stroke-width="1.3"/></g>')
        return dict(rest=(dict(), "", ""), work=(dict(l=(44, 38), r=(76, 38), lb=-1, rb=1, eyes="closed", mouth="smile"), "", ""), blocked=(UP, "", "")), \
            note(88, 14, GREEN) + note(98, 32, "#c9aaff") + note(18, 20, "#ffd36a")
    if name == "auditor":
        return dict(rest=(dict(), "", ""), work=(dict(r=(94, 58), rb=1), "", ""), blocked=(UP, "", "")), \
            '<rect x="0" y="32" width="120" height="2.6" fill="#ff3b3b" opacity="0.6"/><rect x="0" y="28" width="120" height="10" fill="#ff3b3b" opacity="0.12"/>'
    raise ValueError(name)


def alert():
    return wrap('<rect x="2" y="2" width="116" height="156" rx="6" fill="none" stroke="#ff3b3b" stroke-width="3"/>'
                '<rect width="120" height="160" fill="#ff3b3b" opacity="0.1"/>'
                '<circle cx="102" cy="18" r="11" fill="#ff3b3b"/><rect x="100" y="10" width="4" height="10" rx="2" fill="#fff"/><circle cx="102" cy="24.5" r="2.1" fill="#fff"/>')


os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))
for name in list(CAST) + ["auditor"]:
    poses, fx = plan(name)
    for state, (pose, behind, front) in poses.items():
        d, body = auditor(pose, front) if name == "auditor" else figure(name, pose, behind, front)
        open(f"{OUT}/{name}-{state}.svg", "w").write(wrap(body, d))
    open(f"{OUT}/{name}-fx.svg", "w").write(wrap(fx))
open(f"{OUT}/alert.svg", "w").write(alert())
