export const CSS = `
:host{all:initial;position:fixed;inset:0;width:100%;height:100%;z-index:var(--gm-z,2147483000);pointer-events:none}
*,*::before,*::after{box-sizing:border-box}
.gm-backdrop{animation:gm-fade .2s ease-out;position:fixed;inset:0;background:var(--gm-dim,rgba(15,15,25,.62));pointer-events:auto;transition:opacity .2s}
.gm-ring{position:fixed;border-radius:var(--gm-radius,10px);outline:2px solid var(--gm-accent,#4263eb);outline-offset:2px;pointer-events:none;transition:left .2s,top .2s,width .2s,height .2s}
.gm-pop{color:var(--gm-fg,#1c1b22);font:var(--gm-font-size,15px)/1.45 var(--gm-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);text-transform:none;letter-spacing:normal;position:fixed;box-sizing:border-box;width:min(var(--gm-width,340px),calc(100vw - 24px));padding:16px 18px;background:var(--gm-bg,#fff);border-radius:var(--gm-radius,10px);box-shadow:0 12px 40px rgba(0,0,0,.28);pointer-events:auto;transition:left .2s,top .2s,opacity .15s;animation:gm-in .18s ease-out}
@keyframes gm-in{from{opacity:0;transform:translateY(4px) scale(.98)}}
@keyframes gm-fade{from{opacity:0}}
.gm-arrow{position:absolute;width:12px;height:12px;background:var(--gm-bg,#fff);transform:rotate(45deg);pointer-events:none}
.gm-pop[data-side=center] .gm-arrow{display:none}
.gm-pop:focus{outline:none}
.gm-title{margin:0 0 6px;font-size:16px;font-weight:700}
.gm-desc{margin:0;color:var(--gm-muted,#4a4958)}
.gm-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:14px}
.gm-progress{margin-inline-end:auto;font-size:13px;color:var(--gm-muted,#4a4958)}
.gm-btn{font:inherit;font-weight:600;font-size:.93em;line-height:1.2;border-radius:calc(var(--gm-radius,10px) - 2px);border:1px solid var(--gm-border,transparent);background:rgba(66,99,235,.1);background:color-mix(in srgb,var(--gm-accent,#4263eb) 11%,transparent);color:var(--gm-fg,#1c1b22);padding:8px 15px;cursor:pointer;transition:background .15s,filter .15s,transform .05s}
.gm-btn:hover{background:rgba(66,99,235,.18);background:color-mix(in srgb,var(--gm-accent,#4263eb) 19%,transparent)}
.gm-btn:active{transform:translateY(1px)}
.gm-btn.gm-primary{background-color:var(--gm-accent,#4263eb);background-image:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,0));border-color:transparent;color:var(--gm-accent-fg,#fff);box-shadow:0 1px 2px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.22)}
.gm-btn.gm-primary:hover{filter:brightness(1.07)}
.gm-btn:focus-visible{outline:2px solid var(--gm-accent,#4263eb);outline-offset:2px}
.gm-x{position:absolute;top:8px;inset-inline-end:8px;width:30px;height:30px;padding:0;line-height:1;font-size:18px;border:0;border-radius:999px;background:transparent;opacity:.65}
.gm-x:hover{opacity:1}
.gm-banner{position:fixed;top:max(12px,env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);max-width:calc(100vw - 24px);padding:6px 14px;border-radius:999px;background:var(--gm-accent,#4263eb);color:var(--gm-accent-fg,#fff);font:600 13px/1.3 var(--gm-font,system-ui,sans-serif);text-transform:none;letter-spacing:normal;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.25)}
.gm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.gm-hint{margin:10px 0 0;font-size:.93em;font-weight:600;color:var(--gm-accent,#4263eb)}
.gm-never{display:block;margin:10px auto 0;padding:2px 4px;background:none;border:0;color:var(--gm-muted,#4a4958);font:inherit;font-size:.86em;text-decoration:underline;cursor:pointer}
.gm-pop[data-mode=sheet]{padding:20px 18px 16px;border-radius:calc(var(--gm-radius,10px) + 8px);font-size:max(var(--gm-font-size,15px),16px);box-shadow:0 -6px 30px rgba(0,0,0,.28);animation:gm-up .25s ease-out;touch-action:pan-y;transition:opacity .15s}
.gm-pop[data-mode=sheet]::before{content:"";display:block;width:36px;height:4px;margin:-10px auto 12px;border-radius:2px;background:var(--gm-border,rgba(0,0,0,.22))}
.gm-pop[data-mode=sheet] .gm-btn{min-height:44px;padding:0 18px}
.gm-pop[data-mode=sheet] .gm-foot .gm-btn{flex:1}
.gm-pop[data-mode=sheet] .gm-skip{min-height:44px;padding:0 10px}
.gm-pop[data-mode=sheet] .gm-dots{justify-content:center;padding-inline-end:0;margin-bottom:14px}
.gm-pop[data-mode=sheet] .gm-x{top:2px;width:44px;height:44px;padding:0;min-height:44px}
.gm-pop[data-mode=sheet] .gm-never{min-height:44px}
@keyframes gm-up{from{opacity:0;transform:translateY(28px)}}
.gm-dots{display:flex;align-items:center;gap:6px;margin:0 0 12px;padding-inline-end:34px}
.gm-dot{width:7px;height:7px;border-radius:99px;background:rgba(120,120,140,.32);background:color-mix(in srgb,var(--gm-fg,#1c1b22) 20%,transparent);transition:width .25s,background .25s}
.gm-dot[data-state=done]{background:var(--gm-accent,#4263eb);opacity:.5}
.gm-dot[data-state=current]{width:22px;background:var(--gm-accent,#4263eb)}
.gm-bar{height:4px;margin:0 0 14px;border-radius:99px;overflow:hidden;background:rgba(120,120,140,.25);background:color-mix(in srgb,var(--gm-fg,#1c1b22) 14%,transparent)}
.gm-bar>i{display:block;height:100%;border-radius:inherit;background:var(--gm-accent,#4263eb);transition:width .3s}
.gm-skip{margin-inline-end:auto;padding:8px 6px;border:0;border-radius:6px;background:none;color:var(--gm-muted,#4a4958);font:inherit;font-size:.9em;cursor:pointer}
.gm-skip:hover{color:var(--gm-fg,#1c1b22);text-decoration:underline}
.gm-skip:focus-visible{outline:2px solid var(--gm-accent,#4263eb);outline-offset:2px}
.gm-icon{margin:0 0 10px;font-size:32px;line-height:1}
.gm-img{display:block;width:100%;max-height:170px;margin:0 0 12px;object-fit:cover;border-radius:calc(var(--gm-radius,10px) - 2px)}
.gm-pop[data-welcome]:not([data-mode=sheet]){width:min(var(--gm-welcome-width,420px),calc(100vw - 24px));padding:30px 30px 22px;text-align:center}
.gm-pop[data-welcome]:not([data-mode=sheet]) .gm-title{font-size:21px}
.gm-pop[data-welcome]:not([data-mode=sheet]) .gm-dots{justify-content:center;padding-inline-end:0}
.gm-pop[data-welcome]:not([data-mode=sheet]) .gm-foot{flex-direction:column-reverse;align-items:stretch;margin-top:20px}
.gm-pop[data-welcome]:not([data-mode=sheet]) .gm-skip{margin:0;align-self:center}
.gm-pop[data-welcome]:not([data-mode=sheet]) .gm-btn{padding:11px 16px}
.gm-ring[data-pulse]{animation:gm-pulse 1.5s ease-out infinite}
@keyframes gm-pulse{0%{box-shadow:0 0 0 0 rgba(66,99,235,.55);box-shadow:0 0 0 0 color-mix(in srgb,var(--gm-accent,#4263eb) 55%,transparent)}100%{box-shadow:0 0 0 14px rgba(66,99,235,0);box-shadow:0 0 0 14px transparent}}
@media (prefers-reduced-motion:reduce){.gm-ring,.gm-ring[data-pulse],.gm-pop,.gm-backdrop,.gm-dot{transition:none;animation:none}}
`
