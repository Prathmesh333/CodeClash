import json,itertools,math,collections
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
count=0
for p in bank:
 if p['title'] not in oracles:continue
 for case in p['examples']+p['tests']:
  actual=oracles[p['title']](json.loads(case['input']));expected=json.loads(case['output'])
  assert actual==expected,(p['title'],case['input'],actual,expected)
  count+=1
assert len(oracles)==33
print('Independent brute-force/math checks:',len(oracles),'algorithms;',count,'fixtures')
