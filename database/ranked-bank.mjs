// Project-authored ranked questions. Reference solutions and editorials stay server-side.
const starter =
  'import sys\n\ndef solve():\n    # Read standard input and print the answer.\n    pass\n\nif __name__ == "__main__":\n    solve()\n';
const fixture = (input, output) => ({ input, output: String(output) + '\n' });
const arrayInput = (a) => `${a.length}\n${a.join(' ')}\n`;
let state = 7919;
const integer = (lo, hi) => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return lo + (state % (hi - lo + 1));
};
const arrays = Array.from({ length: 24 }, () =>
  Array.from({ length: integer(1, 18) }, () => integer(-9, 9)),
);
const positive = arrays.map((a) => a.map((x) => Math.abs(x)));
function make(
  id,
  title,
  topic,
  difficulty,
  statement,
  inputFormat,
  outputFormat,
  constraints,
  cases,
  referenceSolution,
  explanation,
  time,
  space,
) {
  return {
    id,
    version: 1,
    title,
    topic,
    difficulty,
    statement,
    inputFormat,
    outputFormat,
    constraints,
    examples: cases.slice(0, 2).map((c) => ({ ...c })),
    tests: cases.slice(2),
    starterCode: starter,
    referenceSolution,
    editorial: { explanation, timeComplexity: time, spaceComplexity: space },
  };
}
const maximum = (a) => {
  let best = -Infinity;
  for (let i = 0; i < a.length; i++) {
    let sum = 0;
    for (let j = i; j < a.length; j++) {
      sum += a[j];
      best = Math.max(best, sum);
    }
  }
  return best;
};
const distinct = (s) => {
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    let seen = new Set();
    for (let j = i; j < s.length && !seen.has(s[j]); j++) {
      seen.add(s[j]);
      best = Math.max(best, seen.size);
    }
  }
  return best;
};
const next = (a) => a.map((v, i) => a.slice(i + 1).find((x) => x > v) ?? -1).join(' ');
const water = (a) =>
  a.reduce(
    (s, v, i) =>
      s + Math.max(0, Math.min(Math.max(...a.slice(0, i + 1)), Math.max(...a.slice(i))) - v),
    0,
  );
