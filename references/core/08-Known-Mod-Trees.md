# 08 — Known Mod Trees: Crawled Catalog of Real TMT Games

> **Crawl date:** 2026-10-01 · **Sources:** gityx.com modding-trees category (97 curated entries, all detail pages), GitHub forks of Acamaeda/The-Modding-Tree (top 200 by stars → 171 unique → 106 verified modified → 40 with live GitHub Pages), yhvr.me/pt/mods.html community modlist (28 early-era entries).
> **Verification:** every play link was probed with HTTP requests (✅ = HTTP 200 & looks like a TMT game, ❌ = dead/404); every GitHub repo was confirmed via `raw.githubusercontent.com/.../js/mod.js` (which also yields the in-game `modInfo.name`).
> **Note on g8hh:** the repo `github.com/g8hh/g8hh.github.io` does NOT contain the games in its git tree (Pages deploys separately). Use the per-game mirrors `https://g8hh.github.io/{game}/` and `https://{game}.g8hh.com.cn/` as play URLs; the original-author repo is listed separately per game.

**Stats:** ✅ 87/97 gityx entries have a verified live play link · 33 fork games with live play links not already in the gityx list · 65 modified forks exist as source-only (no verified hosting).

## 1. Highest-signal games (start here when studying design patterns)

Cross-referenced picks: top gityx community ratings plus the most-starred modified forks. All links verified live at crawl time.

