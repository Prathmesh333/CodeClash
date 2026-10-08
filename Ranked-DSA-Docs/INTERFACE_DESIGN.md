# CodeClash interface direction

## Purpose
Make the live Python duel easy to understand and enter. Keep the casual beta and unverified results visible without letting infrastructure details dominate the page.

## Tokens
The default light palette uses white #FFFFFF for surfaces, cloud #F7FAFC for the page, ink #0F172A for primary text, slate #64748B for supporting text, lime #A3E635 for actions, and blue #2563EB for navigation. Orange appears in development/warning states through the existing semantic tokens. Every component follows the selected theme's tokens.

Space Grotesk carries headings; Source Sans 3 carries interface text. Code uses the existing monospace stack.

## Layout
A left-aligned introduction sits beside the illustrative coding room. On mobile, the room follows the primary action. Account statistics form one strip. The three-step match flow precedes history, upcoming features, and leaderboard links.

```text
Brand / navigation / theme / account
Introduction + action | illustrative duel
Account statistics
Queue -> solve -> finish
History | coming next | leaderboard
Enter the arena
```

The duel preview is the focal point. Secondary content uses simpler surfaces and quieter type. Motion is limited to one preview entrance and existing dialog feedback; reduced motion disables it.

## Verification
Check mobile overflow, keyboard focus, all themes, persisted profiles, login, and a full two-player casual duel. Preserve current matchmaking and rating behavior.
