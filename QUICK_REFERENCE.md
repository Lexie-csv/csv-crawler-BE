# 🎯 Quick Reference Card - Policy Scanner

## 3-Step Workflow (Copy & Paste These!)

### 1️⃣ Run a Scan
```bash
cd apps/api
pnpm scanner scan --file example-urls.txt
```
⏱️ Takes 2-5 minutes for 10 URLs

---

### 2️⃣ View Results
```bash
pnpm view scan
```
📊 Shows results in plain English - no SQL/JSON needed!

---

### 3️⃣ Get Summary (Optional)
```bash
pnpm scanner digest --input storage/exports/scan_results_*.json
pnpm view digest
```
📄 Easy-to-read executive summary

---

## 📋 All Commands Cheat Sheet

| What You Want | Command |
|---------------|---------|
| Scan websites | `pnpm scanner scan --file example-urls.txt` |
| View results | `pnpm view scan` |
| View summary | `pnpm view digest` |
| List all files | `pnpm view list` |
| Open in Excel | `open storage/exports/datapoints_*.csv` |
| Read digest | `open storage/exports/digest_*.md` |

---

## 📂 Where's My Data?

All results saved to: `apps/api/storage/exports/`

```
storage/exports/
├── scan_results_2025-11-19_14-30.json  ← Raw data
├── digest_2025-11-19_14-35.md          ← Summary (double-click to open)
└── datapoints_2025-11-19_14-35.csv     ← Excel-friendly
```

---

## 💡 What You'll See

### When You Run `pnpm view scan`:
```
✅ RELEVANT UPDATES (7)

1. SEC Circular 2025-01
   Relevance Score: 95/100
   Why: Contains new circular with compliance deadline
   
   📋 Found 3 signals:
   • Type: CIRCULAR
     Title: SEC Circular 2025-01
     Effective Date: December 1, 2025
     Who's affected: publicly listed companies
     Confidence: 95%
```

### When You Run `pnpm view digest`:
```
# Policy & Market Scanner Digest

## What Changed
• SEC Circular 2025-01: New reporting requirements
• BSP Rate: Increased to 6.50%

## So What?
Rate increase affects borrowing costs...

## What to Watch
Deadline: December 1, 2025
```

---

## 🔄 Daily Workflow

**Morning routine (5 minutes):**
```bash
cd apps/api
pnpm scanner scan --file example-urls.txt
pnpm view scan
```

**Done!** You see all updates immediately.

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| No results show | Run `pnpm scanner scan --file example-urls.txt` first |
| Command not found | Make sure you're in `apps/api` directory |
| Can't see data | Run `pnpm view list` to see what files exist |
| Want Excel format | Run `open storage/exports/datapoints_*.csv` |

---

## ⭐ Pro Tips

1. **View while you wait**: Keep terminal open, run `pnpm view scan` right after scanning
2. **Share easily**: Digest files are plain text - just copy/paste or email them
3. **Use Excel**: CSV files open directly - double-click `datapoints_*.csv`
4. **Archive**: Files have timestamps - keep old scans for comparison

---

## 🎉 Bottom Line

**You don't need SQL, JSON, or coding!**

Just remember 2 commands:
1. `pnpm scanner scan --file example-urls.txt` ← Get data
2. `pnpm view scan` ← See results

Everything else is automatic!

---

📖 **Full Guide:** [HOW_TO_VIEW_RESULTS.md](HOW_TO_VIEW_RESULTS.md)
