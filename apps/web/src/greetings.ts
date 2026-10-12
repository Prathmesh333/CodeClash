export const greetings = [
  ['Ready for your next clash', '?'],
  ['Ready to take the first solve', '?'],
  ['Bring your best', '.'],
  ['Can you solve it first', '?'],
  ['Make this round yours', '.'],
  ['Up for another showdown', '?'],
  ['Put your skills to the test', '.'],
  ['Ready to outsolve your rival', '?'],
  ['Take your place in the arena', '.'],
  ['Got the winning approach', '?'],
  ['Your move', '.'],
  ['Think fast. Code carefully', '.'],
  ['Find your edge', '.'],
  ['A fresh challenge. Your best approach', '.'],
  ['How will you win this one', '?'],
  ['Ready for a close contest', '?'],
  ['Make every attempt count', '.'],
  ['Keep your cool under pressure', '.'],
  ['Take on your next rival', '.'],
  ['Turn your practice into a win', '.'],
  ['Bring your strongest approach', '.'],
  ['The next round starts with you', '.'],
  ['Stay sharp for the next clash', '.'],
  ['Back to compete', '?'],
  ['Earn this round', '.'],
  ['Let your solution do the talking', '.'],
  ['Ready to make the first move', '?'],
  ['Test your ideas against a rival', '.'],
  ['Make the clock count', '.'],
  ['Know your next move', '?'],
  ['Go for a clean solve', '.'],
  ['Ready to challenge yourself', '?'],
  ['Focus up for the next round', '.'],
  ['One problem. Two approaches. Your move', '.'],
  ['Bring the focus. Find the solution', '.'],
  ['Who will solve it first', '?'],
] as const;

const chosen = new Map<string, number>();
export function greetingFor(userId: string, username?: string): string {
  let index = chosen.get(userId);
  if (index === undefined) {
    let previous = -1;
    try {
      previous = Number(sessionStorage.getItem('codeclash:last-greeting') ?? '-1');
    } catch {}
    const valid = Number.isInteger(previous) && previous >= 0 && previous < greetings.length;
    index = Math.floor(Math.random() * (greetings.length - Number(valid)));
    if (valid && index >= previous) index++;
    chosen.set(userId, index);
    try {
      sessionStorage.setItem('codeclash:last-greeting', String(index));
    } catch {}
  }
  const [message, punctuation] = greetings[index];
  return `${message}${username ? `, ${username}` : ''}${punctuation}`;
}