export const expandedProblems = [
  make(
    'cargo-streak',
    'Cargo streak',
    'Dynamic programming',
    'Easy',
    'A cargo route records daily gains and losses. Choose a nonempty consecutive segment with the largest total gain. Print that total.',
    'First line: n. Second line: n integers.',
    'The largest nonempty segment sum.',
    ['1 ≤ n ≤ 5,000', '−10,000 ≤ gain ≤ 10,000'],
    [[-2, 3, -1, 4, -6], [-5, -2, -9], ...arrays, [0], [7], Array(5000).fill(1)].map((a) =>
      fixture(arrayInput(a), a.length > 100 ? 5000 : maximum(a)),
    ),
    'n=int(input())\na=list(map(int,input().split()))\ncurrent=best=a[0]\nfor x in a[1:]:\n    current=max(x,current+x)\n    best=max(best,current)\nprint(best)\n',
    'Keep the best sum ending at the current position. Either extend it or begin a new segment. Initialize from the first value so all-negative inputs work.',
    'O(n)',
    'O(n) including input storage',
  ),
  make(
    'distinct-channel',
    'Distinct channel',
    'Sliding window',
    'Medium',
    'Find the length of the longest consecutive part of a lowercase message that contains no repeated character.',
    'One nonempty lowercase ASCII string.',
    'The maximum length.',
    ['1 ≤ length ≤ 5,000'],
    [
      'abcaabcd',
      'aaaa',
      ...arrays.map((a) => a.map((x) => String.fromCharCode(97 + (Math.abs(x) % 5))).join('')),
      'abcdefghijklmnopqrstuvwxyz',
      'a'.repeat(5000),
    ].map((s) => fixture(s + '\n', s.length > 100 ? 1 : distinct(s))),
    's=input().strip()\nlast={}\nleft=best=0\nfor right,c in enumerate(s):\n    left=max(left,last.get(c,-1)+1)\n    last[c]=right\n    best=max(best,right-left+1)\nprint(best)\n',
    'Store each character’s latest position. Move the left edge past a repeated character, never backwards.',
    'O(n)',
    'O(n) input; O(1) auxiliary for 26 letters',
  ),
  make(
    'next-taller',
    'Next taller',
    'Monotonic stack',
    'Medium',
    'For each tower, find the height of the first tower strictly taller than it to its right. Print -1 when no such tower exists. Equal heights do not count.',
    'First line: n. Second line: n positive heights.',
    'n answers in order, separated by spaces.',
    ['1 ≤ n ≤ 5,000', '1 ≤ height ≤ 1,000,000'],
    [
      [2, 1, 2, 4, 3],
      [5, 5, 5],
      ...positive.map((a) => a.map((x) => x + 1)),
      Array(5000).fill(8),
    ].map((a) =>
      fixture(arrayInput(a), a.length > 100 ? Array(a.length).fill(-1).join(' ') : next(a)),
    ),
    'n=int(input())\na=list(map(int,input().split()))\nanswer=[-1]*n\nstack=[]\nfor i,x in enumerate(a):\n    while stack and a[stack[-1]]<x:\n        answer[stack.pop()]=x\n    stack.append(i)\nprint(*answer)\n',
    'Keep unresolved indices on a decreasing stack. The current height answers every smaller height popped from the stack. Each index is pushed and popped once.',
    'O(n)',
    'O(n)',
  ),
  make(
    'rain-reservoir',
    'Rain reservoir',
    'Two pointers',
    'Medium',
    'Unit-width columns have the given nonnegative heights. After rain, water collects between columns. Find the total number of unit squares of trapped water.',
    'First line: n. Second line: n heights.',
    'The total trapped water.',
    ['1 ≤ n ≤ 5,000', '0 ≤ height ≤ 10,000'],
    [[3, 0, 2, 0, 4], [1, 2, 3], ...positive, [0], [10000, ...Array(4998).fill(0), 10000]].map(
      (a) => fixture(arrayInput(a), a.length > 100 ? 49980000 : water(a)),
    ),
    'n=int(input())\na=list(map(int,input().split()))\nleft,right=0,n-1\nlmax=rmax=total=0\nwhile left<=right:\n    if lmax<=rmax:\n        lmax=max(lmax,a[left]); total+=lmax-a[left]; left+=1\n    else:\n        rmax=max(rmax,a[right]); total+=rmax-a[right]; right-=1\nprint(total)\n',
    'Advance the side with the smaller known boundary. That boundary determines how much water can sit above the current column.',
    'O(n)',
    'O(n) input; O(1) auxiliary',
  ),
  make(
    'range-ledger',
    'Range ledger',
    'Prefix sums',
    'Easy',
    'A ledger contains signed values. Answer each query with the sum from position l through r, including both endpoints. Positions are zero-based.',
    'First line: n q. Second line: n integers. Next q lines: l r.',
    'One sum per line, in query order.',
    ['1 ≤ n ≤ 10,000', '1 ≤ q ≤ 5,000', '−10,000 ≤ value ≤ 10,000', '0 ≤ l ≤ r < n'],
    [[2, -1, 4], [0], ...arrays, Array(10000).fill(10000)].map((a) => {
      const qs = [
        [0, a.length - 1],
        [0, 0],
        [a.length - 1, a.length - 1],
      ];
      return fixture(
        `${a.length} ${qs.length}\n${a.join(' ')}\n${qs.map((q) => q.join(' ')).join('\n')}\n`,
        qs.map(([l, r]) => a.slice(l, r + 1).reduce((x, y) => x + y, 0)).join('\n'),
      );
    }),
    'import sys\nit=iter(map(int,sys.stdin.buffer.read().split()))\nn,q=next(it),next(it)\np=[0]\nfor _ in range(n): p.append(p[-1]+next(it))\nfor _ in range(q):\n    l,r=next(it),next(it)\n    print(p[r+1]-p[l])\n',
    'Prefix entry i stores the sum before index i. Subtract the prefix at l from the prefix at r+1.',
    'O(n + q)',
    'O(n + q) including parsed input',
  ),
  make(
    'packet-groups',
    'Packet groups',
    'Sorting',
    'Easy',
    'Packets carry integer labels. Count how many distinct labels occur.',
    'First line: n. Second line: n labels.',
    'The number of distinct labels.',
    ['1 ≤ n ≤ 5,000', '−10⁹ ≤ label ≤ 10⁹'],
    [[2, 2, 5, 1, 5], [7], ...arrays, Array.from({ length: 5000 }, (_, i) => i)].map((a) =>
      fixture(arrayInput(a), new Set(a).size),
    ),
    'n=int(input())\nprint(len(set(map(int,input().split()))))\n',
    'Insert labels into a set and count the entries. A sorting-based solution is also acceptable.',
    'O(n) expected',
    'O(n)',
  ),
  make(
    'inversion-parcels',
    'Inversion parcels',
    'Merge sort',
    'Medium',
    'Count pairs of parcel positions i < j whose labels satisfy a[i] > a[j]. Equal labels do not form a pair.',
    'First line: n. Second line: n labels.',
    'The number of inversions.',
    ['1 ≤ n ≤ 5,000', '−10⁹ ≤ label ≤ 10⁹'],
    [[3, 1, 2], [2, 2], ...arrays, Array.from({ length: 5000 }, (_, i) => 5000 - i)].map((a) =>
      fixture(
        arrayInput(a),
        a.length > 100
          ? 12497500
          : a.reduce((s, x, i) => s + a.slice(i + 1).filter((y) => y < x).length, 0),
      ),
    ),
    'n=int(input())\na=list(map(int,input().split()))\ndef count(a):\n    if len(a)<2: return a,0\n    m=len(a)//2\n    l,x=count(a[:m]); r,y=count(a[m:])\n    out=[]; i=j=0; total=x+y\n    while i<len(l) and j<len(r):\n        if l[i]<=r[j]: out.append(l[i]); i+=1\n        else: out.append(r[j]); j+=1; total+=len(l)-i\n    return out+l[i:]+r[j:],total\nprint(count(a)[1])\n',
    'During a merge, taking a right-side value before a left-side value adds all remaining left-side values to the inversion count. Use <= for equal values.',
    'O(n log n)',
    'O(n)',
  ),
];

