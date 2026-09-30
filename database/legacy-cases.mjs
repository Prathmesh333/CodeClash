// Additional edge and scale cases for the six original ranked questions.
export function extendLegacy(problems) {
  const get = (id) => problems.find((p) => p.id === id).tests;
  const add = (id, input, output) => get(id).push({ input, output: String(output) + '\n' });
  for (let n = 2; n <= 18; n++) {
    const a = Array.from({ length: n }, (_, i) => i * 2 + 10);
    a[0] = -1;
    a[n - 1] = 1;
    add('signal-pair', `${n} 0\n${a.join(' ')}\n`, `0 ${n - 1}`);
    const b = Array.from({ length: n }, (_, i) => ((i * 7) % 13) - 8);
    for (const k of [1, n])
      add(
        'quiet-window',
        `${n} ${k}\n${b.join(' ')}\n`,
        Math.max(
          ...Array.from({ length: n - k + 1 }, (_, i) =>
            b.slice(i, i + k).reduce((x, y) => x + y, 0),
          ),
        ),
      );
    const missing = n % 3,
      crates = Array.from({ length: n + 1 }, (_, i) => i)
        .filter((x) => x !== missing)
        .reverse();
    add('missing-crate', `${n}\n${crates.join(' ')}\n`, missing);
    const sorted = Array.from({ length: n }, (_, i) => Math.floor(i / 2) - 3),
      target = (n % 7) - 3;
    const index = sorted.findIndex((x) => x >= target);
    add('sorted-checkpoint', `${n} ${target}\n${sorted.join(' ')}\n`, index < 0 ? n : index);
  }
  for (const [s, out] of [
    ['(', 'NO'],
    [')', 'NO'],
    [')(', 'NO'],
    ['(()', 'NO'],
    ['())(', 'NO'],
    ['((()))', 'YES'],
    ['()', 'YES'],
    ['('.repeat(5000) + ')'.repeat(5000), 'YES'],
  ])
    add('balanced-beacons', s + '\n', out);
  for (const s of [
    'z',
    'zz',
    'abac',
    'aabbc',
    'cabb',
    'a'.repeat(5000) + 'b',
    'abcabc',
    'abcdefghijklmnopqrstuvwxyz',
  ])
    add(
      'unique-frequency',
      s + '\n',
      [...s].findIndex((c) => s.indexOf(c) === s.lastIndexOf(c)),
    );
  add('signal-pair', '2 1000000000\n500000000 500000000\n', '0 1');
  add('quiet-window', '5000 5000\n' + Array(5000).fill(-10000).join(' ') + '\n', -50000000);
  add(
    'missing-crate',
    '5000\n' + Array.from({ length: 5000 }, (_, i) => i + 1).join(' ') + '\n',
    0,
  );
  add('sorted-checkpoint', '5000 1000000000\n' + Array(5000).fill(1000000000).join(' ') + '\n', 0);
}
