"""Verify project-authored reference solutions only. Never pass player submissions here."""
import io
import json
import sys

problem = json.loads(sys.stdin.read())
source = compile(problem['referenceSolution'], 'reference.py', 'exec')
original_in, original_out = sys.stdin, sys.stdout
def normalize(value):
    value = value.replace('\r\n', '\n')
    return value[:-1] if value.endswith('\n') else value

for index, case in enumerate(problem['examples'] + problem['tests']):
    sys.stdin = io.TextIOWrapper(io.BytesIO(case['input'].encode('utf-8')), encoding='utf-8')
    sys.stdout = io.StringIO()
    try:
        exec(source, {'__name__': '__main__'})
        actual = sys.stdout.getvalue()
    finally:
        sys.stdin, sys.stdout = original_in, original_out
    if normalize(actual) != normalize(case['output']):
        raise AssertionError(f"{problem['id']} case {index}: expected {case['output'][:100]!r}, got {actual[:100]!r}")
print(len(problem['examples']) + len(problem['tests']))
