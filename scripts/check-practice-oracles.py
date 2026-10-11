import json,itertools,math,collections,functools,random,copy,ast,hashlib
from pathlib import Path
# Intentionally simple offline oracles: production complexity belongs to the
# reference solutions, not these small-case correctness checks.
bank=json.load(open('database/practice-bank.json',encoding='utf-8'))
subs=lambda a:[a[i:j] for i in range(len(a)) for j in range(i+1,len(a)+1)]
oracles={
'Product exclusions':lambda a:[math.prod(a[:i]+a[i+1:]) for i in range(len(a))],
'Longest consecutive IDs':lambda a:max([0]+[next((k for k in range(1,len(set(a))+2) if x+k not in set(a))) for x in set(a)]),
'Majority candidate':lambda a:next((x for x in set(a) if a.count(x)>len(a)//2),None),
'Best trade':lambda a:max([0]+[a[j]-a[i] for i in range(len(a)) for j in range(i+1,len(a))]),
'Repeated trades':lambda a:sum(max(0,a[i]-a[i-1]) for i in range(1,len(a))),
'Pivot balance':lambda a:next((i for i in range(len(a)) if sum(a[:i])==sum(a[i+1:])), -1),
'Next warmer reading':lambda a:[next((j-i for j in range(i+1,len(a)) if a[j]>a[i]),0) for i in range(len(a))],
'Previous smaller reading':lambda a:[next((j for j in range(i-1,-1,-1) if a[j]<a[i]),-1) for i in range(len(a))],
'Largest histogram block':lambda a:max([0]+[min(a[i:j])*(j-i) for i in range(len(a)) for j in range(i+1,len(a)+1)]),
'Retained rain':lambda a:sum(max(0,min(max(a[:i+1]),max(a[i:]))-a[i]) for i in range(len(a))),
'Container reach':lambda a:max([0]+[min(a[i],a[j])*(j-i) for i in range(len(a)) for j in range(i+1,len(a))]),
'Unique substring span':lambda s:max([0]+[len(t) for t in subs(s) if len(set(t))==len(t)]),
'Palindrome expansion':lambda s:max([0]+[len(t) for t in subs(s) if t==t[::-1]]),
'Palindrome inventory':lambda s:sum(t==t[::-1] for t in subs(s)),
'Rotation period':lambda s:next((i for i in range(1,len(s)+1) if len(s)%i==0 and s[:i]*(len(s)//i)==s),0),
'Target subarray inventory':lambda d:sum(sum(a)==d['k'] for a in subs(d['values'])),
'Divisible subarray inventory':lambda d:sum(sum(a)%d['k']==0 for a in subs(d['values'])),
'Window maximums':lambda d:[max(d['values'][i:i+d['k']]) for i in range(len(d['values'])-d['k']+1)],
'Window minimums':lambda d:[min(d['values'][i:i+d['k']]) for i in range(len(d['values'])-d['k']+1)],
'Window medians':lambda d:[sorted(d['values'][i:i+d['k']])[(d['k']-1)//2] for i in range(len(d['values'])-d['k']+1)],
'Pair difference inventory':lambda d:sum(abs(a-b)==d['k'] for a,b in itertools.combinations(d['values'],2)),
'Longest bounded distinct window':lambda d:max([0]+[len(a) for a in subs(d['values']) if len(set(a))<=d['k']]),
'Exact distinct window inventory':lambda d:sum(len(set(a))==d['k'] for a in subs(d['values'])),
'Count target triples':lambda d:sum(sum(a)==d['k'] for a in itertools.combinations(d['values'],3)),
'Longest target-sum span':lambda d:max([0]+[len(a) for a in subs(d['values']) if sum(a)==d['k']]),
'Minimum target-sum span':lambda d:min([len(a) for a in subs(d['values']) if sum(a)==d['k']],default=0),
'Subset target count':lambda d:sum(sum(c)==d['k'] for n in range(len(d['values'])+1) for c in itertools.combinations(d['values'],n)),
'Catalan structures':lambda n:math.comb(2*n,n)//(n+1),
'Balanced parenthesis count':lambda n:math.comb(2*n,n)//(n+1),
'Prime inventory':lambda n:sum(all(i%j for j in range(2,math.isqrt(i)+1)) for i in range(2,n)),
'Prefix directory':lambda d:sum(w.startswith(d['prefix']) for w in d['words']),
'Prefix suggestions':lambda d:sorted(set(w for w in d['words'] if w.startswith(d['prefix']))),
'Buildable word':lambda d:next(iter(sorted((w for w in set(d) if all(w[:i] in d for i in range(1,len(w)+1))),key=lambda w:(-len(w),w))),''),
}
def longest_run(a, predicate):
 return max([0]+[len(t) for t in subs(a) if all(predicate(x,y) for x,y in zip(t,t[1:]))])

def rewards(a, circular=False):
 @functools.lru_cache(None)
 def search(i, previous, first):
  if i==len(a):return 0
  skip=search(i+1,False,first)
  if previous or (circular and len(a)>1 and i==len(a)-1 and first):return skip
  return max(skip,a[i]+search(i+1,True,first or i==0))
 return search(0,False,False)

def palindrome_subsequence(s):
 @functools.lru_cache(None)
 def f(i,j):
  if i>j:return 0
  if i==j:return 1
  return 2+f(i+1,j-1) if s[i]==s[j] else max(f(i+1,j),f(i,j-1))
 return f(0,len(s)-1)

def partitions(s):
 cuts=[0]+[i for i in range(1,len(s)) if not set(s[:i])&set(s[i:])]+([len(s)] if s else [])
 return [y-x for x,y in zip(cuts,cuts[1:])]

def cancel(s):
 while True:
  pair=next((i for i in range(len(s)-1) if s[i]==s[i+1]),None)
  if pair is None:return s
  s=s[:pair]+s[pair+2:]

def distinct_subsequences(s):
 # Count subsequences by their unique first character; each next occurrence is
 # chosen at its earliest position, avoiding the reference's last-count DP.
 @functools.lru_cache(None)
 def f(start):
  return (1+sum(f(s.index(c,start)+1) for c in set(s[start:])))%1000000007
 return f(0)

def edit_distance(d):
 a,b=d
 @functools.lru_cache(None)
 def f(i,j):
  if i==len(a):return len(b)-j
  if j==len(b):return len(a)-i
  if a[i]==b[j]:return f(i+1,j+1)
  return 1+min(f(i+1,j),f(i,j+1),f(i+1,j+1))
 return f(0,0)

def common_subsequence(d):
 a,b=d
 @functools.lru_cache(None)
 def f(i,j):
  if i==len(a) or j==len(b):return 0
  return 1+f(i+1,j+1) if a[i]==b[j] else max(f(i+1,j),f(i,j+1))
 return f(0,0)

def is_subsequence(d):
 a,b=d;it=iter(b)
 return all(any(x==c for x in it) for c in a)

def common_prefix(words):
 if not words:return ''
 for length in range(len(words[0]),-1,-1):
  candidate=words[0][:length]
  if all(word.startswith(candidate) for word in words):return candidate

def increment_cost(a):
 used=set();cost=0
 for x in sorted(a):
  y=x
  while y in used:y+=1
  used.add(y);cost+=y-x
 return cost

def lis(a):
 lengths=[1]*len(a)
 for i in range(len(a)):
  lengths[i]=1+max([0]+[lengths[j] for j in range(i) if a[j]<a[i]])
 return max(lengths,default=0)

def recurrence(n, steps):
 @functools.lru_cache(None)
 def f(x):return int(x==0) if x<=0 else sum(f(x-s) for s in steps)
 return f(n)

def happy(n):
 def advance(x):return sum(int(c)**2 for c in str(x))
 slow=advance(n);fast=advance(advance(n))
 while slow!=fast:slow=advance(slow);fast=advance(advance(fast))
 return slow==1

def integer_partitions(n):
 @functools.lru_cache(None)
 def f(total,minimum):
  if total==0:return 1
  return sum(f(total-x,x) for x in range(minimum,total+1))
 return f(n,1)

def gray(n):
 out=[0]
 for bit in range(n):out += [x+(1<<bit) for x in out[::-1]]
 return out

def reachability(d, weighted=False, directed=False):
 n=d['n'];dist=[[math.inf]*n for _ in range(n)]
 for i in range(n):dist[i][i]=0
 for e in d['edges']:
  u,v=e[:2];w=e[2] if weighted else 1;dist[u][v]=min(dist[u][v],w)
  if not directed:dist[v][u]=min(dist[v][u],w)
 for k in range(n):
  for i in range(n):
   for j in range(n):dist[i][j]=min(dist[i][j],dist[i][k]+dist[k][j])
 return dist

def component_count(d):
 dist=reachability(d)
 return sum(not any(dist[i][j]<math.inf for j in range(i)) for i in range(d['n']))

def bipartite(d):
 # Independent parity constraints via signed union sets.
 groups=[{i:0} for i in range(d['n'])]
 for u,v in d['edges']:
  a=next(g for g in groups if u in g);b=next(g for g in groups if v in g)
  if a is b:
   if a[u]==a[v]:return False
  else:
   flip=a[u]^b[v]^1;a.update({x:p^flip for x,p in b.items()});groups.remove(b)
 return True

def dependency_order(d):
 remaining=set(range(d['n']));out=[]
 while remaining:
  ready=[v for v in remaining if not any(b==v and a in remaining for a,b in d['edges'])]
  if not ready:return []
  v=min(ready);out.append(v);remaining.remove(v)
 return out

def dependency_depth(d):
 @functools.lru_cache(None)
 def f(v):return 1+max([0]+[f(w) for u,w in d['edges'] if u==v])
 return max((f(v) for v in range(d['n'])),default=0)

def mst(d):
 # Prim via a full cut scan, rather than the reference's sorted-edge DSU.
 seen={0};cost=0
 while len(seen)<d['n']:
  crossing=[(w,u,v) for u,v,w in d['edges'] if (u in seen)!=(v in seen)]
  if not crossing:return -1
  w,u,v=min(crossing);seen.update([u,v]);cost+=w
 return cost

def islands(a):
 remaining={(r,c) for r,row in enumerate(a) for c,x in enumerate(row) if x};sizes=[]
 while remaining:
  group={remaining.pop()}
  while True:
   added={p for p in remaining if any(abs(p[0]-q[0])+abs(p[1]-q[1])==1 for q in group)}
   if not added:break
   group|=added;remaining-=added
  sizes.append(len(group))
 return sizes

def grid_paths(a):
 @functools.lru_cache(None)
 def f(r,c):
  if r>=len(a) or c>=len(a[0]) or a[r][c]:return 0
  if (r,c)==(len(a)-1,len(a[0])-1):return 1
  return f(r+1,c)+f(r,c+1)
 return f(0,0)

def spiral(a):
 out=[];a=copy.deepcopy(a)
 while a:
  out.extend(a.pop(0))
  a=[list(row) for row in zip(*a)][::-1]
 return out

def traversal(a,kind):
 # Sort nodes by conceptual DFS event path, avoiding recursive traversal.
 def key(i):
  path=bin(i+1)[3:];event={'in':'2','pre':'0','post':'4'}[kind]
  return ''.join('1' if x=='0' else '3' for x in path)+event
 return [a[i] for i in sorted(range(len(a)),key=key)]

def tree_path(a):
 best=-math.inf
 for u in range(len(a)):
  for v in range(u,len(a)):
   x,y=u,v;left=[];right=[]
   while x!=y:
    if x>y:left.append(a[x]);x=(x-1)//2
    else:right.append(a[y]);y=(y-1)//2
   best=max(best,sum(left)+sum(right)+a[x])
 return best

def interval_union(a):
 # Repeatedly combine intersecting intervals, instead of sorted sweep.
 out=copy.deepcopy(a)
 while True:
  pair=next(((i,j) for i in range(len(out)) for j in range(i+1,len(out)) if max(out[i][0],out[j][0])<=min(out[i][1],out[j][1])),None)
  if pair is None:return sorted(out)
  i,j=pair;out[i]=[min(out[i][0],out[j][0]),max(out[i][1],out[j][1])];out.pop(j)

def appointments(a):
 # Quadratic weighted interval scheduling, rather than earliest-end greedy.
 ordered=sorted(a);dp=[1]*len(a)
 for i,(start,end) in enumerate(ordered):
  dp[i]=1+max([0]+[dp[j] for j in range(i) if ordered[j][1]<=start])
 return max(dp,default=0)

def coins(d):
 target=d['k'];seen={0};front={0};depth=0
 while front:
  if target in front:return depth
  nxt={x+c for x in front for c in d['values'] if x+c<=target}-seen
  seen|=nxt;front=nxt;depth+=1
 return -1

oracles.update({
'Duplicate manifest':lambda a:any(a.count(x)>1 for x in a),
'Distinct manifest':lambda a:sorted(set(a)),
'Occurrence ledger':lambda a:[[x,a.count(x)] for x in sorted(set(a))],
'Prefix ledger':lambda a:[sum(a[:i+1]) for i in range(len(a))],
'Zero relocation':lambda a:[x for x in a if x]+[0]*a.count(0),
'Alternating parity run':lambda a:longest_run(a,lambda x,y:x%2!=y%2),
'Increasing streak':lambda a:longest_run(a,lambda x,y:x<y),
'Square order':lambda a:sorted(x*x for x in a),
'Adjacent differences':lambda a:[y-x for x,y in zip(a,a[1:])],
'Nonadjacent rewards':rewards,
'Increasing subsequence length':lis,
'Degree span':lambda a:min([len(t) for t in subs(a) if max(collections.Counter(t).values())==max(collections.Counter(a).values())],default=0),
'Minimum increment cost':increment_cost,
'Weighted position sum':lambda a:sum(sum(a[i:]) for i in range(len(a))),
'Reverse message':lambda s:''.join(reversed(s)),
'Palindrome message':lambda s:all(s[i]==s[-i-1] for i in range(len(s)//2)),
'Distinct characters':lambda s:len(collections.Counter(s)),
'Run compression':lambda s:[[c,len(list(g))] for c,g in itertools.groupby(s)],
'Partition message':partitions,
'Palindrome assembly':lambda s:sum(n-n%2 for n in collections.Counter(s).values())+int(any(n%2 for n in collections.Counter(s).values())),
'Adjacent cancellation':cancel,
'Lexical suffix':lambda s:min((s[i:] for i in range(len(s))),default=''),
'Vowel count':lambda s:sum(s.count(c) for c in 'aeiou'),
'Alphabet shift':lambda s:''.join('abcdefghijklmnopqrstuvwxyz'[('abcdefghijklmnopqrstuvwxyz'.index(c)+1)%26] for c in s),
'Minimal palindrome deletions':lambda s:len(s)-palindrome_subsequence(s),
'Palindromic subsequence':palindrome_subsequence,
'Distinct subsequence inventory':distinct_subsequences,
'Subsequence ordering':lambda s:''.join(c*s.count(c) for c in sorted(set(s),key=lambda c:(-s.count(c),c))),
'First repeated character':lambda s:next((c for i,c in enumerate(s) if c in s[:i]),None),
'Character ledger':lambda s:[[c,s.count(c)] for c in sorted(set(s))],
'Anagram comparison':lambda d:sorted(d[0])==sorted(d[1]),
'Subsequence check':is_subsequence,
'Common prefix':common_prefix,
'Edit distance':edit_distance,
'Common subsequence':common_subsequence,
'Cyclic shift':lambda d:[d['values'][(i-d['k'])%len(d['values'])] for i in range(len(d['values']))],
'Top frequency values':lambda d:sorted(set(d['values']),key=lambda x:(-d['values'].count(x),x))[:d['k']],
'Smallest selection':lambda d:sorted(d['values'])[:d['k']],
'Threshold count':lambda d:sum(x<d['k'] for x in d['values']),
'Closest target value':lambda d:min(d['values'],key=lambda x:(abs(x-d['k']),x),default=None),
'Remove target values':lambda d:[x for x in d['values'] if x!=d['k']],
'Integer pair reach':lambda d:any(x+y==d['k'] for x,y in itertools.combinations(d['values'],2)),
'Maximum target xor':lambda d:max((x^d['k'] for x in d['values']),default=0),
'Bit population':lambda n:bin(n).count('1'),
'Population table':lambda n:[bin(x).count('1') for x in range(n+1)],
'Power of two':lambda n:n in [2**k for k in range(n.bit_length()+1)],
'Power of three':lambda n:n in [3**k for k in range(n.bit_length()+1)],
'Fibonacci marker':lambda n:0 if n==0 else recurrence(n-1,(1,2)),
'Staircase routes':lambda n:recurrence(n,(1,2)),
'Three-step staircase':lambda n:recurrence(n,(1,2,3)),
'Factor ledger':lambda n:[x for x in range(1,n+1) if n%x==0],
'Trailing factorial zeros':lambda n:len(str(math.factorial(n)))-len(str(math.factorial(n)).rstrip('0')),
'Digital root':lambda n:n if n<10 else oracles['Digital root'](sum(map(int,str(n)))),
'Decimal reversal':lambda n:sum(int(c)*10**i for i,c in enumerate(str(n))),
'Digit ledger':lambda n:[str(n).count(str(x)) for x in range(10)],
'Happy marker':happy,
'Square feasibility':lambda n:any(x*x==n for x in range(math.isqrt(n)+1)),
'Triangular feasibility':lambda n:next(x-1 for x in itertools.count(1) if x*(x+1)//2>n),
'Integer square root':lambda n:next(x-1 for x in itertools.count(1) if x*x>n),
'Gray traversal':gray,
'Binary reversal byte':lambda n:int(format(n,'08b')[::-1],2),
'Range bitwise conjunction':lambda d:functools.reduce(lambda x,y:x&y,range(d[0],d[1]+1)),
'Euclidean divisor':lambda d:math.gcd(*d),
'Least common period':lambda d:math.lcm(*d),
'Pascal row':lambda n:[math.comb(n,k) for k in range(n+1)],
'Binary adjacency avoidance':lambda n:sum(math.comb(n-k+1,k) for k in range(n//2+2) if n-k+1>=k),
'Domino strip routes':lambda n:recurrence(n,(1,2)),
'Integer partitions':integer_partitions,
'Connected districts':component_count,
'District reach':lambda d:[v for v,x in enumerate(reachability(d)[0]) if x<math.inf],
'Route hop count':lambda d:-1 if reachability(d)[0][-1]==math.inf else reachability(d)[0][-1],
'Bipartite districts':bipartite,
'Cycle detection':lambda d:len(d['edges'])>d['n']-component_count(d),
'Degree ledger':lambda d:[sum(i in e for e in d['edges']) for i in range(d['n'])],
'Dependency order':dependency_order,
'Dependency depth':dependency_depth,
'Cheapest route':lambda d:-1 if reachability(d,True)[0][-1]==math.inf else reachability(d,True)[0][-1],
'Spanning connection cost':mst,
'Island count':lambda a:len(islands(a)),
'Largest island':lambda a:max(islands(a),default=0),
'Island perimeter':lambda a:sum(1 for r,row in enumerate(a) for c,x in enumerate(row) if x for dr,dc in [(1,0),(-1,0),(0,1),(0,-1)] if not (0<=r+dr<len(a) and 0<=c+dc<len(row) and a[r+dr][c+dc])),
'Obstacle grid routes':grid_paths,
'Largest square patch':lambda a:max([0]+[k*k for k in range(1,min(len(a),len(a[0]))+1) for r in range(len(a)-k+1) for c in range(len(a[0])-k+1) if all(a[x][y] for x in range(r,r+k) for y in range(c,c+k))]),
'Spiral scan':spiral,
'Matrix transpose':lambda a:[[row[c] for row in a] for c in range(len(a[0]))],
'Zero row propagation':lambda a:[[0 if 0 in row or any(other[c]==0 for other in a) else x for c,x in enumerate(row)] for row in a],
'Heap-index tree depth':lambda a:len(bin(len(a)))-2,
'Heap-index inorder':lambda a:traversal(a,'in'),
'Heap-index preorder':lambda a:traversal(a,'pre'),
'Heap-index postorder':lambda a:traversal(a,'post'),
'Complete tree right view':lambda a:[a[min(len(a),2**(level+1)-1)-1] for level in range(len(a).bit_length())],
'Maximum tree path':tree_path,
'Interval union':interval_union,
'Meeting capacity':lambda a:max([0]+[sum(start<=t<end for start,end in a) for t in {x for pair in a for x in pair}]),
'Nonoverlapping appointment count':appointments,
'Minimum interval removals':lambda a:len(a)-appointments(a),
'Covered duration':lambda a:len({t for start,end in a for t in range(start,end)}),
'Circular rewards':lambda a:rewards(a,True),
'Minimum coin count':coins,
'Linked chain group reversal':lambda d:[d['values'][(i//d['k']+1)*d['k']-1-i%d['k']] if (i//d['k']+1)*d['k']<=len(d['values']) else x for i,x in enumerate(d['values'])],
})

def generated_input(p,rng):
 sample=json.loads(p['examples'][0]['input']);title=p['title'];statement=p['statement'].lower()
 length=rng.randrange(0,9)
 def values():
  low=0 if 'nonnegative' in statement else -4
  return [rng.randint(low,5) for _ in range(length)]
 def word():return ''.join(rng.choice('abcz') for _ in range(rng.randrange(0,9)))
 if isinstance(sample,str):return word()
 if isinstance(sample,int):
  upper=10 if title=='Gray traversal' else 11 if title=='Balanced parenthesis count' else 20 if title=='Catalan structures' else 30
  return rng.randint(1 if 'positive integer' in statement else 0,upper)
 if isinstance(sample,dict):
  if 'n' in sample:
   n=rng.randint(1,7);directed=title in ('Dependency order','Dependency depth')
   edges=[]
   for u in range(n):
    for v in range(n):
     if u==v or (not directed or title=='Dependency depth') and u>v:continue
     if rng.random()<.25:edges.append([u,v,rng.randint(1,8)] if title in ('Cheapest route','Spanning connection cost') else [u,v])
   return {'n':n,'edges':edges}
  if 'words' in sample:return {'words':[word() for _ in range(length)],'prefix':word()[:rng.randrange(0,4)]}
  a=values();k=rng.randint(1,10)
  if title=='Minimum coin count':a=[rng.randint(1,6) for _ in range(length)];k=rng.randint(0,20)
  elif title=='Maximum target xor':a=[rng.randint(0,16) for _ in range(length)];k=rng.randint(0,16)
  elif title in ('Target subarray inventory','Longest target-sum span','Minimum target-sum span','Integer pair reach','Subset target count','Count target triples','Closest target value','Remove target values','Threshold count'):k=rng.randint(-5,5)
  elif title in ('Cyclic shift','Top frequency values','Smallest selection'):k=rng.randint(0,12)
  return {'values':a,'k':k}
 if isinstance(sample,list):
  if title in ('Anagram comparison','Subsequence check','Edit distance','Common subsequence'):return [word(),word()]
  if title in ('Common prefix','Buildable word'):return [word() for _ in range(length)]
  if title=='Range bitwise conjunction':x=rng.randint(0,30);return [x,x+rng.randint(0,30)]
  if title=='Euclidean divisor':return [rng.randint(0,30),rng.randint(1,30)]
  if title=='Least common period':return [rng.randint(1,30),rng.randint(1,30)]
  if p['topic']=='Intervals' or title=='Nonoverlapping appointment count':
   return [[x,x+rng.randint(1,8)] for x in values()]
  if isinstance(sample[0] if sample else None,list):
   width=rng.randint(1,6)
   return [[rng.randrange(2) for _ in range(width)] for _ in range(rng.randint(1,6))]
  a=values()
  if 'complete binary tree' in statement and not a:a=[rng.randint(-5,5)]
  if title=='Square order':a.sort()
  return a
 raise AssertionError(('Missing generator',title))

def canonical(x):return json.dumps(x,separators=(',',':'),sort_keys=True)

count=0;fuzz_count=0;report=[];rng=random.Random(271828)
for p in bank:
 assert p['title'] in oracles,p['title']
 oracle=oracles[p['title']]
 for case in p['examples']+p['tests']:
  actual=oracle(json.loads(case['input']));expected=json.loads(case['output'])
  assert canonical(actual)==canonical(expected),(p['title'],case['input'],actual,expected)
  count+=1
 # Load only imports and the project-owned solve function. No input wrapper,
 # contestant code, database writes, or network calls are executed here.
 tree=ast.parse(p['referenceSolution'])
 tree.body=[node for node in tree.body if isinstance(node,(ast.Import,ast.ImportFrom)) or isinstance(node,ast.FunctionDef) and node.name=='solve']
 namespace={};exec(compile(tree,'project-reference.py','exec'),namespace)
 for _ in range(100):
  data=generated_input(p,rng);expected=oracle(copy.deepcopy(data));actual=namespace['solve'](copy.deepcopy(data))
  assert canonical(actual)==canonical(expected),(p['title'],data,actual,expected)
  fuzz_count+=1
 report.append({'id':p['id'],'fixtures':len(p['examples'])+len(p['tests']),'generatedCases':100})
assert {p['title'] for p in bank}==set(oracles), 'Every practice question needs an independent oracle'
Path('artifacts').mkdir(exist_ok=True)
Path('artifacts/practice-validation.json').write_text(json.dumps({'bankSha256':hashlib.sha256(Path('database/practice-bank.json').read_bytes()).hexdigest(),'seed':271828,'questions':report,'fixtures':count,'generatedCases':fuzz_count,'scope':'133 JSON practice questions; not a server isolation, performance, editorial or multiplayer gate'},indent=2)+'\n',encoding='utf-8')
print('Independent checks:',len(oracles),'algorithms;',count,'fixtures;',fuzz_count,'generated cases')
