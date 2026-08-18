window.__ModuleLoader__.load({
  id: "@custom/dsh-plugin-j-space",
  factory: (require) => {
    const exports = {};
    const React = require("react");
    const { useState, useEffect } = React;
    const { jsxs, jsx } = require("react/jsx-runtime");

    // Locale helper
    const isZh = () => {
      try {
        const stored = localStorage.getItem("dsh.locale") || localStorage.getItem("locale");
        if (stored) return stored.startsWith("zh");
        return (navigator.language || "").startsWith("zh") || (document.documentElement.lang || "").startsWith("zh");
      } catch {
        return true;
      }
    };

    const t = (zh, en) => (isZh() ? zh : en);

    // Clean inline SVG Icons
    const BrainSvg = () => jsx("svg", {
      width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
      children: [
        jsx("path", { d: "M12 2a4 4 0 0 0-4 4v14a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z" }),
        jsx("path", { d: "M8 6a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4" }),
        jsx("path", { d: "M16 6a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4" })
      ]
    });

    const ChevronSvg = ({ open }) => jsx("svg", {
      width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
      style: { transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" },
      children: jsx("polyline", { points: "6 9 12 15 18 9" })
    });

    const BroadcastSvg = () => jsx("svg", {
      width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
      children: [
        jsx("path", { d: "M4.93 19.07A10 10 0 0 1 12 2a10 10 0 0 1 7.07 17.07" }),
        jsx("path", { d: "M7.76 16.24A6 6 0 0 1 12 6a6 6 0 0 1 4.24 10.24" }),
        jsx("circle", { cx: "12", cy: "18", r: "2" })
      ]
    });

    const DenseTrackSvg = () => jsx("svg", {
      width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
      children: jsx("polyline", { points: "22 12 18 12 15 21 9 3 6 12 2 12" })
    });

    const FocusSvg = () => jsx("svg", {
      width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
      children: [
        jsx("circle", { cx: "12", cy: "12", r: "10" }),
        jsx("line", { x1: "22", y1: "12", x2: "18", y2: "12" }),
        jsx("line", { x1: "6", y1: "12", x2: "2", y2: "12" }),
        jsx("line", { x1: "12", y1: "6", x2: "12", y2: "2" }),
        jsx("line", { x1: "12", y1: "22", x2: "12", y2: "18" })
      ]
    });

    const ShieldSvg = () => jsx("svg", {
      width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
      children: jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })
    });

    const LedgerSvg = () => jsx("svg", {
      width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
      children: [
        jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
        jsx("polyline", { points: "14 2 14 8 20 8" }),
        jsx("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
        jsx("line", { x1: "16", y1: "17", x2: "8", y2: "17" })
      ]
    });

    const BridgeSvg = () => jsx("svg", {
      width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
      children: [
        jsx("line", { x1: "6", y1: "3", x2: "6", y2: "15" }),
        jsx("circle", { cx: "18", cy: "6", r: "3" }),
        jsx("circle", { cx: "6", cy: "18", r: "3" }),
        jsx("path", { d: "M18 9a9 9 0 0 1-9 9" })
      ]
    });

    const CheckSvg = () => jsx("svg", {
      width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round",
      children: jsx("polyline", { points: "20 6 9 17 4 12" })
    });

    function JSpaceCard() {
      const [open, setOpen] = useState(false);
      const [mode, setMode] = useState("on-demand");
      const [saving, setSaving] = useState(false);
      const [statusMsg, setStatusMsg] = useState(null);

      const MODES = [
        { id: "on-demand", label: t("按需", "On Demand"), sub: t("按需启用", "On Demand"), desc: t("显式调用或复杂多步推理时长效唤起（推荐默认）", "Triggered explicitly or during complex multi-step reasoning (Recommended)") },
        { id: "always-on", label: t("打开", "Always On"), sub: t("全局常开", "Always On"), desc: t("所有推理会话默认全局注入 J-Space 认知工作空间", "Inject J-Space cognitive workspace into every session by default") },
        { id: "auto", label: t("自动", "Auto"), sub: t("自主判定", "Auto"), desc: t("根据任务复杂度与代码工程深度自主判定启用", "Autonomously activated based on task complexity and code depth") },
        { id: "off", label: t("关闭", "Off"), sub: t("完全停用", "Disabled"), desc: t("完全停用认知控制套件", "Completely disable the cognition control suite") }
      ];

      const MODULES = [
        { icon: BroadcastSvg, name: t("广播枢纽 (Broadcast Hub)", "Broadcast Hub"), desc: t("跨步骤全局共享约束，杜绝表征漂移", "Globally shared constraints across steps to prevent representation drift") },
        { icon: DenseTrackSvg, name: t("稠密轨推理 (Dense Track)", "Dense Track Reasoning"), desc: t("✓/?/✗ 符号寄存器步进验证，可展开为自然语言", "Compact ✓/?/✗ symbol registers with lossless expansion to plain words") },
        { icon: FocusSvg, name: t("聚焦控制 (Directed Focus)", "Directed Focus"), desc: t("工作台容量限制在 1~2 个关键激活项", "Active workspace capacity constrained to 1-2 core items") },
        { icon: ShieldSvg, name: t("自我监控 (Self-Monitoring)", "Self-Monitoring"), desc: t("自主检测推理退化并携带诊断修复", "Detect reasoning degeneration and self-correct with diagnosis") },
        { icon: LedgerSvg, name: t("断点记账 (Workspace Ledger)", "Workspace Ledger"), desc: t("长任务缝隙间的持久化断点状态管理", "Durable state externalization across task seams") },
        { icon: BridgeSvg, name: t("结论前桥接 (Bridge Reasoning)", "Bridge Before Conclusion"), desc: t("强制在得出结论前完成逻辑支撑推导", "Mandate intermediate cognitive bridging before committing to conclusions") }
      ];

      useEffect(() => {
        fetch("/api/jspace.config")
          .then(r => r.json())
          .then(data => {
            if (data && data.ok && data.mode) {
              setMode(data.mode);
            }
          })
          .catch(() => {});
      }, []);

      const handleModeChange = (newMode) => {
        if (mode === newMode || saving) return;
        setMode(newMode);
        setSaving(true);
        setStatusMsg(null);
        fetch("/api/jspace.config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: newMode })
        })
          .then(r => r.json())
          .then(data => {
            setSaving(false);
            if (data && data.ok) {
              const current = MODES.find(m => m.id === newMode);
              setStatusMsg(t("已更新运行策略为: " + current.label, "Policy updated to: " + current.label));
              setTimeout(() => setStatusMsg(null), 3000);
            }
          })
          .catch(() => setSaving(false));
      };

      const getStatusBadge = () => {
        if (mode === "off") {
          return { label: t("已关闭", "Disabled"), bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "rgba(239, 68, 68, 0.3)" };
        }
        if (mode === "always-on") {
          return { label: t("全局常开", "Always On"), bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", border: "rgba(59, 130, 246, 0.4)" };
        }
        if (mode === "auto") {
          return { label: t("智能自动", "Auto"), bg: "rgba(168, 85, 247, 0.2)", color: "#c084fc", border: "rgba(168, 85, 247, 0.4)" };
        }
        return { label: t("按需加载", "On Demand"), bg: "rgba(16, 185, 129, 0.2)", color: "#10b981", border: "rgba(16, 185, 129, 0.4)" };
      };

      const badge = getStatusBadge();

      return jsx("li", {
        style: {
          border: "1px solid var(--dsw-alias-border-l2, #333)",
          borderRadius: "8px",
          background: "var(--dsw-alias-bg-layer-2, #1e1e1e)",
          marginBottom: "12px",
          overflow: "hidden",
          listStyle: "none"
        },
        children: jsxs("div", {
          children: [
            jsxs("button", {
              type: "button",
              onClick: () => setOpen(!open),
              style: {
                width: "100%",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                textAlign: "left"
              },
              children: [
                jsxs("div", {
                  style: { display: "flex", alignItems: "center", gap: "12px" },
                  children: [
                    jsx("div", {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "#60a5fa"
                      },
                      children: jsx(BrainSvg, {})
                    }),
                    jsxs("div", {
                      style: { display: "flex", flexDirection: "column", gap: "3px" },
                      children: [
                        jsxs("div", {
                          style: { display: "flex", alignItems: "center", gap: "8px" },
                          children: [
                            jsx("span", {
                              style: { fontWeight: "600", fontSize: "14px", color: "var(--dsw-alias-label-primary, #fff)" },
                              children: t("J-Space 认知控制套件 (Cognition Suite V3.6)", "J-Space Cognition Suite (V3.6)")
                            }),
                            jsx("span", {
                              style: {
                                fontSize: "11px",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                background: badge.bg,
                                color: badge.color,
                                border: "1px solid " + badge.border,
                                fontWeight: "600"
                              },
                              children: badge.label
                            })
                          ]
                        }),
                        jsx("span", {
                          style: { fontSize: "12px", color: "var(--dsw-alias-label-secondary, #aaa)" },
                          children: t("面向 DeepSeek / Kimi 大模型的推理时认知控制层 · 稠密轨推理 · 防表征漂移", "Inference-time cognitive control layer for DeepSeek / Kimi models · Dense Track · Anti-Drift")
                        })
                      ]
                    })
                  ]
                }),
                jsx(ChevronSvg, { open })
              ]
            }),
            open ? jsxs("div", {
              style: {
                padding: "16px",
                borderTop: "1px solid var(--dsw-alias-border-l1, #2a2a2a)",
                background: "var(--dsw-alias-bg-layer-1, #181818)",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              },
              children: [
                // 1. Activation Mode Selector
                jsxs("div", {
                  style: { display: "flex", flexDirection: "column", gap: "8px" },
                  children: [
                    jsxs("div", {
                      style: { display: "flex", justifyContent: "space-between", alignItems: "center" },
                      children: [
                        jsx("span", {
                          style: { fontSize: "13px", fontWeight: "600", color: "var(--dsw-alias-label-primary, #fff)" },
                          children: t("激活时机与运行模式", "Activation Mode & Runtime Policy")
                        }),
                        statusMsg ? jsx("span", {
                          style: { fontSize: "12px", color: "#10b981" },
                          children: statusMsg
                        }) : null
                      ]
                    }),
                    jsx("div", {
                      style: {
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "8px",
                        background: "rgba(255, 255, 255, 0.02)",
                        padding: "4px",
                        borderRadius: "8px",
                        border: "1px solid var(--dsw-alias-border-l1, #2a2a2a)"
                      },
                      children: MODES.map((m) => {
                        const active = mode === m.id;
                        return jsxs("button", {
                          key: m.id,
                          type: "button",
                          onClick: () => handleModeChange(m.id),
                          disabled: saving,
                          style: {
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: active ? "1px solid #3b82f6" : "1px solid transparent",
                            background: active ? "rgba(59, 130, 246, 0.15)" : "transparent",
                            color: active ? "#60a5fa" : "var(--dsw-alias-label-secondary, #aaa)",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "4px",
                            textAlign: "center",
                            transition: "all 0.15s ease"
                          },
                          children: [
                            jsxs("div", {
                              style: { display: "flex", alignItems: "center", gap: "4px", fontWeight: "600", fontSize: "13px" },
                              children: [
                                active ? jsx(CheckSvg, {}) : null,
                                jsx("span", { children: m.label })
                              ]
                            }),
                            jsx("span", {
                              style: { fontSize: "10px", opacity: active ? 0.9 : 0.6, lineHeight: "1.2" },
                              children: m.sub
                            })
                          ]
                        });
                      })
                    }),
                    jsx("div", {
                      style: { fontSize: "12px", color: "var(--dsw-alias-label-tertiary, #888)", paddingLeft: "2px" },
                      children: t("当前模式说明：" + (MODES.find(m => m.id === mode)?.desc || ""), "Policy details: " + (MODES.find(m => m.id === mode)?.desc || ""))
                    })
                  ]
                }),

                // 2. Cognitive Modules
                jsxs("div", {
                  style: { display: "flex", flexDirection: "column", gap: "8px" },
                  children: [
                    jsx("span", {
                      style: { fontSize: "13px", fontWeight: "600", color: "var(--dsw-alias-label-primary, #fff)" },
                      children: t("内置认知控制模块", "Built-in Cognitive Control Modules")
                    }),
                    jsx("div", {
                      style: {
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "8px"
                      },
                      children: MODULES.map((m, idx) => {
                        const IconComponent = m.icon;
                        return jsxs("div", {
                          key: idx,
                          style: {
                            padding: "10px 12px",
                            borderRadius: "6px",
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid var(--dsw-alias-border-l1, #2a2a2a)",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px"
                          },
                          children: [
                            jsx("div", {
                              style: {
                                marginTop: "2px",
                                color: "#60a5fa",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              },
                              children: jsx(IconComponent, {})
                            }),
                            jsxs("div", {
                              children: [
                                jsx("div", {
                                  style: { fontWeight: "600", fontSize: "12px", color: "var(--dsw-alias-label-primary, #eee)", marginBottom: "2px" },
                                  children: m.name
                                }),
                                jsx("div", {
                                  style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary, #888)", lineHeight: "1.4" },
                                  children: m.desc
                                })
                              ]
                            })
                          ]
                        });
                      })
                    })
                  ]
                }),

                // 3. Footer info
                jsxs("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--dsw-alias-border-l1, #2a2a2a)",
                    fontSize: "12px",
                    color: "var(--dsw-alias-label-tertiary, #888)"
                  },
                  children: [
                    jsx("span", { children: t("技能挂载: ~/.dsh/skills/j-space", "Mounted Skill: ~/.dsh/skills/j-space") }),
                    jsx("span", { style: { color: "#10b981" }, children: t("5 项核心机制已通过本地单元自测", "5 core mechanisms verified via local unit tests") })
                  ]
                })
              ]
            }) : null
          ]
        })
      });
    }

    exports.apply = function(ctx) {
      ctx.inject(["slots"], (sctx) => {
        sctx.slots.inject("settings.plugin.item", function* () {
          yield sctx.slots.register({
            name: "settings.plugin.item",
            id: "j-space",
            order: 5
          }, JSpaceCard);
        });
      });
    };

    return exports;
  }
});
