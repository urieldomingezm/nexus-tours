export const CSS = `
:host{all:initial;position:fixed;inset:0;width:100%;height:100%;z-index:var(--gm-z,2147483000);pointer-events:none}
*,*::before,*::after{box-sizing:border-box}
.gm-backdrop{position:fixed;inset:0;background:var(--gm-dim,rgba(15,15,25,.62));pointer-events:auto;transition:opacity .2s}
.gm-ring{position:fixed;border-radius:var(--gm-radius,10px);outline:2px solid var(--gm-accent,#6d5efc);outline-offset:2px;pointer-events:none;transition:left .2s,top .2s,width .2s,height .2s}
.gm-pop{color:var(--gm-fg,#1c1b22);font:15px/1.45 var(--gm-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);text-transform:none;letter-spacing:normal;position:fixed;box-sizing:border-box;width:min(340px,calc(100vw - 24px));padding:16px 18px;background:var(--gm-bg,#fff);border-radius:var(--gm-radius,10px);box-shadow:0 12px 40px rgba(0,0,0,.28);pointer-events:auto;transition:left .2s,top .2s,opacity .15s}
.gm-pop:focus{outline:none}
.gm-title{margin:0 0 6px;font-size:16px;font-weight:700}
.gm-desc{margin:0;color:var(--gm-muted,#4a4958)}
.gm-foot{display:flex;align-items:center;gap:8px;margin-top:14px}
.gm-progress{margin-right:auto;font-size:13px;color:var(--gm-muted,#4a4958)}
.gm-btn{font:inherit;font-weight:600;border-radius:8px;border:1px solid var(--gm-border,#cfcde0);background:transparent;color:inherit;padding:7px 13px;cursor:pointer}
.gm-btn:hover{background:rgba(109,94,252,.08)}
.gm-btn.gm-primary{background:var(--gm-accent,#6d5efc);border-color:var(--gm-accent,#6d5efc);color:var(--gm-accent-fg,#fff)}
.gm-btn.gm-primary:hover{filter:brightness(1.08)}
.gm-btn:focus-visible{outline:2px solid var(--gm-accent,#6d5efc);outline-offset:2px}
.gm-x{position:absolute;top:8px;right:8px;width:30px;height:30px;padding:0;line-height:1;font-size:18px;border:0}
.gm-banner{position:fixed;top:12px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 24px);padding:6px 14px;border-radius:999px;background:var(--gm-accent,#6d5efc);color:var(--gm-accent-fg,#fff);font:600 13px/1.3 var(--gm-font,system-ui,sans-serif);text-transform:none;letter-spacing:normal;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.25)}
.gm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.gm-ring,.gm-pop,.gm-backdrop{transition:none}}
`
