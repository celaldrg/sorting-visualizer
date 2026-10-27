/**
 * English and Turkish UI strings plus a tiny translate helper.
 * Keys are flat ("stats.swaps"); `{name}` marks a placeholder.
 * Algorithm strings use the ids from algorithms.js ("algo.heap.name").
 * @module i18n
 */

/** Supported languages; the first one is the default. */
export const LANGUAGES = Object.freeze(['en', 'tr']);

/** Language used until the visitor picks another one. */
export const DEFAULT_LANGUAGE = 'en';

const en = {
  'app.title': 'Sorting Visualizer',
  'lang.next': 'TR',
  'lang.switch': 'Türkçeye geç',
  'sound.toggle': 'Comparison sounds',

  'settings.title': 'Settings',
  'settings.algorithm': 'Algorithm',
  'settings.pattern': 'Input pattern',
  'settings.size': 'Array size',
  'settings.sizeValue': '{size} bars',
  'settings.speed': 'Speed',
  'settings.speedValue': '{rate} steps/s',
  'settings.speedValueLong': '{rate} steps per second',

  'pattern.random': 'Random',
  'pattern.nearlySorted': 'Nearly sorted',
  'pattern.reversed': 'Reversed',
  'pattern.fewUnique': 'Few unique values',

  'controls.label': 'Playback',
  'controls.shuffle': 'Shuffle',
  'controls.reset': 'Reset',
  'controls.play': 'Play',
  'controls.pause': 'Pause',
  'controls.replay': 'Replay',
  'controls.step': 'Step',

  'stats.comparisons': 'Comparisons',
  'stats.swaps': 'Swaps',
  'stats.writes': 'Writes',
  'stats.steps': 'Steps',

  'status.ready': 'Ready',
  'status.playing': 'Playing',
  'status.paused': 'Paused',
  'status.done': 'Sorted',

  'chart.label': 'Bar chart of {count} values being sorted',
  'progress.label': 'Progress',
  'legend.label': 'Color key',
  'legend.compare': 'Compare',
  'legend.swap': 'Swap',
  'legend.write': 'Write',
  'legend.sorted': 'Sorted',

  'step.idle': 'Press Play or Step to begin',
  'step.compare': 'Compare a[{i}] = {a} with a[{j}] = {b}',
  'step.comparePivot': 'Pointer stops at the pivot a[{i}] = {a}',
  'step.swap': 'Swap a[{i}] ↔ a[{j}]',
  'step.write': 'Write a[{i}] ← {value}',
  'step.sortedOne': 'a[{i}] is in its final place',
  'step.sortedMany': '{count} bars reached their final places',
  'step.done': 'Sorted in {steps} steps',

  'hint.space': 'Space',
  'hint.playPause': 'play / pause',
  'hint.step': 'step',
  'hint.shuffle': 'shuffle',
  'hint.touch': 'Tap the chart to play or pause',

  'info.title': 'How it works',
  'info.best': 'Best',
  'info.average': 'Average',
  'info.worst': 'Worst',
  'info.space': 'Extra space',
  'info.stableYes': 'Stable: equal values keep their input order.',
  'info.stableNo': 'Not stable: equal values may change order.',

  'symbol.n': 'n = number of elements',
  'symbol.k': 'k = value range (max − min + 1)',
  'symbol.d': 'd = number of digits',
  'symbol.b': 'b = base (10)',

  'footer.source': 'Source on GitHub',

  'algo.bubble.name': 'Bubble sort',
  'algo.bubble.desc':
    'Sweeps the array again and again, swapping neighbors that are out of order, so large values bubble up to the end. Stops after a pass without swaps.',
  'algo.insertion.name': 'Insertion sort',
  'algo.insertion.desc':
    'Grows a sorted part on the left: each new element slides left past larger neighbors until it fits. Very fast on nearly sorted input.',
  'algo.selection.name': 'Selection sort',
  'algo.selection.desc':
    'Finds the smallest remaining element and swaps it to the front of the unsorted part. Few swaps, but always about n²/2 comparisons.',
  'algo.shell.name': 'Shell sort',
  'algo.shell.desc':
    'Runs insertion sort over shrinking gaps (…, 40, 13, 4, 1), so distant elements move early and the final pass has little left to do.',
  'algo.merge.name': 'Merge sort',
  'algo.merge.desc':
    'Splits the array in half, sorts each half recursively, then merges the two sorted halves through a buffer and writes them back.',
  'algo.quickLomuto.name': 'Quick sort (Lomuto)',
  'algo.quickLomuto.desc':
    'Takes the last element as the pivot, gathers smaller values to its left and drops the pivot into its final place, then sorts both sides. Slows to n² on sorted input.',
  'algo.quickHoare.name': 'Quick sort (Hoare)',
  'algo.quickHoare.desc':
    'Takes the middle element as the pivot; two pointers walk towards each other and swap pairs that sit on the wrong side. Makes fewer swaps than Lomuto.',
  'algo.heap.name': 'Heap sort',
  'algo.heap.desc':
    'Builds a max-heap from the array, then repeatedly moves the largest element to the end and repairs the heap.',
  'algo.counting.name': 'Counting sort',
  'algo.counting.desc':
    'Counts how often each value occurs and writes the elements back in order, without a single comparison. Very fast when the value range k is small.',
  'algo.radix.name': 'Radix sort (LSD)',
  'algo.radix.desc':
    'Sorts digit by digit, starting with the ones, using a stable counting pass for each digit; it never compares two elements.',
};