// Exhaustive small-state oracles below deliberately differ from the reference algorithms.
function coins(coins, target) {
  const distance = Array(target + 1).fill(-1);
  distance[0] = 0;
  const q = [0];
  for (let i = 0; i < q.length; i++)
    for (const c of coins) {
      const v = q[i] + c;
      if (v <= target && distance[v] < 0) {
        distance[v] = distance[q[i]] + 1;
        q.push(v);
      }
    }
  return distance[target];
}
const coinCases = [
  [[1, 3, 4], 6],
  [[4, 6], 7],
  [[2], 0],
  [[7], 7],
  ...positive.map((a) => [[...new Set(a.map((x) => x + 1))], integer(0, 45)]),
  [[1], 10000],
];
expandedProblems.push(
  make(
    'coin-terminal',
    'Coin terminal',
    'Dynamic programming',
    'Medium',
    'A terminal accepts unlimited coins of each listed denomination. Find the fewest coins needed to pay exactly the target, or -1 if impossible.',
    'First line: k target. Second line: k distinct denominations.',
    'The minimum count, or -1.',
    ['1 ≤ k ≤ 50', '0 ≤ target ≤ 10,000', '1 ≤ denomination ≤ 10,000'],
    coinCases.map(([a, t]) => fixture(`${a.length} ${t}\n${a.join(' ')}\n`, coins(a, t))),
    'k,target=map(int,input().split())\ncoins=list(map(int,input().split()))\ndp=[0]+[target+1]*target\nfor x in range(1,target+1):\n    for c in coins:\n        if c<=x: dp[x]=min(dp[x],dp[x-c]+1)\nprint(dp[target] if dp[target]<=target else -1)\n',
    'Build the minimum cost for each amount using one final coin. Unreachable amounts retain a sentinel; target zero needs zero coins.',
    'O(k × target)',
    'O(target + k)',
  ),
);

