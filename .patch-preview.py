import io

p = 'preview/academy.html'
s = open(p, encoding='utf-8').read()

# ---------- footer markup ----------
old_footer = s[s.index('<footer>'):s.index('</footer>') + len('</footer>')]
new_footer = '''<footer>
  <section class="foot-cta">
    <div class="wrap">
      <div class="foot-cta-top">
        <div>
          <p class="foot-eyebrow">Next cohort opens 6 October 2026</p>
          <h2 class="foot-h">The next promotion is a metrics conversation.</h2>
        </div>
        <div>
          <p class="foot-lead">Start where you actually are. The five levels map what you own now
            against what the role above expects, and programs begin at &#8377;2,999.</p>
          <div class="foot-acts">
            <a class="btn btn-invert" href="#metrics">Find your level</a>
            <a class="btn btn-ghostline" href="#governance">Open the Governance Room</a>
          </div>
        </div>
      </div>
      <ol class="foot-levels">
        <li><span class="n">01</span><p class="v">Learn</p><p class="d">RCM Foundation</p></li>
        <li><span class="n">02</span><p class="v">Perform</p><p class="d">RCM Operations</p></li>
        <li><span class="n">03</span><p class="v">Master</p><p class="d">Operational Excellence</p></li>
        <li><span class="n">04</span><p class="v">Lead</p><p class="d">Team and Operations Leadership</p></li>
        <li><span class="n">05</span><p class="v">Execute</p><p class="d">Executive Leadership</p></li>
      </ol>
    </div>
  </section>

  <div class="foot-dir">
    <div class="wrap">
      <div class="foot-grid">
        <div>
          <a class="brand" href="#top"><b>RCMS</b><span>Operations <i>Academy</i></span></a>
          <p class="micro" style="margin-top:14px;max-width:38ch;color:var(--muted-foreground);line-height:1.6">
            Structured training for US healthcare revenue cycle professionals, from first job to
            executive accountability. Built by a practitioner still on the floor.</p>
        </div>
        <nav><h3 class="lab">Learn</h3><ul><li><a href="#metrics">Learning paths</a></li><li><a href="#metrics">Programs</a></li><li><a href="#metrics">Pricing and tracks</a></li><li><a href="#governance">Mentoring</a></li></ul></nav>
        <nav><h3 class="lab">Practice</h3><ul><li><a href="#governance">Governance Room</a></li><li><a href="#metrics">Operations console</a></li><li><a href="#governance">Denial inventory</a></li><li><a href="#governance">KPI library</a></li></ul></nav>
        <nav><h3 class="lab">Academy</h3><ul><li><a href="#top">About the founder</a></li><li><a href="#top">Community</a></li><li><a href="#top">Writing</a></li><li><a href="#top">Contact</a></li></ul></nav>
        <nav><h3 class="lab">Legal</h3><ul><li><a href="#top">Privacy policy</a></li><li><a href="#top">Terms</a></li><li><a href="#top">Refund policy</a></li><li><a href="#top">Disclaimer</a></li></ul></nav>
      </div>
      <div class="foot-btm">
        <span>&copy; 2026 RCMS Operations Academy. All rights reserved.</span>
        <p>Console and Governance Room figures are illustrative teaching data; no real patient,
          provider or payer information is used anywhere on this site. Benchmarks referenced from
          HFMA MAP Keys, no affiliation. Training content does not replace payer, CMS, HIPAA,
          legal, compliance or employer-specific guidance.</p>
      </div>
    </div>
  </div>
</footer>'''
s = s.replace(old_footer, new_footer)