const tr = {
  'app.title': 'Sıralama Görselleştirici',
  'lang.next': 'EN',
  'lang.switch': 'Switch to English',
  'sound.toggle': 'Karşılaştırma sesleri',

  'settings.title': 'Ayarlar',
  'settings.algorithm': 'Algoritma',
  'settings.pattern': 'Girdi düzeni',
  'settings.size': 'Dizi boyutu',
  'settings.sizeValue': '{size} çubuk',
  'settings.speed': 'Hız',
  'settings.speedValue': '{rate} adım/sn',
  'settings.speedValueLong': 'saniyede {rate} adım',

  'pattern.random': 'Rastgele',
  'pattern.nearlySorted': 'Neredeyse sıralı',
  'pattern.reversed': 'Ters sıralı',
  'pattern.fewUnique': 'Az sayıda farklı değer',

  'controls.label': 'Oynatma',
  'controls.shuffle': 'Karıştır',
  'controls.reset': 'Sıfırla',
  'controls.play': 'Oynat',
  'controls.pause': 'Duraklat',
  'controls.replay': 'Tekrar',
  'controls.step': 'Adım',

  'stats.comparisons': 'Karşılaştırma',
  'stats.swaps': 'Takas',
  'stats.writes': 'Yazma',
  'stats.steps': 'Adım',

  'status.ready': 'Hazır',
  'status.playing': 'Oynatılıyor',
  'status.paused': 'Duraklatıldı',
  'status.done': 'Sıralandı',

  'chart.label': 'Sıralanan {count} değerin çubuk grafiği',
  'progress.label': 'İlerleme',
  'legend.label': 'Renk açıklaması',
  'legend.compare': 'Karşılaştırma',
  'legend.swap': 'Takas',
  'legend.write': 'Yazma',
  'legend.sorted': 'Sıralı',

  'step.idle': 'Başlamak için Oynat’a ya da Adım’a bas',
  'step.compare': 'Karşılaştır: a[{i}] = {a} ile a[{j}] = {b}',
  'step.comparePivot': 'İşaretçi pivotta durur: a[{i}] = {a}',
  'step.swap': 'Takas: a[{i}] ↔ a[{j}]',
  'step.write': 'Yaz: a[{i}] ← {value}',
  'step.sortedOne': 'a[{i}] son yerinde',
  'step.sortedMany': '{count} çubuk son yerine oturdu',
  'step.done': '{steps} adımda sıralandı',

  'hint.space': 'Boşluk',
  'hint.playPause': 'oynat / duraklat',
  'hint.step': 'adım',
  'hint.shuffle': 'karıştır',
  'hint.touch': 'Oynatmak ya da duraklatmak için grafiğe dokun',

  'info.title': 'Nasıl çalışır',
  'info.best': 'En iyi',
  'info.average': 'Ortalama',
  'info.worst': 'En kötü',
  'info.space': 'Ek bellek',
  'info.stableYes': 'Kararlı: eşit değerler girdi sırasını korur.',
  'info.stableNo': 'Kararlı değil: eşit değerlerin sırası değişebilir.',

  'symbol.n': 'n = eleman sayısı',
  'symbol.k': 'k = değer aralığı (en büyük − en küçük + 1)',
  'symbol.d': 'd = basamak sayısı',
  'symbol.b': 'b = taban (10)',

  'footer.source': 'Kaynak kodu GitHub’da',

  'algo.bubble.name': 'Kabarcık sıralaması',
  'algo.bubble.desc':
    'Diziyi baştan sona tekrar tekrar tarar ve sırası bozuk komşuları takas eder; büyük değerler kabarcık gibi sona yükselir. Takassız geçen bir turdan sonra durur.',
  'algo.insertion.name': 'Eklemeli sıralama',
  'algo.insertion.desc':
    'Soldaki sıralı bölümü büyütür: her yeni eleman, kendinden büyük komşularını geçip yerine oturana kadar sola kayar. Neredeyse sıralı girdide çok hızlıdır.',
  'algo.selection.name': 'Seçmeli sıralama',
  'algo.selection.desc':
    'Kalan elemanların en küçüğünü bulur ve sıralanmamış bölümün başına takas eder. Az takas yapar ama her zaman yaklaşık n²/2 karşılaştırma gerekir.',
  'algo.shell.name': 'Shell sıralaması',
  'algo.shell.desc':
    'Giderek küçülen aralıklarla (…, 40, 13, 4, 1) eklemeli sıralama yapar; uzaktaki elemanlar erkenden yerine yaklaşır, son tura az iş kalır.',
  'algo.merge.name': 'Birleştirmeli sıralama',
  'algo.merge.desc':
    'Diziyi ikiye böler, her yarıyı özyinelemeyle sıralar, sonra sıralı iki yarıyı bir ara bellekte birleştirip geri yazar.',
  'algo.quickLomuto.name': 'Hızlı sıralama (Lomuto)',
  'algo.quickLomuto.desc':
    'Son elemanı pivot seçer, küçük değerleri soluna toplar ve pivotu son yerine koyar; ardından iki tarafı ayrı ayrı sıralar. Sıralı girdide n²’ye yavaşlar.',
  'algo.quickHoare.name': 'Hızlı sıralama (Hoare)',
  'algo.quickHoare.desc':
    'Ortadaki elemanı pivot seçer; iki işaretçi birbirine doğru ilerler ve yanlış taraftaki çiftleri takas eder. Lomuto’dan daha az takas yapar.',
  'algo.heap.name': 'Yığın sıralaması',
  'algo.heap.desc':
    'Diziden bir maksimum yığın (max-heap) kurar, sonra en büyük elemanı tekrar tekrar sona alıp yığını onarır.',
  'algo.counting.name': 'Sayma sıralaması',
  'algo.counting.desc':
    'Her değerin kaç kez geçtiğini sayar ve elemanları sırayla geri yazar; hiç karşılaştırma yapmaz. Değer aralığı k küçükken çok hızlıdır.',
  'algo.radix.name': 'Radix sıralaması (LSD)',
  'algo.radix.desc':
    'Birler basamağından başlayarak basamak basamak sıralar; her basamak için kararlı bir sayma geçişi yapar, iki elemanı hiç karşılaştırmaz.',
};

/** String tables by language. */
export const STRINGS = Object.freeze({ en: Object.freeze(en), tr: Object.freeze(tr) });

/**
 * Returns `value` when it is a supported language code, otherwise the default.
 * @param {unknown} value Candidate code, e.g. a saved preference.
 * @returns {string} 'en' or 'tr'.
 */
export function resolveLanguage(value) {
  return LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * The language the toggle button switches to.
 * @param {string} lang Current language.
 * @returns {string}
 */
export function otherLanguage(lang) {
  return resolveLanguage(lang) === 'en' ? 'tr' : 'en';
}

/**
 * Looks up a string and fills its `{name}` placeholders.
 * Missing keys fall back to English, then to the key itself.
 * @param {string} lang Language code.
 * @param {string} key String key.
 * @param {Object<string, string|number>} [params] Placeholder values.
 * @returns {string}
 */
export function translate(lang, key, params = {}) {
  const template = lookup(STRINGS[resolveLanguage(lang)], key) ?? lookup(STRINGS.en, key) ?? key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}

function lookup(table, key) {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}