const stairCases = [1, 2, 3, 4, 5, 10, ...Array.from({ length: 20 }, () => integer(6, 60)), 5000];
function stairOracle(n) {
  let a = 1,
    b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, (a + b) % 1000000007];
  return b;
}
expandedProblems.push(
  make(
    'stair-signals',
    'Stair signals',
    'Dynamic programming',
    'Easy',
    'Climb a staircase of n steps by moving one or two steps at a time. Count the distinct sequences of moves, modulo 1,000,000,007.',
    'One integer n.',
    'The number of sequences modulo 1,000,000,007.',
    ['1 ≤ n ≤ 5,000'],
    stairCases.map((n) => fixture(n + '\n', stairOracle(n))),
    'n=int(input())\na=b=1\nfor _ in range(n): a,b=b,(a+b)%1000000007\nprint(a)\n',
    'The final move comes from step n−1 or n−2. Keep only the two previous counts and reduce modulo the required value.',
    'O(n)',
    'O(1)',
  ),
);

const graphCases = [
  {
    n: 4,
    edges: [
      [0, 1],
      [1, 2],
    ],
    s: 0,
    t: 3,
  },
  {
    n: 3,
    edges: [
      [0, 1],
      [1, 2],
    ],
    s: 0,
    t: 2,
  },
  { n: 1, edges: [], s: 0, t: 0 },
  ...Array.from({ length: 24 }, () => {
    const n = integer(2, 12),
      edges = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) if (integer(0, 3) === 0) edges.push([i, j]);
    return { n, edges, s: 0, t: n - 1 };
  }),
];
function distances(g) {
  const d = Array.from({ length: g.n }, (_, i) =>
    Array.from({ length: g.n }, (_, j) => (i === j ? 0 : Infinity)),
  );
  for (const [u, v] of g.edges) d[u][v] = d[v][u] = 1;
  for (let k = 0; k < g.n; k++)
    for (let i = 0; i < g.n; i++)
      for (let j = 0; j < g.n; j++) d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);
  return d;
}
expandedProblems.push(
  make(
    'relay-distance',
    'Relay distance',
    'Breadth-first search',
    'Medium',
    'Stations form an undirected graph. Find the smallest number of links needed to travel from s to t. Print -1 if no route exists.',
    'First line: n m s t. Next m lines: two endpoints u v. Stations are numbered 0 through n−1.',
    'The minimum link count, or -1.',
    ['1 ≤ n ≤ 10,000', '0 ≤ m ≤ 20,000', 'No self-loops or duplicate edges.'],
    [
      ...graphCases.map((g) => {
        const d = distances(g)[g.s][g.t];
        return fixture(
          `${g.n} ${g.edges.length} ${g.s} ${g.t}\n${g.edges.map((e) => e.join(' ')).join('\n')}\n`,
          Number.isFinite(d) ? d : -1,
        );
      }),
      fixture(
        '5000 4999 0 4999\n' +
          Array.from({ length: 4999 }, (_, i) => `${i} ${i + 1}`).join('\n') +
          '\n',
        4999,
      ),
    ],
    'from collections import deque\nn,m,s,t=map(int,input().split())\ng=[[] for _ in range(n)]\nfor _ in range(m):\n    u,v=map(int,input().split()); g[u].append(v); g[v].append(u)\nd=[-1]*n; d[s]=0; q=deque([s])\nwhile q:\n    u=q.popleft()\n    for v in g[u]:\n        if d[v]<0: d[v]=d[u]+1; q.append(v)\nprint(d[t])\n',
    'Breadth-first search visits unweighted graph nodes in increasing distance. Mark nodes when enqueuing them.',
    'O(n + m)',
    'O(n + m)',
  ),
);
expandedProblems.push(
  make(
    'network-islands',
    'Network islands',
    'Disjoint sets',
    'Medium',
    'Count the connected components of an undirected station network. Isolated stations each count as a component.',
    'First line: n m. Next m lines: endpoints u v, numbered 0 through n−1.',
    'The number of connected components.',
    ['1 ≤ n ≤ 10,000', '0 ≤ m ≤ 20,000', 'No self-loops or duplicate edges.'],
    [
      ...graphCases.map((g) => {
        const d = distances(g);
        let seen = new Set(),
          count = 0;
        for (let i = 0; i < g.n; i++)
          if (!seen.has(i)) {
            count++;
            for (let j = 0; j < g.n; j++) if (Number.isFinite(d[i][j])) seen.add(j);
          }
        return fixture(
          `${g.n} ${g.edges.length}\n${g.edges.map((e) => e.join(' ')).join('\n')}\n`,
          count,
        );
      }),
      fixture('10000 0\n', 10000),
    ],
    'n,m=map(int,input().split())\np=list(range(n)); size=[1]*n; count=n\ndef find(x):\n    while p[x]!=x: p[x]=p[p[x]]; x=p[x]\n    return x\nfor _ in range(m):\n    a,b=map(int,input().split()); a,b=find(a),find(b)\n    if a!=b:\n        if size[a]<size[b]: a,b=b,a\n        p[b]=a; size[a]+=size[b]; count-=1\nprint(count)\n',
    'Begin with n components. Union the endpoints of each edge; reduce the count only when two different components merge.',
    'O((n + m) α(n)) amortized',
    'O(n)',
  ),
);

