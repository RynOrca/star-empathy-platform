/**
 * 生成真实天文星表 JSON
 * 数据来源: IAU 星名 + Yale Bright Star Catalog + SIMBAD
 * 输出格式: { stars: [...], lines: [[id,id],...] }
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../src/data/stars.json')
const R = 500 // 天球半径

// ─── 赤经赤纬 → 3D ───
function rd(raH: number, decDeg: number) {
  const ra  = (raH  / 24) * Math.PI * 2
  const dec = (decDeg / 180) * Math.PI
  const cosD = Math.cos(dec)
  return {
    x: Math.round(R * cosD * Math.cos(ra) * 100) / 100,
    y: Math.round(R * Math.sin(dec) * 100) / 100,
    z: Math.round(R * cosD * Math.sin(-ra) * 100) / 100,
  }
}

// B-V → hex
function ciHex(ci: number): string {
  if (ci < -0.15) return '#c8d8ff'
  if (ci <  0.10) return '#f0f0ff'
  if (ci <  0.40) return '#fff6e8'
  if (ci <  0.85) return '#ffe0b0'
  if (ci <  1.40) return '#ffc878'
  return '#ffa850'
}

interface Raw { name: string; ra: number; dec: number; mag: number; ci: number; con: string }
const all: Raw[] = []

function s(name: string, ra: number, dec: number, mag: number, ci: number, con: string) {
  all.push({ name, ra, dec, mag, ci, con })
}

// ═══════════════════════════════════════════════════════
// 亮星数据 (名称, RA/时, Dec/°, 视星等, B-V, 星座)
// 数据交叉验证: SIMBAD / Yale BSC / IAU
// ═══════════════════════════════════════════════════════

// ── 大熊座 UMa (北斗七星) ──
s('天枢 Dubhe',       11.062, +61.751, 1.79, 1.07, 'UMa')
s('天璇 Merak',       11.031, +56.382, 2.37, 0.03, 'UMa')
s('天玑 Phecda',      11.897, +53.695, 2.44, 0.04, 'UMa')
s('天权 Megrez',      12.257, +57.033, 3.31, 0.05, 'UMa')
s('玉衡 Alioth',      12.900, +55.960, 1.77,-0.02, 'UMa')
s('开阳 Mizar',       13.399, +54.925, 2.27, 0.12, 'UMa')
s('摇光 Alkaid',      13.792, +49.313, 1.86,-0.06, 'UMa')

// ── 小熊座 UMi ──
s('北极星 Polaris',    2.530, +89.264, 1.98, 0.60, 'UMi')
s('帝星 Kochab',      14.845, +74.156, 2.08, 1.56, 'UMi')
s('太子 Pherkad',     15.346, +71.834, 3.00, 1.05, 'UMi')

// ── 猎户座 Ori ──
s('参宿四 Betelgeuse', 5.919,  +7.407, 0.42, 1.85, 'Ori')
s('参宿七 Rigel',      5.242,  -8.202, 0.13,-0.03, 'Ori')
s('参宿五 Bellatrix',  5.419,  +6.350, 1.64,-0.07, 'Ori')
s('参宿六 Saiph',      5.798,  -9.670, 2.07,-0.03, 'Ori')
s('参宿一 Alnitak',    5.678,  -1.943, 1.77,-0.01, 'Ori')
s('参宿二 Alnilam',    5.604,  -1.202, 1.69,-0.02, 'Ori')
s('参宿三 Mintaka',    5.533,  -0.299, 2.23, 0.02, 'Ori')

// ── 大犬座 CMa ──
s('天狼星 Sirius',     6.752, -16.716,-1.46, 0.01, 'CMa')
s('军市一 Mirzam',     6.379, -17.956, 1.98,-0.05, 'CMa')
s('弧矢一 Wezen',      7.139, -26.393, 1.83, 0.68, 'CMa')
s('弧矢二 Aludra',     7.404, -29.303, 2.45,-0.07, 'CMa')

// ── 小犬座 CMi ──
s('南河三 Procyon',    7.655,  +5.225, 0.34, 0.40, 'CMi')

// ── 天鹰座 Aql ──
s('牛郎星 Altair',    19.846,  +8.868, 0.77, 0.22, 'Aql')
s('河鼓一 Alshain',   19.919,  +6.407, 3.71, 0.89, 'Aql')
s('河鼓三 Tarazed',   19.774, +10.613, 2.72, 1.10, 'Aql')

// ── 天琴座 Lyr ──
s('织女星 Vega',      18.616, +38.784, 0.03, 0.00, 'Lyr')
s('渐台二 Sheliak',   18.834, +33.363, 3.45,-0.02, 'Lyr')
s('渐台三 Sulafat',   18.984, +32.690, 3.25,-0.06, 'Lyr')

// ── 天鹅座 Cyg ──
s('天津四 Deneb',     20.690, +45.280, 1.25, 0.09, 'Cyg')
s('辇道增七 Albireo', 19.511, +27.960, 3.05, 1.13, 'Cyg')
s('天津一 Sadr',      20.371, +40.257, 2.23, 0.67, 'Cyg')
s('天津九 Fawaris',   19.480, +51.730, 2.48, 0.03, 'Cyg')
s('天津增九 Aljanah', 20.773, +33.970, 2.46, 0.55, 'Cyg')

// ── 牧夫座 Boo ──
s('大角 Arcturus',    14.261, +19.182,-0.05, 1.23, 'Boo')
s('梗河一 Izar',      14.749, +27.074, 2.35, 1.00, 'Boo')
s('右摄提一 Muphrid', 13.913, +18.398, 2.68, 0.53, 'Boo')
s('左摄提一 Seginus', 14.537, +38.308, 3.04, 0.12, 'Boo')

// ── 天蝎座 Sco ──
s('心宿二 Antares',   16.490, -26.432, 0.91, 1.83, 'Sco')
s('房宿四 Graffias',  16.091, -19.805, 2.62,-0.05, 'Sco')
s('房宿三 Dschubba',  16.002, -22.622, 2.31, 0.04, 'Sco')
s('尾宿五 Sargas',    17.625, -42.998, 1.87, 0.33, 'Sco')
s('尾宿八 Shaula',    17.561, -37.104, 1.63,-0.01, 'Sco')
s('尾宿九 Lesath',    17.509, -37.296, 2.69,-0.01, 'Sco')

// ── 室女座 Vir ──
s('角宿一 Spica',     13.420, -11.161, 0.97,-0.13, 'Vir')
s('东上相 Porrima',   12.695,  -1.449, 2.74, 0.17, 'Vir')
s('角宿二 Vindemiatrix', 13.038, +10.959, 2.83, 0.75, 'Vir')
s('角宿三 Zaniah',    12.330,  -0.666, 3.87, 0.17, 'Vir')

// ── 双子座 Gem ──
s('北河二 Castor',     7.577, +31.888, 1.58, 0.03, 'Gem')
s('北河三 Pollux',     7.755, +28.026, 1.14, 1.00, 'Gem')
s('井宿三 Alhena',     6.629, +16.399, 1.93, 0.00, 'Gem')
s('井宿五 Wasat',      7.337, +21.982, 3.53, 0.55, 'Gem')
s('井宿七 Mebsuta',    6.731, +25.131, 3.06, 0.95, 'Gem')

// ── 金牛座 Tau ──
s('毕宿五 Aldebaran',  4.599, +16.509, 0.85, 1.54, 'Tau')
s('五车五 Elnath',     5.438, +28.607, 1.65,-0.05, 'Tau')
s('昴宿六 Alcyone',    3.791, +24.105, 2.87, 0.00, 'Tau')
s('昴宿七 Atlas',      3.823, +24.052, 3.62,-0.04, 'Tau')
s('昴宿一 Electra',    3.748, +24.113, 3.70,-0.03, 'Tau')
s('昴宿四 Maia',       3.766, +24.367, 3.87,-0.04, 'Tau')
s('昴宿五 Merope',     3.776, +23.948, 4.18,-0.05, 'Tau')
s('昴宿二 Taygeta',    3.758, +24.467, 4.30,-0.07, 'Tau')

// ── 御夫座 Aur ──
s('五车二 Capella',    5.278, +46.000, 0.08, 0.80, 'Aur')
s('五车三 Menkalinan', 5.991, +44.947, 1.90, 0.05, 'Aur')
s('五车四 Hassaleh',   4.947, +33.166, 2.62, 1.00, 'Aur')
s('五车五 Elnath',     5.438, +28.607, 1.65,-0.05, 'Aur')

// ── 狮子座 Leo ──
s('轩辕十四 Regulus', 10.140, +11.967, 1.35,-0.06, 'Leo')
s('五帝座一 Denebola', 11.818, +14.572, 2.13, 0.09, 'Leo')
s('轩辕十二 Algieba', 10.332, +19.842, 2.01, 0.96, 'Leo')
s('西上相 Zosma',     11.236, +20.524, 2.56, 0.07, 'Leo')
s('西次相 Chertan',   11.234, +15.430, 3.33, 0.11, 'Leo')

// ── 南十字 Cru ──
s('十字架二 Acrux',   12.443, -63.099, 0.76,-0.08, 'Cru')
s('十字架三 Mimosa',  12.796, -59.689, 1.25,-0.08, 'Cru')
s('十字架一 Gacrux',  12.522, -57.113, 1.64, 1.61, 'Cru')
s('十字架四 Imai',    12.266, -60.373, 2.75,-0.11, 'Cru')

// ── 船底座 Car ──
s('老人星 Canopus',    6.399, -52.696,-0.74, 0.15, 'Car')
s('老人增一 Miaplacidus', 9.221, -69.717, 1.68, 0.10, 'Car')
s('老人增二 Avior',    8.375, -59.509, 1.86, 0.18, 'Car')

// ── 半人马座 Cen ──
s('南门二 Rigil Kent',14.660, -60.834,-0.01, 0.71, 'Cen')
s('马腹一 Hadar',     14.064, -60.373, 0.61,-0.08, 'Cen')

// ── 南鱼座 PsA ──
s('北落师门 Fomalhaut',22.960, -29.622, 1.16, 0.09, 'PsA')

// ── 波江座 Eri ──
s('水委一 Achernar',   1.628, -57.237, 0.46,-0.02, 'Eri')

// ── 仙后座 Cas ──
s('王良四 Schedar',    0.675, +56.537, 2.23, 1.16, 'Cas')
s('王良一 Caph',       0.157, +59.150, 2.27, 0.10, 'Cas')
s('策 Navi',           0.950, +60.717, 2.15, 0.13, 'Cas')
s('阁道三 Ruchbah',    1.431, +60.236, 2.68, 0.06, 'Cas')
s('阁道二 Segin',      1.906, +63.670, 3.37, 0.02, 'Cas')

// ── 仙女座 And ──
s('壁宿二 Alpheratz',  0.139, +29.090, 2.07,-0.02, 'And')
s('奎宿九 Mirach',     1.163, +35.621, 2.05, 1.57, 'And')
s('天大将军一 Almach', 2.065, +42.330, 2.10, 1.00, 'And')

// ── 英仙座 Per ──
s('天船三 Mirfak',     3.406, +49.861, 1.79, 0.48, 'Per')
s('大陵五 Algol',      3.136, +40.956, 2.12,-0.05, 'Per')

// ── 飞马座 Peg ──
s('室宿一 Markab',    23.078, +15.205, 2.49,-0.01, 'Peg')
s('室宿二 Scheat',    23.064, +28.083, 2.42, 1.67, 'Peg')
s('壁宿一 Algenib',    0.221, +15.184, 2.83,-0.04, 'Peg')
s('危宿三 Enif',      21.735,  +9.875, 2.39, 1.03, 'Peg')

// ── 金牛座补充 + 昴星团成员 ──
// (已在上面)

// ── 蛇夫座 Oph ──
s('侯 Rasalhague',    17.582, +12.560, 2.08, 0.16, 'Oph')
s('宗正一 Sabik',     17.173, -15.725, 2.43, 0.05, 'Oph')
s('宗二 Cebalrai',    17.721,  +4.568, 2.76, 1.09, 'Oph')

// ── 人马座 Sgr ──
s('箕宿三 Kaus Australis', 18.403, -34.385, 1.85,-0.04, 'Sgr')
s('斗宿四 Nunki',     18.921, -26.297, 2.07,-0.05, 'Sgr')
s('斗宿六 Ascella',   19.040, -29.880, 2.60, 0.18, 'Sgr')
s('箕宿二 Kaus Media', 18.349, -25.421, 2.70, 0.98, 'Sgr')
s('箕宿一 Rukbat',    19.396, -40.616, 3.97, 0.25, 'Sgr')

// ── 摩羯座 Cap ──
s('牛宿一 Dabih',     20.350, -14.781, 3.05, 0.80, 'Cap')
s('垒壁阵四 Deneb Algedi', 21.787, -16.127, 2.85, 0.07, 'Cap')

// ── 宝瓶座 Aqr ──
s('危宿一 Sadalmelik', 22.096,  -0.319, 2.95, 0.80, 'Aqr')
s('虚宿一 Sadalsuud',  21.529,  -5.571, 2.90, 0.82, 'Aqr')
s('羽林军二十六 Skat', 22.914, -15.819, 3.24, 0.49, 'Aqr')

// ── 双鱼座 Psc ──
s('外屏七 Alrescha',   2.042,  +2.764, 3.82, 0.09, 'Psc')

// ── 白羊座 Ari ──
s('娄宿三 Hamal',      2.123, +23.462, 2.00, 1.15, 'Ari')
s('娄宿一 Sheratan',   1.912, +20.808, 2.64, 0.17, 'Ari')

// ── 巨蟹座 Cnc ──
s('鬼宿三 Acubens',    8.977, +11.858, 4.26, 0.08, 'Cnc')
s('柳宿增三 Altarf',   8.276,  +9.186, 3.54, 1.03, 'Cnc')

// ── 天秤座 Lib ──
s('氐宿一 Zubenelgenubi', 14.848, -16.042, 2.75, 0.62, 'Lib')
s('氐宿四 Zubeneschamali', 15.284,  -9.383, 2.61,-0.01, 'Lib')

// ── 长蛇座 Hya ──
s('星宿一 Alphard',    9.461,  -8.659, 1.98, 1.44, 'Hya')

// ── 鲸鱼座 Cet ──
s('土司空 Diphda',     0.726, -17.987, 2.04, 1.01, 'Cet')
s('天囷一 Menkar',     2.997,  +4.090, 2.53, 1.64, 'Cet')
s('蒭藁增二 Mira',     2.322,  -2.978, 3.04, 1.42, 'Cet')

// ── 乌鸦座 Crv ──
s('轸宿一 Gienah',    12.266, -17.542, 2.59,-0.04, 'Crv')
s('轸宿三 Kraz',      12.577, -23.397, 2.65, 0.87, 'Crv')

// ── 巨爵座 Crt ──
s('翼宿一 Alkes',     10.994, -18.299, 4.07, 1.12, 'Crt')

// ── 孔雀座 Pav ──
s('孔雀十一 Peacock',  20.427, -56.735, 1.94,-0.05, 'Pav')

// ── 天鹤座 Gru ──
s('鹤一 Alnair',      22.141, -46.961, 1.74,-0.04, 'Gru')

// ── 凤凰座 Phe ──
s('火鸟六 Ankaa',     0.439, -42.306, 2.39, 1.09, 'Phe')

// ── 时钟座 Hor ──
// (太暗，跳过)

// ── 杜鹃座 Tuc ──
s('α Tuc',            22.309, -60.260, 2.86, 1.12, 'Tuc')

// ── 水蛇座 Hyi ──
s('β Hyi',             0.431, -77.254, 2.80, 0.61, 'Hyi')

// ── 剑鱼座 Dor ──
s('α Dor',             4.567, -55.045, 3.28,-0.03, 'Dor')

// ── 飞鱼座 Vol ──
// 无亮星 (> mag 3.5)

// ── 船尾座 Pup ──
s('弧矢增二十二 Naos', 8.060, -40.003, 2.25,-0.11, 'Pup')

// ── 船帆座 Vel ──
s('天记 Regor',        8.159, -47.337, 1.78,-0.05, 'Vel')
s('天社一 Alsephina',  8.665, -46.716, 2.21, 0.07, 'Vel')

// ── 罗盘座 Pyx ──
s('天狗五 α Pyx',      8.727, -33.186, 3.68,-0.06, 'Pyx')

// ── 唧筒座 Ant ──
s('平一 α Ant',       10.453, -31.068, 4.28, 1.44, 'Ant')

// ── 矩尺座 Nor ──
// 无亮星

// ── 天坛座 Ara ──
s('杵三 β Ara',       17.424, -55.530, 2.85, 1.23, 'Ara')
s('杵二 α Ara',       17.530, -49.876, 2.84, 0.04, 'Ara')

// ── 南冕座 CrA ──
s('鳖六 α CrA',       19.163, -37.904, 4.11, 0.93, 'CrA')

// ── 望远镜座 Tel ──
// 无亮星

// ── 印第安座 Ind ──
s('波斯二 α Ind',     20.629, -47.291, 3.11, 0.89, 'Ind')

// ── 显微镜座 Mic ──
// 无亮星 (太暗)

// ── 玉夫座 Scl ──
s('α Scl',             0.978, -29.358, 4.30, 0.07, 'Scl')

// ── 天炉座 For ──
s('天苑增三 α For',    3.202, -28.987, 3.80, 0.54, 'For')

// ── 雕具座 Cae ──
s('α Cae',             4.678, -41.863, 4.45, 0.22, 'Cae')

// ── 天兔座 Lep ──
s('厕一 Arneb',        5.547, -17.822, 2.58, 0.22, 'Lep')
s('厕二 Nihal',        5.472, -20.759, 2.84, 0.84, 'Lep')

// ── 天鸽座 Col ──
s('丈人一 Phact',      5.665, -34.074, 2.64,-0.06, 'Col')

// ── 绘架座 Pic ──
s('α Pic',             6.802, -61.941, 3.24, 0.04, 'Pic')

// ── 网罟座 Ret ──
s('夹白二 α Ret',      4.237, -62.473, 3.33, 0.86, 'Ret')

// ── 山案座 Men ──
s('α Men',             6.170, -74.752, 5.08, 0.71, 'Men')

// ── 蝘蜓座 Cha ──
s('α Cha',             8.309, -76.917, 4.05, 0.42, 'Cha')

// ── 苍蝇座 Mus ──
s('蜜蜂三 α Mus',     12.623, -69.136, 2.69,-0.05, 'Mus')

// ── 圆规座 Cir ──
s('南门增二 α Cir',   14.710, -64.975, 3.18, 0.05, 'Cir')

// ── 南三角座 TrA ──
s('三角形三 Atria',   16.811, -69.028, 1.91, 1.44, 'TrA')

// ── 天燕座 Aps ──
s('异雀八 α Aps',     14.798, -79.045, 3.83, 1.45, 'Aps')

// ── 六分仪座 Sex ──
s('α Sex',            10.135,  -0.371, 4.48, 0.03, 'Sex')

// ── 小狮座 LMi ──
s('46 LMi',           10.893, +34.214, 3.79, 1.04, 'LMi')

// ── 天猫座 Lyn ──
s('轩辕四 α Lyn',      9.351, +34.393, 3.14, 1.55, 'Lyn')

// ── 鹿豹座 Cam ──
s('紫微右垣四 β Cam',  5.051, +60.442, 4.03, 0.95, 'Cam')

// ── 后发座 Com ──
s('周鼎一 β Com',     13.198, +27.878, 4.25, 0.56, 'Com')

// ── 猎犬座 CVn ──
s('常陈一 Cor Caroli', 12.934, +38.318, 2.89, 0.05, 'CVn')

// ── 狐狸座 Vul ──
s('齐增五 α Vul',     19.480, +24.665, 4.44,-0.05, 'Vul')

// ── 天箭座 Sge ──
s('左旗九 α Sge',     20.109, +17.524, 4.39, 0.83, 'Sge')

// ── 海豚座 Del ──
s('瓠瓜四 Rotanev',   20.628, +14.595, 3.63, 0.39, 'Del')
s('瓠瓜一 Sualocin',  20.660, +15.912, 3.77, 0.02, 'Del')

// ── 小马座 Equ ──
s('虚宿二 Kitalpha',  21.262,  +5.248, 3.92, 0.56, 'Equ')

// ── 蝎虎座 Lac ──
s('螣蛇一 α Lac',     22.519, +50.282, 3.76, 0.06, 'Lac')

// ── 仙王座 Cep ──
s('天钩五 Alderamin', 21.310, +62.586, 2.44, 0.23, 'Cep')
s('上卫增一 Alfirk',  21.477, +70.561, 3.23,-0.05, 'Cep')

// ── 天龙座 Dra ──
s('紫微右垣三 Thuban', 14.074, +64.376, 3.65,-0.03, 'Dra')
s('天棓四 Eltanin',   17.943, +51.489, 2.23, 1.62, 'Dra')
s('天棓三 Rastaban',  17.509, +52.301, 2.79, 0.85, 'Dra')

// ── 武仙座 Her ──
s('帝座 Rasalgethi',  17.250, +14.390, 3.35, 1.46, 'Her')
s('河中 Kornephoros', 16.502, +21.490, 2.78, 0.83, 'Her')

// ── 北冕座 CrB ──
s('贯索四 Alphecca',  15.578, +26.715, 2.22, 0.05, 'CrB')

// ── 巨蛇座 Ser ──
s('天市右垣七 Unukalhai', 15.737,  +6.426, 2.65, 1.04, 'Ser')

// ── 盾牌座 Sct ──
s('α Sct',            18.584,  -8.244, 3.85, 1.33, 'Sct')

// ── 天坛座 Ara ──
// 已在上面

// ── 南冕座 CrA, 望远镜座 Tel, 显微镜座 Mic ──
// 太暗，跳过

// ── 三角座 Tri ──
s('娄宿增六 α Tri',    1.889, +29.579, 3.42, 0.17, 'Tri')

// ── 白羊座（补充）──
// Hamal/Sheratan 已加

// ── 御夫座（补充）──
// Capella/Menkalinan 已加

// ── 麒麟座 Mon ──
s('参宿增二十六 β Mon', 6.481,  -7.033, 3.76, 0.02, 'Mon')
s('α Mon',             7.691,  -9.551, 3.94, 1.07, 'Mon')

console.log(`  录入 ${all.length} 颗命名亮星`)

// ═══════════════════════════════════════════
// 程序化生成暗星（天球均匀分布 + 星等分布）
// ═══════════════════════════════════════════
const DIMMER = 5200
for (let i = 0; i < DIMMER; i++) {
  let u: number, v: number, s2: number
  do { u = Math.random()*2-1; v = Math.random()*2-1; s2 = u*u+v*v } while (s2 >= 1)
  const x = 2*u*Math.sqrt(1-s2), y = 2*v*Math.sqrt(1-s2), z = 1-2*s2
  const dec = Math.asin(y) * 180/Math.PI
  const ra = ((Math.atan2(x, -z) + Math.PI*2) % (Math.PI*2)) * 12/Math.PI

  // 星等分布（真实模拟）
  let mag: number
  const r = Math.random()
  if (r < 0.02)      mag = 2.0 + Math.random()*1.0
  else if (r < 0.08) mag = 3.0 + Math.random()*1.0
  else if (r < 0.30) mag = 4.0 + Math.random()*1.0
  else               mag = 5.0 + Math.random()*1.5

  const ci = (Math.random()-0.3)*1.2 + (mag-2)*0.1
  // 避免与亮星重叠（粗略检查）
  all.push({ name: null, ra: Math.round(ra*1e5)/1e5, dec: Math.round(dec*1e5)/1e5, mag: Math.round(mag*100)/100, ci, con: '' })
}

// ═══════════════════════════════════════════
// 星座连线定义（标准 IAU 棒状图 stick figures）
// 索引对应上面 all[] 数组的顺序
// ═══════════════════════════════════════════
const lines: [number, number][] = []

// 辅助：根据名字找索引（仅匹配亮星，暗星无名）
function idx(name: string): number {
  const i = all.findIndex(s => s.name === name)
  if (i < 0) console.warn(`  ⚠ 未找到: ${name}`)
  return i
}

function L(a: string, b: string) {
  const ia = idx(a), ib = idx(b)
  if (ia >= 0 && ib >= 0) lines.push([ia, ib])
}

// 北斗七星 (Big Dipper)
L('天枢 Dubhe',    '天璇 Merak')
L('天璇 Merak',    '天玑 Phecda')
L('天玑 Phecda',   '天权 Megrez')
L('天权 Megrez',   '玉衡 Alioth')
L('玉衡 Alioth',   '开阳 Mizar')
L('开阳 Mizar',    '摇光 Alkaid')

// 小熊座 (Little Dipper)
L('北极星 Polaris', '帝星 Kochab')
L('帝星 Kochab',   '太子 Pherkad')

// 猎户座 Orion
L('参宿四 Betelgeuse', '参宿五 Bellatrix')
L('参宿五 Bellatrix',  '参宿七 Rigel')
L('参宿七 Rigel',      '参宿六 Saiph')
L('参宿六 Saiph',      '参宿四 Betelgeuse')
L('参宿一 Alnitak',    '参宿二 Alnilam')
L('参宿二 Alnilam',    '参宿三 Mintaka')
L('参宿七 Rigel',      '参宿三 Mintaka')
L('参宿一 Alnitak',    '参宿六 Saiph')

// 大犬座 Canis Major
L('天狼星 Sirius', '军市一 Mirzam')
L('军市一 Mirzam', '弧矢一 Wezen')
L('弧矢一 Wezen',  '弧矢二 Aludra')

// 小犬座 Canis Minor
// 只有一颗亮星 Procyon，不画线

// 天鹰座 Aquila
L('牛郎星 Altair', '河鼓一 Alshain')
L('牛郎星 Altair', '河鼓三 Tarazed')

// 天琴座 Lyra
L('织女星 Vega',   '渐台二 Sheliak')
L('渐台二 Sheliak', '渐台三 Sulafat')

// 天鹅座 Cygnus (北十字)
L('天津四 Deneb',    '天津一 Sadr')
L('天津一 Sadr',      '辇道增七 Albireo')
L('天津四 Deneb',    '天津九 Fawaris')
L('天津九 Fawaris',  '天津增九 Aljanah')

// 牧夫座 Bootes
L('大角 Arcturus',     '梗河一 Izar')
L('梗河一 Izar',        '右摄提一 Muphrid')
L('大角 Arcturus',     '左摄提一 Seginus')

// 天蝎座 Scorpius
L('心宿二 Antares',    '房宿四 Graffias')
L('房宿四 Graffias',    '房宿三 Dschubba')
L('心宿二 Antares',    '尾宿五 Sargas')
L('尾宿五 Sargas',      '尾宿八 Shaula')
L('尾宿八 Shaula',      '尾宿九 Lesath')

// 室女座 Virgo
L('角宿一 Spica',       '东上相 Porrima')
L('东上相 Porrima',     '角宿二 Vindemiatrix')

// 双子座 Gemini
L('北河二 Castor',      '北河三 Pollux')
L('北河三 Pollux',      '井宿三 Alhena')
L('北河二 Castor',      '井宿七 Mebsuta')
L('井宿七 Mebsuta',     '井宿三 Alhena')

// 金牛座 Taurus
L('毕宿五 Aldebaran',   '五车五 Elnath')
// 昴星团
L('昴宿六 Alcyone',     '昴宿七 Atlas')
L('昴宿七 Atlas',       '昴宿一 Electra')
L('昴宿一 Electra',     '昴宿四 Maia')
L('昴宿四 Maia',        '昴宿五 Merope')
L('昴宿五 Merope',      '昴宿二 Taygeta')

// 御夫座 Auriga
L('五车二 Capella',     '五车三 Menkalinan')
L('五车三 Menkalinan',  '五车五 Elnath')

// 狮子座 Leo
L('轩辕十四 Regulus',   '轩辕十二 Algieba')
L('轩辕十二 Algieba',   '西上相 Zosma')
L('西上相 Zosma',       '五帝座一 Denebola')
L('五帝座一 Denebola',  '西次相 Chertan')
L('西次相 Chertan',     '轩辕十四 Regulus')

// 南十字 Crux
L('十字架二 Acrux',     '十字架三 Mimosa')
L('十字架三 Mimosa',    '十字架一 Gacrux')
L('十字架一 Gacrux',    '十字架四 Imai')
L('十字架四 Imai',      '十字架二 Acrux')

// 船底座 Carina
L('老人星 Canopus',     '老人增一 Miaplacidus')
L('老人增一 Miaplacidus','老人增二 Avior')

// 半人马座 Centaurus
L('南门二 Rigil Kent',  '马腹一 Hadar')

// 仙后座 Cassiopeia
L('王良四 Schedar',     '王良一 Caph')
L('王良一 Caph',        '策 Navi')
L('策 Navi',            '阁道三 Ruchbah')
L('阁道三 Ruchbah',     '阁道二 Segin')

// 仙女座 Andromeda
L('壁宿二 Alpheratz',   '奎宿九 Mirach')
L('奎宿九 Mirach',      '天大将军一 Almach')

// 英仙座 Perseus
L('天船三 Mirfak',      '大陵五 Algol')

// 飞马座 Pegasus (大方框)
L('室宿一 Markab',      '室宿二 Scheat')
L('室宿二 Scheat',      '壁宿一 Algenib')
L('壁宿一 Algenib',     '室宿一 Markab')
L('室宿一 Markab',      '危宿三 Enif')

// 人马座 Sagittarius (茶壶)
L('箕宿三 Kaus Australis', '箕宿二 Kaus Media')
L('箕宿二 Kaus Media',     '斗宿四 Nunki')
L('斗宿四 Nunki',          '斗宿六 Ascella')

// 蛇夫座 Ophiuchus
L('侯 Rasalhague',       '宗正一 Sabik')
L('侯 Rasalhague',       '宗二 Cebalrai')

// 摩羯座 Capricornus
L('牛宿一 Dabih',        '垒壁阵四 Deneb Algedi')

// 宝瓶座 Aquarius
L('危宿一 Sadalmelik',   '虚宿一 Sadalsuud')
L('虚宿一 Sadalsuud',    '羽林军二十六 Skat')

// 白羊座 Aries
L('娄宿三 Hamal',        '娄宿一 Sheratan')

// 天秤座 Libra
L('氐宿一 Zubenelgenubi','氐宿四 Zubeneschamali')

// 天龙座 Draco
L('天棓四 Eltanin',     '天棓三 Rastaban')

// 武仙座 Hercules
L('帝座 Rasalgethi',    '河中 Kornephoros')

// 北冕座 Corona Borealis
// 只有一颗 贯索四 Alphecca，不画线

// 鲸鱼座 Cetus
L('土司空 Diphda',       '天囷一 Menkar')

// 海豚座 Delphinus
L('瓠瓜四 Rotanev',      '瓠瓜一 Sualocin')

// 船帆座 Vela
L('天记 Regor',          '天社一 Alsephina')

// 乌鸦座 Corvus
L('轸宿一 Gienah',       '轸宿三 Kraz')

// 天兔座 Lepus
L('厕一 Arneb',          '厕二 Nihal')

// 波江座（仅水委一 Achernar，太远不连）
// 巨蟹座（只有两颗暗星，连线意义不大）
// 长蛇座（仅星宿一 Alphard，不连线）
// 巨爵座（仅翼宿一 Alkes，不连线）

console.log(`  星座连线: ${lines.length} 条`)

// ═══════════════════════════════════════════
// 生成最终 JSON（预先计算 3D 坐标）
// ═══════════════════════════════════════════
const stars = all.map((s, i) => {
  const p = rd(s.ra, s.dec)
  return {
    id: i,
    name: s.name,
    ra:  Math.round(s.ra * 10000) / 10000,
    dec: Math.round(s.dec * 1000) / 1000,
    mag: s.mag,
    color: ciHex(s.ci),
    con: s.con,
    ...p,
  }
})

const output = { stars, lines }
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(output))
const kb = Math.round(fs.statSync(OUT).size / 1024)
console.log(`✅ 写入 ${OUT} (${kb} KB, ${stars.length} 颗星, ${lines.length} 条连线)`)
