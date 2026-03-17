# Quick Site Update

Use one of these methods whenever you changed your website files.

## Method 1 (easiest)

1. Double-click `update-site.cmd` in the project root.
2. Wait for the terminal window to finish.
3. Refresh your GitHub Pages site after 1-3 minutes.

## Method 2 (PowerShell)

From project root:

```powershell
.\scripts\publish-site.ps1
```

Custom commit message:

```powershell
.\scripts\publish-site.ps1 "Update Arsenal page"
```

## If pull/rebase causes conflicts

1. Open conflicted files and resolve conflict markers.
2. Run:

```powershell
git add .
git rebase --continue
```

3. Run the update script again.
