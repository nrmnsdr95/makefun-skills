/* The three charts are hand laid-out; all distances are in chart units. */
(() => {
  'use strict';
  const L = globalThis.Lumen ??= {};
  L.chart = { width: 1240, height: 540, margin: 23, harbor: { x: 144, y: 270, r: 79 }, breakwater: [45, 272, 57, 54] };
  L.rig = { range: 174, slots: 3, link: 43, hull: 3, speed: 254, boost: 2.8, berth: 0.62 };

  L.tides = [
    {
      name: 'Glasswater', bearing: 'N 041°', call: 'A quiet start', goal: 4, seconds: 74, seed: 14,
      briefing: 'Recover four lights. A full tow pays more, but give the reefs a wide berth.',
      palette: { deep: '#071d29', water: '#124344', bank: '#337660', ink: '#112f38', foam: '#7ddebd', sky: '#8cf7d4', shoal: '#438a77' },
      reefs: [
        [277, 87, 78, 36], [407, 168, 53, 40], [432, 405, 97, 55], [665, 350, 63, 46],
        [743, 102, 96, 47], [924, 254, 55, 65], [1049, 437, 123, 43], [1161, 122, 49, 31],
        [42, 459, 71, 44], [1176, 329, 17, 19], [568, 17, 51, 30],
      ],
      lamps: [[346, 290], [492, 258], [560, 198], [620, 409], [770, 275], [1005, 179, 2], [1072, 310]],
      wakes: [[829, 391, 83, 58, 0.58, 1.1, 22]],
      streams: [], fronts: [], labels: [[260, 140, 'COPPER SHOAL'], [807, 464, 'OUTER SOUND']],
    },
    {
      name: 'Split Reefs', bearing: 'E 093°', call: 'Mind the needle', goal: 5, seconds: 83, seed: 43,
      briefing: 'The Needle is a tight passage. Follow the current or take the long way with a full tow.',
      palette: { deep: '#121b36', water: '#263b61', bank: '#536586', ink: '#222d49', foam: '#9bcdf7', sky: '#b6d6ff', shoal: '#526d9a' },
      reefs: [
        [241, 61, 68, 50], [353, 445, 100, 61], [457, 155, 91, 84], [531, 385, 94, 87],
        [734, 63, 99, 32], [805, 334, 101, 55], [1024, 182, 55, 51], [1061, 453, 95, 51],
        [1210, 274, 63, 85], [679, 500, 35, 20], [35, 403, 43, 26],
      ],
      lamps: [[292, 304], [342, 210], [589, 246], [712, 160, 2], [710, 412], [922, 245], [973, 361], [1120, 112, 2]],
      wakes: [[688, 263, 100, 56, 0.79, 2.2, 24], [991, 372, 118, 40, -0.66, 0.04, 22]],
      streams: [[519, 251, 191, 65, 73, 8], [899, 431, 155, 71, -47, -33]],
      fronts: [], labels: [[494, 274, 'THE NEEDLE'], [851, 128, 'FAR SOUND']],
    },
    {
      name: 'Black Current', bearing: 'SE 151°', call: 'The last light', goal: 6, seconds: 91, seed: 82,
      briefing: 'Copper rings warn of a surge. Wait outside them or boost through before they close.',
      palette: { deep: '#16172e', water: '#3d344e', bank: '#625269', ink: '#282438', foam: '#ceb09b', sky: '#dcc3f8', shoal: '#776075' },
      reefs: [
        [279, 112, 77, 51], [378, 402, 79, 63], [554, 165, 73, 49], [643, 342, 62, 83],
        [840, 98, 117, 52], [888, 282, 65, 48], [1084, 401, 122, 55], [1170, 168, 38, 63],
        [745, 506, 49, 28], [111, 464, 57, 31],
      ],
      lamps: [[306, 270], [428, 241], [508, 321], [472, 89], [709, 153, 2], [847, 418], [985, 174, 2], [1108, 264], [1044, 308], [751, 394]],
      wakes: [[612, 261, 141, 50, 0.64, 0.9, 23], [944, 359, 133, 69, -0.76, 1.5, 25], [1075, 142, 66, 47, 0.9, 1, 22]],
      streams: [[504, 301, 146, 78, 52, 33], [798, 226, 154, 65, -68, 28], [975, 445, 158, 94, -59, -16]],
      fronts: [[521, 326, 109, 8.4], [838, 202, 103, 13.1], [1012, 329, 126, 17.4]],
      labels: [[645, 66, 'NORTH PASS'], [647, 446, 'BELL GRAVE'], [951, 118, 'OUTER REACH']],
    },
  ];

  L.math = {
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    angleDelta: (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from)),
    random(seed) {
      return () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    },
    ellipseGap(x, y, [rx, ry, w, h], padding = 0) {
      return Math.hypot((x - rx) / (w + padding), (y - ry) / (h + padding));
    },
    crossesReef(from, to, reef, padding = 0) {
      const [x, y, w, h] = reef;
      const ax = (from.x - x) / (w + padding), ay = (from.y - y) / (h + padding);
      const dx = (to.x - from.x) / (w + padding), dy = (to.y - from.y) / (h + padding);
      const t = this.clamp(-(ax * dx + ay * dy) / (dx * dx + dy * dy || 1), 0, 1);
      return (ax + dx * t) ** 2 + (ay + dy * t) ** 2 < 1;
    },
  };
})();