const intervalCases = [
  [
    [1, 4],
    [2, 5],
    [5, 7],
  ],
  [
    [0, 1],
    [1, 2],
    [2, 3],
  ],
  ...arrays.map((a) => a.map((x) => [x, x + integer(1, 5)])),
];
function scheduleOracle(a) {
  let best = 0;
  function visit(i, end, count) {
    best = Math.max(best, count);
    for (let j = i; j < a.length; j++) if (a[j][0] >= end) visit(j + 1, a[j][1], count + 1);
  }
  visit(0, -Infinity, 0);
  return best;
}
expandedProblems.push(
  make(
    'meeting-dock',
    'Meeting dock',
    'Greedy',
    'Medium',
    'One dock can host at most one meeting at a time. Choose the largest possible number of meetings. A meeting may start exactly when another ends.',
    'First line: n. Next n lines: start end.',
    'The maximum number of compatible meetings.',
    ['1 ≤ n ≤ 5,000', '−10⁹ ≤ start < end ≤ 10⁹'],
    [
      ...intervalCases.map((a) =>
        fixture(
          `${a.length}\n${a.map((x) => x.join(' ')).join('\n')}\n`,
          scheduleOracle([...a].sort((x, y) => x[0] - y[0])),
        ),
      ),
      fixture(
        '5000\n' + Array.from({ length: 5000 }, (_, i) => `${i} ${i + 1}`).join('\n') + '\n',
        5000,
      ),
    ],
    'n=int(input())\na=[tuple(map(int,input().split())) for _ in range(n)]\na.sort(key=lambda p:p[1])\nend=-float("inf"); count=0\nfor start,finish in a:\n    if start>=end: count+=1; end=finish\nprint(count)\n',
    'Choose the earliest-finishing available meeting. This leaves at least as much room for subsequent meetings as any other first choice.',
    'O(n log n)',
    'O(n)',
  ),
);