# ---------- footer CSS ----------
old_fcss = s[s.index('footer{border-top:1px solid var(--border);'):s.index('@media (prefers-reduced-motion:reduce)')]
new_fcss = '''footer{border-top:1px solid var(--border)}
.foot-cta{background:var(--foreground); color:var(--background); padding:80px 20px}
.foot-cta-top{display:grid; grid-template-columns:minmax(0,1fr) minmax(0,26rem); gap:48px; align-items:end}
@media (max-width:900px){.foot-cta-top{grid-template-columns:1fr; gap:32px} .foot-cta{padding:56px 16px}}
.foot-eyebrow{font-family:"IBM Plex Mono",monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:rgba(246,243,237,.58)}
.foot-h{margin-top:24px; max-width:18ch; font-size:clamp(2.1rem,4.6vw,3.6rem); line-height:1.02; color:var(--background)}
.foot-lead{max-width:46ch; font-size:14.5px; line-height:1.65; color:rgba(246,243,237,.74)}
.foot-acts{display:flex; flex-wrap:wrap; gap:10px; margin-top:26px}
.btn-invert{background:var(--background); color:var(--foreground); border-color:var(--background)}
.btn-ghostline{background:transparent; color:var(--background); border-color:rgba(246,243,237,.3)}
.btn-ghostline:hover{background:rgba(246,243,237,.1)}
.foot-levels{list-style:none; display:grid; grid-template-columns:repeat(5,1fr); gap:1px; margin:60px 0 0; padding:0; background:rgba(246,243,237,.16); border:1px solid rgba(246,243,237,.16); border-radius:18px; overflow:hidden}
@media (max-width:900px){.foot-levels{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.foot-levels{grid-template-columns:1fr}}
.foot-levels li{background:var(--foreground); padding:20px}
.foot-levels .n{font-family:"IBM Plex Mono",monospace; font-size:12px; color:rgba(246,243,237,.5)}
.foot-levels .v{margin-top:8px; font-size:15px; font-weight:600; color:var(--background)}
.foot-levels .d{margin-top:6px; font-size:12px; line-height:1.5; color:rgba(246,243,237,.62)}
.foot-dir{background:var(--secondary); padding:56px 20px}
.foot-grid{display:grid; grid-template-columns:1.5fr repeat(4,1fr); gap:40px}
@media (max-width:1000px){.foot-grid{grid-template-columns:1fr 1fr; gap:32px}}
.foot-grid nav ul{list-style:none; margin:16px 0 0; padding:0; display:flex; flex-direction:column; gap:10px}
.foot-grid nav a{font-size:13.5px; color:var(--secondary-foreground); text-decoration:none}
.foot-grid nav a:hover{color:var(--primary)}
.foot-btm{margin-top:56px; padding-top:24px; border-top:1px solid var(--border); display:flex; flex-wrap:wrap; gap:16px; justify-content:space-between; font-size:12px; line-height:1.6; color:var(--muted-foreground)}
.foot-btm p{max-width:70ch}
'''
s = s.replace(old_fcss, new_fcss)

# ---------- nav hide-on-scroll ----------
old_scroll = s[s.index('function onScroll(){'):s.index('window.addEventListener("scroll", onScroll, { passive:true });')]
new_scroll = '''let lastY = 0;
function onScroll(){
  const y = window.scrollY;
  nav.dataset.lifted = y > 12 ? "true" : "false";
  const d = y - lastY;
  if (Math.abs(d) >= 6) {
    lastY = y;
    nav.dataset.hidden = (!reduced && d > 0 && y > 140) ? "true" : "false";
  }
  const at = y + 130;
  let active = -1;
  targets.forEach((sec, i) => { if (sec && sec.offsetTop <= at) active = i; });
  navLinks.forEach((a, i) => {
    if (i === active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}
'''
s = s.replace(old_scroll, new_scroll)
s = s.replace('const navLinks = Array.prototype.slice.call(document.querySelectorAll("#navlinks a"));',
              'const navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));')

# `reduced` is declared later in the file than onScroll runs; hoist it
s = s.replace('/* ---------------- nav ---------------- */',
              '/* ---------------- nav: floating pill that hides on scroll down ---------------- */\nconst reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;')
s = s.replace('const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;\nconst g = window.gsap;',
              'const g = window.gsap;')

open(p, 'w', encoding='utf-8').write(s)
print('preview: footer + nav scroll done')
