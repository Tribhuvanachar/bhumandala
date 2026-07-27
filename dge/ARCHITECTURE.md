# Digital Grantha Engine (DGE)
## Architecture

Current Status: Stable Engine ✅

---

# Core Engine

index.html
│
├── index.js
│
├── granthaManager.js
│
├── datasetAdapter.js
│
├── granthaReader.js
│
├── granthaNavigator.js
│
├── granthaCommentary.js
│
├── granthaSearch.js
│
├── granthaAudio.js
│
├── granthaBookmarks.js
│
└── granthaNotes.js

---

# Data Flow

data.json

↓

GranthaManager

↓

DatasetAdapter

↓

Reader

↓

Navigator

↓

User Interface

---

# Current JSON Structure

metadata

shlokas

---

# Future Features

✔ Multiple Granthas

✔ Multiple Languages

✔ Audio Sync

✔ OCR Import

✔ Search

✔ Bookmarks

✔ Notes

✔ Commentary Explorer

---

This document must always reflect the current architecture.
