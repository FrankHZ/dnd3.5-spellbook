# D&D 3.5 Spellbook

A modern **Dungeons & Dragons 3.5 spellbook web application** built with a **React + Express** stack, powered by a legacy SQLite dataset and extended with **bilingual (English / Chinese) spell support**.

This project focuses on **fast spell querying**, **clean spell presentation**, and **practical spell management** for real tabletop play.

---

## Project Goals

* 🔍 **Modern spell search & filtering**

  * Fast, flexible querying across thousands of D&D 3.5 spells
  * Filters by class, level, school, components, and more
  
* 📖 **Practical spell management**

  * Favorites
  * Custom spellbooks
  * Daily prepared spell lists

* 🌏 **Bilingual support (EN / ZH)**

  * English base data from legacy sources
  * Chinese spell descriptions imported from player-made CHM/HTML sources
  * Language toggle with graceful fallback

* 🧠 **Table-ready UX**

  * Optimized for quick lookup during sessions
  * Clear spell formatting and minimal friction

---

## Non-Goals (Intentional Scope Limits)

To keep the project focused and sustainable, the following are **out of scope** for now:

* ❌ Full character sheets
* ❌ Spell slot legality or automatic rule enforcement
* ❌ Multi-edition support (5e / Pathfinder)
* ❌ Comprehensive SRD rules beyond spells

These may be revisited later if they clearly improve at-table usability.

---

## Project Structure

This repository is organized as a **monorepo**:

```
/
├── server/        # Express API + SQLite access
├── web/           # React single-page application
├── tools/
│   └── zh-parser/ # Chinese spell import & normalization tools
├── docs/          # Requirements, schema notes, decisions
└── README.md
```

Each major component is treated as a self-contained module, even though they live in one repository.

---

## Data Sources & Licensing Notes

* Spell data originates from a **legacy `dnd.sqlite` database** (ignored from git).
* Chinese spell descriptions come from **player-created CHM/HTML sources** and are imported via a separate tool.
* Raw data files are **not committed** to this repository.
* This project is intended for **personal, educational, and tabletop use**.

If you plan to reuse or publish parts of this project, please review the licensing status of any external data sources.

---

## Development Status

Current phase:

* 🟡 Project setup & planning
* 🟡 Legacy database analysis
* 🟡 API and data model design

This project is under **active development**, but stability and long-term maintainability are prioritized over rapid feature growth.

---

## Guiding Principles

* **At-table usefulness beats theoretical completeness**
* **Readable, explicit decisions over clever abstractions**
* **Bilingual support as a first-class feature, not an afterthought**
* **Future contributors should understand *why* decisions were made**

Key architectural and design decisions are documented in `/docs`.

---

## Contributing

This is currently a **solo project**, but contributions may be considered in the future.

If you are interested:

* Open an issue to discuss ideas first
* Avoid submitting large refactors without context
* Keep changes aligned with the project goals above

---

## Roadmap (High Level)

* **v0.x** — Data import, schema stabilization, basic API
* **v1.0** — Spell search, spell detail view, favorites
* **v1.5** — Spellbooks & daily prepared spells
* **v2.0** — Full Chinese content integration & bilingual search

---

## Author

Maintained by **FFang**
Built for real D&D 3.5 tables, not just demos.
