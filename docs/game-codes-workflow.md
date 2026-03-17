# Game Codes Update Workflow

Edit `data/game-codes.json` directly — no scripts needed.

## How to Update Codes

1. Open `data/game-codes.json`.
2. Find the game you want to update (e.g. `"rivals"`).
3. Add codes to `workingCodes` as objects, or plain strings for codes with no reward:
   - `{ "code": "CODE123", "reward": "free reward text" }` — code with reward
   - `"CODE123"` — code with no reward description
4. Add expired codes to `expiredCodes` as plain strings.
5. Update `lastUpdated` and `lastTested` for that game entry.

## Notes

- Empty arrays are valid when no verified codes are available.
- Duplicate codes are filtered automatically by the site.
- The global `_meta.lastUpdated` / `_meta.lastTested` act as fallbacks for any game that doesn't have its own dates set.

## Example

```json
"rivals": {
    "lastUpdated": "March 17, 2026",
    "lastTested": "March 17, 2026",
    "workingCodes": [
        { "code": "REWARD2026", "reward": "3 keys" },
        "BOOSTNOW"
    ],
    "expiredCodes": [
        "OLDCODE1",
        "OLDCODE2"
    ]
}
```