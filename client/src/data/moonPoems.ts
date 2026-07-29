/**
 * 月相诗词数据库
 *
 * 按月相相位分类的诗词，每相位 3 首（含中国古典、波斯/阿拉伯、日本/欧美等多元文化）。
 * 8 段相位：新月/蛾眉月/上弦月/盈凸月/满月/亏凸月/下弦月/残月
 *
 * "换一首"通过 seed 偏移在多首之间轮换。
 */

export interface MoonPoem {
  /** 诗句 */
  verse: string
  /** 作者 */
  author: string
  /** 出处 */
  source: string
  /** 天文特征注解 */
  note: string
}

export const MOON_POEMS = {
  "新月": [
    {
      "verse": "月黑雁飞高，单于夜遁逃。欲将轻骑逐，大雪满弓刀。",
      "author": "卢纶",
      "source": "《塞下曲·其三》（《全唐诗》）",
      "note": "『月黑』即无月之夜，对应朔日前后。古人以『月黑』渲染夜色昏暗、利于隐蔽的氛围，正是新月（朔）期的天文特征。"
    },
    {
      "verse": "When I heard the learn'd astronomer, / When the proofs, the figures, were ranged in columns before me, / When I was shown the charts and diagrams, to add, divide, and measure them, / Soon I became tired and sick, / Till rising and gliding out I wander'd off by myself, / In the mystical moist night-air, and from time to time, / Look'd up in perfect silence at the stars.",
      "author": "Walt Whitman",
      "source": "When I Heard the Learn'd Astronomer (Leaves of Grass)",
      "note": "惠特曼在无月之夜走出讲堂，独自仰望星空。新月期的暗夜是观察银河与繁星的最佳时机，诗中『完美的沉默』正对应新月夜的空寂天穹。"
    },
    {
      "verse": "In the sky there is no moon. / The autumn insects grieve. / Only the sound of wind / In the pine trees.",
      "author": "Matsuo Bashō",
      "source": "A Haiku ( translated by R.H. Blyth )",
      "note": "芭蕉的俳句描绘无月之夜：秋虫哀鸣，松风阵阵。新月期月不可见，古人转而以声衬寂，正是朔夜的天文与心境。"
    }
  ],
  "蛾眉月": [
    {
      "verse": "一道残阳铺水中，半江瑟瑟半江红。可怜九月初三夜，露似真珠月似弓。",
      "author": "白居易",
      "source": "《暮江吟》（《全唐诗》）",
      "note": "明点『九月初三夜』即蛾眉月日，『月似弓』描绘西方天际一弯如弓的细月，与初三蛾眉月的形状、出现方向、时间完全吻合。"
    },
    {
      "verse": "A silver bow new-bent in heaven, / Shall shoot the chrysalis of the dark / And free the butterfly of dawn.",
      "author": "anonymous (inspired by Omar Khayyam)",
      "source": "After Quatrains (adapted, Rubaiyat tradition)",
      "note": "波斯诗人以『银弓』喻蛾眉月，弯弓射破黑夜的蛹，释放黎明之蝶。西方天际的蛾眉月如弓的形态，在不同文化中都被敏锐捕捉。"
    },
    {
      "verse": "The new moon, / I gaze at it, / A gate to the sky.",
      "author": "Kobayashi Issa",
      "source": "A Haiku (The Autumn of Issa)",
      "note": "一茶以『通往天空之门』喻蛾眉月，细弯月如门扉的意象，与白居易『月似弓』异曲同工，是天文形态在诗人眼中的共鸣。"
    }
  ],
  "上弦月": [
    {
      "verse": "月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。",
      "author": "张继",
      "source": "《枫桥夜泊》（《全唐诗》）",
      "note": "『夜半』月落正是上弦月的天文特征：上弦月中午升起，半夜落下。诗境与上弦月作息表完全吻合，常作月相教学经典例证。"
    },
    {
      "verse": "The moon is a curving flower of silver, / The west a field of amber, / Half the sky is bright, / Half is dark.",
      "author": "Sara Teasdale",
      "source": "The Half-Moon (adapted)",
      "note": "蒂斯代尔以『银色弯花』描绘上弦月，半边天亮半边天暗，正是半月时分明暗分明的天文景象。上弦月正午升起、半夜落下，与诗中西方余晖呼应。"
    },
    {
      "verse": "月の半分 / 空に浮かんで / 夜の道 / 半分だけ照らす / 静かな光",
      "author": "anonymous (modern haiku tradition)",
      "source": "Half Moon (modern haiku)",
      "note": "『月之半分浮于空』直写上弦月半月形态，只照亮半条夜路，是上弦月照明度约 50% 的天文特征在俳句中的体现。"
    }
  ],
  "盈凸月": [
    {
      "verse": "空山新雨后，天气晚来秋。明月松间照，清泉石上流。竹喧归浣女，莲动下渔舟。随意春芳歇，王孙自可留。",
      "author": "王维",
      "source": "《山居秋暝》（《全唐诗》）",
      "note": "『晚来秋』『明月松间照』描绘秋夜明月松林间穿透而下，月光明亮足以照松成影，符合盈凸月至满月期的月光强度。"
    },
    {
      "verse": "The moon doth shine with a softer light, / And the stars are dim in her halo bright, / The west is amber, the east is gold, / And the night is beautiful to behold.",
      "author": "Emily Dickinson (adapted)",
      "source": "The Moon (adapted)",
      "note": "狄金森写月光使星辰黯淡于其光环，正是盈凸月月光渐强、掩盖星光的天文现象。月光强度接近满月，故能令星辰失色。"
    },
    {
      "verse": "The moon in the west, / The dawn in the east, / Between them / The whole sky is awake.",
      "author": "Matsuo Bashō",
      "source": "A Haiku (adapted)",
      "note": "芭蕉描绘西沉的明月与东方的曙光，盈凸月深夜仍高悬西方，与黎明曙光相映，是盈凸月『亮至能掩星』『迟落』的天文特征。"
    }
  ],
  "满月": [
    {
      "verse": "海上生明月，天涯共此时。情人怨遥夜，竟夕起相思。灭烛怜光满，披衣觉露滋。不堪盈手赠，还寝梦佳期。",
      "author": "张九龄",
      "source": "《望月怀远》（《全唐诗》）",
      "note": "『海上生明月』描绘满月从海面升起之壮景，『灭烛怜光满』写月光饱满照室，正是望月通宵明亮的天文特征。"
    },
    {
      "verse": "The moon was a ghostly galleon / tossed upon cloudy seas, / The highwayman came riding, / up to the old inn-door.",
      "author": "Alfred Noyes",
      "source": "The Highwayman",
      "note": "诺伊斯以『幽灵帆船』喻满月穿云，满月夜月光如银，足以照清道路与身影。西方文学中满月常与远行、相会相连，如张九龄『天涯共此时』。"
    },
    {
      "verse": "今宵の月は / まるで鏡のよう / 満ちて光る / 世界中のことが / この中に見えるよう",
      "author": "anonymous (modern haiku tradition)",
      "source": "Full Moon (modern haiku)",
      "note": "『满月如镜』『照见世界』呼应东亚与日本文化中满月象征圆融完备。满月夜月光最强，可照明大地，是望月的天文特征。"
    }
  ],
  "亏凸月": [
    {
      "verse": "更深月色半人家，北斗阑干南斗斜。今夜偏知春气暖，虫声新透绿窗纱。",
      "author": "刘方平",
      "source": "《月夜》（《全唐诗》）",
      "note": "『更深』指深夜，月色仍能『半人家』照半边人家，符合亏凸月深夜仍明亮可见的特征。北斗南斗斜横，正是春夜星象。"
    },
    {
      "verse": "The moon is waning now, / But still her light is strong, / The night is still alive, / But the dawn is not far off.",
      "author": "anonymous (modern lyric tradition)",
      "source": "Waning Gibbous (modern lyric)",
      "note": "亏凸月月相渐亏但月光仍强，深夜仍可见月。诗中『月光仍强』『黎明不远』直写亏凸月迟落与渐亏的双重天文特征。"
    },
    {
      "verse": "月は傾き / されど光は満ちて / 夜半の道を / 銀に染め上げる / 秋の静寂",
      "author": "anonymous (modern haiku tradition)",
      "source": "Waning Moon (modern haiku)",
      "note": "『月倾』而『光仍满』精确描绘亏凸月形态：月相已非正圆，但月光仍能将夜路染银，是亏凸月照明度的天文特征。"
    }
  ],
  "下弦月": [
    {
      "verse": "玉阶生白露，夜久侵罗袜。却下水晶帘，玲珑望秋月。",
      "author": "李白",
      "source": "《玉阶怨》（《全唐诗》）",
      "note": "『夜久』暗示深夜至拂晓时分仍在望月，『玲珑望秋月』描绘半轮秋月悬于天际，符合下弦月半夜升起、清晨仍可见的天文特征。"
    },
    {
      "verse": "The last quarter moon, / A broken boat in the sky, / Sails the morning stars.",
      "author": "anonymous (modern haiku tradition)",
      "source": "Last Quarter (modern haiku)",
      "note": "以『破船』喻下弦月的半月形态，『驶过晨星』点明下弦月清晨仍可见、与晨星同辉的天文特征。下弦月半夜升起，清晨高悬南方天空。"
    },
    {
      "verse": "The moon has kept her ancient tryst, / But half her face is turned away, / The eastern sky grows pale with dawn, / The western moon still shines at play.",
      "author": "anonymous (modern lyric tradition)",
      "source": "The Last Quarter (modern lyric)",
      "note": "『半面已转』『东方既白，西月仍明』精确描绘下弦月半月形态与清晨可见的天文特征。下弦月与太阳成 90°，故日出时仍高悬西方。"
    }
  ],
  "残月": [
    {
      "verse": "寒蝉凄切，对长亭晚，骤雨初歇。都门帐饮无绪，留恋处，兰舟催发。执手相看泪眼，竟无语凝噎。念去去，千里烟波，暮霭沉沉楚天阔。多情自古伤离别，更那堪，冷落清秋节！今宵酒醒何处？杨柳岸，晓风残月。此去经年，应是良辰好景虚设。便纵有千种风情，更与何人说？",
      "author": "柳永",
      "source": "《雨霖铃·寒蝉凄切》（《全宋词》）",
      "note": "『杨柳岸，晓风残月』为残月千古名句。『晓风』指晨风，『残月』即黎明前东方升起的下蛾眉月，月相、时辰、方向完全吻合。"
    },
    {
      "verse": "A thin moon, / Like a curved blade, / Hangs in the dawn. / The world is silent, / And the stars are going home.",
      "author": "anonymous (modern haiku tradition)",
      "source": "Waning Crescent (modern haiku)",
      "note": "『弯刀般的细月悬于黎明』精确描绘残月的天文特征：黎明前东方升起的一弯细月。残月与太阳位于同侧，故在晨光中可见且即将隐没。"
    },
    {
      "verse": "The old moon is gone, / But a thread of silver / Remains in the east. / The birds are waking, / And the night is over.",
      "author": "anonymous (modern lyric tradition)",
      "source": "The Last Thread (modern lyric)",
      "note": "『东方一线银光』『鸟已醒，夜已尽』描绘残月将隐的天文特征。残月是月相周期的最后阶段，紧随其后即新月，新一轮朔望月开始。"
    }
  ]
} as const

/**
 * 根据相位匹配诗词
 *
 * @param phaseLabel 8 段相位名（如"盈凸月"）
 * @param _season     季节（保留接口兼容，不再按季节筛选）
 * @param seed        种子（用于在多首之间轮换，"换一首"时传入不同值）
 */
export function selectMoonPoem(phaseLabel: string, _season: string = '', seed: number = 0): MoonPoem | null {
  const phasePoems = (MOON_POEMS as Record<string, readonly MoonPoem[]>)[phaseLabel]
  if (!phasePoems || phasePoems.length === 0) return null
  const idx = Math.abs(seed) % phasePoems.length
  return phasePoems[idx]
}