const grids = [
  ['..', '..'],
  ['.#.', '...'],
  ['#'],
  ['.'],
  ...Array.from({ length: 24 }, () =>
    Array.from({ length: integer(2, 6) }, () => '.'.repeat(5)).map((row) =>
      [...row].map(() => (integer(0, 4) === 0 ? '#' : '.')).join(''),
    ),
  ),
];
function paths(g, r = 0, c = 0) {
  if (r >= g.length || c >= g[0].length || g[r][c] === '#') return 0;
  if (r === g.length - 1 && c === g[0].length - 1) return 1;
  return paths(g, r + 1, c) + paths(g, r, c + 1);
}
expandedProblems.push(
  make(
    'grid-courier',
    'Grid courier',
    'Dynamic programming',
    'Medium',
    'A courier starts at the top-left cell and must reach the bottom-right cell, moving only right or down. Dots are open cells; # cells are blocked. Count routes modulo 1,000,000,007. A blocked start or finish gives zero routes.',
    'First line: rows columns. Next rows lines: the grid.',
    'The route count modulo 1,000,000,007.',
    ['1 ≤ rows, columns ≤ 100'],
    [
      ...grids.map((g) => fixture(`${g.length} ${g[0].length}\n${g.join('\n')}\n`, paths(g))),
      fixture('1 100\n' + '.'.repeat(100) + '\n', 1),
      fixture('100 100\n' + Array(100).fill('#'.repeat(100)).join('\n') + '\n', 0),
    ],
    'r,c=map(int,input().split())\ndp=[0]*c; dp[0]=1\nfor _ in range(r):\n    row=input().strip()\n    for j in range(c):\n        if row[j]=="#": dp[j]=0\n        elif j: dp[j]=(dp[j]+dp[j-1])%1000000007\nprint(dp[-1])\n',
    'Each open cell receives paths from above and from its left. A one-row array reuses the count from above; blocked cells reset it to zero.',
    'O(rows × columns)',
    'O(columns)',
  ),
);

const gcd = (a, b) => {
  while (b) [a, b] = [b, a % b];
  return a;
};
expandedProblems.push(
  make(
    'tile-workshop',
    'Tile workshop',
    'Number theory',
    'Easy',
    'A rectangular board has integer side lengths a and b. Cover it exactly with identical square tiles of the largest possible integer side length, without cutting tiles. Print that side length.',
    'Two positive integers a b.',
    'The largest tile side length.',
    ['1 ≤ a,b ≤ 10⁹'],
    [
      [12, 18],
      [7, 13],
      [1, 1],
      [50000000, 50000000],
      [50000000, 1],
      ...Array.from({ length: 24 }, () => [integer(1, 1000), integer(1, 1000)]),
    ].map(([a, b]) => fixture(`${a} ${b}\n`, gcd(a, b))),
    'import math\na,b=map(int,input().split())\nprint(math.gcd(a,b))\n',
    'The square side must divide both board dimensions. The greatest common divisor is the largest such length.',
    'O(log min(a,b))',
    'O(1)',
  ),
);

export const referenceNotes = {
  'signal-pair': [
    'n,t=map(int,input().split())\na=list(map(int,input().split()))\nseen={}\nfor i,x in enumerate(a):\n    if t-x in seen: print(seen[t-x],i); break\n    seen[x]=i\n',
    'Store earlier positions by value; look up the complement before inserting the current position.',
    'O(n) expected',
    'O(n)',
  ],
  'quiet-window': [
    'n,k=map(int,input().split())\na=list(map(int,input().split()))\ns=best=sum(a[:k])\nfor i in range(k,n):\n    s+=a[i]-a[i-k]; best=max(best,s)\nprint(best)\n',
    'Update a fixed-length window by adding the entering value and subtracting the leaving value.',
    'O(n)',
    'O(n)',
  ],
  'balanced-beacons': [
    's=input().strip()\nb=0\nfor c in s:\n    b+=1 if c=="(" else -1\n    if b<0: break\nprint("YES" if b==0 else "NO")\n',
    'Every prefix must have at least as many opening as closing brackets; the final balance must be zero.',
    'O(n)',
    'O(n) input; O(1) auxiliary',
  ],
  'missing-crate': [
    'n=int(input())\na=list(map(int,input().split()))\nprint(n*(n+1)//2-sum(a))\n',
    'Subtract the observed sum from the sum of all labels 0 through n.',
    'O(n)',
    'O(n)',
  ],
  'unique-frequency': [
    'from collections import Counter\ns=input().strip()\nc=Counter(s)\nprint(next((i for i,x in enumerate(s) if c[x]==1),-1))\n',
    'Count characters, then scan in original order for the first count of one.',
    'O(n)',
    'O(n) input; O(1) auxiliary',
  ],
  'sorted-checkpoint': [
    'from bisect import bisect_left\nn,x=map(int,input().split())\na=list(map(int,input().split()))\nprint(bisect_left(a,x))\n',
    'Use lower-bound binary search, keeping equal values in the right half.',
    'O(n) to read input; O(log n) search',
    'O(n)',
  ],
};
