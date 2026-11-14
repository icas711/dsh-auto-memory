/**
 * 会话登录身份(1.8.0 多用户):取自 `session.header.owner`(deepseek-harness 在
 * 带鉴权的 web 会话里写入;CLI/headless 无此字段)。
 * 返回 undefined = 本机/无登录会话:沿用旧版目录布局,且视为共享层管理员。
 * 空串/非字符串一律按"无 owner"处理——但注意这意味着畸形 owner 会落到本机视图;
 * 部署方应保证带鉴权入口恒写入 owner(这是 dsh 侧的契约,插件无法自证)。
 */
export function ownerOf(agent: { session: { header: unknown } } | undefined | null): string | undefined {
  const header = agent?.session.header as { owner?: unknown } | undefined
  const owner = header?.owner
  return typeof owner === 'string' && owner.trim().length > 0 ? owner : undefined
}
