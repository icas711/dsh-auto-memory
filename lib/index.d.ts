import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
//#region src/index.d.ts
declare const name = "dsh-auto-memory";
declare const inject: string[];
/** 插件配置(schemastery 声明,默认值写在 schema;用户经 profile patch 覆盖,整表替换)。 */
interface Config {
  /** 注入索引段(含写入指导)的字节预算。 */
  maxBytes: number;
  /** 记忆根目录;缺省 $DSH_HOME/memory(跟随 $DSH_HOME > ~/.dsh)。 */
  memoryDir?: string;
  /** 是否启用用户级作用域(_user 目录注入所有会话)。 */
  enableUserScope: boolean;
  /** P1:会话结束自动总结固化(需要可用模型路由;失败静默不影响会话)。 */
  autoSummarize: boolean;
  /** 单次固化最多写入的新记忆数。 */
  autoSummarizeMaxMemories: number;
  /** 固化模型调用的输出 token 上限。 */
  autoSummarizeMaxTokens: number;
  /** 1.7.0: через сколько новых пользовательских сообщений запускать инкрементальную консолидацию на границе хода (у длинной сессии нет момента «завершения»). */
  autoSummarizeEveryTurns: number;
  /** #17 固化价值门槛:候选有效分(importance ?? 类型缺省)低于此值直接丢弃,不落盘。 */
  minImportance: number;
  /** P1:软淘汰阈值(天)——超过且从未被读取的记忆在索引重建时从注入索引隐藏(文件保留)。0 禁用。 */
  staleAfterDays: number;
  /** 1.7.0: recall по запросу — на каждое пользовательское сообщение отдельный вызов LLM выбирает релевантные записи и добавляет их в хвост контекста. */
  recall: boolean;
  /** Сколько записей максимум возвращать на одно пользовательское сообщение. */
  recallMaxMemories: number;
  /** Бюджет в байтах для сообщения с recall. */
  recallMaxBytes: number;
  /** Жёсткий таймаут вызова селектора (мс); по таймауту recall тихо пропускается. */
  recallTimeoutMs: number;
  /** Отдельные provider/model для селектора (задавать парой; пусто = модель сессии). */
  recallProvider?: string;
  recallModel?: string;
  /** 1.8.0: администраторы общего слоя (логины = session.header.owner, без учёта регистра); локальная/CLI-сессия всегда админ. */
  admins: string[];
  /** 1.8.0: включён ли общий слой для всех (_shared; запись не-админов проходит модерацию). */
  enableSharedScope: boolean;
  /** 1.9.0:фоновая уборка — слияние дублей (LLM подтверждает; старые помечаются superseded). */
  curate?: boolean;
  /** Не чаще раза в N часов на слой. */
  curateIntervalHours?: number;
  /** Максимум слияний за один проход. */
  curateMaxMerges?: number;
  /** 1.11.0: recall подмешивает project-память других рабочих областей владельца. */
  recallOtherProjects?: boolean;
  /** 1.10.0: гейт инъекций — memory_write после чтения внешнего контента идёт через подтверждение человека. */
  injectionGate?: boolean;
  /** Маски имён инструментов, чтение которых «заражает» ход (пусто = набор по умолчанию). */
  untrustedTools?: string[];
}
declare const Config: z<Config>;
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, apply, inject, name };