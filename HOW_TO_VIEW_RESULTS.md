# How to View Your Results (No SQL/JSON Knowledge Needed!)

## 🎯 Super Simple - 3 Steps

### Step 1: Run a Scan

```bash
cd apps/api
pnpm scanner:scan --file example-urls.txt
```

### Step 2: View the Results

**Option A: View in Terminal (Plain English)**
```bash
pnpm view:scan
```

**Option B: Export to CSV (Opens in Excel!)**
```bash
pnpm view:csv
```

This creates 2 Excel-ready CSV files:
- `results_*.csv` - All scanned pages with scores
- `signals_*.csv` - All extracted policy signals

Then just double-click the files to open in Excel!

**That's it!** You'll see results in plain English like this:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SCAN RESULTS VIEWER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERVIEW
Total pages scanned:   9
Relevant updates:      7
Generated:             Nov 19, 2025 2:30 PM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RELEVANT UPDATES (7)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SEC Circular 2025-01
   URL: https://www.sec.gov.ph/circulars/2025-01
   Relevance Score: 95/100
   Why relevant: Contains new circular with compliance deadline

   📋 Found 3 signal(s):

   • Type: CIRCULAR
     Title: SEC Circular 2025-01
     Description: New reporting requirements for publicly listed companies
     Effective Date: December 1, 2025
     Who's affected: publicly listed companies, corporate secretaries
     Confidence: 95%

   • Type: REGULATORY_TIMELINE
     Title: Compliance Deadline
     Description: Submission deadline for new reporting format
     Effective Date: December 15, 2025
     Confidence: 90%

2. BSP Interest Rate Announcement
   URL: https://www.bsp.gov.ph/...
   Relevance Score: 88/100
   Why relevant: Contains policy rate change announcement
   ...
```

### Step 3: Get a Summary Digest

```bash
pnpm scanner digest --input storage/exports/scan_results_*.json
pnpm view digest
```

You'll see a clean summary like:

```
# Policy & Market Scanner Digest — November 19, 2025

## Executive Summary
This digest covers 7 policy and market changes, including 3 high-priority 
updates. Focus areas: regulatory compliance, rate changes.

## 📋 What Changed

### New Circulars & Memoranda (HIGH)
• **SEC Circular 2025-01**: New reporting requirements
  (Effective: Dec 1, 2025)
  *Impacted*: publicly listed companies

### Rate Changes (HIGH)
• **BSP Policy Rate**: Increased from 6.25% to 6.50%
  (Effective: Nov 20, 2025)

## 💡 So What? (Impact Analysis)
Rate increase will affect borrowing costs for businesses...

## 👀 What to Watch
Upcoming deadline: December 1, 2025 - New reporting format
```

---

## 🎮 All Viewing Commands

### View Latest Scan Results
```bash
pnpm view scan
```
Shows all scanned pages with relevance scores and extracted signals.

### View Latest Digest
```bash
pnpm view digest
```
Shows the executive summary in an easy-to-read format.

### List All Your Files
```bash
pnpm view list
```
Shows all exports with dates and sizes.

### View Help
```bash
pnpm view help
```
Shows available commands.

---

## 📂 Where Are My Files?

All results are automatically saved to:
```
apps/api/storage/exports/
```

**File types:**
- `scan_results_*.json` - Raw scan data
- `digest_*.md` - Executive summaries (readable text)
- `datapoints_*.csv` - Data table (opens in Excel)

**To open in Excel:**
```bash
open apps/api/storage/exports/datapoints_*.csv
```

**To read digest in any text editor:**
```bash
open apps/api/storage/exports/digest_*.md
```

---

## 🔄 Typical Workflow

### Daily Quick Check

```bash
# 1. Scan sources
cd apps/api
pnpm scanner scan --file example-urls.txt

# 2. View results immediately
pnpm view scan

# Done! No need to open files or run SQL
```

### Weekly Report

```bash
# 1. Run comprehensive scan
pnpm scanner scan --file example-urls.txt --headless

# 2. Generate digest
pnpm scanner digest --input storage/exports/scan_results_*.json

# 3. Read the summary
pnpm view digest

# 4. Open in Word/Email if you want to share
open storage/exports/digest_*.md
```

### Share with Team

The digest is just a text file, so you can:

```bash
# Copy to clipboard (Mac)
cat storage/exports/digest_*.md | pbcopy

# Email it
mail -s "Weekly Policy Update" team@company.com < storage/exports/digest_*.md

# Or just open and copy/paste
open storage/exports/digest_*.md
```

---

## 💡 Pro Tips

### 1. View as You Work
Leave your terminal open and just run `pnpm view scan` after each scan - instant results!

### 2. Open Digest Files Directly
The `.md` files are just text files. Double-click to open in any text editor, or:
```bash
# Mac
open storage/exports/digest_*.md

# Copy to Desktop for easy access
cp storage/exports/digest_*.md ~/Desktop/policy-update.txt
```

### 3. Use Excel for Data Analysis
CSV files open directly in Excel:
```bash
# Export datapoints
pnpm scanner export --input storage/exports/digest_*.json --format csv

# Open in Excel
open storage/exports/datapoints_*.csv
```

---

## ❓ FAQ

**Q: Do I need to learn JSON?**  
A: Nope! Just use `pnpm view scan` and it shows everything in plain English.

**Q: Do I need to learn SQL?**  
A: Nope! The viewer reads the database for you and shows it in the terminal.

**Q: How do I share results?**  
A: The digest files (`.md`) are plain text. Just open them and copy/paste, or email them directly.

**Q: Can I open results in Excel?**  
A: Yes! Use `pnpm scanner export --format csv` then open the CSV file.

**Q: Where's the data stored?**  
A: In `apps/api/storage/exports/` - all your scans and digests are there.

**Q: How do I see what I scanned yesterday?**  
A: Run `pnpm view list` to see all files with dates. The filenames include timestamps.

---

## 🆘 Quick Help

**Can't see results?**
```bash
# List what you have
pnpm view list

# If empty, run a scan first
pnpm scanner scan --file example-urls.txt
```

**Want to see old results?**
```bash
# List all files with dates
pnpm view list

# Each file has timestamp in name: scan_results_2025-11-19_14-30-00.json
# Open in viewer by copying the filename
```

**Need to share with non-technical people?**
```bash
# Generate digest (creates readable text file)
pnpm scanner digest --input storage/exports/scan_results_*.json

# Open and copy/paste
open storage/exports/digest_*.md
```

---

## 🎉 Summary

**You don't need to:**
- ❌ Know SQL
- ❌ Understand JSON
- ❌ Use database tools
- ❌ Write code

**You just need to:**
- ✅ Run `pnpm scanner scan --file urls.txt`
- ✅ Run `pnpm view scan`
- ✅ Read the results in plain English!

**For summaries:**
- ✅ Run `pnpm scanner digest --input storage/exports/scan_results_*.json`
- ✅ Run `pnpm view digest`
- ✅ Read the executive summary!

**All results are in:** `apps/api/storage/exports/`  
**Just open the `.md` files in any text editor!**