| Game | Rating | Play | GitHub | Stars |
|---|---|---|---|---|
| 挖矿增量页 (The Mining Incremental Table) | 9.6 | angrystar6k.github.io/The-Mining-Incremental-Table/ | [angrystar6k/The-Mining-Incremental-Table](https://github.com/angrystar6k/The-Mining-Incremental-Table) ✅ (+1 more repos) | — |
| 马力欧创作家2树 (The Mario Maker 2 Tree) | 8.1 | angrystar6k.github.io/The-Mario-Maker-2-Tree/langs/ch/ | [angrystar6k/The-Mario-Maker-2-Tree](https://github.com/angrystar6k/The-Mario-Maker-2-Tree) ✅ | — |
| 增量宇宙树（Incrementreeverse） | 8.0 | incrementreeverse-cn.g8hh.com.cn/ | [pg132/The-Modding-Tree](https://github.com/pg132/The-Modding-Tree) ✅ | — |
| 高考树 (Gaokao Tree) | 8.0 | loader3229.github.io/gaokaotree/index2.html | [loader3229/gaokaotree](https://github.com/loader3229/gaokaotree) ✅ (+1 more repos) | — |
| 1点数=1层级树 (One Point One Layer) | 7.8 | loader3229.github.io/one-point-one-layer/ | [loader3229/one-point-one-layer](https://github.com/loader3229/one-point-one-layer) ✅ (+1 more repos) | — |
| 2026春节树 (The Spring Festival Tree 2026) | 7.8 | qqqe308.github.io/The-Spring-Festival-Tree-2026/ | [qqqe308/The-Spring-Festival-Tree-2026](https://github.com/qqqe308/The-Spring-Festival-Tree-2026) ✅ | — |
| 胀树 (Zhang Tree) | 7.7 | qwqe198.github.io/Zhang-Tree/ | [qwqe198/Zhang-Tree](https://github.com/qwqe198/Zhang-Tree) ✅ | — |
| 病毒树（C0v1d Modding Tree） | 7.6 | qwqe198.github.io/c0v1d-modding-tree-ch/ | [qwqe198/c0v1d-modding-tree-ch](https://github.com/qwqe198/c0v1d-modding-tree-ch) ✅ (+1 more repos) | — |
| 反物质维度树（Antreematter Dimensions） | 7.3 | gltyx.github.io/antreematter-dimensions/ | [jasperfr/The-Modding-Tree](https://github.com/jasperfr/The-Modding-Tree) ✅ | — |
| 天体增量树 (Celestial Incremental) | 7.3 | icecreamdudes.github.io/celestial_incremental/ | [icecreamdudes/celestial_incremental](https://github.com/icecreamdudes/celestial_incremental) ✅ | — |
| 光之树（Lit） | 7.0 | www.thepaperpilot.org/lit/ | [thepaperpilot/profectus](https://github.com/thepaperpilot/profectus) ✅ | — |
| 增量神树2（Gods of Incremental） | 7.0 | icecreamdudes.github.io/godsofincremental/ | [icecreamdudes/godsofincremental](https://github.com/icecreamdudes/godsofincremental) ✅ | — |
| 怨种树（The Yuanzhong Tree） | 7.0 | qwqe198.github.io/a-yuanzhongtree/ | [qwqe198/a-yuanzhongtree](https://github.com/qwqe198/a-yuanzhongtree) ✅ | — |
| 春节树 (The Spring Festival Tree 2025) | 7.0 | liuliu66686.github.io/The-Spring-Festival-Tree/ | [liuliu66686/The-Spring-Festival-Tree](https://github.com/liuliu66686/The-Spring-Festival-Tree) ✅ | — |
| 1行1层级树 (1 Row 1 Layer) | 7.0 | qwqe198.github.io/1-row-1-layer/ | [qwqe198/1-row-1-layer](https://github.com/qwqe198/1-row-1-layer) ✅ | — |
| Plague Tree (Vorona Cirus Treesease) | — | c0v1d-9119361.github.io/The-Plague-Tree/ | https://github.com/c0v1d-9119361/The-Plague-Tree | 4 |
| The Septenary Forest | — | Yrahcaz7.github.io/The-Septenary-Forest/ | https://github.com/Yrahcaz7/The-Septenary-Forest | 3 |
| RTXT25.Github.io | — | RTXT25.github.io/RTreeXTree/ | https://github.com/RTXT25/RTreeXTree | 3 |
| 编年史树 | — | catfish-in-a-nutshell.github.io/The-Chronicle-Tree/ | https://github.com/catfish-in-a-nutshell/The-Chronicle-Tree | 2 |
| The Point Tree | — | p-u.github.io/The-Point-Tree/ | https://github.com/p-u/The-Point-Tree | 2 |
| The Lime Upgrade Tree | — | mirc3a22000.github.io/the-lime-upgrade-tree/ | https://github.com/mirc3a22000/the-lime-upgrade-tree | 2 |

## 2. gityx.com curated list (97 entries, sorted by community rating)

`#` = gityx detail page id (`https://gityx.com/modding-trees/{id}.html`). Play column lists verified-live original/author links first, then g8hh mirrors. GitHub column = repository derived from the play URL and verified to exist.

| # | Game | Rating | Play (verified live) | GitHub |
|---|---|---|---|---|
| 1119 | 挖矿增量页 (The Mining Incremental Table) | 9.6 | angrystar6k.github.io/The-Mining-Incremental-Table/ ; angrystar6k.github.io/The-Mining-Incremental-Table-BE/ (+1) | [angrystar6k/The-Mining-Incremental-Table](https://github.com/angrystar6k/The-Mining-Incremental-Table) ✅ (+1 more repos)  |
| 1456 | 马力欧创作家2树 (The Mario Maker 2 Tree) | 8.1 | angrystar6k.github.io/The-Mario-Maker-2-Tree/langs/ch/ ; angrystar6k.github.io/The-Mario-Maker-2-Tree/ (+1) | [angrystar6k/The-Mario-Maker-2-Tree](https://github.com/angrystar6k/The-Mario-Maker-2-Tree) ✅  |
| 17 | 增量宇宙树（Incrementreeverse） | 8.0 | incrementreeverse-cn.g8hh.com.cn/ | [pg132/The-Modding-Tree](https://github.com/pg132/The-Modding-Tree) ✅  |
| 1334 | 高考树 (Gaokao Tree) | 8.0 | loader3229.github.io/gaokaotree/index2.html ; qwqe198.github.io/Gaokao-Tree-ch/ (+2) | [loader3229/gaokaotree](https://github.com/loader3229/gaokaotree) ✅ (+1 more repos)  |
| 1151 | 1点数=1层级树 (One Point One Layer) | 7.8 | loader3229.github.io/one-point-one-layer/ ; qwqe198.github.io/1p1l-ch/ (+1) | [loader3229/one-point-one-layer](https://github.com/loader3229/one-point-one-layer) ✅ (+1 more repos)  |
| 1270 | 2026春节树 (The Spring Festival Tree 2026) | 7.8 | qqqe308.github.io/The-Spring-Festival-Tree-2026/ ; the-spring-festival-tree-2026.g8hh.com.cn/ | [qqqe308/The-Spring-Festival-Tree-2026](https://github.com/qqqe308/The-Spring-Festival-Tree-2026) ✅  |
| 1413 | 胀树 (Zhang Tree) | 7.7 | qwqe198.github.io/Zhang-Tree/ ; zhang-tree.g8hh.com.cn/ | [qwqe198/Zhang-Tree](https://github.com/qwqe198/Zhang-Tree) ✅  |
| 129 | 病毒树（C0v1d Modding Tree） | 7.6 | qwqe198.github.io/c0v1d-modding-tree-ch/ ; g8hh.github.io/c0v1d-modding-tree/ | [qwqe198/c0v1d-modding-tree-ch](https://github.com/qwqe198/c0v1d-modding-tree-ch) ✅ (+1 more repos)  |
| 503 | 反物质维度树（Antreematter Dimensions） | 7.3 | gltyx.github.io/antreematter-dimensions/ | [jasperfr/The-Modding-Tree](https://github.com/jasperfr/The-Modding-Tree) ✅  |
| 957 | 天体增量树 (Celestial Incremental) | 7.3 | icecreamdudes.github.io/celestial_incremental/ ; g1tyx.github.io/celestial-incremental/ (+1) | [icecreamdudes/celestial_incremental](https://github.com/icecreamdudes/celestial_incremental) ✅  |
| 131 | 光之树（Lit） | 7.0 | ~~www.thepaperpilot.org/lit/ (+2)~~ (dead at crawl time) | [thepaperpilot/profectus](https://github.com/thepaperpilot/profectus) ✅  |
| 767 | 增量神树2（Gods of Incremental） | 7.0 | icecreamdudes.github.io/godsofincremental/ ; g1tyx.github.io/gods-of-incremental/ (+1) | [icecreamdudes/godsofincremental](https://github.com/icecreamdudes/godsofincremental) ✅  |
| 862 | 怨种树（The Yuanzhong Tree） | 7.0 | qwqe198.github.io/a-yuanzhongtree/ ; a-yuanzhong-tree.g8hh.com.cn/ | [qwqe198/a-yuanzhongtree](https://github.com/qwqe198/a-yuanzhongtree) ✅  |
| 993 | 春节树 (The Spring Festival Tree 2025) | 7.0 | liuliu66686.github.io/The-Spring-Festival-Tree/ ; the-spring-festival-tree-2025.g8hh.com.cn/ | [liuliu66686/The-Spring-Festival-Tree](https://github.com/liuliu66686/The-Spring-Festival-Tree) ✅  |
| 1157 | 1行1层级树 (1 Row 1 Layer) | 7.0 | qwqe198.github.io/1-row-1-layer/ ; 1-row-1-layer.g8hh.com.cn/ | [qwqe198/1-row-1-layer](https://github.com/qwqe198/1-row-1-layer) ✅  |
| 125 | 空值树（The Null Tree） | 6.7 | vgakbzc.github.io/tnt/ ; g8hh.github.io/the-null-tree/tnt/ | [vgakbzc/tnt](https://github.com/vgakbzc/tnt) ❌  |
| 648 | 符文树（The Glyph Tree） | 6.7 | qwqe308.github.io/The-Glyph-Tree/ | [qwqe308/The-Glyph-Tree](https://github.com/qwqe308/The-Glyph-Tree) ✅  |
| 1401 | 时间树 (The Time Tree) | 6.4 | qwqe198.github.io/the-time-tree/ ; the-time-tree.g8hh.com.cn/ | [qwqe198/the-time-tree](https://github.com/qwqe198/the-time-tree) ✅  |
| 1089 | 劝退树 (The Wrong Tree NG) | 6.3 | qwqe198.github.io/The-Wrong-Tree-ng/ ; the-wrong-tree-ng.g8hh.com.cn/ | [qwqe198/The-Wrong-Tree-ng](https://github.com/qwqe198/The-Wrong-Tree-ng) ✅  |
| 15 | 创世声望树（Prestreestuck） | 6.0 | g8hh.github.io/prestreestuck/ ; prestreestuck.g8hh.com.cn/ | [ducdat0507/prestreestuck](https://github.com/ducdat0507/prestreestuck) ✅ ★11 |
| 293 | 女团树（The Gfriend Tree） | 6.0 | gltyx.github.io/the-gfriend-tree/ | [ehcho0222/The-Modding-Tree](https://github.com/ehcho0222/The-Modding-Tree) ❌  |
| 412 | 里程碑之树（Milestone Tree） | 6.0 | loader3229.github.io/milestone-tree/index2.html ; milestone-tree.g8hh.com.cn/index2.html | [loader3229/milestone-tree](https://github.com/loader3229/milestone-tree) ✅  |
| 831 | 元素周期增量树（Periodic Elements Incremental Tree） | 6.0 | liuliu66686.github.io/The-Periodic-Elements-Incemental-Tree/TMTR/ ; txgeer.github.io/TPeT/PEIT/The-Modding-Tree-master/ (+1) | [liuliu66686/The-Periodic-Elements-Incemental-Tree](https://github.com/liuliu66686/The-Periodic-Elements-Incemental-Tree) ✅ (+1 more repos)  |
| 1148 | 张力树 (Zhangli Tree) | 6.0 | qwqe198.github.io/zhangli-Tree/ | [qwqe198/zhangli-Tree](https://github.com/qwqe198/zhangli-Tree) ✅  |
| 1319 | 蛮王树 (TPeT) | 6.0 | txgeer.github.io/TPeT/TPeT/The-Modding-Tree-master/ ; man-wang-tree.g8hh.com.cn/ | [txgeer/TPeT](https://github.com/txgeer/TPeT) ✅  |
| 23 | 声望树重制版（Prestige Tree Rewritten） | 5.5 | jacorb90.me/Prestige-Tree/index.html ; prestige-tree.g8hh.com.cn/ | [Jacorb90/The-Prestige-Tree](https://github.com/Jacorb90/The-Prestige-Tree) ❌  |
| 124 | 塔防树（TD Tree） | 5.5 | ~~adsaf123.github.io/TDtree/ (+2)~~ (dead at crawl time) | [adsaf123/TDtree](https://github.com/adsaf123/TDtree) ❌  |
| 794 | 音乐游戏树（The Rhythm Game Tree） | 5.5 | qqqe308.github.io/The-Rhythm-Game-Tree/ ; the-rhyhm-game-tree.g8hh.com.cn/ | [qqqe308/The-Rhythm-Game-Tree](https://github.com/qqqe308/The-Rhythm-Game-Tree) ✅  |
| 1168 | 无尽的砍树 (Endless Tree) | 5.5 | mo-chen-e308.github.io/EndlessTree/ ; endless-tree.g8hh.com.cn/ | [mo-chen-e308/EndlessTree](https://github.com/mo-chen-e308/EndlessTree) ✅  |
| 122 | 生命树（The Tree Of Life） | 5.0 | the-tree-of-life.g8hh.com.cn | [pg132/The-Modding-Tree](https://github.com/pg132/The-Modding-Tree) ✅ ★2 |
| 132 | 收集者树（The Collectors Tree） | 5.0 | abitoftetration.github.io/The-Collectors-Tree/ | [abitoftetration/The-Collectors-Tree](https://github.com/abitoftetration/The-Collectors-Tree) ✅  |
| 594 | 天津中考树（The Tianjin Zhongkao Tree） | 5.0 | gityxs.github.io/tian-jin-zhong-kao-tree-en/ | —  |
| 1042 | 红鲨树 (The Mrshark77 Tree) | 5.0 | qwqe198.github.io/The-Mrshark77-Tree/ ; the-mrshark77-tree.g8hh.com.cn/ | [qwqe198/The-Mrshark77-Tree](https://github.com/qwqe198/The-Mrshark77-Tree) ✅  |
| 1313 | 1001树 (1001 Tree) | 4.6 | 1001tree.flime.top/ ; 1001tree.g8hh.com.cn/ | custom domain: 1001tree.flime.top  |
| 1173 | 指数树 (Exponential) | 4.5 | phigr1301.github.io/Exponential/ ; exponential.g8hh.com.cn/ | [phigr1301/Exponential](https://github.com/phigr1301/Exponential) ✅  |
| 1308 | 冒险树 (The Adventure Chain) | 4.3 | qwqe198.github.io/the-adventure-chain-ch/ ; loader3229.github.io/the-adventure-chain/ (+1) | [qwqe198/the-adventure-chain-ch](https://github.com/qwqe198/the-adventure-chain-ch) ✅ (+1 more repos)  |
| 8 | 工厂树（The Factioree） | 4.0 | dystopia-user181.github.io/The-Modding-Tree/ ; g8hh.github.io/the-factioree/ | [Dystopia-user181/The-Modding-Tree](https://github.com/Dystopia-user181/The-Modding-Tree) ✅ ★1 |
| 1286 | 稀释增量页 (The Diluter Modding Table) | 4.0 | gltyx.github.io/the-diluter-modding-table/ ; the-diluter-modding-table.g8hh.com.cn/ | —  |
| 413 | 数字树（The Number Tree） | 3.7 | factorxxx.github.io/Profectus/index.html | [factorxxx/Profectus](https://github.com/factorxxx/Profectus) ❌  |
| 1329 | 点击树 (The Click Tree) | 3.7 | chenf888.github.io/The-click-Tree/ ; the-click-tree.g8hh.com.cn/ | [chenf888/The-click-Tree](https://github.com/chenf888/The-click-Tree) ✅ ★1 |
| 741 | 另类历史学家树（The Alterhistorian） | 3.5 | dystopia-user181.github.io/The-Alterhistorian/ ; g1tyx.github.io/the-alterhistorian/ (+1) | [dystopia-user181/The-Alterhistorian](https://github.com/dystopia-user181/The-Alterhistorian) ❌  |
| 1143 | 睡觉树 (The Sleep Tree) | 3.5 | the-sleep-tree.github.io/ ; the-sleep-tree.g8hh.com.cn/ | [the-sleep-tree/the-sleep-tree.github.io](https://github.com/the-sleep-tree/the-sleep-tree.github.io) ✅  |
| 1471 | 专业树 (The Pro Tree) | 3.5 | linlei0102.github.io/The-Pro-Tree/ ; hahaha622.github.io/The-Pro-Tree/ (+1) | [linlei0102/The-Pro-Tree](https://github.com/linlei0102/The-Pro-Tree) ✅ (+1 more repos)  |
| 134 | 选举树（The Tree of Vote） | 2.0 | ajchen02.github.io/The-Tree-of-Vote/ | [ajchen02/The-Tree-of-Vote](https://github.com/ajchen02/The-Tree-of-Vote) ✅  |
| 143 | 时间函数树（The Function of Time） | 2.0 | ~~mikosss.github.io/The-Modding-Tree/ (+2)~~ (dead at crawl time) | [mikosss/The-Modding-Tree](https://github.com/mikosss/The-Modding-Tree) ❌  |
| 27 | 社区树（Communitree） | 1.0 | g8hh.github.io/communitree/ ; communitree.g8hh.com.cn | [ducdat0507/communitree](https://github.com/ducdat0507/communitree) ✅  |
| 144 | 转生链（The Prestige Chain） | 1.0 | ~~raw.githack.com/pg132/The-Modding-Tree/buyables/index.html (+2)~~ (dead at crawl time) | [pg132/The-Modding-Tree](https://github.com/pg132/The-Modding-Tree) ✅ ★2 |
| 445 | 原始树（Primordial Tree） | 1.0 | jacorb90.me/Primordial-Tree/ | custom domain: jacorb90.me  |
| 7 | 等级树（The Leveling Tree） | — | denisolenison.github.io/The-Leveling-Tree/ ; g8hh.github.io/the-leveling-tree/ (+1) | [denisolenison/The-Leveling-Tree](https://github.com/denisolenison/The-Leveling-Tree) ✅  |
| 9 | 合并树（Merging Prestige Tree） | — | g8hh.github.io/merging-prestige-tree/ | custom domain: technokaguya.itch.io  |
| 16 | 任务树（Tree Quest） | — | iemory.github.io/TreeQuest/ ; g8hh.github.io/tree-quest/ | [IEmory/TreeQuest](https://github.com/IEmory/TreeQuest) ✅ ★6 |
| 18 | 公式树（The Formula） | — | qwqe308.github.io/The-Formula/ ; jacorb90.me/The-Formula/ | [qwqe308/The-Formula](https://github.com/qwqe308/The-Formula) ✅  |
| 25 | 数学树（True Math Tree） | — | qwqe308.github.io/True-Math-Tree/ ; g8hh.github.io/True-Math-Tree/ | [qwqe308/True-Math-Tree](https://github.com/qwqe308/True-Math-Tree) ✅  |
| 123 | 颜色树（The Color Tree） | — | mrredshark77.github.io/the-color-tree/ | [mrredshark77/the-color-tree](https://github.com/mrredshark77/the-color-tree) ✅  |
| 126 | 声望矩形树（The Prestige Rectangle） | — | gapples2.github.io/The-Prestige-Rectangle/ | [gapples2/The-Prestige-Rectangle](https://github.com/gapples2/The-Prestige-Rectangle) ✅  |
| 130 | 游戏开发树（The Game Dev Tree） | — | ~~www.thepaperpilot.org/gamedevtree/ (+1)~~ (dead at crawl time) | [thepaperpilot/Gamedev-Tree](https://github.com/thepaperpilot/Gamedev-Tree) ❌  |
| 133 | 电力树（The Electric Tree） | — | mathnerdfromfrance.github.io/the-electric-tree/ | [mathnerdfromfrance/the-electric-tree](https://github.com/mathnerdfromfrance/the-electric-tree) ✅  |
| 135 | 献祭树（The Sacrifice Tree） | — | shenmi124.github.io/The-Sacrifice-Tree/ | [shenmi124/The-Sacrifice-Tree](https://github.com/shenmi124/The-Sacrifice-Tree) ✅  |
| 136 | 圣诞树（The Christmas Tree） | — | ~~christmas-tree-nolight.glitch.me/ (+2)~~ (dead at crawl time) | custom domain: christmas-tree-nolight.glitch.me  |
| 137 | 王朝之系谱（The Dynas Tree） | — | the-dynas-tree.g8hh.com.cn/ | [ducdat0507/thedynastree](https://github.com/ducdat0507/thedynastree) ✅  |
| 138 | 夸克树（The Quark Tree） | — | ~~shenmi124.github.io/The-Quark-Tree/ (+2)~~ (dead at crawl time) | [shenmi124/The-Quark-Tree](https://github.com/shenmi124/The-Quark-Tree) ❌  |
| 139 | 圣诞特辑树（Christmas Special） | — | ~~raw.githack.com/Dystopia-user181/The-Modding-Tree/Christmas-Special/index.html (+2)~~ (dead at crawl time) | [Dystopia-user181/The-Modding-Tree](https://github.com/Dystopia-user181/The-Modding-Tree) ✅ ★1 |
| 140 | 燃烧树（The Burning Tree） | — | thefinaluptake.github.io/The-Burning-Tree/ | [thefinaluptake/The-Burning-Tree](https://github.com/thefinaluptake/The-Burning-Tree) ✅  |
| 141 | 新年树（Happy Lunar New Year Tree） | — | qwqe308.github.io/Happy-Lunar-New-Year-Tree/ | [qwqe308/Happy-Lunar-New-Year-Tree](https://github.com/qwqe308/Happy-Lunar-New-Year-Tree) ✅  |
| 142 | 增量开发树（The Incremental Dev Tree / Omeganum） | — | icecreamdudes.github.io/The-Modding-Tree-Omeganum/ | [icecreamdudes/The-Modding-Tree-Omeganum](https://github.com/icecreamdudes/The-Modding-Tree-Omeganum) ✅  |
| 145 | Tubas树重制版（Tubas Tree Rewritten） | — | randomtuba.github.io/Tubas-Tree-Rewritten/ | [randomtuba/Tubas-Tree-Rewritten](https://github.com/randomtuba/Tubas-Tree-Rewritten) ❌  |
| 146 | 协同树（The Synergism Tree） | — | patfr.github.io/The-Synergism-Tree/ | [patfr/The-Synergism-Tree](https://github.com/patfr/The-Synergism-Tree) ✅  |
| 152 | 公司树（Tree Inc） | — | randomtuba.github.io/Tree-Inc/ | [randomtuba/Tree-Inc](https://github.com/randomtuba/Tree-Inc) ❌  |
| 448 | 升级树（The Upgrading Tree） | — | qwqe308.github.io/the-upgrading-tree/ | [qwqe308/the-upgrading-tree](https://github.com/qwqe308/the-upgrading-tree) ✅  |
| 493 | 元素周期表树（The Periodic Table Tree） | — | ~~raw.githack.com/BilboyX/The-Modding-Tree/master/index.html (+2)~~ (dead at crawl time) | [BilboyX/The-Modding-Tree](https://github.com/BilboyX/The-Modding-Tree) ✅  |
| 501 | 传奇树 | — | chuan-qi-tree.g8hh.com.cn/ | [whzyhx/Ni-Ming](https://github.com/whzyhx/Ni-Ming) ❌  |
| 515 | 尘埃树（The Dust Tree） | — | g8hh.github.io/the-dust-tree/ | [chipsams/The-Modding-Tree](https://github.com/chipsams/The-Modding-Tree) ✅  |
| 521 | 飞升树QoL模组（The Ascension Tree QoL Modded） | — | cyxw.github.io/the_ascension_tree_QoL_Modded/ | [cyxw/the_ascension_tree_QoL_Modded](https://github.com/cyxw/the_ascension_tree_QoL_Modded) ✅  |
| 560 | 阿卡树（Arc Tree） | — | cyxw.github.io/Arctree/ | [cyxw/Arctree](https://github.com/cyxw/Arctree) ✅ ★6 |
| 587 | 另类声望树（Falling Mountain's Alter Prestige） | — | fallingmountain.github.io/The-Modding-Tree/ | [fallingmountain/The-Modding-Tree](https://github.com/fallingmountain/The-Modding-Tree) ✅  |
| 651 | 公式树NG--（The Formula NG--） | — | ~~shenmi124.github.io/The_Formula_NG--/ (+1)~~ (dead at crawl time) | [shenmi124/The_Formula_NG--](https://github.com/shenmi124/The_Formula_NG--) ✅  |
| 674 | 增量神树（Incremental God Tree） | — | icecreamdudes.github.io/Incremental-God-Tree/ ; gityxs.github.io/incremental-god-tree/ | [Icecreamdudes/Incremental-God-Tree](https://github.com/Icecreamdudes/Incremental-God-Tree) ✅ ★2 |
| 686 | 序数品客树（Ordinal Gwa Tree） | — | g1tyx.github.io/ordinal-gwa-tree/ | custom domain: ordinal-gwa-tree.glitch.me  |
| 688 | 镜面开拓者树（Planar Pioneers） | — | g1tyx.github.io/planar-pioneers/ | [thepaperpilot/planar](https://github.com/thepaperpilot/planar) ❌  |
| 692 | 化学树（The Chemistry Tree） | — | beautyfallencat.github.io/The-Chemistry-Tree/ ; gltyx.github.io/the-chemistry-tree/ (+2) | [beautyfallencat/The-Chemistry-Tree](https://github.com/beautyfallencat/The-Chemistry-Tree) ✅  |
| 705 | 绿洲（Oasis） | — | murapix.github.io/oasis/ ; gityxs.github.io/oasis/oasis/ | [murapix/oasis](https://github.com/murapix/oasis) ❌  |
| 707 | 恒星流明（The Stellar Lumen） | — | lun4-r.github.io/The-Stellar-Lumen/ ; gityxs.github.io/the-stellar-lumen/ (+1) | [lun4-r/The-Stellar-Lumen](https://github.com/lun4-r/The-Stellar-Lumen) ✅  |
| 720 | 游戏树（The Gaming Tree） | — | medsal15.github.io/The-Gaming-Tree/ ; g1tyx.github.io/the-gaming-tree/ (+1) | [medsal15/The-Gaming-Tree](https://github.com/medsal15/The-Gaming-Tree) ✅  |
| 726 | 愤怒的黑盒（Enraging Black Box） | — | gityxs.github.io/enraging-black-box/ ; enraging-black-box.g8hh.com.cn/ | custom domain: dystopia-user181.itch.io  |
| 752 | 河北中考树（Hebei Zhongkao Tree） | — | beautyfallencat.github.io/Hebei-Zhongkao-Tree/ ; g1tyx.github.io/hebei-zhongkao-tree/ (+1) | [beautyfallencat/Hebei-Zhongkao-Tree](https://github.com/beautyfallencat/Hebei-Zhongkao-Tree) ✅  |
| 768 | 植物树（The Plant Tree） | — | thenonymous.github.io/The-Random-Tree/ ; g1tyx.github.io/the-plant-tree/ (+1) | [thenonymous/The-Random-Tree](https://github.com/thenonymous/The-Random-Tree) ✅  |
| 823 | 二合一合并树（Prestige Tree Mod About Merging Two） | — | abitoftetration.github.io/PrestigeTreeModAboutMergingTwo/ ; g1tyx.github.io/merging-two/ (+1) | [abitoftetration/PrestigeTreeModAboutMergingTwo](https://github.com/abitoftetration/PrestigeTreeModAboutMergingTwo) ✅  |
| 827 | 卡巴拉增量之树（Kabalah Incremental Tree） | — | beautyfallencat.github.io/Kabalah-Incremental-Tree-Chinese/ ; kabalah-incremental-tree.g8hh.com.cn/ | [beautyfallencat/Kabalah-Incremental-Tree](https://github.com/beautyfallencat/Kabalah-Incremental-Tree) ✅ (+1 more repos)  |
| 988 | 2024春节树 (The Spring Festival Tree 2024) | — | qwqe198.github.io/the-Spring-Festival-tree/ ; the-spring-festival-tree.g8hh.com.cn/ | [qwqe198/the-Spring-Festival-tree](https://github.com/qwqe198/the-Spring-Festival-tree) ✅  |
| 994 | 数一亿粒米树 (Varios Metros Tree) | — | linlei0102.github.io/Varios-Metros-Tree/ ; linlei0102.github.io/Varios-Metros-Tree-NG/ (+1) | [linlei0102/Varios-Metros-Tree](https://github.com/linlei0102/Varios-Metros-Tree) ✅ (+1 more repos)  |
| 995 | 熵树 (The Entropy Tree) | — | xiaosunmath.github.io/the-entropy-tree/ ; the-entropy-tree.g8hh.com.cn/ | [xiaosunmath/the-entropy-tree](https://github.com/xiaosunmath/the-entropy-tree) ✅  |
| 996 | 2025春节树 (The Spring Festival Tree 2025 v2) | — | qqqe308.github.io/The-Spring-Festival-Tree-2025/ ; the-spring-festival-tree-20252.g8hh.com.cn/ | [qqqe308/The-Spring-Festival-Tree-2025](https://github.com/qqqe308/The-Spring-Festival-Tree-2025) ✅  |
| 1005 | 膨胀树 (Expanta Num) | — | cjm2006.github.io/ExpantaNum/ ; expanta-num.g8hh.com.cn/ | [cjm2006/ExpantaNum](https://github.com/cjm2006/ExpantaNum) ✅  |
| 1006 | 元元树 (Prestreestuck Metameta Rewritten) | — | qwqe308.github.io/prestreestuck-metameta-rewritten/ ; prestreestuck-metameta-rewritten.g8hh.com.cn/ | [qwqe308/prestreestuck-metameta-rewritten](https://github.com/qwqe308/prestreestuck-metameta-rewritten) ✅  |
| 1071 | 重生树重制版 (The Rebirth Tree Rewritten) | — | brandly123.github.io/Rebirth-Tree-Rewritten/ ; gltyx.github.io/rebirth-tree-rewritten/ (+1) | [brandly123/Rebirth-Tree-Rewritten](https://github.com/brandly123/Rebirth-Tree-Rewritten) ✅  |
| 1144 | 千禧树 (The Millennium Tree) | — | qwqe198.github.io/The-Millennium-Tree/ ; catfish-in-a-nutshell.github.io/The-Millennium-Tree/ (+1) | [qwqe198/The-Millennium-Tree](https://github.com/qwqe198/The-Millennium-Tree) ✅ (+1 more repos)  |
| 1290 | 2026愚人节树 (The Prestige Chain NG) | — | qwqe198.github.io/the-prestige-chain-ng/ ; yu-ren-jie-tree.g8hh.com.cn/ | [qwqe198/the-prestige-chain-ng](https://github.com/qwqe198/the-prestige-chain-ng) ✅  |

## 3. Modified GitHub forks with verified live play links (not already listed above)

Found by checking the top-200 starred forks of Acamaeda/The-Modding-Tree: `js/mod.js` differs from the template AND `https://{owner}.github.io/{repo}/` serves a game. Sorted by stars.

| Game (in-game modInfo.name) | Stars | Play | GitHub |
|---|---|---|---|
| Plague Tree (Vorona Cirus Treesease) | 4 | c0v1d-9119361.github.io/The-Plague-Tree/ ✅ | [c0v1d-9119361/The-Plague-Tree](https://github.com/c0v1d-9119361/The-Plague-Tree) ✅ |
| The Septenary Forest | 3 | Yrahcaz7.github.io/The-Septenary-Forest/ ✅ | [Yrahcaz7/The-Septenary-Forest](https://github.com/Yrahcaz7/The-Septenary-Forest) ✅ |
| RTXT25.Github.io | 3 | RTXT25.github.io/RTreeXTree/ ✅ | [RTXT25/RTreeXTree](https://github.com/RTXT25/RTreeXTree) ✅ |
| The Incrementreeverse | 2 | pg132.github.io/The-Modding-Tree/ ✅ | [pg132/The-Modding-Tree](https://github.com/pg132/The-Modding-Tree) ✅ |
| 编年史树 | 2 | catfish-in-a-nutshell.github.io/The-Chronicle-Tree/ ✅ | [catfish-in-a-nutshell/The-Chronicle-Tree](https://github.com/catfish-in-a-nutshell/The-Chronicle-Tree) ✅ |
| The Point Tree | 2 | p-u.github.io/The-Point-Tree/ ✅ | [p-u/The-Point-Tree](https://github.com/p-u/The-Point-Tree) ✅ |
| The Lime Upgrade Tree | 2 | mirc3a22000.github.io/the-lime-upgrade-tree/ ✅ | [mirc3a22000/the-lime-upgrade-tree](https://github.com/mirc3a22000/the-lime-upgrade-tree) ✅ |
| The Stardust Tree | 1 | okamii17.github.io/Prestige-Tree-Stardust/ ✅ | [okamii17/Prestige-Tree-Stardust](https://github.com/okamii17/Prestige-Tree-Stardust) ✅ |
| The Camellia Tree | 1 | TheCamelliaTree.github.io/The-Camellia-Tree-Rewritten/ ✅ | [TheCamelliaTree/The-Camellia-Tree-Rewritten](https://github.com/TheCamelliaTree/The-Camellia-Tree-Rewritten) ✅ |
| The Question Tree | 1 | ArkSayCode.github.io/The-Question-Tree/ ✅ | [ArkSayCode/The-Question-Tree](https://github.com/ArkSayCode/The-Question-Tree) ✅ |
| The Element Tree | 1 | ArmeKnockedOut.github.io/the-element-tree/ ✅ | [ArmeKnockedOut/the-element-tree](https://github.com/ArmeKnockedOut/the-element-tree) ✅ |
| The PP Tree | 1 | SIGMA-HOPEDY.github.io/The-PP-Tree/ ✅ | [SIGMA-HOPEDY/The-PP-Tree](https://github.com/SIGMA-HOPEDY/The-PP-Tree) ✅ |
| BSED Tree | 1 | OhManLolLol.github.io/BSED-Tree/ ✅ | [OhManLolLol/BSED-Tree](https://github.com/OhManLolLol/BSED-Tree) ✅ |
| The Final Tree | 1 | tekpixels.github.io/The-Final-Tree/ ✅ | [tekpixels/The-Final-Tree](https://github.com/tekpixels/The-Final-Tree) ✅ |
| The Florr io Tree | 1 | d909RCA.github.io/The-Florr-io-Tree/ ✅ | [d909RCA/The-Florr-io-Tree](https://github.com/d909RCA/The-Florr-io-Tree) ✅ |
| The Low Taper Fade Tree | 1 | epicstatbattles.github.io/Low-Taper-Fade/ ✅ | [epicstatbattles/Low-Taper-Fade](https://github.com/epicstatbattles/Low-Taper-Fade) ✅ |
| The Quantum Tree | 1 | haram0614.github.io/The-Modding-Tree/ ✅ | [haram0614/The-Modding-Tree](https://github.com/haram0614/The-Modding-Tree) ✅ |
| The Cookie Tree | 1 | thecoolcookie366.github.io/The-Modding-Tree/ ✅ | [thecoolcookie366/The-Modding-Tree](https://github.com/thecoolcookie366/The-Modding-Tree) ✅ |
| TearonQ's tree | 1 | QnoraeT.github.io/The-Modding-Tree/ ✅ | [QnoraeT/The-Modding-Tree](https://github.com/QnoraeT/The-Modding-Tree) ✅ |
| My Experience Tree Rebuilt | 1 | hervioletness.github.io/My-Experience-Tree/ ✅ | [hervioletness/My-Experience-Tree](https://github.com/hervioletness/My-Experience-Tree) ✅ |
| The ??? Tree | 1 | xiao7sanlian.github.io/The-Better-Modding-Tree/ ✅ | [xiao7sanlian/The-Better-Modding-Tree](https://github.com/xiao7sanlian/The-Better-Modding-Tree) ✅ |
| The Element Tree | 1 | hahaha622.github.io/The-Element-Tree/ ✅ | [hahaha622/The-Element-Tree](https://github.com/hahaha622/The-Element-Tree) ✅ |
| The Tree Tree | 1 | aShorterName.github.io/Modhub/ ✅ | [aShorterName/Modhub](https://github.com/aShorterName/Modhub) ✅ |
| The FYSC Tree | 1 | liquidcashews.github.io/the-fysc-tree/ ✅ | [liquidcashews/the-fysc-tree](https://github.com/liquidcashews/the-fysc-tree) ✅ |
| The Doors Tree | 1 | ThePrestigeTreeGuy.github.io/The-Modding-Tree/ ✅ | [ThePrestigeTreeGuy/The-Modding-Tree](https://github.com/ThePrestigeTreeGuy/The-Modding-Tree) ✅ |
| The Game Tree | 1 | shenmi124.github.io/The-Game-Tree/ ✅ | [shenmi124/The-Game-Tree](https://github.com/shenmi124/The-Game-Tree) ✅ |
| tree of jjt | 1 | evilbocchi.github.io/Absolutely-Not-Tree-of-JJT/ ✅ | [evilbocchi/Absolutely-Not-Tree-of-JJT](https://github.com/evilbocchi/Absolutely-Not-Tree-of-JJT) ✅ |
| The GeomeTree Dash | 1 | XxverycoolusernametotallynotoverusedxX.github.io/The-Geome-Tree-Dash/ ✅ | [XxverycoolusernametotallynotoverusedxX/The-Geome-Tree-Dash](https://github.com/XxverycoolusernametotallynotoverusedxX/The-Geome-Tree-Dash) ✅ |
| The ??? Tree | 0 | 2048io-png.github.io/The-SI-Tree/ ✅ | [2048io-png/The-SI-Tree](https://github.com/2048io-png/The-SI-Tree) ✅ |
| The ??? Tree | 0 | psp39353926.github.io/My-Tree/ ✅ | [psp39353926/My-Tree](https://github.com/psp39353926/My-Tree) ✅ |
| The Video Coin Tree | 0 | masutaki.github.io/videocointree/ ✅ | [masutaki/videocointree](https://github.com/masutaki/videocointree) ✅ |
| The Normal Tree | 0 | e205-idle-beta.github.io/normaltree.github.io/ ✅ | [e205-idle-beta/normaltree.github.io](https://github.com/e205-idle-beta/normaltree.github.io) ✅ |
| The 5 hours Tree | 0 | TheEveryonePinger.github.io/The-Modding-Tree/ ✅ | [TheEveryonePinger/The-Modding-Tree](https://github.com/TheEveryonePinger/The-Modding-Tree) ✅ |

## 4. Historical early-era modlist (yhvr.me/pt/mods.html, ~2020)

Status codes from the source page: f = finished, a = active (as of 2020), p = planned, i = included elsewhere, d = deleted/unmaintained. Glitch.me-hosted games have no GitHub repository and may vanish.

| Game | Author | Status | Play | GitHub |
|---|---|---|---|---|
| The Gamedev Tree | thepaperpilot | f | http://thepaperpilot.org/gamedevtree/ ❌ | custom: thepaperpilot.org |
| The Incrementreeverse | pg132 | f | http://raw.githack.com/pg132/The-Modding-Tree/master/index.html ❌ | [pg132/The-Modding-Tree](https://github.com/pg132/The-Modding-Tree) ✅ |
| PT:Rewritten | despacit, jacorb (YES! the guy who made the original) | a | http://raw.githack.com/AbitofTetration/Prestige-Tree-Rewritten/master/ ❌ | [AbitofTetration/Prestige-Tree-Rewritten](https://github.com/AbitofTetration/Prestige-Tree-Rewritten) ❌ |
| TreeQuest | smiley | a | http://raw.githack.com/IEmory/TreeQuest/master/ ❌ | [IEmory/TreeQuest](https://github.com/IEmory/TreeQuest) ✅ |
| Plauge Tree | zsefbhuk1(?) | a | raw.githack.com/c0v1d-9119361/The-Modding-Tree/master/index.html ❌ | [c0v1d-9119361/The-Modding-Tree](https://github.com/c0v1d-9119361/The-Modding-Tree) ✅ |
| Shenanigans Tree | Holy Broly | p | xxxolegxxx.github.io/Shenanigans-Tree/ ✅ | [xxxolegxxx/Shenanigans-Tree](https://github.com/xxxolegxxx/Shenanigans-Tree) ✅ |
| Incrementali Tree | despacit | p | abitoftetration.github.io/Incrementali-Tree/ ✅ | [abitoftetration/Incrementali-Tree](https://github.com/abitoftetration/Incrementali-Tree) ✅ |
| The Prestige Forest | unpingabot | p | thedev3l0per.github.io/The-Prestige-Forest/ ❌ | [thedev3l0per/The-Prestige-Forest](https://github.com/thedev3l0per/The-Prestige-Forest) ❌ |
| The Basic Tree | gapples2 | p | raw.githack.com/gapples2/The-Modding-Tree/master/index.html ❌ | [gapples2/The-Modding-Tree](https://github.com/gapples2/The-Modding-Tree) ✅ |
| Prestige Tree Stardust | okamii | p | okamii17.github.io/Prestige-Tree-Stardust/ ✅ | [okamii17/Prestige-Tree-Stardust](https://github.com/okamii17/Prestige-Tree-Stardust) ✅ |
| The PG Tree | pg132 | i | http://raw.githack.com/pg132/The-Modding-Tree/thepgtree/index.html ❌ | [pg132/The-Modding-Tree](https://github.com/pg132/The-Modding-Tree) ✅ |
| <unnamed> | Pimgd | i | raw.githack.com/Pimvgd/The-Modding-Tree/master/index.html ❌ | [Pimvgd/The-Modding-Tree](https://github.com/Pimvgd/The-Modding-Tree) ✅ |
| The Candy Tree (only one layer, don't be dissapointed) | Acamaeda | i | raw.githack.com/Acamaeda/Candy-Tree/master/index.html ❌ | [Acamaeda/Candy-Tree](https://github.com/Acamaeda/Candy-Tree) ✅ |
| AltTPT (the first mod 😔) | yhvr | i | alttpt.glitch.me/ ❌ | custom: alttpt.glitch.me |

## 5. Modified forks with no verified hosting (source available)

These forks are confirmed modified (their `js/mod.js` differs from the template) but no live GitHub Pages site was found. Useful as code to study; unplayable as-is unless you serve the repo locally.

| Repo | Stars | In-game name |
|---|---|---|
| 3k5m/The-Modding-Tree | 3 | The Hyperdimensions Tree |
| CoolBoris/The-Galactic-Tree | 3 | The Galactic Tree |
| TurkeyA2317/The-yunigopoh-Tree | 3 | j̶͔̝̫̹̥̲̰̦̞͕̤̪̋̔͐̊̾̂̐̓̏̀̾̃̄͒́̓̈̃̇̊̏͌̔͐̚͜͠h̴̺͍͂̓̏̈́̓̓x̵́̎̐͝... |
| epicanemone28/The-Dust-Tree | 2 | The dust-Tree |
| FlowismG/The-Flowism-Tree | 1 | The Flowism Tree |
| snakeandre/Constellation-Tree | 1 | The Constellation Tree |
| luziang233/The-lianqiqi-Tree | 1 | 史上最强炼气期树 |
| Sundex1/The-Modding-Tree | 1 | The Puzzle Tree |
| chipgeekjr/The-Modding-Tree | 1 | The Synergism Tree |
| Billywlm/The-Modding-Tree | 1 | The Prestige Chain Rewritten |
| Efsoone/The-Modding-Tree | 1 | The Rune Incrememtal |
| dreadfighter/The-Dataminers-Tree | 1 | The Chemistry Lab |
| Nathan90100Github/The-Modding-Tree | 1 | The ??? Tree |
| skralg/The-Modding-Tree | 1 | The RPG Tree |
| CudjzikxmxR/The-Rainbow-Void-Tree | 1 | The Rainbow Void Tree |
| Sersseras/The-Modding-Tree | 1 | The Algebra Tree |
| fifthless/The-Library-Tree | 1 | The Portal Tree |
| SSLOdd1/The-Test-Tree | 1 | The Test Tree |
| qorwogns0909/The-Modding-Tree | 1 | 한글 Tree |
| HiGamezYT/The-Modding-Tree | 1 | The ??? Tree |
| Dr-Smite/The-Modding-Tree | 0 | The Function Tree |
| shade-V7/The-Modding-Tree | 0 | The Blossom Tree |
| new2git-cloud/The-Modding-Tree | 0 | My first tmt mod |
| GMoney7738/The-Modding-Tree | 0 | The Waluigi Tree |
| Safryan1/The-Modding-Tree | 0 | The Sigma Tree |
| Houdem1327/The-Modding-Tree | 0 | The Village |
| p1kachu1070/faucet | 0 | faucet |
| Rachael-Man/The-Modding-Tree | 0 | The Testing Tree |
| Beespoon22/The-Easter-Tree | 0 | The Easter Tree |
| Aimless121432/Tree-of-my-friends | 0 | The test Tree |
| AppleLord1/The-Modding-Tree | 0 | The Dotree |
| yh2023wyh/The-Modding-Tree | 0 | The Code Tester Tree by yhoi |
| Zuggo/The-Modding-Tree | 0 | The Grass Cutting Incremental Tree |
| RobertoWatt/The-Modding-Tree | 0 | Stages of Number Tree |
| gabriel-tolentino/placeholdernametree | 0 | The Niche Tree |
| Shocks654/The-Infinite-Horizon-Tree | 0 | The Infinite Horizon Tree |
| INVADERover/The-Modding-Tree-level | 0 | Level Tree |
| DeathDaNoob/The-Modding-Tree-Ultimate-Ascension- | 0 | The Ultimate Ascension Tree |
| peleserg/The-Modding-Tree | 0 | The Alch Tree |
| MrredsharkFan/The-Exponential-Tree | 0 | The ??? Tree |
| Gyrnw/The-Modding-Tree | 0 | The Generic Tutorial Tree |
| SirNooberson/The-Modding-Tree | 0 | The Unoriginal Prestige Tree |
| UltraJohn/The-Modding-Tree | 0 | Dragon ball |
| Dopler64/The-Modding-Tree | 0 | The Gubbins Tree |
| wxh0814/The-Modding-Tree | 0 | The Idle Tree |
| conbann1/The-Growing-tree | 0 | The Growing Tree |
| ballsreal/The-Feline-Shrine-Tree | 0 | The Feline Shrine Tree |
| makeatree/The-Modding-Tree | 0 | The Tree of Tree |
| thesoftiee/Now-I | 0 | The Now I Tree |
| Krzystof5/Depression-tree | 0 | The Depression Tree |
| epicness1582/The-Modding-Tree | 0 | The sussy Tree |
| person9683/The-Exponential-Tree | 0 | The Exponential Tree |
| OwoPolice90/The-Modding-Tree | 0 | The Power Tree |
| JustAStupidGuyLol/Jasgs-Boring-Tree | 0 | Jasg's Boring Tree |
| elisvoboda42066/The-Modding-Tree | 0 | The Amazing Tree |
| gvnfc3/The-Modding-Tree | 0 | The Counting Tree |
| KhronoLabyrinth/The-Modding-Tree | 0 | The Chrome Tree |
| Encepha11us/The-Modding-Tree | 0 | The Alchemists Student |
| Patchoy0131/The-Virus-Tree | 0 | The Virus Tree |
| GrandieresFlorian/The-Modding-Tree | 0 | The Basic Tree |
| avatarofwrath420/The-Modding-Tree | 0 | Apotheosis Incremental |
| Siphon2D/The-Modding-Tree | 0 | The Oiia Tree |
| Summerlovesyou/The-Modding-Tree | 0 | The ChiChi Tree |
| Oztiks469/The-Modding-Tree | 0 | The Disintegration Tree |
| KeroCore/The-Modding-Tree | 0 | The Wack Tree |

## 6. Observations relevant to generating games

- **One repo, multiple games:** pg132/The-Modding-Tree hosts *The Incrementreeverse* (branch `master`), *The Tree Of Life* (branch `evolution`) and *The Prestige Chain* (branch `buyables`) — branching-per-game is a common TMT hosting pattern.
- **Framework drift:** some entries listed on tree-catalog sites are actually **Profectus** games (thepaperpilot's successor framework to TMT), e.g. *Planar Pioneers*. Check `js/mod.js` vs `src/mod/index.ts` when studying code.
- **Chinese community ecosystem:** gityx.com curates Chinese-localized and Chinese-original trees; mirror accounts `g1tyx`/`gityxs`/`gltyx` (GitHub) and `g8hh` re-host games for China access. The original repo is always the author's own account (e.g. `qwqe198`, `qwqe308`, `qqqe308`, `loader3229`, `linlei0102`, `shenmi124`, `angrystar6k` are prolific original authors).
- **What survives:** GitHub Pages games from 2020-2022 era are frequently dead (❌); g8hh mirrors keep many of them playable. When the skill needs reference material, prefer entries with ✅ on both play and GitHub.
- **Quality signals observed in top-rated entries** (for the future game-generation skill): deep layer counts with meaningful automation milestones (挖矿增量页 9.6, 马力欧创作家2树 8.1, 高考树 8.0, Incrementreeverse 8.0), novel twists on the prestige formula (1点数=1层级树 7.8, 胀树 7.7), and strong theming (春节树 series, 天体增量树 7.3).

---

*Raw crawl data (fully merged dataset, per-fork verdicts, extracted link batches, verification log) lives in the source project repository — not shipped with this skill.*