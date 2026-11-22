window.__ModuleLoader__.load({
	id: "dsh-auto-memory",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		// src/client/MemoryPage.tsx
		/**
		* 记忆管理面板(主列全局面板)—— 0.9.1 视觉重设计:
		* - 真 CSS 类注入(官方 data-plugin-css 约定,见 client/index.ts 的 PANEL_CSS):
		*   hover/focus/clamp 等伪类能力回归,告别内联样式
		* - 卡片式记忆条目(border-l1 + 圆角 + bg-base),类型用描边色 tag 编码
		* - 胶囊筛选 chips(作用域) + 搜索框;两步确认删除(替代 window.confirm)
		* - 全套 --dsw-alias-* 官方主题 token,深浅/第三方主题自动跟随
		* 布局:用户级 | 项目级 双列(flexWrap 窄屏自动堆叠);面板自滚动。
		*/
		/** 条目选择键(slug 与文件名都不含 \u0000,拼接无歧义)。 */
		function importKey(slug, file) {
			return `${slug}\u0000${file}`;
		}
		/** 类型 tag 的 CSS 类映射(描边色编码,颜色定义在 PANEL_CSS)。 */
		/**
		* 类型标签:低饱和 tinted chip(1.6.0 用户实测反馈:全中性后记忆行灰成一片、
		* 无从扫读)——12% 透明底 + 对应色文字,彩色恢复"扫读区分度"但依然克制
		* (色块面积小,不与作用域身份色竞争)。
		*/
		const TYPE_TAG = {
			user: "dam-tag dam-tag--user",
			feedback: "dam-tag dam-tag--feedback",
			project: "dam-tag dam-tag--project",
			reference: "dam-tag dam-tag--reference"
		};
		/** 行内操作图标(单色 SVG,跟随主题文字色;不依赖 emoji 字体)。 */
		const ICONS = {
			book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"],
			edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
			pin: ["M12 17v5", "M9 3h6l-1 7 2 4H8l2-4-1-7Z"],
			unmute: [
				"M11 5 6 9H3v6h3l5 4V5Z",
				"M16 9a4 4 0 0 1 0 6",
				"M19 6a8 8 0 0 1 0 12"
			],
			mute: [
				"M11 5 6 9H3v6h3l5 4V5Z",
				"m17 9 4 6",
				"m21 9-4 6"
			],
			trash: [
				"M3 6h18",
				"M8 6V4h8v2",
				"M19 6l-1 14H6L5 6",
				"M10 11v6",
				"M14 11v6"
			],
			search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3"],
			refresh: ["M21 12a9 9 0 1 1-2.6-6.4", "M21 3v6h-6"],
			download: [
				"M12 3v12",
				"m7 10 5 5 5-5",
				"M4 21h16"
			],
			upload: [
				"M12 21V9",
				"m7 14 5-5 5 5",
				"M4 3h16"
			],
			chevron: ["m9 6 6 6-6 6"],
			close: ["M6 6l12 12", "M18 6 6 18"],
			user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"],
			users: [
				"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
				"M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
				"M22 21v-2a4 4 0 0 0-3-3.87",
				"M16 3.13a4 4 0 0 1 0 7.75"
			],
			folder: ["M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"],
			chart: [
				"M4 20V10",
				"M10 20V4",
				"M16 20v-7",
				"M22 20H2"
			],
			target: [
				"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
				"M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
				"M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
			],
			pulse: ["M3 12h4l2-7 4 14 2-7h6"],
			gear: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"],
			clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 3"]
		};
		function Icon({ name, size = 14 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.8",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				focusable: "false",
				children: ICONS[name].map((path) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: path }, path))
			});
		}
		/** 类型筛选 chips 的顺序(与 tag 编码一致)。 */
		const TYPE_ORDER = [
			"user",
			"feedback",
			"project",
			"reference"
		];
		/** 字节数的紧凑展示(索引体积都很小,统一 B/KB)。 */
		function formatBytes(bytes) {
			if (bytes < 1024) return `${String(bytes)} B`;
			return `${(bytes / 1024).toFixed(1)} KB`;
		}
		/**
		* 项目目录名可读化:slug 把路径分隔符全折叠成 '-' 不可逆,这里只做"末段截短",
		* 完整值放 title——不假装能还原路径。
		*/
		function shortProjectName(slug) {
			const inner = slug.replace(/^--/, "").replace(/--$/, "");
			if (inner.length <= 38) return inner;
			return `…${inner.slice(-37)}`;
		}
		/** 相对时间(纯函数,渲染时求值)。 */
		function relativeTime(ms, now, t) {
			if (ms === void 0) return null;
			const diff = Math.max(0, now - ms);
			const minutes = Math.floor(diff / 6e4);
			if (minutes < 1) return t("justNow");
			if (minutes < 60) return t("minutesAgo", { n: minutes });
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return t("hoursAgo", { n: hours });
			return t("daysAgo", { n: Math.floor(hours / 24) });
		}
		/**
		* 旧宿主(还没有 projects 字段)的前端兜底:用 timeline 最近 50 条现算。
		* 只影响历史完整性,不影响本次会话;服务端升级后自动改用精确聚合。
		*/
		function projectsFromTimeline(timeline) {
			const perProject = /* @__PURE__ */ new Map();
			for (const entry of timeline) {
				const cwd = entry.cwd.length > 0 ? entry.cwd : "unknown";
				const project = perProject.get(cwd) ?? {
					sessions: /* @__PURE__ */ new Set(),
					injections: 0,
					bytes: 0,
					truncated: 0,
					lastTs: 0
				};
				project.sessions.add(entry.sessionId);
				project.injections += 1;
				project.bytes += entry.bytes;
				project.truncated += entry.truncated;
				project.lastTs = Math.max(project.lastTs, entry.ts);
				perProject.set(cwd, project);
			}
			return [...perProject.entries()].map(([cwd, project]) => ({
				cwd,
				sessions: project.sessions.size,
				injections: project.injections,
				avgBytes: project.injections === 0 ? 0 : Math.round(project.bytes / project.injections),
				memories: 0,
				truncated: project.truncated,
				lastTs: project.lastTs
			})).sort((a, b) => b.injections - a.injections || b.lastTs - a.lastTs || a.cwd.localeCompare(b.cwd));
		}
		/**
		* 注入统计卡(0.10.1 重设计):
		* 头部 = 图标 + 标题 + 摘要 + chevron;主体 = 指标条 + 注入占比条 + 截断榜
		* + 时间线。行一律用固定列网格(作用域圆点/名字/进度条/比例/警告),不再用
		* emoji 徽章——emoji 宽度随平台变化,是之前"项目图标挤歪统计列"的根因。
		*/
		/**
		* 记忆体检(1.0.0):待验证/僵尸/矛盾三榜——只读报告,行动在对应记忆卡片上
		* (卡片带 candidate 徽章与 ✓/⊘ 按钮;行内标注归属层)。
		* 1.5.0:并入独立体检 tab;每行可点 = 切回记忆 tab 并直达该卡片(onLocate)。
		* 1.6.0:第四榜「已过期」+ 行内一键续期 90 天(onRenew)。
		*/
		function HealthSection({ health, t, onLocate, onRenew, busy, onStatus, onDelete }) {
			const [confirmingKey, setConfirmingKey] = (0, react.useState)(null);
			const scopeLabel = (scope) => scope === "user" ? t("scopeUser") : t("scopeProject");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dam-stats",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "dam-stats-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dam-stats-glyph",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
								name: "pulse",
								size: 15
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dam-stats-titles",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dam-stats-title",
								children: t("healthTitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dam-stats-sub",
								children: t("healthHint")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dam-row",
							style: {
								gap: "5px",
								marginLeft: "auto",
								marginRight: "4px"
							},
							children: [
								health.unverified.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-health-pill",
									"data-kind": "unverified",
									children: ["? ", health.unverified.length]
								}),
								health.zombies.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-health-pill",
									"data-kind": "zombies",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
											name: "clock",
											size: 10
										}),
										" ",
										health.zombies.length
									]
								}),
								health.expired.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-health-pill",
									"data-kind": "conflicts",
									children: ["⏱ ", health.expired.length]
								}),
								health.conflicts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-health-pill",
									"data-kind": "conflicts",
									children: ["⚠ ", health.conflicts.length]
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dam-health-cols",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-section",
									children: t("healthUnverified")
								}),
								health.unverified.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-note",
									children: t("healthNone")
								}),
								health.unverified.map((m) => {
									const rowKey = `u-${m.scope}-${m.slug}-${m.name}`;
									if (m.untrusted === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dam-health-row",
										title: t("healthLocateTip"),
										onClick: () => {
											onLocate(m.name);
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "dam-badge dam-badge--cand",
												children: ["? ", t("statusCandidate")]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
												title: m.name,
												children: m.name
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "dam-health-meta",
												children: [scopeLabel(m.scope), m.hasEvidence ? " · 📎" : ""]
											})
										]
									}, rowKey);
									const target = {
										name: m.name,
										scope: m.scope,
										slug: m.slug
									};
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "dam-health-row",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dam-health-locate",
											title: t("untrustedTip"),
											onClick: () => {
												onLocate(m.name);
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: "dam-badge dam-badge--warn",
													children: ["⚠ ", t("untrustedBadge", { name: m.untrusted })]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
													title: m.name,
													children: m.name
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: "dam-health-meta",
													children: [scopeLabel(m.scope), m.hasEvidence ? " · 📎" : ""]
												})
											]
										}), confirmingKey === rowKey ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("confirmDelete") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dam-btn dam-btn-danger",
												disabled: busy,
												onClick: () => {
													setConfirmingKey(null);
													onDelete(target);
												},
												children: t("delete")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dam-btn",
												disabled: busy,
												onClick: () => {
													setConfirmingKey(null);
												},
												children: t("cancel")
											})
										] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dam-btn dam-btn-primary",
												disabled: busy,
												title: t("untrustedTip"),
												onClick: () => {
													onStatus(target, "verified");
												},
												children: t("verifyAction")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dam-btn",
												disabled: busy,
												onClick: () => {
													onStatus(target, "disputed");
												},
												children: t("disputeAction")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dam-btn",
												disabled: busy,
												onClick: () => {
													setConfirmingKey(rowKey);
												},
												children: t("delete")
											})
										] })]
									}, rowKey);
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-section",
									children: t("healthZombies")
								}),
								health.zombies.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-note",
									children: t("healthNone")
								}),
								health.zombies.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "dam-health-row",
									title: t("healthLocateTip"),
									onClick: () => {
										onLocate(m.name);
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dam-badge dam-badge--muted",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
												name: "clock",
												size: 10
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
											title: m.name,
											children: m.name
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dam-health-meta",
											children: [
												scopeLabel(m.scope),
												" · ",
												m.ageDays,
												"d"
											]
										})
									]
								}, `z-${m.scope}-${m.slug}-${m.name}`))
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-section",
									children: t("healthConflicts")
								}),
								health.conflicts.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-note",
									children: t("healthNone")
								}),
								health.conflicts.map((c, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "dam-health-row",
									title: t("healthLocateTip"),
									onClick: () => {
										onLocate(c.a.name);
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dam-badge dam-badge--danger",
											children: c.kind === "cross-scope" ? t("healthCrossScope") : t("healthNearDup")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
											title: c.a.name,
											children: c.a.name
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dam-health-meta",
											title: `${c.b.name} (${scopeLabel(c.b.scope)})`,
											children: [
												"↔ ",
												c.b.name,
												" (",
												scopeLabel(c.b.scope),
												")"
											]
										})
									]
								}, `c-${String(i)}`))
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-section",
									children: t("healthExpired")
								}),
								health.expired.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-note",
									children: t("healthNone")
								}),
								health.expired.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-health-row",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dam-health-locate",
										title: t("healthLocateTip"),
										onClick: () => {
											onLocate(m.name);
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "dam-badge dam-badge--warn",
												children: ["⏱ ", t("expiredAgo", { n: m.expiredDays })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
												title: m.name,
												children: m.name
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dam-health-meta",
												children: scopeLabel(m.scope)
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dam-btn",
										disabled: busy,
										title: t("renewAction"),
										onClick: () => {
											onRenew({
												name: m.name,
												scope: m.scope,
												slug: m.slug
											});
										},
										children: t("renewAction")
									})]
								}, `e-${m.scope}-${m.slug}-${m.name}`))
							]
						})
					]
				})]
			});
		}
		function StatsSection({ stats, t, now, groups, budgetBytes }) {
			const total = stats.memories.length;
			const allFull = total > 0 && stats.memories.every((m) => m.injectedCount === stats.injections);
			const avgBytes = stats.avgBytes ?? (stats.timeline.length > 0 ? Math.round(stats.timeline.reduce((sum, e) => sum + e.bytes, 0) / stats.timeline.length) : 0);
			const ranked = stats.memories.slice(0, 8);
			const rest = stats.memories.slice(8);
			const truncated = stats.memories.filter((m) => (m.truncatedCount ?? 0) > 0).sort((a, b) => (b.truncatedCount ?? 0) - (a.truncatedCount ?? 0));
			const truncTotal = stats.memories.reduce((sum, m) => sum + (m.truncatedCount ?? 0), 0);
			const projects = stats.projects ?? projectsFromTimeline(stats.timeline);
			const projectsApproximate = stats.projects === void 0;
			const maxProjectInjections = projects.reduce((max, project) => Math.max(max, project.injections), 0);
			const scopeByName = new Map(stats.memories.map((memory) => [memory.name, memory.scope]));
			/** 时间线展开状态:当前展开的注入事件 ts(null=全部收起)。 */
			const [openTs, setOpenTs] = (0, react.useState)(null);
			/** 活动柱图:最近 24 次注入(时间升序),高=字节,全柱品牌蓝+latest 强调。
			* 1.6.0 修复:定标含当前生效预算(scaleMax = max(数据, 预算))——Y 轴与
			* 预算参考线随设置中心的索引预算即刻变化,而不是停在历史数据的量级 */
			const activity = stats.timeline.slice(-24);
			const maxActivityBytes = activity.reduce((max, e) => Math.max(max, e.bytes), 0);
			const scaleMax = Math.max(maxActivityBytes, budgetBytes);
			/** 预算参考线位置(图内百分比;贴顶/贴底时略收以免溢出边框) */
			const budgetLinePos = budgetBytes > 0 ? Math.min(96, Math.max(2, Math.round(100 - budgetBytes / scaleMax * 100))) : null;
			/** 作用域分布:按注入次数加权的 user/project/both/missing 份额 */
			const scopeShare = /* @__PURE__ */ new Map();
			for (const m of stats.memories) {
				const key = m.scope ?? "missing";
				scopeShare.set(key, (scopeShare.get(key) ?? 0) + m.injectedCount);
			}
			const scopeTotal = [...scopeShare.values()].reduce((a, b) => a + b, 0) || 1;
			/** 类型分布:全库记忆的 4 类型条数(groups 全集,与 stats 正交) */
			const typeShare = /* @__PURE__ */ new Map();
			let typeTotal = 0;
			if (groups !== null) for (const g of groups) for (const m of g.memories) {
				typeShare.set(m.type, (typeShare.get(m.type) ?? 0) + 1);
				typeTotal += 1;
			}
			const scopeLabel = (scope) => {
				switch (scope) {
					case "user": return t("scopeUser");
					case "project": return t("scopeProject");
					case "both": return t("scopeBoth");
					default: return t("scopeMissing");
				}
			};
			/** 注入榜一行:排名 + 作用域圆点 + 名字 + 占比条 + n/m + 截断警告。 */
			const rankRow = (memory, index) => {
				const scope = memory.scope ?? "missing";
				const pct = stats.injections === 0 ? 0 : Math.min(100, memory.injectedCount / stats.injections * 100);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dam-rank-row",
					"data-scope": scope,
					"data-rank": String(index + 1),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dam-rank-num",
							children: index + 1
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dam-scope-dot",
							title: scopeLabel(memory.scope)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
							className: "dam-rank-name",
							title: memory.name,
							children: memory.name
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dam-mini-bar",
							title: `${memory.injectedCount}/${stats.injections}`,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { width: `${pct}%` } })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dam-ratio",
							children: [
								memory.injectedCount,
								"/",
								stats.injections
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dam-rank-warn",
							children: (memory.truncatedCount ?? 0) > 0 ? `⚠ ${memory.truncatedCount}` : ""
						})
					]
				}, memory.name);
			};
			/** 截断榜一行:同一套作用域圆点/名字对齐,右侧只放截断次数。 */
			const truncRow = (memory) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dam-trunc-row",
				"data-scope": scopeByName.get(memory.name) ?? "missing",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dam-scope-dot",
						title: scopeLabel(scopeByName.get(memory.name))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
						className: "dam-rank-name",
						title: memory.name,
						children: memory.name
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dam-warn",
						children: ["⚠ ", memory.truncatedCount]
					})
				]
			}, memory.name);
			/** 分布条一段(seg):纯色块,宽度=份额;百分比写在图例行(段内白字在浅色
			段上对比度不足,实测叠字看不清——1.5.0 审查后用户实测反馈)。 */
			const distSeg = (key, kind, value, colorHint, label) => {
				const pct = value / (kind === "scope" ? scopeTotal : typeTotal) * 100;
				if (pct <= 0) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dam-dist-seg",
					"data-scope": kind === "scope" ? key : void 0,
					"data-type": kind === "type" ? key : void 0,
					style: { width: `${pct}%` },
					title: `${label}: ${value} (${Math.round(pct)}%)${colorHint.length > 0 ? "" : ""}`
				}, key);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dam-stats",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "dam-stats-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dam-stats-glyph",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
							name: "chart",
							size: 15
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dam-stats-titles",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dam-stats-title",
							children: t("statsTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dam-stats-sub",
							children: [
								stats.sessions,
								" ",
								t("statsSessions"),
								" · ",
								stats.injections,
								" ",
								t("statsInjections"),
								" · ",
								t("statsAvg"),
								" ",
								(avgBytes / 1024).toFixed(1),
								"K"
							]
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dam-stats-body",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-metrics",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-metric",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: stats.sessions }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("statsSessions") })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-metric",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: stats.injections }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("statsInjections") })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-metric",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("b", { children: [(avgBytes / 1024).toFixed(1), "K"] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("statsAvg") })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-metric",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
										style: { color: truncTotal > 0 ? "var(--dsw-alias-state-warn-primary,#d97706)" : void 0 },
										children: truncTotal
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("statsTruncMetric") })]
								})
							]
						}),
						activity.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dam-section",
								children: t("statsActivity")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dam-chart-row",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dam-chart-y",
										"aria-hidden": "true",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [(scaleMax / 1024).toFixed(1), "K"] }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [(scaleMax / 2048).toFixed(1), "K"] }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "0" })
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dam-chart",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dam-chart-grid",
												"aria-hidden": "true",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {})
												]
											}),
											budgetLinePos !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dam-chart-budget",
												style: { top: `${budgetLinePos}%` },
												title: `${t("budget")} ${formatBytes(budgetBytes)}`,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: formatBytes(budgetBytes) })
											}),
											activity.map((entry, index) => {
												const height = scaleMax === 0 ? 4 : Math.max(6, Math.round(entry.bytes / scaleMax * 100));
												const isLatest = index === activity.length - 1;
												const label = (entry.cwd.split(/[\\/]/).pop() ?? entry.cwd) || "—";
												return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dam-chart-bar",
													"data-latest": isLatest ? "1" : "0",
													style: { height: `${height}%` },
													title: `${label} · ${(entry.bytes / 1024).toFixed(1)}K · ${entry.count}${t("statsMemories")}${entry.truncated > 0 ? ` · ⚠${entry.truncated}` : ""}\n${new Date(entry.ts).toLocaleString()}`
												}, `${entry.sessionId}-${entry.ts}`);
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-hidden": "true" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dam-chart-cap",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: relativeTime(activity[0]?.ts, now, t) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: relativeTime(activity[Math.floor(activity.length / 2)]?.ts, now, t) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: relativeTime(activity[activity.length - 1]?.ts, now, t) })
										]
									})
								]
							})]
						}),
						(scopeShare.size > 1 || typeShare.size > 1) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-duo",
							children: [scopeShare.size > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dam-dist",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dam-section",
										style: { margin: 0 },
										children: t("statsScopeShare")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dam-dist-bar",
										children: [...scopeShare.entries()].sort((a, b) => b[1] - a[1]).map(([key, value]) => distSeg(key, "scope", value, "", scopeLabel(key === "missing" ? void 0 : key)))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dam-legend",
										children: [...scopeShare.entries()].sort((a, b) => b[1] - a[1]).map(([key, value]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dam-legend-item",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dam-scope-dot",
													"data-scope": key
												}),
												scopeLabel(key === "missing" ? void 0 : key),
												" ",
												value,
												" ",
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("i", {
													className: "dam-legend-pct",
													children: [Math.round(value / scopeTotal * 100), "%"]
												})
											]
										}, key))
									})
								]
							}), typeShare.size > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dam-dist",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dam-section",
										style: { margin: 0 },
										children: t("statsTypeShare")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dam-dist-bar",
										children: [
											"user",
											"feedback",
											"project",
											"reference"
										].filter((type) => (typeShare.get(type) ?? 0) > 0).map((type) => distSeg(type, "type", typeShare.get(type) ?? 0, "", type))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dam-legend",
										children: [
											"user",
											"feedback",
											"project",
											"reference"
										].filter((type) => (typeShare.get(type) ?? 0) > 0).map((type) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dam-legend-item",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dam-scope-dot",
													"data-type": type,
													style: { background: void 0 }
												}),
												type,
												" ",
												typeShare.get(type),
												" ",
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("i", {
													className: "dam-legend-pct",
													children: [Math.round((typeShare.get(type) ?? 0) / typeTotal * 100), "%"]
												})
											]
										}, type))
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-block-head",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dam-section",
										children: t("statsTopInjected")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dam-legend",
										children: [
											"user",
											"project",
											"both",
											"missing"
										].map((scope) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dam-legend-item",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dam-scope-dot",
												"data-scope": scope
											}), scopeLabel(scope)]
										}, scope))
									})]
								}),
								allFull && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-note",
									children: t("statsAllInjected", {
										n: total,
										m: stats.injections
									})
								}),
								ranked.map((memory, index) => rankRow(memory, index)),
								rest.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
									className: "dam-subdetails",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("statsAll", { n: total }) }), rest.map((memory, index) => rankRow(memory, index + 8))]
								})
							]
						}),
						projects.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-section",
									children: t("statsProjects")
								}),
								projectsApproximate && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-note",
									children: t("statsProjectsRecent")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-proj-head",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("statsProjectCol") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("statsProjectSessions") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("statsProjectInjections") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("statsProjectAvg") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
									]
								}),
								projects.map((project) => {
									const label = project.cwd.split(/[\\/]/).pop() || project.cwd;
									const width = maxProjectInjections === 0 ? 0 : Math.min(100, project.injections / maxProjectInjections * 100);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dam-proj-row",
										title: projectsApproximate ? project.cwd : `${project.cwd}\n${project.memories} ${t("statsMemories")}`,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
												className: "dam-proj-name",
												children: label || "—"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dam-proj-stat",
												children: project.sessions
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dam-proj-stat",
												children: project.injections
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dam-proj-bar",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { width: `${width}%` } })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "dam-proj-stat",
												children: [(project.avgBytes / 1024).toFixed(1), "K"]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dam-proj-warn",
												children: project.truncated > 0 ? `⚠ ${project.truncated}` : ""
											})
										]
									}, project.cwd);
								})
							]
						}),
						truncated.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dam-section",
								children: t("statsTruncatedTop")
							}), truncated.map(truncRow)]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dam-section",
								children: t("statsTimeline")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dam-timeline",
								children: stats.timeline.slice(-8).reverse().map((entry, index) => {
									const names = entry.injected ?? [];
									const cutNames = entry.truncatedNames ?? [];
									const expandable = names.length > 0 || cutNames.length > 0;
									const open = openTs === entry.ts;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dam-tl-item",
										"data-latest": index === 0 ? "1" : "0",
										"data-open": open ? "1" : "0",
										role: expandable ? "button" : void 0,
										tabIndex: expandable ? 0 : -1,
										title: expandable ? open ? t("statsCollapse") : t("statsExpand") : void 0,
										onClick: () => {
											if (expandable) setOpenTs(open ? null : entry.ts);
										},
										onKeyDown: (event) => {
											if (!expandable) return;
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												setOpenTs(open ? null : entry.ts);
											}
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dam-tl-top",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "dam-tl-ws",
														title: entry.cwd,
														children: (entry.cwd.split(/[\\/]/).pop() ?? entry.cwd) || "—"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "dam-tl-time",
														children: relativeTime(entry.ts, now, t)
													}),
													entry.truncated > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: "dam-warn",
														children: ["⚠ ", entry.truncated]
													}),
													expandable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "dam-tl-chev",
														"aria-hidden": "true",
														children: open ? "▾" : "▸"
													})
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dam-tl-meta",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: "dam-pill",
													children: [
														entry.count,
														" ",
														t("statsMemories")
													]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: "dam-pill",
													children: [(entry.bytes / 1024).toFixed(1), " KB"]
												})]
											}),
											open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dam-tl-names",
												children: [names.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: "dam-tl-name",
													title: name,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "dam-scope-dot",
														"data-scope": scopeByName.get(name) ?? "missing"
													}), name]
												}, name)), cutNames.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: "dam-tl-name dam-tl-name--cut",
													title: `${name} — ${t("statsTruncatedTop")}`,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														"aria-hidden": "true",
														children: "✂"
													}), name]
												}, `cut-${name}`))]
											})
										]
									}, `${entry.sessionId}-${entry.ts}`);
								})
							})]
						})
					]
				})]
			});
		}
		/** 记忆管理面板(face 方法经直通交叉成为顶层 props)。 */
		function MemoryPage({ t, list, read, write, del, currentCwd, importScan, importApply, auditStats, healthReport, exportAgents, configGet, configSet }) {
			const [groups, setGroups] = (0, react.useState)(null);
			const [maxBytes, setMaxBytes] = (0, react.useState)(4096);
			/** 索引净预算(host 扣掉写入指导/协议壳后返回;旧宿主缺失时回退 maxBytes)。 */
			const [budgetBytes, setBudgetBytes] = (0, react.useState)(4096);
			const [error, setError] = (0, react.useState)(false);
			const [actionError, setActionError] = (0, react.useState)(null);
			const [editing, setEditing] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [filter, setFilter] = (0, react.useState)("");
			/** 作用域筛选 chips:all / user / project。 */
			const [scopeFilter, setScopeFilter] = (0, react.useState)("all");
			/** 类型筛选 chips:all / user / feedback / project / reference。 */
			const [typeFilter, setTypeFilter] = (0, react.useState)("all");
			/** 卡片正文展开缓存:key = groupKey\0name;只缓存成功结果,失败可重试。 */
			const [bodies, setBodies] = (0, react.useState)({});
			/** 分组折叠状态:未显式设置时,非当前工作区的项目组默认折叠。 */
			const [closedGroups, setClosedGroups] = (0, react.useState)({});
			/** 两步删除:当前处于"待确认"状态的记忆名(null=无)。 */
			const [deletingName, setDeletingName] = (0, react.useState)(null);
			/** #19 谱系跳转:待滚动到的记忆名(设置后清筛选+展开组,由 effect 完成滚动)。 */
			const [jumpTarget, setJumpTarget] = (0, react.useState)(null);
			/**
			* 1.5.0 tab 导航:记忆(默认,C 位)/ 洞察(统计+召回)/ 体检 / 设置。
			* 旧宿主降级:对应数据源缺失的 tab 不渲染;三者全缺时 tab 行整体消失,
			* 面板退化为纯列表形态(与 1.4.x 一致)。
			*/
			const [tab, setTab] = (0, react.useState)("memories");
			/** 跨 tab 跳转的强制重触发计数(切 tab 不改变 visibleGroups 引用,effect 不会重跑)。 */
			const [jumpNonce, setJumpNonce] = (0, react.useState)(0);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			/** 注入审计统计(0.9.0;取不到时静默无统计区——审计绝不影响面板可用性)。 */
			const [stats, setStats] = (0, react.useState)(null);
			/** 记忆体检(1.0.0;旧宿主无路由时 null → 体检区不显示)。 */
			const [health, setHealth] = (0, react.useState)(null);
			/** 设置中心(1.4.0;旧宿主无路由时 null → 设置卡不显示)。 */
			const [settings, setSettings] = (0, react.useState)(null);
			/**
			* Ограниченный режим не-админа (сервер отдаёт restricted в groups.list): видны только СВОИ
			* записи (личные слои + свои записи общего слоя), из действий — просмотр текста и удаление
			* (общие — только ещё не одобренные). Админские разделы (аналитика/здоровье/настройки/
			* импорт/экспорт) скрыты и не запрашиваются — их маршруты для не-админа 403.
			*/
			const [restricted, setRestricted] = (0, react.useState)(false);
			/** Claude 可同步条数(watcher 透传;undefined = 旧宿主/未扫描,不显示提示)。 */
			const [claudePending, setClaudePending] = (0, react.useState)(void 0);
			/** 导出 AGENTS.md 的成功提示(导出桥 1.2.0)。 */
			const [exportNote, setExportNote] = (0, react.useState)(null);
			/** 导入桥状态机:loading(扫描)→ select(勾选)→ applying → done。 */
			const [importer, setImporter] = (0, react.useState)(null);
			/** 扫描请求序号:弹层关闭即作废在途请求,迟到的响应不得复活弹层(审查修复)。 */
			const importSeq = (0, react.useRef)(0);
			const load = (0, react.useCallback)(async () => {
				setError(false);
				/** Ограниченный режим из свежего ответа (локальная копия: state ещё не обновился). */
				let isRestricted = false;
				try {
					const data = await list();
					setGroups(data.groups);
					setMaxBytes(data.maxBytes);
					setBudgetBytes(data.budgetBytes ?? data.maxBytes);
					setClaudePending(data.claudeImportPending);
					isRestricted = data.restricted === true;
					setRestricted(isRestricted);
					setNow(Date.now());
				} catch {
					setError(true);
				}
				if (isRestricted) {
					setStats(null);
					setHealth(null);
					setSettings(null);
					return;
				}
				const [statsRes, healthRes, settingsRes] = await Promise.allSettled([
					auditStats(),
					healthReport(),
					configGet()
				]);
				if (statsRes.status === "fulfilled") setStats(statsRes.value);
				if (healthRes.status === "fulfilled") setHealth(healthRes.value);
				if (settingsRes.status === "fulfilled") setSettings(settingsRes.value);
			}, [
				list,
				auditStats,
				healthReport,
				configGet
			]);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			/**
			* #19 谱系/体检行跳转:清筛选 + **显式展开目标所在组** + 滚动到卡片。
			* 1.5.0 审查修复(major):不能 setClosedGroups({}) 清空——非当前工作区的项目组
			* 回落默认折叠,卡片不在 DOM,滚动落空且 visibleGroups 引用不变导致 effect
			* 永不重试;改为只把目标组置为展开(其余组保持用户当前展开态)。
			* 由 effect 驱动(组展开与筛选清空是异步重渲染,同步 scrollIntoView 找不到
			* 节点);滚动+高亮后清除目标防重复触发。找不到目标(dangling 后继)静默 no-op。
			*/
			const jumpTo = (name) => {
				setFilter("");
				setScopeFilter("all");
				setTypeFilter("all");
				setClosedGroups((previous) => {
					const next = { ...previous };
					for (const g of groups ?? []) if (g.memories.some((m) => m.name === name)) next[g.key] = false;
					return next;
				});
				setTab("memories");
				setJumpNonce((n) => n + 1);
				setJumpTarget(name);
			};
			(0, react.useEffect)(() => {
				if (importer === null) return;
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					importSeq.current++;
					setImporter(null);
				};
				window.addEventListener("keydown", onKeyDown);
				return () => {
					window.removeEventListener("keydown", onKeyDown);
				};
			}, [importer]);
			/** 前端过滤:作用域 + 类型 chips + 名称/标题/摘要子串(不区分大小写)。 */
			const needle = filter.trim().toLowerCase();
			const visibleGroups = (0, react.useMemo)(() => {
				if (groups === null) return null;
				const filtering = needle.length > 0 || typeFilter !== "all";
				return groups.filter((g) => scopeFilter === "all" || g.scope === scopeFilter).map((group) => ({
					...group,
					memories: group.memories.filter((memory) => (typeFilter === "all" || memory.type === typeFilter) && (needle.length === 0 || memory.name.toLowerCase().includes(needle) || memory.description.toLowerCase().includes(needle) || (memory.title ?? "").toLowerCase().includes(needle)))
				})).filter((group) => group.memories.length > 0 || !filtering && group.indexText != null);
			}, [
				groups,
				needle,
				scopeFilter,
				typeFilter
			]);
			/** 面板滚动容器 ref(切 tab 时复位滚动位置,审查 minor 修复)。 */
			const rootRef = (0, react.useRef)(null);
			/** 切 tab 复位面板滚动(内容高度不同,旧位置会被钳制成"半路");声明在跳转 effect 之前——jumpTo 同批切 tab 时先复位再 scrollIntoView 目标。 */
			(0, react.useEffect)(() => {
				rootRef.current?.scrollTo({ top: 0 });
			}, [tab]);
			(0, react.useEffect)(() => {
				if (jumpTarget === null) return;
				const element = groups?.flatMap((g) => g.memories.some((m) => m.name === jumpTarget) ? [document.getElementById(`dam-m-${g.key}-${jumpTarget}`)] : []).find((el) => el !== null);
				if (element === void 0) return;
				element.scrollIntoView({
					block: "nearest",
					behavior: "smooth"
				});
				element.setAttribute("tabindex", "-1");
				element.focus({ preventScroll: true });
				element.classList.add("dam-lineage-hit");
				window.setTimeout(() => {
					element.classList.remove("dam-lineage-hit");
				}, 1600);
				setJumpTarget(null);
			}, [
				jumpTarget,
				jumpNonce,
				tab,
				visibleGroups,
				groups
			]);
			/** 类型 chips 的计数:按作用域过滤后的全集统计(与类型筛选无关)。 */
			const typeCounts = (0, react.useMemo)(() => {
				const counts = {};
				if (groups === null) return counts;
				for (const group of groups) {
					if (scopeFilter !== "all" && group.scope !== scopeFilter) continue;
					for (const memory of group.memories) counts[memory.type] = (counts[memory.type] ?? 0) + 1;
				}
				return counts;
			}, [groups, scopeFilter]);
			const act = async (fn) => {
				setBusy(true);
				setActionError(null);
				try {
					const response = await fn();
					if (!response.ok) setActionError(response.status === 404 ? t("deleteFailed") : t("saveFailed"));
				} catch {
					setActionError(t("saveFailed"));
				} finally {
					setBusy(false);
					await load();
				}
			};
			const cwd = (group) => group.scope === "project" && group.current === true ? currentCwd() : void 0;
			/** 非当前工作区的项目组没有 cwd,读写必然 400:UI 直接呈现只读,而不是点了报错。 */
			const canWrite = (group) => group.scope === "user" || group.current === true;
			/**
			* Чтение тела записи. Полный режим: как раньше (личный user-слой + текущая рабочая область).
			* Ограниченный режим дополнительно разрешает общий слой — сервер кладёт туда только СВОИ
			* записи автора (тело читать можно, удалить — только пока запись не одобрена).
			*/
			const canRead = (group) => canWrite(group) || group.scope === "shared";
			/**
			* Удаление. Полный режим (админ): личные группы — как раньше; общие записи (если
			* появятся в панели админа) — любые. Ограниченный режим: свои личные записи — всегда;
			* свои записи общего слоя — только ещё не одобренные (candidate/disputed): одобренные
			* удаляет админ (то же правило проверит store — единая точка).
			*/
			const canDelete = (group, memory) => {
				if (group.scope === "shared") return restricted ? memory.status === "candidate" || memory.status === "disputed" : true;
				return canWrite(group);
			};
			/** 卡片正文展开/收起(懒加载 + 缓存;只读组没有 cwd,不允许展开)。 */
			const toggleBody = (group, memory) => {
				if (!canRead(group)) return;
				const key = `${group.key}\u0000${memory.name}`;
				if (bodies[key]?.body !== void 0) {
					setBodies((previous) => {
						const next = { ...previous };
						delete next[key];
						return next;
					});
					return;
				}
				setBodies((previous) => ({
					...previous,
					[key]: { loading: true }
				}));
				read({
					name: memory.name,
					scope: group.scope,
					cwd: cwd(group)
				}).then((detail) => {
					setBodies((previous) => ({
						...previous,
						[key]: { body: detail.body }
					}));
				}).catch(() => {
					setBodies((previous) => ({
						...previous,
						[key]: { error: true }
					}));
				});
			};
			/** 打开编辑器:先拉取正文(列表响应不含 body);失败中止,绝不以空正文打开。 */
			const openEditor = async (group, memory) => {
				try {
					const detail = await read({
						name: memory.name,
						scope: group.scope,
						cwd: cwd(group)
					});
					setEditing({
						group,
						memory,
						body: detail.body
					});
				} catch (error) {
					console.warn("[auto-memory] read failed, editor aborted", error);
					await load();
				}
			};
			/** 读正文后整条重写的切换(pin/mute 共用;失败把错误上屏,绝不静默)。 */
			const toggleFlag = (group, memory, field) => {
				(async () => {
					try {
						const detail = await read({
							name: memory.name,
							scope: group.scope,
							cwd: cwd(group)
						});
						await act(() => write({
							cwd: cwd(group),
							scope: group.scope,
							name: memory.name,
							title: memory.title,
							description: memory.description,
							type: memory.type,
							body: detail.body,
							pinned: field === "pinned" ? !memory.pinned : memory.pinned,
							disabled: field === "disabled" ? !memory.disabled : memory.disabled
						}));
					} catch (error) {
						console.warn("[auto-memory] read failed, toggle aborted", error);
						setActionError(t("saveFailed"));
					}
				})();
			};
			/** 可信状态流转(1.0.0):读正文后带 status 整条重写(verify/dispute/restore 共用)。
			*  restore(离开 superseded)时同时清本条 supersedes(断链两侧同步,#19)。 */
			const setStatus = (group, memory, status) => {
				(async () => {
					try {
						const detail = await read({
							name: memory.name,
							scope: group.scope,
							cwd: cwd(group)
						});
						const leaving = memory.status === "superseded" && status !== "superseded";
						await act(() => write({
							cwd: cwd(group),
							scope: group.scope,
							name: memory.name,
							title: memory.title,
							description: memory.description,
							type: memory.type,
							body: detail.body,
							pinned: memory.pinned,
							disabled: memory.disabled,
							status,
							...leaving ? { supersedes: "" } : {}
						}));
					} catch (error) {
						console.warn("[auto-memory] status change aborted", error);
						setActionError(t("saveFailed"));
					}
				})();
			};
			if (error) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dam-root",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("error") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "dam-btn",
					onClick: () => {
						load();
					},
					children: t("retry")
				})]
			});
			if (groups === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dam-root",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("loading") })
			});
			const total = groups.reduce((sum, group) => sum + group.memories.length, 0);
			const totalPinned = groups.reduce((sum, group) => sum + group.memories.filter((m) => m.pinned).length, 0);
			const totalMuted = groups.reduce((sum, group) => sum + group.memories.filter((m) => m.disabled).length, 0);
			const totalStale = groups.reduce((sum, group) => sum + group.memories.filter((m) => m.stale && !m.disabled).length, 0);
			const injectedBytes = groups.reduce((sum, group) => sum + (group.scope === "user" || group.scope === "shared" || group.current === true ? group.indexBytes : 0), 0);
			injectedBytes / budgetBytes;
			/** 顶条构成显示(1.6.0 透明化):固定开销 = maxBytes − 净预算,前端算零后端改动;
			*  旧宿主无 budgetBytes 字段(回退=maxBytes)时差值为 0,自动降级单段显示 */
			const fixedOverhead = Math.max(0, maxBytes - budgetBytes);
			const usageTotalPct = maxBytes > 0 ? Math.min(100, Math.round((injectedBytes + fixedOverhead) / maxBytes * 100)) : 0;
			const fixedPct = maxBytes > 0 ? Math.min(100, fixedOverhead / maxBytes * 100) : 0;
			const idxPct = maxBytes > 0 ? Math.min(100 - fixedPct, injectedBytes / maxBytes * 100) : 0;
			const userCount = groups.filter((g) => g.scope === "user").reduce((sum, group) => sum + group.memories.length, 0);
			const sharedCount = groups.filter((g) => g.scope === "shared").reduce((sum, group) => sum + group.memories.length, 0);
			const projectCount = total - userCount - sharedCount;
			const visibleCount = visibleGroups?.reduce((sum, group) => sum + group.memories.length, 0) ?? 0;
			const filtering = filter.trim().length > 0 || typeFilter !== "all" || scopeFilter !== "all";
			/** 一个分组(可折叠):组头 + 注入预算/索引预览 + 紧凑记忆行。 */
			const renderGroup = (group) => {
				const readonly = !canRead(group);
				const isShared = group.scope === "shared";
				const injected = group.scope === "user" || isShared || group.current === true;
				const usage = injected ? group.indexBytes / budgetBytes : 0;
				const hot = usage > .8;
				const pinnedCount = group.memories.filter((m) => m.pinned).length;
				const mutedCount = group.memories.filter((m) => m.disabled).length;
				const staleCount = group.memories.filter((m) => m.stale && !m.disabled).length;
				const totalInGroup = (groups?.find((candidate) => candidate.key === group.key))?.memories.length ?? group.memories.length;
				const shownCount = group.memories.length;
				const defaultClosed = group.scope === "project" && group.current !== true;
				const collapsed = editing?.group.key === group.key ? false : closedGroups[group.key] ?? defaultClosed;
				const projectLabel = group.scope === "project" && group.current === true ? currentCwd()?.split(/[\\/]/).filter(Boolean).pop() ?? shortProjectName(group.slug) : shortProjectName(group.slug);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "dam-group",
					"data-scope": group.scope,
					"data-current": group.current === true ? "1" : "0",
					"data-open": collapsed ? "0" : "1",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dam-group-head",
						"aria-expanded": !collapsed,
						onClick: () => {
							setClosedGroups((previous) => ({
								...previous,
								[group.key]: !collapsed
							}));
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dam-group-icon",
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
									name: group.scope === "user" ? "user" : isShared ? "users" : "folder",
									size: 14
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dam-group-name",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-group-title",
									title: group.slug,
									children: group.scope === "user" ? t("userScopeShort") : isShared ? t("sharedScopeShort") : projectLabel
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-group-sub",
									children: group.scope === "user" ? t("userScopeHint") : isShared ? t("sharedScopeHint") : `${t("projectScope")} · ${group.current === true ? t("currentBadge") : t("readonlyBadge")}`
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dam-group-meta",
								children: [
									shownCount < totalInGroup ? `${shownCount} / ${totalInGroup}` : String(shownCount),
									" ",
									t("overviewMemories"),
									pinnedCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										" · ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
											name: "pin",
											size: 10
										}),
										" ",
										pinnedCount
									] }),
									mutedCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										" · ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
											name: "mute",
											size: 10
										}),
										" ",
										mutedCount
									] }),
									staleCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										" · ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
											name: "clock",
											size: 10
										}),
										" ",
										staleCount
									] })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dam-chevron",
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
									name: "chevron",
									size: 12
								})
							})
						]
					}), !collapsed && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dam-group-body",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-group-tools",
							children: [injected ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dam-budget",
								title: `${formatBytes(injectedBytes)} / ${formatBytes(budgetBytes)}`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-budget-track",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
										"data-hot": hot ? "1" : "0",
										style: { width: `${Math.min(100, usage * 100)}%` }
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-budget-label",
									children: [
										formatBytes(group.indexBytes),
										" / ",
										formatBytes(budgetBytes)
									]
								})]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dam-group-hint",
								children: t("notInjectedHint")
							}), group.indexText != null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: "dam-index",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("injectedPreview") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: group.indexText })]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-memory-list",
							children: [group.memories.map((memory) => {
								const when = relativeTime(memory.updatedMs, now, t);
								const confirming = deletingName === memory.name;
								const bodyState = bodies[`${group.key}\u0000${memory.name}`];
								const expanded = bodyState?.body !== void 0;
								const actionsDisabled = busy || importer !== null;
								const readonlyHint = readonly ? t("projectNeedsSession") : void 0;
								const deletable = canDelete(group, memory);
								const deleteHint = deletable ? t("delete") : readonly ? t("projectNeedsSession") : t("deleteRestrictedHint");
								if (editing !== null && editing.memory.name === memory.name && editing.group.key === group.key) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MemoryEditor, {
									t,
									initial: editing.memory,
									initialBody: editing.body,
									busy,
									inline: true,
									onCancel: () => {
										setEditing(null);
									},
									onSave: async (payload) => {
										await act(() => write({
											cwd: cwd(group),
											scope: group.scope,
											...payload
										}));
										setEditing(null);
									}
								}, memory.name);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									id: `dam-m-${group.key}-${memory.name}`,
									className: "dam-memory",
									"data-pinned": memory.pinned ? "1" : "0",
									"data-muted": memory.disabled ? "1" : "0",
									"data-stale": memory.stale && !memory.disabled ? "1" : "0",
									"data-expanded": expanded ? "1" : "0",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dam-memory-main",
											role: readonly ? void 0 : "button",
											tabIndex: readonly ? -1 : 0,
											title: readonly ? t("projectNeedsSession") : expanded ? t("hideBody") : t("showBody"),
											onClick: () => {
												if (!readonly) toggleBody(group, memory);
											},
											onKeyDown: (event) => {
												if (readonly) return;
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													toggleBody(group, memory);
												}
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "dam-memory-line",
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: TYPE_TAG[memory.type] ?? TYPE_TAG.reference,
															children: memory.type
														}),
														memory.importedFrom === "claude-code" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "dam-badge dam-badge--ok",
															title: t("importedBadge"),
															children: "Claude"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "dam-memory-title",
															children: memory.title ?? memory.name
														}),
														memory.pinned && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "dam-memory-pin",
															title: t("pinned"),
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
																name: "pin",
																size: 11
															})
														}),
														memory.disabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "dam-badge dam-badge--muted",
															children: t("mutedShort")
														}),
														memory.stale && !memory.disabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "dam-badge dam-badge--warn",
															children: t("staleShort")
														}),
														memory.expired && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dam-badge dam-badge--warn",
															title: t("validUntilHint"),
															children: ["⏱ ", t("expiredBadge")]
														}),
														memory.status === "candidate" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dam-badge dam-badge--cand",
															title: t("statusTipCandidate"),
															children: ["? ", t("statusCandidate")]
														}),
														memory.status === "verified" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dam-badge dam-badge--ok",
															title: t("statusVerified"),
															children: ["✓ ", t("statusVerified")]
														}),
														memory.status === "disputed" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dam-badge dam-badge--danger",
															title: t("statusTipDisputed"),
															children: ["⊘ ", t("statusDisputed")]
														}),
														memory.status === "superseded" && memory.supersededBy === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dam-badge dam-badge--muted",
															title: t("statusSuperseded"),
															children: ["⟳ ", t("statusSuperseded")]
														}),
														memory.status === "superseded" && memory.supersededBy !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dam-badge dam-badge--muted dam-lineage-link",
															title: `${t("statusSuperseded")} → ${memory.supersededBy}`,
															role: "button",
															tabIndex: 0,
															onClick: (event) => {
																event.stopPropagation();
																jumpTo(memory.supersededBy);
															},
															onKeyDown: (event) => {
																if (event.key === "Enter" || event.key === " ") {
																	event.stopPropagation();
																	jumpTo(memory.supersededBy);
																}
															},
															children: [
																"⟳ ",
																t("statusSuperseded"),
																" → ",
																memory.supersededBy
															]
														}),
														memory.status !== "superseded" && memory.supersedes !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dam-badge dam-badge--ok",
															title: t("lineageReplaces", { name: memory.supersedes }),
															children: ["⇄ ", memory.supersedes]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dam-memory-time",
															title: memory.updatedMs !== void 0 ? new Date(memory.updatedMs).toLocaleString() : void 0,
															children: [
																memory.reads,
																" ",
																t("reads"),
																when !== null ? ` · ${when}` : ""
															]
														})
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
													className: "dam-memory-desc",
													children: memory.description
												}),
												bodyState?.loading === true && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
													className: "dam-note",
													children: ["⏳ ", t("bodyLoading")]
												}),
												bodyState?.error === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
													className: "dam-err",
													children: t("bodyLoadFailed")
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dam-memory-actions",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "dam-icon-btn",
													"data-on": expanded ? "1" : "0",
													disabled: actionsDisabled || readonly,
													title: readonlyHint ?? (expanded ? t("hideBody") : t("showBody")),
													"aria-label": expanded ? t("hideBody") : t("showBody"),
													onClick: () => {
														toggleBody(group, memory);
													},
													"data-tone": "brand",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { name: "book" })
												}),
												!restricted && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: "dam-icon-btn",
														disabled: actionsDisabled || readonly,
														title: readonlyHint ?? t("edit"),
														"aria-label": t("edit"),
														onClick: () => {
															openEditor(group, memory);
														},
														"data-tone": "brand",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { name: "edit" })
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: "dam-icon-btn",
														"data-on": memory.pinned ? "1" : "0",
														disabled: actionsDisabled || readonly,
														title: readonlyHint ?? (memory.pinned ? t("unpinAction") : t("pinAction")),
														"aria-label": memory.pinned ? t("unpinAction") : t("pinAction"),
														onClick: () => {
															toggleFlag(group, memory, "pinned");
														},
														"data-tone": "warn",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { name: "pin" })
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: "dam-icon-btn",
														"data-on": memory.disabled ? "1" : "0",
														disabled: actionsDisabled || readonly,
														title: readonlyHint ?? (memory.disabled ? t("unmuteAction") : t("muteAction")),
														"aria-label": memory.disabled ? t("unmuteAction") : t("muteAction"),
														onClick: () => {
															toggleFlag(group, memory, "disabled");
														},
														"data-tone": "muted",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { name: memory.disabled ? "unmute" : "mute" })
													})
												] }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "dam-icon-btn",
													"data-danger": "1",
													disabled: actionsDisabled || !deletable,
													title: deleteHint,
													"aria-label": t("delete"),
													onClick: () => {
														setDeletingName(memory.name);
													},
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { name: "trash" })
												})
											]
										}),
										expanded && bodyState?.body !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
											className: "dam-body dam-memory-body",
											children: bodyState.body
										}),
										expanded && memory.evidence !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dam-evidence",
											title: `${t("evidenceTitle")} · ${memory.evidence.sessionId}`,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dam-evidence-label",
												children: t("evidenceTitle")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "dam-evidence-quote",
												children: [
													"“",
													memory.evidence.quote,
													"”"
												]
											})]
										}),
										!restricted && memory.status === "candidate" && !readonly && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dam-status-actions",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dam-btn dam-btn-primary",
												disabled: busy || actionsDisabled,
												title: t("statusTipCandidate"),
												onClick: () => {
													setStatus(group, memory, "verified");
												},
												children: t("verifyAction")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dam-btn",
												disabled: busy || actionsDisabled,
												onClick: () => {
													setStatus(group, memory, "disputed");
												},
												children: t("disputeAction")
											})]
										}),
										!restricted && (memory.status === "disputed" || memory.status === "superseded") && !readonly && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dam-status-actions",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dam-btn",
												disabled: busy || actionsDisabled,
												onClick: () => {
													setStatus(group, memory, "candidate");
												},
												children: t("restoreAction")
											})
										}),
										confirming && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dam-memory-confirm",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("confirmDelete") }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "dam-btn dam-btn-danger",
													disabled: busy,
													onClick: () => {
														setDeletingName(null);
														act(() => del({
															cwd: cwd(group),
															scope: group.scope,
															name: memory.name
														}));
													},
													children: t("delete")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "dam-btn",
													disabled: busy,
													onClick: () => {
														setDeletingName(null);
													},
													children: t("cancel")
												})
											]
										})
									]
								}, memory.name);
							}), group.memories.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dam-note",
								children: t("noSearchHits")
							})]
						})]
					})]
				}, group.key);
			};
			const userGroups = visibleGroups?.filter((g) => g.scope === "user") ?? [];
			const projectGroups = visibleGroups?.filter((g) => g.scope !== "user") ?? [];
			const showInsights = stats !== null && stats.injections > 0;
			const healthIssueCount = health === null ? 0 : health.unverified.length + health.zombies.length + health.conflicts.length + health.expired.length;
			const showHealth = health !== null && healthIssueCount > 0;
			const showSettings = settings !== null;
			const showTabBar = showInsights || showHealth || showSettings;
			const activeTab = tab === "insights" && !showInsights ? "memories" : tab === "health" && !showHealth ? "memories" : tab === "settings" && !showSettings ? "memories" : tab;
			/**
			* 打开 Claude 导入弹层(头部按钮/提示条/空状态三处共用一个入口;
			* 1.5.0 消灭旧版"提示条按钮 querySelector 转发点击头部按钮"的 hack)。
			*/
			const openImporter = () => {
				if (busy || importer !== null || editing !== null) return;
				const seq = ++importSeq.current;
				setImporter({ phase: "loading" });
				importScan().then((scan) => {
					if (seq !== importSeq.current) return;
					if (scan.found && scan.projects.length > 0) {
						const selected = {};
						for (const p of scan.projects) for (const f of p.files) selected[importKey(p.slug, f.file)] = true;
						setImporter({
							phase: "select",
							projects: scan.projects,
							selected,
							allToUser: false
						});
					} else setImporter({ phase: "empty" });
				}).catch(() => {
					if (seq !== importSeq.current) return;
					setImporter({ phase: "failed" });
				});
			};
			/**
			* 过期记忆一键续期(1.6.0):按 scope+slug 精确定组(跨层/跨项目同名不串,
			* 审查 major 修复),先读原正文(write 路由整条重写,body 缺省会清空),
			* 带新 validUntilMs=now+90d 重写;显式透传 status 避免触发降级判定;
			* 项目组沿用 cwd(group) 门禁——非当前工作区只读组直接提示失败。
			*/
			const renewExpired = async (target) => {
				const group = groups?.find((g) => g.scope === target.scope && g.slug === target.slug);
				const memory = group?.memories.find((m) => m.name === target.name);
				if (group === void 0 || memory === void 0) return;
				if (group.scope === "project" && group.current !== true) {
					setActionError(t("renewFailed"));
					return;
				}
				const owningCwd = cwd(group);
				try {
					const full = await read({
						name: target.name,
						scope: group.scope,
						...owningCwd !== void 0 ? { cwd: owningCwd } : {}
					});
					await act(() => write({
						...owningCwd !== void 0 ? { cwd: owningCwd } : {},
						scope: group.scope,
						name: target.name,
						description: memory.description,
						type: memory.type,
						body: full.body,
						...memory.pinned ? { pinned: true } : {},
						...memory.disabled ? { disabled: true } : {},
						...memory.status !== void 0 ? { status: memory.status } : {},
						validUntilMs: Date.now() + 7776e6
					}));
				} catch {
					setActionError(t("renewFailed"));
				}
			};
			/**
			* П.9 (v1.12): verify/dispute «тихой» записи (после недоверенного чтения) прямо
			* из health board. Точная группа по scope+slug, read + write со статусом —
			* как renewExpired; метка untrusted сохраняется наследованием в store.
			* Проектные группы не текущего workspace — read-only (та же дисциплина).
			*/
			const healthSetStatus = (target, status) => {
				const group = groups?.find((g) => g.scope === target.scope && g.slug === target.slug);
				const memory = group?.memories.find((m) => m.name === target.name);
				if (group === void 0 || memory === void 0) return;
				if (group.scope === "project" && group.current !== true) {
					setActionError(t("saveFailed"));
					return;
				}
				const owningCwd = cwd(group);
				(async () => {
					try {
						const full = await read({
							name: target.name,
							scope: group.scope,
							...owningCwd !== void 0 ? { cwd: owningCwd } : {}
						});
						await act(() => write({
							...owningCwd !== void 0 ? { cwd: owningCwd } : {},
							scope: group.scope,
							name: target.name,
							description: memory.description,
							type: memory.type,
							body: full.body,
							...memory.pinned ? { pinned: true } : {},
							...memory.disabled ? { disabled: true } : {},
							status
						}));
					} catch {
						setActionError(t("saveFailed"));
					}
				})();
			};
			/** П.9: удаление «тихой» записи из health board (действие после инлайн-подтверждения). */
			const healthDelete = (target) => {
				const group = groups?.find((g) => g.scope === target.scope && g.slug === target.slug);
				if (group === void 0) return;
				if (group.scope === "project" && group.current !== true) {
					setActionError(t("deleteFailed"));
					return;
				}
				const owningCwd = cwd(group);
				act(() => del({
					...owningCwd !== void 0 ? { cwd: owningCwd } : {},
					scope: group.scope,
					name: target.name
				}));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dam-root",
				ref: rootRef,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dam-shell",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: "dam-header",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-heading",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dam-brand-mark",
										"aria-hidden": "true"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
										className: "dam-title",
										title: t("intro"),
										children: t("title")
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dam-header-side",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "dam-usage",
										title: `${t("budget")} ${formatBytes(maxBytes)} · ${t("usageFixedTip")}`,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dam-usage-label",
											children: [
												t("indexUsage"),
												" ",
												String(usageTotalPct),
												"% · ",
												t("usageIdx"),
												" ",
												formatBytes(injectedBytes),
												fixedOverhead > 0 ? ` + ${t("usageFixed")} ${formatBytes(fixedOverhead)}` : "",
												" / ",
												formatBytes(maxBytes)
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dam-usage-track",
											children: [fixedOverhead > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
												className: "dam-usage-fixed",
												style: { width: `${String(Math.round(fixedPct))}%` }
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
												"data-hot": usageTotalPct > 80 ? "1" : "0",
												style: { width: `${String(Math.round(idxPct))}%` }
											})]
										})]
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-header-actions",
									children: [
										!restricted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-btn dam-btn-ghost",
											disabled: busy,
											title: t("exportTip"),
											"aria-label": t("exportAction"),
											onClick: () => {
												exportAgents().then((res) => navigator.clipboard.writeText(res.content)).then(() => {
													setActionError(null);
													setExportNote(t("exportDone"));
												}).catch(() => {
													setExportNote(null);
													setActionError(t("exportFailed"));
												});
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
												name: "upload",
												size: 13
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-btn dam-btn-ghost",
											onClick: () => {
												load();
											},
											disabled: busy,
											"aria-label": t("refresh"),
											title: t("refresh"),
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
												name: "refresh",
												size: 13
											})
										}),
										!restricted && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dam-btn dam-btn-primary",
											disabled: busy || importer !== null || editing !== null,
											onClick: openImporter,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
													name: "download",
													size: 13
												}),
												" ",
												t("importBtn")
											]
										})
									]
								})
							]
						}),
						restricted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-restricted-note",
							children: t("restrictedModeHint")
						}),
						showTabBar && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
							className: "dam-tabs",
							role: "tablist",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									role: "tab",
									"aria-selected": activeTab === "memories",
									className: "dam-tab",
									"data-on": activeTab === "memories" ? "1" : "0",
									onClick: () => {
										setTab("memories");
									},
									children: [
										t("tabMemories"),
										" ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dam-tab-count",
											children: String(total)
										})
									]
								}),
								showInsights && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									role: "tab",
									"aria-selected": activeTab === "insights",
									className: "dam-tab",
									"data-on": activeTab === "insights" ? "1" : "0",
									onClick: () => {
										setTab("insights");
									},
									children: t("tabInsights")
								}),
								showHealth && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									role: "tab",
									"aria-selected": activeTab === "health",
									className: "dam-tab",
									"data-on": activeTab === "health" ? "1" : "0",
									onClick: () => {
										setTab("health");
									},
									children: [
										t("tabHealth"),
										" ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dam-tab-count dam-tab-count--alert",
											children: String(healthIssueCount)
										})
									]
								}),
								showSettings && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									role: "tab",
									"aria-selected": activeTab === "settings",
									className: "dam-tab",
									"data-on": activeTab === "settings" ? "1" : "0",
									onClick: () => {
										setTab("settings");
									},
									children: t("settingsTitle")
								})
							]
						}),
						claudePending !== void 0 && claudePending > 0 && importer === null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-import-hint",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
									name: "download",
									size: 12
								}),
								" ",
								t("importHint", { n: claudePending })
							] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dam-btn",
								onClick: openImporter,
								children: t("healthView")
							})]
						}),
						exportNote !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-export-note",
							children: ["✓ ", exportNote]
						}),
						actionError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-err dam-banner",
							children: actionError
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-tabpane",
							"data-on": activeTab === "memories" ? "1" : "0",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-toolbar",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "dam-search",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dam-search-icon",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
														name: "search",
														size: 13
													})
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													value: filter,
													placeholder: t("searchPlaceholder"),
													"aria-label": t("searchPlaceholder"),
													onChange: (event) => {
														setFilter(event.target.value);
													}
												}),
												filter.trim().length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "dam-search-clear",
													title: t("clearFilters"),
													"aria-label": t("clearFilters"),
													onClick: () => {
														setFilter("");
													},
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
														name: "close",
														size: 11
													})
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dam-segment",
											role: "group",
											"aria-label": t("overviewMemories"),
											children: [
												[
													"all",
													t("allScopes"),
													total
												],
												[
													"user",
													t("userScopeShort"),
													userCount
												],
												[
													"project",
													t("projectScope"),
													projectCount
												],
												...restricted && sharedCount > 0 ? [[
													"shared",
													t("sharedScopeShort"),
													sharedCount
												]] : []
											].map(([key, label, count]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												"data-on": scopeFilter === key ? "1" : "0",
												onClick: () => {
													setScopeFilter(key);
												},
												children: [
													label,
													" ",
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: count })
												]
											}, key))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											className: "dam-select",
											"aria-label": t("allTypes"),
											value: typeFilter,
											onChange: (event) => {
												setTypeFilter(event.target.value);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
												value: "all",
												children: [
													t("allTypes"),
													" · ",
													total
												]
											}), TYPE_ORDER.map((type) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
												value: type,
												children: [
													type,
													" · ",
													typeCounts[type] ?? 0
												]
											}, type))]
										}),
										filtering && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-btn dam-btn-ghost",
											onClick: () => {
												setFilter("");
												setScopeFilter("all");
												setTypeFilter("all");
											},
											children: t("clearFilters")
										})
									]
								}),
								(totalPinned > 0 || totalMuted > 0 || totalStale > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-chips",
									children: [
										totalPinned > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dam-chip",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
													name: "pin",
													size: 11
												}),
												" ",
												totalPinned,
												" ",
												t("overviewPinned")
											]
										}),
										totalMuted > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dam-chip",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
													name: "mute",
													size: 11
												}),
												" ",
												totalMuted,
												" ",
												t("overviewMuted")
											]
										}),
										totalStale > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dam-chip",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
													name: "clock",
													size: 11
												}),
												" ",
												totalStale,
												" ",
												t("overviewStale")
											]
										}),
										filtering && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dam-chip dam-chip--filter",
											children: t("showingOf", {
												shown: visibleCount,
												total
											})
										})
									]
								}),
								total === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-empty",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dam-empty-icon",
											"aria-hidden": "true",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
												name: "book",
												size: 34
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("emptyTitle") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("emptyStep1") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
											className: "dam-note",
											children: [
												t("emptyStep2"),
												" · ",
												t("emptyStep3")
											]
										}),
										!restricted && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dam-btn dam-btn-primary",
											disabled: busy || importer !== null || editing !== null,
											onClick: openImporter,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
													name: "download",
													size: 13
												}),
												" ",
												t("importBtn")
											]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-groups",
									children: [userGroups.map(renderGroup), projectGroups.map(renderGroup)]
								}),
								total > 0 && (visibleGroups?.length ?? 0) === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-note",
									children: t("noSearchHits")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-tabpane",
							"data-on": activeTab === "insights" ? "1" : "0",
							children: stats !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dam-insights",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatsSection, {
									stats,
									t,
									now,
									groups,
									budgetBytes
								}), groups !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecallSection, {
									stats,
									groups,
									t
								})]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-tabpane",
							"data-on": activeTab === "health" ? "1" : "0",
							children: health !== null && showHealth && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HealthSection, {
								health,
								t,
								onLocate: jumpTo,
								onRenew: renewExpired,
								busy,
								onStatus: healthSetStatus,
								onDelete: healthDelete
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-tabpane",
							"data-on": activeTab === "settings" ? "1" : "0",
							children: settings !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsCard, {
								t,
								settings,
								avgRowBytes: groups !== null && groups.length > 0 ? Math.max(24, Math.round(groups.reduce((s, g) => s + g.indexBytes, 0) / Math.max(1, groups.reduce((s, g) => s + g.memories.length, 0)))) : 96,
								onSaved: async () => {
									try {
										setSettings(await configGet());
									} catch {}
									await load();
								},
								configSet
							})
						}),
						importer !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-modal-backdrop",
							onMouseDown: (event) => {
								if (event.target !== event.currentTarget) return;
								importSeq.current++;
								setImporter(null);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dam-modal",
								role: "dialog",
								"aria-modal": "true",
								"aria-label": t("importTitle"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImportDialog, {
									t,
									state: importer,
									onClose: () => {
										importSeq.current++;
										setImporter(null);
									},
									onToggleProject: (slug, value) => {
										if (importer.phase !== "select") return;
										const project = importer.projects.find((p) => p.slug === slug);
										if (project === void 0) return;
										const selected = { ...importer.selected };
										for (const f of project.files) if (f.state === "pending" || f.state === "imported" || f.state === "legacy") selected[importKey(slug, f.file)] = value;
										setImporter({
											...importer,
											selected
										});
									},
									onToggleFile: (slug, file, value) => {
										if (importer.phase !== "select") return;
										setImporter({
											...importer,
											selected: {
												...importer.selected,
												[importKey(slug, file)]: value
											}
										});
									},
									onAllToUser: (value) => {
										if (importer.phase !== "select") return;
										setImporter({
											...importer,
											allToUser: value
										});
									},
									onApply: async () => {
										if (importer.phase !== "select") return;
										const items = [];
										const revoke = [];
										for (const project of importer.projects) for (const file of project.files) {
											const checked = importer.selected[importKey(project.slug, file.file)] === true;
											if (checked && file.state === "pending") items.push({
												slug: project.slug,
												file: file.file
											});
											if (!checked && (file.state === "imported" || file.state === "legacy")) revoke.push({
												slug: project.slug,
												file: file.file
											});
										}
										if (items.length === 0 && revoke.length === 0) return;
										setImporter({ phase: "applying" });
										try {
											const response = await importApply({
												items,
												revoke,
												allToUser: importer.allToUser
											});
											if (!response.ok) throw new Error(String(response.status));
											const result = await response.json();
											const kept = result.keptModified + result.revokeMissing;
											setImporter({
												phase: "done",
												summary: t("importDone", {
													n: result.imported,
													s: result.skipped,
													f: result.failed,
													r: result.revoked
												}) + (kept > 0 ? ` ${t("importKeptNote", { k: kept })}` : "")
											});
										} catch {
											setImporter({ phase: "runFailed" });
										} finally {
											await load();
										}
									}
								})
							})
						})
					]
				})
			});
		}
		/** 单条记忆编辑器(标题/摘要/正文,保存即重建索引、下次注入生效)。
		* inline=true:在被编辑卡片的原位展开(0.9.1 行内编辑),去 sticky 浮层形态
		* 并自动滚入视野;缺省(false)保持底部浮层形态(兼容既有调用面)。 */
		function MemoryEditor({ t, initial, initialBody, busy, inline, onSave, onCancel }) {
			const [title, setTitle] = (0, react.useState)(initial.title ?? "");
			const [description, setDescription] = (0, react.useState)(initial.description);
			const [body, setBody] = (0, react.useState)(initialBody);
			const [validDays, setValidDays] = (0, react.useState)(() => {
				if (initial.validUntilMs === void 0) return "";
				const remaining = Math.ceil((initial.validUntilMs - Date.now()) / 864e5);
				return remaining > 0 ? String(remaining) : "";
			});
			const validDaysInit = (0, react.useRef)(validDays);
			const rootRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (inline) rootRef.current?.scrollIntoView({
					block: "nearest",
					behavior: "smooth"
				});
			}, [inline]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: inline ? "dam-form dam-form--inline" : "dam-form",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dam-form-title",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dam-form-bar" }),
							t("edit"),
							": ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: initial.name })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						className: "dam-label",
						children: t("titleField")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "dam-input",
						value: title,
						onChange: (event) => {
							setTitle(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						className: "dam-label",
						children: t("descriptionField")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "dam-input",
						value: description,
						onChange: (event) => {
							setDescription(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						className: "dam-label",
						children: t("bodyField")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						className: "dam-textarea",
						value: body,
						onChange: (event) => {
							setBody(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dam-label",
						title: t("validUntilHint"),
						children: [
							t("validUntilField"),
							" · ",
							t("validUntilHint")
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "dam-input",
						type: "number",
						min: 1,
						max: 3650,
						placeholder: t("validUntilNone"),
						value: validDays,
						onChange: (event) => {
							setValidDays(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dam-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dam-btn dam-btn-primary",
							disabled: busy,
							onClick: () => {
								const validDaysDirty = validDays !== validDaysInit.current;
								const parsedDirty = Number(validDays);
								onSave({
									name: initial.name,
									title: title.trim().length > 0 ? title.trim() : void 0,
									description,
									type: initial.type,
									body,
									pinned: initial.pinned,
									...validDaysDirty ? { validUntilMs: validDays.trim().length > 0 && Number.isSafeInteger(parsedDirty) && parsedDirty > 0 ? Date.now() + parsedDirty * 864e5 : 0 } : {}
								});
							},
							children: t("save")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dam-btn",
							disabled: busy,
							onClick: onCancel,
							children: t("cancel")
						})]
					})
				]
			});
		}
		/**
		* 导入 Claude Code 记忆的浮层弹窗(0.8.0;0.10.0 逐条选择 + 撤销):
		* loading → empty/failed → select(逐项目/逐条勾选,已导入条目取消勾选=撤销)
		* → applying → done(结果摘要;关闭后列表已刷新)。
		*/
		function ImportDialog({ t, state, onClose, onToggleProject, onToggleFile, onAllToUser, onApply }) {
			const counts = state.phase === "select" ? state.projects.reduce((acc, project) => {
				for (const file of project.files) {
					const checked = state.selected[importKey(project.slug, file.file)] === true;
					if (checked && file.state === "pending") acc.pending += 1;
					if (!checked && (file.state === "imported" || file.state === "legacy")) acc.revoke += 1;
				}
				return acc;
			}, {
				pending: 0,
				revoke: 0
			}) : {
				pending: 0,
				revoke: 0
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dam-form",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dam-form-title",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dam-form-bar" }), t("importTitle")]
					}),
					state.phase === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: { margin: "12px 0" },
						children: "⏳ …"
					}),
					state.phase === "empty" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: { margin: "12px 0" },
						children: t("importEmpty")
					}),
					state.phase === "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dam-err",
						style: { margin: "12px 0" },
						children: t("importScanFailed")
					}),
					state.phase === "runFailed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dam-err",
						style: { margin: "12px 0" },
						children: t("importRunFailed")
					}),
					state.phase === "select" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-import-wrap",
							children: state.projects.map((project) => {
								const selectable = project.files.filter((f) => f.state === "pending" || f.state === "imported" || f.state === "legacy");
								const allChecked = selectable.length > 0 && selectable.every((f) => state.selected[importKey(project.slug, f.file)] === true);
								const someChecked = selectable.some((f) => state.selected[importKey(project.slug, f.file)] === true);
								const importedCount = project.files.filter((f) => f.state === "imported").length;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-import-group",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dam-import-head",
										children: [
											selectable.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												className: "dam-check",
												checked: allChecked,
												ref: (el) => {
													if (el !== null) el.indeterminate = someChecked && !allChecked;
												},
												onChange: (e) => {
													onToggleProject(project.slug, e.target.checked);
												}
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
												className: "dam-import-slug",
												children: project.slug
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dam-group-meta",
												children: project.targetScope === "project" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: ["📁 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
													style: { fontSize: 11 },
													children: project.targetDir
												})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: ["👤 ", t("importNoCwd")] })
											}),
											importedCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "dam-badge dam-badge--ok",
												children: [
													t("importStateImported"),
													" ",
													importedCount
												]
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dam-import-items",
										children: project.files.map((file) => {
											const checked = state.selected[importKey(project.slug, file.file)] === true;
											const locked = file.state === "modified" || file.state === "conflict";
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
												className: "dam-import-item",
												"data-locked": locked ? "1" : "0",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
														type: "checkbox",
														className: "dam-check",
														checked,
														disabled: locked,
														onChange: (e) => {
															onToggleFile(project.slug, file.file, e.target.checked);
														}
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: "dam-import-main",
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dam-import-name",
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: file.name }),
																" ",
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: "dam-import-file",
																	children: file.file
																})
															]
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "dam-import-desc",
															children: file.description
														})]
													}),
													file.state === "imported" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "dam-badge dam-badge--ok",
														children: t("importStateImported")
													}),
													file.state === "legacy" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "dam-badge dam-badge--ok",
														title: t("importStateLegacyHint"),
														children: t("importStateLegacy")
													}),
													file.state === "modified" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "dam-badge dam-badge--warn",
														title: t("importStateModifiedHint"),
														children: t("importStateModified")
													}),
													file.state === "conflict" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "dam-badge dam-badge--muted",
														title: t("importStateConflictHint"),
														children: t("importStateConflict")
													})
												]
											}, file.file);
										})
									})]
								}, project.slug);
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dam-label",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: { cursor: "pointer" },
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										className: "dam-check",
										checked: state.allToUser,
										onChange: (e) => {
											onAllToUser(e.target.checked);
										}
									}),
									" ",
									t("importAllToUser")
								]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dam-note",
							children: t("importRevokeWarning")
						})
					] }),
					state.phase === "applying" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: { margin: "12px 0" },
						children: t("importApplying")
					}),
					state.phase === "done" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						style: { margin: "12px 0" },
						children: ["✅ ", state.summary]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dam-row",
						children: [
							state.phase === "select" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								className: "dam-btn dam-btn-primary",
								disabled: counts.pending === 0 && counts.revoke === 0,
								onClick: () => {
									onApply();
								},
								children: ["📥 ", t("importApplyCount", {
									n: counts.pending,
									r: counts.revoke
								})]
							}),
							state.phase === "done" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								className: "dam-btn dam-btn-primary",
								onClick: onClose,
								children: ["✓ ", t("refresh")]
							}),
							state.phase !== "applying" && state.phase !== "done" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "dam-btn",
								onClick: onClose,
								children: t("cancel")
							})
						]
					})
				]
			});
		}
		/**
		* 召回排行 + 注入→召回漏斗(1.4.0)。
		* reads 来自 store(memory_read 计数 + 搜索命中 top-3),injectedCount 来自
		* 注入审计——两榜对照即漏斗:注入多而零召回 = 占预算;注入少而常召回 = 被埋没。
		*/
		function RecallSection({ stats, groups, t }) {
			/** name → {reads(跨层求和), scope(取首个出现层)};再并上注入次数。 */
			const readsByName = /* @__PURE__ */ new Map();
			for (const group of groups) for (const memory of group.memories) {
				const hit = readsByName.get(memory.name);
				if (hit === void 0) readsByName.set(memory.name, {
					reads: memory.reads,
					scope: group.scope
				});
				else hit.reads += memory.reads;
			}
			const injectedByName = new Map(stats.memories.map((m) => [m.name, m.injectedCount]));
			const rows = [...readsByName.entries()].map(([name, info]) => ({
				name,
				reads: info.reads,
				injected: injectedByName.get(name) ?? 0,
				scope: info.scope
			}));
			const topRecall = [...rows].sort((a, b) => b.reads - a.reads || b.injected - a.injected).slice(0, 8);
			const maxReads = Math.max(1, ...rows.map((r) => r.reads));
			const maxInj = Math.max(1, ...rows.map((r) => r.injected));
			const injActive = (r) => r.injected >= Math.max(2, stats.injections * .5);
			const readActive = (r) => r.reads >= 2;
			const hh = rows.filter((r) => injActive(r) && readActive(r));
			const hz = rows.filter((r) => injActive(r) && !readActive(r)).sort((a, b) => b.injected - a.injected);
			const lh = rows.filter((r) => !injActive(r) && readActive(r)).sort((a, b) => b.reads - a.reads);
			const ll = rows.filter((r) => !injActive(r) && !readActive(r));
			/** 双条行:上条=注入(蓝) 下条=召回(绿),宽度各按自身最大值归一;顶部图例标注。 */
			const dualRow = (row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dam-recall-row",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
						className: "dam-rank-name",
						title: row.name,
						children: row.name
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dam-dualbar",
						title: `inj ${String(row.injected)} · reads ${String(row.reads)}`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { width: `${Math.round(row.injected / maxInj * 100)}%` } }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", { style: { width: `${Math.round(row.reads / maxReads * 100)}%` } })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dam-ratio",
						children: [
							row.reads,
							"/",
							row.injected
						]
					})
				]
			}, row.name);
			/** 双条图例(可见,不只靠 hover):● 注入 ● 召回 + 比率含义 */
			const dualLegend = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dam-legend dam-legend--dual",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dam-legend-item",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "dam-dot dam-dot--inj" }), t("legendInj")]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dam-legend-item",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "dam-dot dam-dot--rec" }), t("legendRec")]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dam-legend-item dam-ratio-hint",
						children: t("legendRatio")
					})
				]
			});
			const quadrant = (label, count, tone) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dam-quad dam-quad--${tone}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: String(count) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label })]
			}, label);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dam-stats",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "dam-stats-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dam-stats-glyph",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
							name: "target",
							size: 15
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dam-stats-titles",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dam-stats-title",
							children: t("recallTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dam-stats-sub",
							children: t("recallHint")
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dam-stats-body",
					children: [
						dualLegend,
						stats.injections >= 4 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-duo",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dam-block",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-section",
									style: { margin: 0 },
									children: t("funnelTitle")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dam-quad-grid-inner",
									children: [
										quadrant(t("funnelQuadHH"), hh.length, "ok"),
										quadrant(t("funnelQuadHZ"), hz.length, "warn"),
										quadrant(t("funnelQuadLH"), lh.length, "info"),
										quadrant(t("funnelQuadLL"), ll.length, "muted")
									]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dam-block",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-section",
									style: { margin: 0 },
									children: t("recallTop")
								}), topRecall.length > 0 ? topRecall.map(dualRow) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dam-note",
									children: t("healthNone")
								})]
							})]
						}),
						stats.injections < 4 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dam-section",
								style: { margin: 0 },
								children: t("recallTop")
							}), topRecall.length > 0 ? topRecall.map(dualRow) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dam-note",
								children: t("healthNone")
							})]
						}),
						stats.injections >= 4 && hz.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "dam-section",
								children: [
									t("funnelQuadHZ"),
									" · ",
									t("funnelSuggestMute")
								]
							}), hz.slice(0, 5).map(dualRow)]
						}),
						stats.injections >= 4 && lh.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-block",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "dam-section",
								children: [
									t("funnelQuadLH"),
									" · ",
									t("funnelSuggestPin")
								]
							}), lh.slice(0, 5).map(dualRow)]
						})
					]
				})]
			});
		}
		/**
		* 设置中心卡(1.4.0):预设一键切换 + 白名单字段滑块/开关 + 来源徽章 +
		* 保存(POST config.set,宿主原地改 live 配置,下一个请求生效)。
		*/
		function SettingsCard({ t, settings, avgRowBytes, onSaved, configSet }) {
			const effective = settings.effective;
			const gateValue = (value) => value === true ? "ask" : value === false ? "off" : value === "ask" || value === "off" ? value : "candidate";
			const [maxBytes, setMaxBytes] = (0, react.useState)(Number(effective.maxBytes));
			const [minImportance, setMinImportance] = (0, react.useState)(Number(effective.minImportance));
			const [staleDays, setStaleDays] = (0, react.useState)(Number(effective.staleAfterDays));
			const [autoSummarize, setAutoSummarize] = (0, react.useState)(effective.autoSummarize === true);
			const [injectionGate, setInjectionGate] = (0, react.useState)(gateValue(effective.injectionGate));
			const [recallSessionMaxBytes, setRecallSessionMaxBytes] = (0, react.useState)(Number(effective.recallSessionMaxBytes ?? 12e3));
			const [verifyWrites, setVerifyWrites] = (0, react.useState)(effective.verifyWrites !== false);
			const [dream, setDream] = (0, react.useState)(effective.dream !== false);
			const [dreamDryRun, setDreamDryRun] = (0, react.useState)(effective.dreamDryRun === true);
			const [dreamIntervalHours, setDreamIntervalHours] = (0, react.useState)(Number(effective.dreamIntervalHours ?? 168));
			const [dreamMaxActions, setDreamMaxActions] = (0, react.useState)(Number(effective.dreamMaxActions ?? 5));
			const [dreamTranscripts, setDreamTranscripts] = (0, react.useState)(Number(effective.dreamTranscripts ?? 3));
			const [busy, setBusy] = (0, react.useState)(false);
			const [note, setNote] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				setMaxBytes(Number(effective.maxBytes));
				setMinImportance(Number(effective.minImportance));
				setStaleDays(Number(effective.staleAfterDays));
				setAutoSummarize(effective.autoSummarize === true);
				setInjectionGate(gateValue(effective.injectionGate));
				setRecallSessionMaxBytes(Number(effective.recallSessionMaxBytes ?? 12e3));
				setVerifyWrites(effective.verifyWrites !== false);
				setDream(effective.dream !== false);
				setDreamDryRun(effective.dreamDryRun === true);
				setDreamIntervalHours(Number(effective.dreamIntervalHours ?? 168));
				setDreamMaxActions(Number(effective.dreamMaxActions ?? 5));
				setDreamTranscripts(Number(effective.dreamTranscripts ?? 3));
			}, [
				effective.maxBytes,
				effective.minImportance,
				effective.staleAfterDays,
				effective.autoSummarize,
				effective.injectionGate,
				effective.recallSessionMaxBytes,
				effective.verifyWrites,
				effective.dream,
				effective.dreamDryRun,
				effective.dreamIntervalHours,
				effective.dreamMaxActions,
				effective.dreamTranscripts
			]);
			const preset = maxBytes <= 4096 && minImportance >= 4 ? "focus" : maxBytes >= 8192 && minImportance <= 1 ? "companion" : "";
			const fits = Math.max(1, Math.floor(maxBytes * .66 / avgRowBytes));
			const srcBadge = (field) => {
				const source = settings.sources[field];
				if (source === void 0) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: source === "override" ? "dam-src dam-src--own" : "dam-src",
					children: source === "override" ? t("setSourceOverride") : t("setSourceProfile")
				});
			};
			const send = (patch) => {
				setBusy(true);
				setNote(null);
				configSet(patch).then(async (response) => {
					if (!response.ok) throw new Error(String(response.status));
					setNote(t("setSaved"));
					await onSaved();
				}).catch(() => {
					setNote(t("setSaveFailed"));
				}).finally(() => {
					setBusy(false);
				});
			};
			const resetField = (field) => {
				send({ [field]: null });
			};
			const dirty = maxBytes !== Number(effective.maxBytes) || minImportance !== Number(effective.minImportance) || staleDays !== Number(effective.staleAfterDays) || autoSummarize !== (effective.autoSummarize === true) || injectionGate !== gateValue(effective.injectionGate) || recallSessionMaxBytes !== Number(effective.recallSessionMaxBytes ?? 12e3) || verifyWrites !== (effective.verifyWrites !== false) || dream !== (effective.dream !== false) || dreamDryRun !== (effective.dreamDryRun === true) || dreamIntervalHours !== Number(effective.dreamIntervalHours ?? 168) || dreamMaxActions !== Number(effective.dreamMaxActions ?? 5) || dreamTranscripts !== Number(effective.dreamTranscripts ?? 3);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dam-stats dam-settings",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "dam-stats-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dam-stats-glyph",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
							name: "gear",
							size: 15
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dam-stats-titles",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dam-stats-title",
							children: t("settingsTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dam-stats-sub",
							children: t("settingsIntro")
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dam-stats-body",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-row",
							style: { gap: "8px" },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dam-preset",
								"data-active": preset === "focus" ? "1" : "0",
								disabled: busy,
								title: t("presetFocusTip"),
								onClick: () => {
									setMaxBytes(4096);
									setMinImportance(4);
								},
								children: [t("presetFocus"), preset === "focus" ? ` · ${t("presetActive")}` : ""]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dam-preset",
								"data-active": preset === "companion" ? "1" : "0",
								disabled: busy,
								title: t("presetCompanionTip"),
								onClick: () => {
									setMaxBytes(16384);
									setMinImportance(1);
								},
								children: [t("presetCompanion"), preset === "companion" ? ` · ${t("presetActive")}` : ""]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-head",
									children: [
										t("setMaxBytes"),
										" ",
										srcBadge("maxBytes"),
										settings.sources.maxBytes === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-reset",
											disabled: busy,
											"aria-label": t("setResetField"),
											title: t("setResetField"),
											onClick: () => {
												resetField("maxBytes");
											},
											children: "↺"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-val",
									children: [(maxBytes / 1024).toFixed(1), " KB"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 1024,
									max: 65536,
									step: 512,
									value: maxBytes,
									onChange: (e) => {
										setMaxBytes(Number(e.target.value));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-hint",
									children: [
										t("setMaxBytesHint"),
										" · ",
										t("setFits", { n: fits })
									]
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-head",
									children: [
										t("setMinImportance"),
										" ",
										srcBadge("minImportance"),
										settings.sources.minImportance === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-reset",
											disabled: busy,
											"aria-label": t("setResetField"),
											title: t("setResetField"),
											onClick: () => {
												resetField("minImportance");
											},
											children: "↺"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-val",
									children: [String(minImportance), minImportance === 0 ? " (off)" : ""]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 0,
									max: 10,
									step: 1,
									value: minImportance,
									onChange: (e) => {
										setMinImportance(Number(e.target.value));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-ctrl-hint",
									children: t("setMinImportanceHint")
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-head",
									children: [
										t("setStaleDays"),
										" ",
										srcBadge("staleAfterDays"),
										settings.sources.staleAfterDays === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-reset",
											disabled: busy,
											"aria-label": t("setResetField"),
											title: t("setResetField"),
											onClick: () => {
												resetField("staleAfterDays");
											},
											children: "↺"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-val",
									children: [String(staleDays), staleDays === 0 ? " (off)" : " d"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 0,
									max: 3650,
									step: 1,
									value: staleDays,
									onChange: (e) => {
										setStaleDays(Number(e.target.value));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-ctrl-hint",
									children: t("setStaleDaysHint")
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl dam-ctrl--toggle",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dam-ctrl-head",
								children: [
									t("setAutoSummarize"),
									" ",
									srcBadge("autoSummarize"),
									settings.sources.autoSummarize === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dam-reset",
										disabled: busy,
										"aria-label": t("setResetField"),
										title: t("setResetField"),
										onClick: () => {
											resetField("autoSummarize");
										},
										children: "↺"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "dam-check",
								checked: autoSummarize,
								onChange: (e) => {
									setAutoSummarize(e.target.checked);
								}
							})] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-head",
									children: [
										t("setInjectionGate"),
										" ",
										srcBadge("injectionGate"),
										settings.sources.injectionGate === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-reset",
											disabled: busy,
											"aria-label": t("setResetField"),
											title: t("setResetField"),
											onClick: () => {
												resetField("injectionGate");
											},
											children: "↺"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: "dam-select",
									value: injectionGate,
									onChange: (e) => {
										setInjectionGate(e.target.value);
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "candidate",
											children: t("gateCandidate")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "ask",
											children: t("gateAsk")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "off",
											children: t("gateOff")
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-ctrl-hint",
									children: t("setInjectionGateHint")
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-head",
									children: [
										t("setRecallSessionMaxBytes"),
										" ",
										srcBadge("recallSessionMaxBytes"),
										settings.sources.recallSessionMaxBytes === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-reset",
											disabled: busy,
											"aria-label": t("setResetField"),
											title: t("setResetField"),
											onClick: () => {
												resetField("recallSessionMaxBytes");
											},
											children: "↺"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-ctrl-val",
									children: recallSessionMaxBytes === 0 ? "off" : `${(recallSessionMaxBytes / 1024).toFixed(1)} KB`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 0,
									max: 65536,
									step: 512,
									value: recallSessionMaxBytes,
									onChange: (e) => {
										setRecallSessionMaxBytes(Number(e.target.value));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-ctrl-hint",
									children: t("setRecallSessionMaxBytesHint")
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl dam-ctrl--toggle",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dam-ctrl-head",
								children: [
									t("setVerifyWrites"),
									" ",
									srcBadge("verifyWrites"),
									settings.sources.verifyWrites === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dam-reset",
										disabled: busy,
										"aria-label": t("setResetField"),
										title: t("setResetField"),
										onClick: () => {
											resetField("verifyWrites");
										},
										children: "↺"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "dam-check",
								checked: verifyWrites,
								onChange: (e) => {
									setVerifyWrites(e.target.checked);
								}
							})] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl dam-ctrl--toggle",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dam-ctrl-head",
								children: [
									t("setDream"),
									" ",
									srcBadge("dream"),
									settings.sources.dream === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dam-reset",
										disabled: busy,
										"aria-label": t("setResetField"),
										title: t("setResetField"),
										onClick: () => {
											resetField("dream");
										},
										children: "↺"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "dam-check",
								checked: dream,
								onChange: (e) => {
									setDream(e.target.checked);
								}
							})] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-head",
									children: [
										t("setDreamIntervalHours"),
										" ",
										srcBadge("dreamIntervalHours"),
										settings.sources.dreamIntervalHours === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-reset",
											disabled: busy,
											"aria-label": t("setResetField"),
											title: t("setResetField"),
											onClick: () => {
												resetField("dreamIntervalHours");
											},
											children: "↺"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-val",
									children: [String(dreamIntervalHours), " h"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 1,
									max: 8760,
									step: 1,
									value: dreamIntervalHours,
									onChange: (e) => {
										setDreamIntervalHours(Number(e.target.value));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-ctrl-hint",
									children: t("setDreamIntervalHoursHint")
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-head",
									children: [
										t("setDreamMaxActions"),
										" ",
										srcBadge("dreamMaxActions"),
										settings.sources.dreamMaxActions === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-reset",
											disabled: busy,
											"aria-label": t("setResetField"),
											title: t("setResetField"),
											onClick: () => {
												resetField("dreamMaxActions");
											},
											children: "↺"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-ctrl-val",
									children: String(dreamMaxActions)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 1,
									max: 20,
									step: 1,
									value: dreamMaxActions,
									onChange: (e) => {
										setDreamMaxActions(Number(e.target.value));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-ctrl-hint",
									children: t("setDreamMaxActionsHint")
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl dam-ctrl--toggle",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dam-ctrl-head",
								children: [
									t("setDreamDryRun"),
									" ",
									srcBadge("dreamDryRun"),
									settings.sources.dreamDryRun === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dam-reset",
										disabled: busy,
										"aria-label": t("setResetField"),
										title: t("setResetField"),
										onClick: () => {
											resetField("dreamDryRun");
										},
										children: "↺"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "dam-check",
								checked: dreamDryRun,
								onChange: (e) => {
									setDreamDryRun(e.target.checked);
								}
							})] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dam-ctrl",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dam-ctrl-head",
									children: [
										t("setDreamTranscripts"),
										" ",
										srcBadge("dreamTranscripts"),
										settings.sources.dreamTranscripts === "override" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dam-reset",
											disabled: busy,
											"aria-label": t("setResetField"),
											title: t("setResetField"),
											onClick: () => {
												resetField("dreamTranscripts");
											},
											children: "↺"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-ctrl-val",
									children: String(dreamTranscripts)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "range",
									min: 0,
									max: 10,
									step: 1,
									value: dreamTranscripts,
									onChange: (e) => {
										setDreamTranscripts(Number(e.target.value));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dam-ctrl-hint",
									children: t("setDreamTranscriptsHint")
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dam-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dam-btn dam-btn-primary",
								disabled: busy || !dirty,
								onClick: () => {
									const patch = {};
									if (maxBytes !== Number(effective.maxBytes)) patch.maxBytes = maxBytes;
									if (minImportance !== Number(effective.minImportance)) patch.minImportance = minImportance;
									if (staleDays !== Number(effective.staleAfterDays)) patch.staleAfterDays = staleDays;
									if (autoSummarize !== (effective.autoSummarize === true)) patch.autoSummarize = autoSummarize;
									if (injectionGate !== gateValue(effective.injectionGate)) patch.injectionGate = injectionGate;
									if (recallSessionMaxBytes !== Number(effective.recallSessionMaxBytes ?? 12e3)) patch.recallSessionMaxBytes = recallSessionMaxBytes;
									if (verifyWrites !== (effective.verifyWrites !== false)) patch.verifyWrites = verifyWrites;
									if (dream !== (effective.dream !== false)) patch.dream = dream;
									if (dreamDryRun !== (effective.dreamDryRun === true)) patch.dreamDryRun = dreamDryRun;
									if (dreamIntervalHours !== Number(effective.dreamIntervalHours ?? 168)) patch.dreamIntervalHours = dreamIntervalHours;
									if (dreamMaxActions !== Number(effective.dreamMaxActions ?? 5)) patch.dreamMaxActions = dreamMaxActions;
									if (dreamTranscripts !== Number(effective.dreamTranscripts ?? 3)) patch.dreamTranscripts = dreamTranscripts;
									if (Object.keys(patch).length === 0) return;
									send(patch);
								},
								children: t("setSave")
							}), note !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: note === t("setSaved") ? "dam-ok" : "dam-err",
								children: note
							})]
						})
					]
				})]
			});
		}
		// src/client/MemoryPanelIcon.tsx
		function MemoryPanelIcon(_props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				"aria-hidden": true,
				width: "16",
				height: "16",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.7",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				style: {
					display: "block",
					margin: "auto"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9.5 3a3 3 0 0 0-3 3 3 3 0 0 0-2.4 4.6A3.2 3.2 0 0 0 4.5 16a3 3 0 0 0 3 4.5c.9.6 2 .5 2-.5V4.5c0-1-.9-1.5-2-1.5Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14.5 3a3 3 0 0 1 3 3 3 3 0 0 1 2.4 4.6 3.2 3.2 0 0 1-.4 5.4 3 3 0 0 1-3 4.5c-.9.6-2 .5-2-.5V4.5c0-1 .9-1.5 2-1.5Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "8",
						cy: "9",
						r: "0.6",
						fill: "currentColor",
						stroke: "none"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "10",
						cy: "13.5",
						r: "0.6",
						fill: "currentColor",
						stroke: "none"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "16",
						cy: "9",
						r: "0.6",
						fill: "currentColor",
						stroke: "none"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "14",
						cy: "13.5",
						r: "0.6",
						fill: "currentColor",
						stroke: "none"
					})
				]
			});
		}
		// src/client/locales.ts
		/**
		* Русский словарь панели (1.10.0). В сборке-приёмнике локаль плоская и только русская:
		* `locale.register(NS, ru)` без языкового измерения. Ключи — те же, что в zh/en (проверяется типом).
		*/
		const ru = {
			panel: "Память",
			title: "Постоянная память",
			intro: "Управление файлами памяти, которые сохраняются между сессиями",
			loading: "Загружаю память…",
			error: "Сейчас не удаётся загрузить память.",
			retry: "Повторить",
			refresh: "Обновить",
			empty: "Записей пока нет. Скажите агенту «запомни…», чтобы создать первую.",
			emptyTitle: "Записей пока нет",
			userScope: "Уровень пользователя (все рабочие области)",
			userScopeShort: "Пользователь",
			userScopeHint: "общая для всех рабочих областей",
			allScopes: "Все",
			clearFilters: "Сбросить фильтры",
			projectScope: "Уровень проекта",
			pinned: "закреплено",
			activeState: "активна",
			muted: "отключена (не попадает в контекст)",
			muteAction: "Отключить",
			unmuteAction: "Включить",
			reads: "чтений",
			updated: "обновлено",
			injectedPreview: "Индекс, который попадёт в следующую сессию (нажмите для просмотра)",
			indexUsage: "Заполнение индекса",
			budget: "бюджет внедрения",
			of: "/",
			bytes: "Б",
			edit: "Изменить",
			save: "Сохранить",
			cancel: "Отмена",
			delete: "Удалить",
			confirmDelete: "Удалить эту запись?",
			deleteFailed: "Не удалось удалить",
			saveFailed: "Не удалось сохранить",
			pinAction: "Закрепить",
			unpinAction: "Открепить",
			projectNeedsSession: "Откройте сессию в этой рабочей области, чтобы править эту группу",
			currentBadge: "Текущая рабочая область",
			searchPlaceholder: "Поиск по памяти (имя/описание)…",
			noSearchHits: "Подходящих записей нет.",
			overviewMemories: "записей",
			overviewPinned: "закреплено",
			overviewMuted: "отключено",
			overviewStale: "устарели (не внедряются)",
			staleState: "устарела (нет в индексе)",
			staleShort: "устарела",
			mutedShort: "отключена",
			allTypes: "Все типы",
			readonlyBadge: "только чтение",
			notInjectedHint: "другая рабочая область · не входит в это внедрение",
			showBody: "Текст",
			hideBody: "Скрыть текст",
			bodyLoading: "Загружаю текст…",
			bodyLoadFailed: "Не удалось загрузить текст.",
			emptyStep1: "Скажите агенту: «Запомни: я …»",
			emptyStep2: "Он вызовет memory_write — на диск ляжет обычный Markdown-файл памяти",
			emptyStep3: "Следующая сессия начнётся с уже внедрённым индексом памяти",
			justNow: "только что",
			minutesAgo: "{n} мин назад",
			hoursAgo: "{n} ч назад",
			daysAgo: "{n} дн назад",
			name: "Имя",
			descriptionField: "Описание",
			bodyField: "Текст",
			titleField: "Заголовок (необязательно)",
			importBtn: "Импорт из Claude Code",
			importTitle: "Импорт памяти Claude Code",
			importEmpty: "Нечего импортировать: файлов памяти Claude Code в ~/.claude/projects не найдено.",
			importScanFailed: "Не удалось просканировать.",
			importRunFailed: "Импорт/отмена не завершились (выполненное сохранено, можно повторить — список обновлён).",
			importNoCwd: "путь источника неизвестен → уровень пользователя",
			importAllToUser: "Импортировать всё на уровень пользователя (без разбивки по проектам)",
			importApplyCount: "Применить ({n} импорт / {r} отмена)",
			importApplying: "Применяю…",
			importRevokeWarning: "Записи с тем же именем пропускаются, а не перезаписываются. Снятие отметки с импортированной записи удаляет её из плагина при применении; записи, изменённые после импорта, сохраняются.",
			importStateImported: "импортирована",
			importStateLegacy: "старый импорт",
			importStateModified: "изменена",
			importStateConflict: "имя занято",
			importStateLegacyHint: "Импортирована версией 0.8.0 (без метки происхождения); содержимое в точности совпадает с источником, поэтому снятие отметки удалит её",
			importStateModifiedHint: "Изменена после импорта — снятие отметки её не удалит",
			importStateConflictHint: "Запись с тем же именем, не из этого исходного файла — не затрагивается",
			importKeptNote: "Сохранено изменённых/отсутствующих записей: {k}.",
			importDone: "Готово: импортировано {n} / пропущено {s} (то же имя) / отменено {r} / ошибок {f}",
			importedBadge: "Импортировано из Claude Code",
			statsTitle: "Статистика внедрения",
			statsSessions: "сессий",
			statsInjections: "внедрений",
			statsTopInjected: "Чаще всего внедряемые записи",
			statsTimeline: "Последние внедрения",
			statsMemories: "записей",
			statsTruncated: "обрезано ",
			statsAvg: "средний размер сегмента",
			statsTruncatedTop: "Обрезка по бюджету (вытеснено)",
			statsProjects: "По проектам",
			statsProjectsRecent: "считается по последним 50 внедрениям до перезапуска сервера",
			statsProjectCol: "Проект",
			statsProjectSessions: "Сессии",
			statsProjectInjections: "Внедрения",
			statsProjectAvg: "Средний сегмент",
			statsAll: "Все {n}",
			statsAllInjected: "Все {n} записей присутствуют в каждом из {m} внедрений",
			scopeUser: "слой пользователя",
			scopeProject: "слой проекта",
			statusCandidate: "кандидат",
			statusVerified: "подтверждена",
			statusDisputed: "спорная",
			statusSuperseded: "заменена",
			verifyAction: "✓ Подтвердить",
			disputeAction: "⊘ Оспорить",
			restoreAction: "Вернуть в контекст",
			evidenceTitle: "Основание",
			healthTitle: "Состояние памяти",
			healthUnverified: "Не подтверждены (кандидаты)",
			healthZombies: "Забытые (30 дн, ни одного чтения)",
			healthConflicts: "Подозрение на конфликт",
			healthNone: "Ничего не требует внимания.",
			healthCrossScope: "одно имя в обоих слоях",
			healthNearDup: "почти дубликат",
			healthView: "найти",
			statusTipCandidate: "Сформирована моделью, ещё не подтверждена — подтвердите, чтобы повысить доверие",
			statusTipDisputed: "Остановлена защитой от инъекций или оспорена вами — не внедряется, можно восстановить",
			exportAction: "Экспорт в AGENTS.md",
			exportTip: "Скопировать доверенные записи (подтверждённые/без метки) как фрагмент AGENTS.md — подойдёт любому инструменту по соглашению AGENTS.md",
			exportDone: "Скопировано в буфер обмена",
			exportFailed: "Не удалось экспортировать",
			importHint: "Готово к синхронизации записей Claude Code: {n}",
			lineageReplaces: "заменяет более старую запись {name} (линия эволюции)",
			statsActivity: "Активность внедрения (последние 24)",
			statsScopeShare: "Доли по слоям (по внедрениям)",
			statsTypeShare: "Доли по типам (все записи)",
			statsTruncMetric: "обрезок по бюджету",
			statsExpand: "Развернуть, чтобы увидеть записи, внедрённые в этом событии",
			statsCollapse: "Свернуть",
			settingsTitle: "Настройки",
			settingsIntro: "Настройки во время работы: применяются сразу (без перезапуска), хранятся в settings.json хранилища памяти",
			presetFocus: "🎯 Фокус (код)",
			presetFocusTip: "Бюджет 4 КБ / порог ценности 4 — сначала главное, бытовая мелочь отсекается",
			presetCompanion: "💬 Собеседник (повседневное)",
			presetCompanionTip: "Бюджет 16 КБ / порог 1 — сохраняем факты о жизни, dsh как повседневный помощник",
			presetActive: "активно",
			setMaxBytes: "Бюджет индекса",
			setMaxBytesHint: "Общий предел на одно внедрение, включая фиксированные накладные расходы (правила записи; см. шкалу вверху); пустое хранилище всегда стоит ноль",
			setMinImportance: "Порог ценности",
			setMinImportanceHint: "Кандидаты консолидации ниже этой оценки не записываются (0 = выкл.); выше — строже",
			setStaleDays: "Мягкое вытеснение (дней)",
			setStaleDaysHint: "Записи без чтений старше N дней перестают внедряться (файлы сохраняются); 0 = выкл.",
			setAutoSummarize: "Автоконсолидация по ходу сессии",
			setAutoSummarizeMax: "Предел записей за проход",
			setSave: "Сохранить настройки",
			setSaved: "Сохранено и применено",
			setSaveFailed: "Не удалось сохранить",
			setSourceProfile: "профиль",
			setSourceOverride: "ваше значение",
			setFits: "В текущий бюджет помещается ≈ {n} записей",
			setResetField: "Вернуть значение профиля",
			recallTitle: "Рейтинг обращений",
			recallHint: "чтения = модель сама обратилась к записи (memory_read / попадание в поиск) — разрыв с внедрениями показывает напрасные расходы",
			recallTop: "Чаще всего читаемые",
			funnelTitle: "Воронка: внедрение → обращение",
			funnelQuadHH: "Высокая ценность (внедряется и читается)",
			funnelQuadHZ: "Пожиратель бюджета (внедряется, не читается)",
			funnelQuadLH: "Скрытая жемчужина (редко внедряется, читается)",
			funnelQuadLL: "Низкая активность (и то и другое мало)",
			funnelSuggestMute: "стоит отключить",
			funnelSuggestPin: "стоит закрепить",
			scopeBoth: "слои пользователя + проекта",
			scopeMissing: "нет в текущем индексе",
			tabMemories: "Записи",
			tabInsights: "Аналитика",
			tabHealth: "Состояние",
			showingOf: "показано {shown} / {total} (с фильтром)",
			healthHint: "нажмите на запись, чтобы перейти к её карточке",
			healthLocateTip: "найти карточку этой записи",
			legendInj: "внедрено",
			legendRec: "прочитано",
			legendRatio: "правый столбец = чтения/внедрения",
			expiredBadge: "истекла",
			expiredAgo: "истекла {n} дн назад",
			renewAction: "↻ продлить на 90 дн",
			renewFailed: "не удалось продлить",
			healthExpired: "Истекшие (больше не внедряются)",
			validUntilField: "Срок действия (дней)",
			validUntilHint: "Для фактов, которые устаревают; после истечения запись перестаёт внедряться. Введите число, чтобы задать/продлить; очистите прежнее число, чтобы сделать бессрочной; не трогайте поле, чтобы оставить как есть",
			validUntilNone: "бессрочно",
			usageIdx: "индекс",
			usageFixed: "фикс.",
			usageFixedTip: "фиксированные накладные расходы (правила записи и т. п.; не растут с числом записей; входят в предел)",
			untrustedBadge: "после чтения: {name}",
			untrustedTip: "Тихо записано после чтения недоверенного контента (веб/документы): проверьте, подтвердите или удалите",
			setInjectionGate: "Гейт инъекций",
			setInjectionGateHint: "candidate = тихо сохранять кандидатом с меткой источника; ask = подтверждать каждую запись; off = выключено",
			gateCandidate: "candidate — тихо",
			gateAsk: "ask — спрашивать",
			gateOff: "off — выключено",
			setRecallSessionMaxBytes: "Бюджет recall на сессию",
			setRecallSessionMaxBytesHint: "Суммарный лимит байтов сообщений recall в одной сессии; 0 = без лимита",
			setVerifyWrites: "Проверять пути при записи",
			setVerifyWritesHint: "Авто-создаваемые памяти: пути файлов в теле сверяются через fs.stat, предложения с несуществующими вырезаются",
			setDream: "Dream — глубокий пересмотр",
			setDreamHint: "Периодическая сверка слоя памяти со свежими сессиями (по умолчанию включена и пишет автоматически)",
			setDreamIntervalHours: "Интервал Dream",
			setDreamIntervalHoursHint: "Не чаще раза в N часов на слой (штамп .dream)",
			setDreamMaxActions: "Лимит действий Dream",
			setDreamMaxActionsHint: "Максимум записей за один проход Dream",
			setDreamDryRun: "Dream — режим превью",
			setDreamDryRunHint: "Включён — предложения только в лог, на диск ничего не пишется",
			setDreamTranscripts: "Сессии для Dream",
			setDreamTranscriptsHint: "Сколько последних сессий сводится в дайджест",
			sharedScopeShort: "Общий слой",
			sharedScopeHint: "видна всем сотрудникам; удалить можно только свои неодобренные записи",
			restrictedModeHint: "Ограниченный режим: показаны только ваши записи — можно смотреть название, описание и текст, а также удалять их (общие записи удаляются, пока они не одобрены; одобренные удаляет администратор)",
			deleteRestrictedHint: "Одобренные общие записи удаляет администратор"
		};
		// src/client/index.ts
		/** 词典命名空间。 */
		const NS = "autoMemory";
		/** 侧栏入口与主面板共用的面板 id。 */
		const PANEL_ID = "auto-memory";
		/** 浏览器半依赖的服务(slots/locale 为 web 组合必有;sessions 来自基线 client-store)。 */
		const inject = [
			"slots",
			"locale",
			"sessions"
		];
		const BASE = "/api/auto-memory";
		function memoryFace(ctx) {
			return {
				list: async () => {
					const cwd = currentCwd(ctx);
					const query = cwd === void 0 ? "" : `?cwd=${encodeURIComponent(cwd)}`;
					const response = await fetch(`${BASE}/groups.list${query}`, { headers: { "cache-control": "no-store" } });
					if (!response.ok) throw new Error(`groups.list HTTP ${String(response.status)}`);
					return await response.json();
				},
				read: async ({ name, scope, cwd }) => {
					const params = new URLSearchParams({
						name,
						scope
					});
					if (cwd !== void 0) params.set("cwd", cwd);
					const response = await fetch(`${BASE}/memory.read?${params}`);
					if (!response.ok) throw new Error(`memory.read HTTP ${String(response.status)}`);
					return await response.json();
				},
				write: (payload) => fetch(`${BASE}/memory.write`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				}),
				del: (payload) => fetch(`${BASE}/memory.delete`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				}),
				importScan: async () => {
					const response = await fetch(`${BASE}/import.claude.scan`, { headers: { "cache-control": "no-store" } });
					if (!response.ok) throw new Error(`import.claude.scan HTTP ${String(response.status)}`);
					return await response.json();
				},
				importApply: (payload) => fetch(`${BASE}/import.claude.apply`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				}),
				auditStats: async () => {
					const response = await fetch(`${BASE}/audit.stats`, { headers: { "cache-control": "no-store" } });
					if (!response.ok) throw new Error(`audit.stats HTTP ${String(response.status)}`);
					return await response.json();
				},
				healthReport: async () => {
					const response = await fetch(`${BASE}/health.report`, { headers: { "cache-control": "no-store" } });
					if (!response.ok) throw new Error(`health.report HTTP ${String(response.status)}`);
					return await response.json();
				},
				exportAgents: async () => {
					const response = await fetch(`${BASE}/export.agents`, { headers: { "cache-control": "no-store" } });
					if (!response.ok) throw new Error(`export.agents HTTP ${String(response.status)}`);
					return await response.json();
				},
				configGet: async () => {
					const response = await fetch(`${BASE}/config.get`, { headers: { "cache-control": "no-store" } });
					if (!response.ok) throw new Error(`config.get HTTP ${String(response.status)}`);
					return await response.json();
				},
				configSet: (payload) => fetch(`${BASE}/config.set`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				}),
				currentCwd: () => currentCwd(ctx)
			};
		}
		/** 从 sessions 快照解析当前工作区 cwd(#9:多工作区并存时不再取首个)。 */
		function currentCwd(ctx) {
			const byId = ctx.get("sessions")?.list?.getSnapshot?.()?.byId;
			if (byId === void 0) return void 0;
			const rows = Object.values(byId).filter((session) => session.cwd !== void 0 && session.cwd.length > 0);
			if (rows.length === 0) return void 0;
			const running = rows.filter((session) => session.running === true);
			const pool = running.length > 0 ? running : rows;
			pool.sort((a, b) => {
				const delta = (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
				return delta !== 0 ? delta : a.cwd < b.cwd ? -1 : 1;
			});
			return pool[0]?.cwd;
		}
		/** 面板样式表(官方主题 token 驱动;深浅主题与第三方主题自动跟随)。 */
		const PANEL_CSS = `
.dam-root{display:flex;justify-content:flex-start;align-items:flex-start;width:100%;height:100%;overflow-y:auto;box-sizing:border-box;padding:clamp(16px,3vw,32px);scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2) transparent;}
.dam-root::-webkit-scrollbar{width:7px;height:7px;}
.dam-root::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:999px;}
.dam-root::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-label-tertiary);}
.dam-root::-webkit-scrollbar-track{background:transparent;}
.dam-shell{width:100%;max-width:1040px;margin:0;min-width:0;display:flex;flex-direction:column;gap:14px;font-size:13px;line-height:1.55;color:var(--dsw-alias-label-primary);}
.dam-header{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.dam-heading{display:flex;flex-direction:row;align-items:center;gap:9px;min-width:0;}
.dam-brand-mark{flex:none;width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,var(--dsw-alias-brand-primary,#4d76e6),#0d9488);display:inline-grid;place-items:center;box-shadow:0 1px 4px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 35%,transparent);}
.dam-brand-mark::after{content:"";width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:10px 3px 0 -1px rgba(255,255,255,.75),5px 8px 0 -1.5px rgba(255,255,255,.55);}
.dam-title{font-size:16px;font-weight:650;margin:0;letter-spacing:-.01em;}
.dam-header-side{display:flex;align-items:center;gap:10px;margin-left:auto;min-width:0;}
.dam-header-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
/* ---- 1.5.0 tab 导航:下划线式(与列表级 segment 的胶囊语义区分) ---- */
.dam-tabs{display:flex;align-items:stretch;gap:2px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;}
.dam-tabs::-webkit-scrollbar{display:none;}
.dam-tab{position:relative;display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;padding:7px 10px 9px;cursor:pointer;white-space:nowrap;}
.dam-tab:hover{color:var(--dsw-alias-label-primary);}
.dam-tab[data-on="1"]{color:var(--dsw-alias-label-primary);font-weight:600;}
.dam-tab[data-on="1"]::after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;background:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-tab-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:16px;padding:0 5px;border-radius:999px;font-size:10.5px;font-weight:600;font-variant-numeric:tabular-nums;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);}
.dam-tab-count--alert{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 13%,transparent);color:var(--dsw-alias-state-error-primary,#ef4444);}
.dam-tab-signals{margin-left:auto;display:flex;align-items:center;gap:12px;padding-left:8px;}
.dam-chips{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:-4px;}
.dam-chip{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;font-variant-numeric:tabular-nums;}
.dam-chip svg{color:var(--dsw-alias-label-tertiary);}
.dam-chip--filter{color:var(--dsw-alias-label-tertiary);}
/* ---- 1.5.0 洞察页双列:左注入/右召回,窄屏自动堆叠 ---- */
.dam-tabpane[data-on="0"]{display:none;}
.dam-insights{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:14px;align-items:start;}
.dam-insights .dam-stats{min-width:0;}
.dam-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.dam-search{position:relative;display:flex;align-items:center;flex:1;min-width:220px;}
.dam-search input{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:inherit;padding:7px 30px 7px 30px;font-size:12.5px;outline:none;font-family:inherit;}
.dam-search input:focus{border-color:var(--dsw-alias-brand-primary,#4d76e6);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 15%,transparent);}
.dam-search-icon{position:absolute;left:9px;display:inline-flex;color:var(--dsw-alias-label-tertiary);pointer-events:none;}
.dam-search-clear{position:absolute;right:6px;width:20px;height:20px;display:grid;place-items:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:0;}
.dam-search-clear:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.dam-segment{display:inline-flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);}
.dam-segment button{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:8px;padding:4px 9px;font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap;}
.dam-segment button span{font-size:10px;opacity:.65;font-variant-numeric:tabular-nums;}
.dam-segment button[data-on="1"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.08);}
.dam-select{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:6px 10px;font-size:12px;font-family:inherit;cursor:pointer;outline:none;}
.dam-select:focus{border-color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:9px;padding:5px 12px;font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap;}
.dam-btn svg{flex:none;}
.dam-btn:hover{border-color:var(--dsw-alias-brand-primary,#4d76e6);color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-btn:disabled{opacity:.5;cursor:default;}
.dam-btn-ghost{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary);}
.dam-btn-ghost:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:transparent;}
.dam-btn-primary{background:linear-gradient(135deg,var(--dsw-alias-brand-primary,#4d76e6),color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 72%,#0d1180));border-color:transparent;color:var(--dsw-alias-bg-base,#fff);box-shadow:0 1px 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 35%,transparent);}
.dam-btn-primary:hover{color:var(--dsw-alias-bg-base,#fff);filter:brightness(1.08);box-shadow:0 2px 8px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 45%,transparent);}
.dam-btn-primary:active{transform:translateY(1px);box-shadow:none;}
.dam-btn-danger{background:var(--dsw-alias-state-error-primary,#dc2626);border-color:var(--dsw-alias-state-error-primary,#dc2626);color:#fff;}
.dam-btn-danger:hover{color:#fff;opacity:.9;}
.dam-usage{flex:1;min-width:150px;max-width:300px;}
.dam-usage-label{font-size:10.5px;color:var(--dsw-alias-label-tertiary);display:block;margin-bottom:3px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dam-usage-track{display:flex;height:5px;border-radius:999px;background:var(--dsw-alias-border-l1);overflow:hidden;}
.dam-usage-track i{border-radius:0;}
.dam-usage-track i:first-child{border-radius:999px 0 0 999px;}
.dam-usage-track i:last-child{border-radius:0 999px 999px 0;}
.dam-usage-track i:only-child,.dam-usage-track i:first-child:last-child{border-radius:999px;}
/* 固定开销段:中性灰(常驻成本,与动态索引的蓝区分) */
.dam-usage-fixed{background:var(--dsw-alias-border-l2);}
.dam-usage-track i{display:block;height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary,#4d76e6);transition:width .2s ease;}
.dam-usage-track i[data-hot="1"]{background:var(--dsw-alias-state-warn-primary,#d97706);}
.dam-groups{display:flex;flex-direction:column;gap:10px;}
/* 身份双色(1.5.0 视觉纪律):user=品牌蓝 / project=青 #0d9488(ΔE 色觉校验通过,
   替换旧紫 #8b5cf6——与蓝在 deutan 下不可分);current=绿(状态,非身份) */
.dam-group{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;transition:border-color .12s ease;}
.dam-group[data-scope]{border-left-width:3px;}
.dam-group[data-scope="user"]{border-left-color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-group[data-scope="project"]{border-left-color:#0d9488;}
.dam-group[data-scope="project"][data-current="1"]{border-left-color:#16a34a;}
/* Общий слой (ограниченный режим не-админа): нейтральный серый — без нового цветового тона
   (фиолетовый уже браковался ΔE-проверкой рядом с синим, 1.5.0), отличим по светлоте */
.dam-group[data-scope="shared"]{border-left-color:#94a3b8;}
.dam-group[data-scope="shared"] .dam-group-icon{color:#94a3b8;}
.dam-group[data-current="1"]>.dam-group-head{background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 5%,transparent),transparent 55%);}
.dam-group-head{display:grid;grid-template-columns:18px minmax(0,1fr) auto 16px;gap:10px;align-items:center;width:100%;padding:11px 14px;border:0;background:transparent;color:inherit;font-family:inherit;text-align:left;cursor:pointer;}
.dam-group-head:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dam-group-icon{display:inline-flex;text-align:center;line-height:1;color:var(--dsw-alias-label-tertiary);}
.dam-group[data-scope="user"] .dam-group-icon{color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-group[data-scope="project"] .dam-group-icon{color:#0d9488;}
.dam-group-name{display:flex;flex-direction:column;gap:1px;min-width:0;}
.dam-group-title{font-weight:600;font-size:13px;line-height:18px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dam-group-sub{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dam-group-meta{font-size:10.5px;color:var(--dsw-alias-label-secondary);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;display:inline-flex;align-items:center;gap:3px;justify-content:flex-end;flex-wrap:wrap;}
.dam-group-meta svg{color:var(--dsw-alias-label-tertiary);}
.dam-chevron{display:inline-flex;color:var(--dsw-alias-label-tertiary);transition:transform .15s ease;transform:rotate(90deg);}
.dam-group[data-open="0"] .dam-chevron{transform:rotate(0deg);}
.dam-group-body{padding:0 10px 10px;display:flex;flex-direction:column;gap:6px;}
.dam-group-tools{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:8px 4px 4px;border-top:1px solid var(--dsw-alias-border-l1);}
.dam-budget{display:inline-flex;align-items:center;gap:8px;flex:0 1 auto;min-width:0;max-width:380px;}
.dam-budget-track{display:block;width:190px;flex:none;height:4px;border-radius:999px;background:var(--dsw-alias-border-l1);overflow:hidden;}
.dam-budget-track i{display:block;height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary,#4d76e6);transition:width .2s ease;}
.dam-budget-track i[data-hot="1"]{background:var(--dsw-alias-state-warn-primary,#d97706);}
.dam-budget-label{font-size:10.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;font-variant-numeric:tabular-nums;}
.dam-group-hint{font-size:10.5px;color:var(--dsw-alias-label-tertiary);flex:1;}
.dam-index>summary{cursor:pointer;font-size:10.5px;color:var(--dsw-alias-label-tertiary);list-style:none;white-space:nowrap;}
.dam-index>summary::-webkit-details-marker{display:none;}
.dam-index pre{margin:6px 0 0;padding:10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);font-size:11px;line-height:1.55;white-space:pre-wrap;word-break:break-word;max-height:240px;overflow:auto;}
/* 类型标签:中性等宽小写 chip——类型用文字表达,彩色留给作用域与图表 mark */
.dam-tag{font-family:var(--ds-font-family-code);font-size:11px;border-radius:5px;padding:1px 7px;white-space:nowrap;border:0;background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 8%,transparent);color:var(--dsw-alias-label-secondary);}
.dam-tag--user{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 12%,transparent);color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-tag--feedback{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 12%,transparent);color:var(--dsw-alias-state-warn-primary,#d97706);}
.dam-tag--project{background:color-mix(in srgb,#0d9488 12%,transparent);color:#0d9488;}
.dam-tag--reference{background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 10%,transparent);color:var(--dsw-alias-label-secondary);}
.dam-memory-list{display:flex;flex-direction:column;gap:8px;}
.dam-memory{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:8px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);transition:border-color .12s ease,background .12s ease;}
.dam-memory:hover,.dam-memory:focus-within{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 32%,var(--dsw-alias-border-l2));box-shadow:0 2px 8px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 12%,transparent);transform:translateY(-1px);}
.dam-memory{position:relative;}
.dam-memory[data-pinned="1"]{border-left:3px solid var(--dsw-alias-state-warn-primary,#d97706);padding-left:10px;}
.dam-memory[data-muted="1"]{opacity:.6;}
.dam-memory-main{min-width:0;cursor:pointer;outline:none;}
.dam-memory-main:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d76e6);outline-offset:2px;border-radius:6px;}
.dam-memory-line{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;}
.dam-memory-title{font-weight:600;font-size:13px;line-height:19px;min-width:120px;flex:1;overflow-wrap:anywhere;}
.dam-memory-pin{display:inline-flex;color:var(--dsw-alias-state-warn-primary,#d97706);line-height:1;}
.dam-memory-time{margin-left:auto;font-size:10px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;}
.dam-memory-desc{margin:2px 0 0;font-size:11.5px;line-height:1.55;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.dam-memory-actions{display:flex;align-items:flex-start;gap:2px;opacity:.85;transition:opacity .12s ease;}
.dam-memory:hover .dam-memory-actions,.dam-memory:focus-within .dam-memory-actions{opacity:1;}
@media (hover:none){.dam-memory-actions{opacity:1;}}
.dam-icon-btn{display:inline-grid;place-items:center;width:27px;height:27px;padding:0;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-family:inherit;}
.dam-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.dam-icon-btn[data-tone="brand"]:hover{color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-icon-btn[data-tone="warn"]:hover{color:var(--dsw-alias-state-warn-primary,#d97706);}
.dam-icon-btn[data-tone="warn"][data-on="1"]{color:var(--dsw-alias-state-warn-primary,#d97706);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 30%,transparent);}
.dam-icon-btn[data-on="1"]{color:var(--dsw-alias-brand-primary,#4d76e6);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 30%,transparent);}
.dam-icon-btn[data-danger="1"]:hover{color:var(--dsw-alias-state-error-primary,#ef4444);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 10%,transparent);}
.dam-icon-btn:disabled{opacity:.35;cursor:default;}
.dam-memory-body{grid-column:1 / -1;margin:6px 0 2px;}
.dam-memory-confirm{grid-column:1 / -1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px;margin-top:4px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 40%,transparent);border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 6%,transparent);font-size:11.5px;color:var(--dsw-alias-label-secondary);}
.dam-body{margin:0;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-family:var(--ds-font-family-code);font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word;max-height:320px;overflow:auto;}
/* ---- 统计卡(0.10.1→1.5.0 平铺化:tab 即折叠机制,卡片不再自带 details) ---- */
.dam-stats{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;}
.dam-stats-head{display:flex;align-items:center;gap:11px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);}
.dam-stats-glyph{flex:none;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(135deg,color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 14%,transparent),color-mix(in srgb,#0d9488 12%,transparent));color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-stats-titles{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;}
.dam-stats-title{font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary);}
.dam-stats-sub{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dam-stats-body{display:flex;flex-direction:column;gap:14px;padding:14px 16px 16px;max-height:560px;overflow-y:auto;}
.dam-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;}
.dam-metric{padding:9px 13px;border-left:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:1px;min-width:0;}
.dam-metric:first-child{border-left:0;}
.dam-metric b{font-size:20px;line-height:25px;font-weight:650;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);background:linear-gradient(120deg,var(--dsw-alias-label-primary),color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 55%,var(--dsw-alias-label-primary)));-webkit-background-clip:text;background-clip:text;}
.dam-metric span{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dam-block{display:flex;flex-direction:column;gap:2px;min-width:0;}
.dam-block-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:3px;}
.dam-section{margin:0;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);}
.dam-note{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);}
.dam-legend{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:10.5px;color:var(--dsw-alias-label-tertiary);}
.dam-legend-item{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;}
.dam-scope-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--scope-color,var(--dsw-alias-label-tertiary));box-shadow:0 0 0 2px color-mix(in srgb,var(--scope-color,var(--dsw-alias-border-l2)) 16%,transparent);}
.dam-legend-item .dam-scope-dot{width:6px;height:6px;box-shadow:none;}
.dam-rank-row[data-scope="user"],.dam-trunc-row[data-scope="user"]{--scope-color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-rank-row[data-scope="project"],.dam-trunc-row[data-scope="project"]{--scope-color:#0d9488;}
.dam-rank-row[data-scope="both"],.dam-trunc-row[data-scope="both"]{--scope-color:#0d9488;}
.dam-rank-row[data-scope="missing"],.dam-trunc-row[data-scope="missing"]{--scope-color:#94a3b8;}
.dam-scope-dot[data-scope="user"]{--scope-color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-scope-dot[data-scope="project"]{--scope-color:#0d9488;}
.dam-scope-dot[data-scope="both"]{background:linear-gradient(90deg,var(--dsw-alias-brand-primary,#4d76e6) 0 50%,#0d9488 50% 100%);}
/* missing = 空心圆(形状编码,不引第三色相) */
.dam-scope-dot[data-scope="missing"]{background:transparent;box-shadow:inset 0 0 0 1.5px var(--dsw-alias-label-tertiary);}
.dam-scope-dot[data-type="user"]{--scope-color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-scope-dot[data-type="feedback"]{--scope-color:#d97706;}
.dam-scope-dot[data-type="project"]{--scope-color:#16a34a;}
.dam-scope-dot[data-type="reference"]{--scope-color:#94a3b8;}
.dam-rank-row[data-scope="both"] .dam-scope-dot{background:linear-gradient(90deg,var(--dsw-alias-brand-primary,#4d76e6) 0 50%,#0d9488 50% 100%);}
.dam-rank-row[data-scope="both"] .dam-mini-bar i{background:linear-gradient(90deg,var(--dsw-alias-brand-primary,#4d76e6),#0d9488);}
.dam-rank-row{display:grid;grid-template-columns:16px 8px minmax(0,280px) minmax(60px,1fr) 44px 34px;align-items:center;gap:8px;padding:5px 8px;margin:0 -8px;border-radius:8px;transition:background .12s ease;}
.dam-rank-row:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dam-rank-name{font-family:var(--ds-font-family-code);font-size:11px;line-height:16px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);}
.dam-mini-bar{height:4px;border-radius:999px;background:var(--dsw-alias-border-l1);overflow:hidden;}
.dam-mini-bar i{display:block;height:100%;border-radius:999px;background:var(--scope-color,var(--dsw-alias-brand-primary,#4d76e6));transition:width .2s ease;}
.dam-ratio{font-size:10.5px;line-height:14px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;}
.dam-rank-warn{font-size:10.5px;line-height:16px;text-align:right;white-space:nowrap;color:var(--dsw-alias-state-warn-primary,#d97706);}
.dam-trunc-row{display:grid;grid-template-columns:8px minmax(0,1fr) auto;align-items:center;gap:10px;padding:4px 8px;margin:0 -8px;border-radius:8px;transition:background .12s ease;}
.dam-trunc-row:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dam-trunc-row .dam-warn{justify-self:end;}
/* ---- 按项目统计(0.10.1):固定列 + 项目色条 ---- */
.dam-proj-head,.dam-proj-row{display:grid;grid-template-columns:minmax(0,280px) 34px 34px minmax(60px,1fr) 44px 30px;align-items:center;gap:8px;padding-left:8px;padding-right:8px;margin:0 -8px;}
.dam-proj-head{font-size:10.5px;color:var(--dsw-alias-label-tertiary);text-align:right;padding-top:2px;padding-bottom:2px;}
.dam-proj-head span:first-child{text-align:left;}
.dam-proj-row{padding-top:5px;padding-bottom:5px;border-radius:8px;transition:background .12s ease;}
.dam-proj-row:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dam-proj-name{font-family:var(--ds-font-family-code);font-size:11px;line-height:16px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);}
.dam-proj-stat{font-size:10.5px;line-height:14px;color:var(--dsw-alias-label-tertiary);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
.dam-proj-bar{height:4px;border-radius:999px;background:var(--dsw-alias-border-l1);overflow:hidden;}
.dam-proj-bar i{display:block;height:100%;border-radius:999px;}
.dam-proj-warn{font-size:10.5px;line-height:16px;color:var(--dsw-alias-state-warn-primary,#d97706);text-align:right;white-space:nowrap;}
.dam-warn{flex:none;font-size:10px;line-height:16px;padding:0 6px;border-radius:999px;font-weight:600;white-space:nowrap;color:var(--dsw-alias-state-warn-primary,#d97706);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 12%,transparent);}
.dam-timeline{display:flex;flex-direction:column;border-left:1.5px solid var(--dsw-alias-border-l2);margin:2px 0 0 4px;padding:2px 0 0 14px;}
.dam-tl-item{position:relative;padding:4px 0;}
.dam-tl-item[data-open="1"]{cursor:pointer;background:var(--dsw-alias-interactive-bg-hover);border-radius:8px;margin:0 -8px;padding:4px 8px;}
.dam-tl-item[role="button"]{cursor:pointer;}
.dam-tl-chev{flex:none;font-size:10.5px;color:var(--dsw-alias-label-tertiary);margin-left:4px;}
.dam-tl-names{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);}
.dam-tl-name{display:inline-flex;align-items:center;gap:4px;padding:1px 7px;border-radius:999px;font-family:var(--ds-font-family-code);font-size:10px;line-height:16px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dam-tl-name .dam-scope-dot{width:5px;height:5px;box-shadow:none;flex:none;}
.dam-tl-name--cut{color:var(--dsw-alias-state-warn-primary,#d97706);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 35%,transparent);text-decoration:line-through;text-decoration-thickness:1px;opacity:.8;}
.dam-tl-item::before{content:"";position:absolute;left:-18px;top:9px;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-border-l2);}
.dam-tl-item[data-latest="1"]::before{background:var(--dsw-alias-brand-primary,#4d76e6);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 22%,transparent);}
.dam-tl-top{display:flex;align-items:baseline;gap:8px;font-size:11px;line-height:16px;min-width:0;}
.dam-tl-time{flex:none;color:var(--dsw-alias-label-tertiary);white-space:nowrap;margin-left:auto;}
.dam-tl-ws{flex:1 1 auto;min-width:0;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dam-tl-meta{display:flex;align-items:center;gap:6px;margin-top:2px;font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}
.dam-pill{display:inline-flex;align-items:center;padding:0 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);line-height:15px;}
.dam-subdetails>summary{cursor:pointer;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);padding:4px 0;list-style:none;}
.dam-subdetails>summary::-webkit-details-marker{display:none;}
.dam-form{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:8px;position:sticky;bottom:12px;box-shadow:var(--dsw-elevation-prominent,0 3px 8px rgba(0,0,0,.14),0 0 20px rgba(0,0,0,.18));}
.dam-form--inline{position:static;box-shadow:none;border-color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-form-title{font-weight:600;font-size:13px;display:flex;align-items:center;gap:8px;}
.dam-form-bar{width:3px;height:14px;border-radius:2px;background:var(--dsw-alias-brand-primary,#4d76e6);display:inline-block;}
.dam-label{font-size:12px;color:var(--dsw-alias-label-secondary);margin:4px 0 0;}
.dam-input,.dam-textarea{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);color:inherit;padding:6px 10px;font-size:13px;outline:none;font-family:inherit;}
.dam-input:focus,.dam-textarea:focus{border-color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-textarea{resize:vertical;min-height:120px;}
.dam-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.dam-err{color:var(--dsw-alias-state-warn-primary,#d97706);font-size:12px;}
.dam-banner{padding:8px 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 35%,transparent);border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 7%,transparent);}
/* Ограниченный режим панели не-админа: нейтральное пояснение под шапкой */
.dam-restricted-note{padding:7px 12px;border:1px dashed var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-1);font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);}
.dam-empty{display:flex;flex-direction:column;align-items:center;gap:4px;border:1px dashed var(--dsw-alias-border-l2);border-radius:14px;padding:34px 16px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12.5px;background:var(--dsw-alias-bg-layer-1);}
.dam-empty-icon{color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 45%,var(--dsw-alias-label-tertiary));margin-bottom:6px;}
.dam-empty h3{margin:0;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);}
.dam-empty p{margin:0;max-width:520px;}
.dam-modal-backdrop{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.42);backdrop-filter:blur(2px);}
.dam-modal{width:min(760px,100%);max-height:min(82vh,820px);overflow:auto;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.28);padding:18px;}
.dam-modal .dam-form{position:static;box-shadow:none;border:0;background:transparent;padding:0;max-height:none;}
.dam-check{accent-color:var(--dsw-alias-brand-primary,#4d76e6);}
/* ---- 1.4.0 统计可视化增强:活动柱图 + 双分布条 + 榜单排名 ---- */
.dam-chart{display:flex;align-items:flex-end;gap:2px;height:64px;padding:6px 8px 0;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-2);position:relative;}
.dam-chart-row{display:grid;grid-template-columns:34px 1fr;gap:2px 6px;align-items:stretch;}
.dam-chart-y{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;font-size:10.5px;color:var(--dsw-alias-label-tertiary);padding:8px 0 2px;font-variant-numeric:tabular-nums;line-height:1;}
.dam-chart-grid{position:absolute;inset:6px 8px 0;pointer-events:none;}
/* 1.6.0:活动图预算参考线(琥珀虚线+右端标签)——随设置中心的索引预算即刻变化 */
.dam-chart-budget{position:absolute;left:8px;right:8px;border-top:1.5px dashed color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 65%,transparent);pointer-events:none;}
.dam-chart-budget b{position:absolute;right:2px;top:-15px;font-size:10px;font-weight:600;color:var(--dsw-alias-state-warn-primary,#d97706);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 9%,var(--dsw-alias-bg-layer-2));padding:0 5px;border-radius:999px;line-height:14px;font-variant-numeric:tabular-nums;}
.dam-chart-grid i{position:absolute;left:0;right:0;height:1px;background:var(--dsw-alias-border-l1);opacity:.6;}
.dam-chart-grid i:nth-child(1){top:0;}
.dam-chart-grid i:nth-child(2){top:50%;}
.dam-chart-grid i:nth-child(3){bottom:0;}
.dam-chart-cap{grid-column:2;display:flex;justify-content:space-between;font-size:10.5px;color:var(--dsw-alias-label-tertiary);padding:3px 8px 0;font-variant-numeric:tabular-nums;}
.dam-chart-bar{flex:1 1 0;min-width:3px;max-width:18px;border-radius:3px 3px 0 0;background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 75%,var(--dsw-alias-border-l2)),color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 40%,var(--dsw-alias-border-l2)));opacity:.9;transition:opacity .12s ease,transform .12s ease;transform-origin:bottom;cursor:default;}
.dam-chart-bar:hover{opacity:1;transform:scaleY(1.04);}
.dam-chart-bar[data-latest="1"]{background:var(--dsw-alias-brand-primary,#4d76e6);opacity:1;box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 40%,transparent);}
.dam-duo{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px;}
.dam-dist{display:flex;flex-direction:column;gap:5px;min-width:0;}
.dam-dist-bar{display:flex;height:14px;border-radius:999px;overflow:hidden;background:var(--dsw-alias-border-l1);}
.dam-dist-seg{position:relative;min-width:2px;transition:filter .12s ease;}
.dam-dist-seg:hover{filter:brightness(1.18);}
.dam-dist-seg[data-scope="user"]{background:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-dist-seg[data-scope="project"]{background:#0d9488;}
.dam-dist-seg[data-scope="both"]{background:linear-gradient(90deg,var(--dsw-alias-brand-primary,#4d76e6),#0d9488);}
.dam-dist-seg[data-scope="missing"]{background:#94a3b8;}
.dam-dist-seg[data-type="user"]{background:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-dist-seg[data-type="feedback"]{background:#d97706;}
.dam-dist-seg[data-type="project"]{background:#16a34a;}
.dam-dist-seg[data-type="reference"]{background:#94a3b8;}
/* 百分比在图例行展示(段内白字在浅色段上不可读) */
.dam-legend-pct{font-style:normal;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}
.dam-rank-num{width:16px;text-align:right;font-size:10.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}
.dam-rank-row[data-rank="1"] .dam-rank-num,.dam-rank-row[data-rank="2"] .dam-rank-num,.dam-rank-row[data-rank="3"] .dam-rank-num{color:var(--dsw-alias-brand-primary,#4d76e6);font-weight:700;}
.dam-health-pill{display:inline-flex;align-items:center;gap:4px;padding:0 8px;border-radius:999px;font-size:10.5px;line-height:17px;font-weight:600;white-space:nowrap;}
.dam-health-pill[data-kind="unverified"]{color:var(--dsw-alias-brand-primary,#4d76e6);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 13%,transparent);}
.dam-health-pill[data-kind="zombies"]{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);}
.dam-health-pill[data-kind="conflicts"]{color:var(--dsw-alias-state-error-primary,#ef4444);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 12%,transparent);}
/* ---- 1.4.0 设置中心 + 召回漏斗 ---- */
.dam-settings .dam-stats-glyph{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 10%,transparent);}
.dam-preset{flex:1 1 160px;padding:8px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;transition:border-color .12s ease,box-shadow .12s ease;text-align:center;}
.dam-preset:hover{border-color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-preset[data-active="1"]{border-color:var(--dsw-alias-brand-primary,#4d76e6);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 45%,transparent),0 0 12px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 14%,transparent);font-weight:600;}
.dam-ctrl{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);padding:10px 12px;}
.dam-ctrl label{display:flex;flex-direction:column;gap:6px;cursor:pointer;}
.dam-ctrl--toggle label{flex-direction:row;align-items:center;justify-content:space-between;}
.dam-ctrl-head{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px;}
.dam-ctrl-val{margin-left:auto;font-variant-numeric:tabular-nums;font-size:12px;color:var(--dsw-alias-label-secondary);min-width:56px;text-align:right;}
.dam-ctrl-head .dam-ctrl-val{margin-left:auto;}
.dam-ctrl-hint{font-size:10.5px;color:var(--dsw-alias-label-tertiary);}
.dam-ctrl input[type="range"]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:999px;background:var(--dsw-alias-border-l1);outline:none;}
.dam-ctrl input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-brand-primary,#4d76e6);border:2px solid var(--dsw-alias-bg-layer-2);box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer;}
.dam-ctrl input[type="range"]::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:var(--dsw-alias-brand-primary,#4d76e6);border:2px solid var(--dsw-alias-bg-layer-2);cursor:pointer;}
.dam-src{flex:none;font-size:10px;line-height:14px;padding:0 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);white-space:nowrap;}
.dam-src--own{color:var(--dsw-alias-brand-primary,#4d76e6);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 40%,transparent);}
.dam-reset{flex:none;margin-left:2px;width:20px;height:16px;line-height:14px;padding:0;border-radius:5px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-tertiary);font-size:10px;cursor:pointer;}
.dam-reset:hover:not(:disabled){color:var(--dsw-alias-brand-primary,#4d76e6);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 40%,transparent);}
.dam-reset:disabled{opacity:.45;cursor:default;}
.dam-recall-row{display:grid;grid-template-columns:minmax(0,240px) minmax(60px,1fr) 52px;align-items:center;gap:10px;padding:4px 8px;margin:0 -8px;border-radius:8px;transition:background .12s ease;}
.dam-recall-row:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dam-dualbar{display:flex;flex-direction:column;gap:2px;}
.dam-dualbar i,.dam-dualbar em{display:block;height:3px;border-radius:999px;font-style:normal;}
.dam-dualbar i{background:var(--dsw-alias-brand-primary,#4d76e6);opacity:.8;}
.dam-dualbar em{background:#16a34a;}
.dam-quad-grid-inner{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.dam-quad{display:flex;align-items:baseline;gap:8px;padding:9px 11px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);}
.dam-quad--ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 7%,var(--dsw-alias-bg-layer-2));border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 22%,transparent);}
.dam-quad--warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 7%,var(--dsw-alias-bg-layer-2));border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 22%,transparent);}
.dam-quad--info{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 7%,var(--dsw-alias-bg-layer-2));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 22%,transparent);}
.dam-quad--muted{background:var(--dsw-alias-bg-layer-2);}
.dam-quad b{font-size:16px;font-variant-numeric:tabular-nums;line-height:1;}
.dam-quad span{font-size:10.5px;color:var(--dsw-alias-label-tertiary);line-height:1.3;}
.dam-quad--ok b{color:#16a34a;}
.dam-quad--warn b{color:var(--dsw-alias-state-warn-primary,#d97706);}
.dam-quad--info b{color:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-quad--muted b{color:var(--dsw-alias-label-tertiary);}
.dam-ok{color:var(--dsw-alias-state-success-primary,#16a34a);font-size:12px;}
/* ---- 1.5.0 召回双条图例点 + 空态导入按钮 ---- */
.dam-legend--dual{margin:-6px 0 0;}
.dam-dot{display:inline-block;width:7px;height:7px;border-radius:2px;}
.dam-dot--inj{background:var(--dsw-alias-brand-primary,#4d76e6);}
.dam-dot--rec{background:var(--dsw-alias-state-success-primary,#16a34a);}
.dam-ratio-hint{opacity:.75;}
.dam-empty .dam-btn{margin-top:6px;}
/* ---- Claude Code 导入弹层(0.10.0):逐条勾选 + 状态徽章 + 撤销 ---- */
.dam-import-wrap{display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow-y:auto;padding-right:2px;}
.dam-import-group{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:8px 10px;}
.dam-import-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px;}
.dam-import-slug{font-size:11.5px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}
.dam-import-items{display:flex;flex-direction:column;gap:2px;margin-top:4px;}
.dam-import-item{display:flex;align-items:flex-start;gap:8px;padding:4px 6px;border-radius:7px;cursor:pointer;transition:background .12s ease;}
.dam-import-item:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dam-import-item[data-locked="1"]{cursor:default;opacity:.72;}
.dam-import-main{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;}
.dam-import-name{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;font-size:12px;line-height:17px;}
.dam-import-file{font-size:10.5px;color:var(--dsw-alias-label-tertiary);}
.dam-import-desc{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}
.dam-badge{flex:none;align-self:center;font-size:10.5px;line-height:16px;padding:0 7px 0 6px;border-radius:999px;white-space:nowrap;border:1px solid transparent;}
.dam-badge--cand::before,.dam-badge--ok::before,.dam-badge--warn::before,.dam-badge--danger::before{content:"";display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor;margin-right:4px;vertical-align:1px;}
.dam-badge--ok{color:var(--dsw-alias-state-success-primary,#16a34a);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 12%,transparent);}
.dam-badge--warn{color:var(--dsw-alias-state-warn-primary,#d97706);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 12%,transparent);}
/* 可信记忆(1.0.0):状态徽章 + 证据链 + 体检卡 */
.dam-badge--cand{color:var(--dsw-alias-brand-primary,#4d76e6);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 12%,transparent);}
.dam-badge--danger{color:var(--dsw-alias-state-error-primary,#ef4444);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 12%,transparent);}
.dam-evidence{display:flex;gap:6px;align-items:baseline;font-size:11.5px;padding:6px 8px;border-left:2px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:0 6px 6px 0;}
.dam-evidence-label{color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.dam-evidence-quote{color:var(--dsw-alias-label-secondary);font-style:italic;overflow-wrap:anywhere;}
.dam-status-actions{display:flex;gap:6px;}
.dam-status-actions .dam-btn-primary{background:var(--dsw-alias-state-success-primary,#16a34a);border-color:var(--dsw-alias-state-success-primary,#16a34a);color:#fff;}
.dam-status-actions .dam-btn-primary:hover{color:#fff;opacity:.9;}
.dam-status-actions .dam-btn:not(.dam-btn-primary){color:var(--dsw-alias-state-error-primary,#ef4444);}
.dam-status-actions .dam-btn:not(.dam-btn-primary):hover{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ef4444) 35%,transparent);color:var(--dsw-alias-state-error-primary,#ef4444);}
/* 1.5.0:体检平铺为独立 tab;行=button(可点直达记忆卡片) */
.dam-health-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:14px;padding:14px 16px 16px;max-height:560px;overflow-y:auto;align-items:start;}
.dam-health-row{display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 6px;margin:0 -6px;border:0;background:transparent;color:inherit;font-family:inherit;text-align:left;cursor:pointer;border-radius:8px;min-width:0;transition:background .12s ease;}
.dam-health-row:hover{background:var(--dsw-alias-interactive-bg-hover);}
/* 1.6.0 过期行:外层容器(span) + 内层定位按钮 */
.dam-health-row{gap:4px;}
.dam-health-locate{flex:1;display:flex;align-items:center;gap:8px;min-width:0;padding:4px 6px;margin:0 -6px;border:0;border-radius:8px 0 0 8px;background:transparent;color:inherit;font-family:inherit;text-align:left;cursor:pointer;transition:background .12s ease;}
.dam-health-locate:hover{background:var(--dsw-alias-interactive-bg-hover);}
.dam-health-row .dam-btn{flex:none;padding:3px 8px;font-size:11px;border-radius:8px;}
.dam-memory-line .dam-badge svg{vertical-align:-2px;}
.dam-health-row code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
.dam-health-row:hover code{color:var(--dsw-alias-label-primary);text-decoration:underline dotted;text-underline-offset:3px;}
.dam-health-meta{margin-left:auto;color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap;flex:none;}
/* 导入提示条 + 导出成功提示(1.2.0) */
.dam-import-hint{display:flex;align-items:center;gap:10px;justify-content:space-between;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 40%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 8%,transparent);border-radius:8px;padding:6px 12px;font-size:12.5px;}
.dam-export-note{color:var(--dsw-alias-state-success-primary,#16a34a);font-size:12px;}
/* #19 谱系:可点徽章与跳转命中高亮 */
.dam-lineage-link{cursor:pointer;text-decoration:underline dotted;}
.dam-lineage-link:hover{color:var(--dsw-alias-brand-primary,#4d76e6);}
@keyframes dam-lineage-flash{0%{box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d76e6) 60%,transparent);}100%{box-shadow:0 0 0 3px transparent;}}
.dam-lineage-hit{animation:dam-lineage-flash 1.5s ease-out;border-radius:8px;}
.dam-badge--muted{color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l2);}
`;
		/** 幂等注入面板样式(官方 data-plugin-css 约定)。 */
		function injectPanelCss() {
			const tagId = "dsh-auto-memory/panel.css";
			if (typeof document === "undefined" || document.querySelector(`style[data-plugin-css="${tagId}"]`) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-auto-memory";
			tag.dataset.pluginCss = tagId;
			tag.textContent = PANEL_CSS;
			document.head.appendChild(tag);
		}
		/** 注册侧栏入口与记忆管理面板。 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, ru), "dsh-auto-memory: dictionaries");
			injectPanelCss();
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID,
				locale: NS,
				inject: () => memoryFace(ctx)
			}, MemoryPage));
			const slots = ctx.slots;
			slots.inject("settings.section", () => slots.register({
				name: "settings.section",
				id: PANEL_ID,
				order: 50,
				label: () => t("panel"),
				locale: NS,
				inject: () => memoryFace(ctx)
			}, MemoryPage));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 50,
				label: () => t("panel"),
				locale: NS
			}, MemoryPanelIcon));
		}
		exports.NS = NS;
		exports.PANEL_CSS = PANEL_CSS;
		exports.PANEL_ID = PANEL_ID;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
