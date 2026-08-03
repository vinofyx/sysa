# Document Analysis — Sai Yadadri Seva Ashram Website Project

Generated: 2026-08-03
Scope: Every file found in `D:\sysa\docs` plus two images pasted inline in chat (no file on disk, content transcribed below).

---

## 1. Ashram Brochure
**File:** `SAI YADADRI SEVA ASHRAM_Broucher_26-08-2025.pdf` (7.4 MB, 4 pages — text is embedded as flattened images/graphics, not selectable text; extracted via page rendering + visual reading, not OCR-guessed)

| Page | Content |
|---|---|
| 1 | Cover: org name, logo, motto, registration no., address, service focus areas (Senior Citizens, Education, Helping Poor & Needy), 4 key office-bearer names/phones, building photo, Telugu tagline |
| 2 | History & mission narrative; "Vanaprasthasramam" (Old Age Home) origin story; Annaprasada Program + Life Long Annaprasada Program pricing; Goseva/Goshala description |
| 3 | "Journey Ahead" — expansion plans, building cost estimate, infrastructure list, daily activities, Education initiatives, Medical Support initiatives |
| 4 | Full Committee Members grid (2025–2028) with photos, "How Can You Support Us" donation pricing, Bank Account Details box (incl. UPI/QR), existing website URL |

**Notable data:** existing live website `https://sysaindia.org` is printed on the brochure — this project is very likely a **redesign/rebuild**, not a greenfield build. This needs confirmation from you.

## 2. Logo
**File:** `LOGO final-1.pdf` → rendered `_logo_page1.png`
Circular emblem: green/yellow/white palette. Center: white silhouette of Shirdi Sai Baba in walking pose against a green temple/gopuram silhouette. Top arc: Telugu name + "SAI YADADRI SEVA ASHRAMAM" + "REGD. NO: 423/2019". Bottom arcs: "HYDERABAD" (English) / "హైదరాబాద్" (Telugu). No source vector (SVG) file supplied — only a PDF render. **Flag:** the brochure's Website Requirements doc explicitly asks for "Logo (SVG/PNG)"; only a PDF was provided. Recommend requesting a vector/transparent-background source from the Ashram's designer for production use (favicons, print, retina).

## 3. Committee Members List
**File:** `COMMITTEE MEMBERS LIST.docx`
Table of 27 committee members (Sl. No., Name, Designation, Age, Occupation/Retired-From, Mobile). Full roster: President, VP-I, VP-II, General Secretary, Joint Secretary I/II, Organizing Secretary I–V, Treasurer, Asst. Treasurer, Advisor I–IV, Executive Members 1–9.

**Data-quality note:** rows 24 and 25 are both labeled "Executive Member-7" (Reddy Setty Prakasam and M. Jayantha Kumar) — likely a typo in the source; sequential numbering (7 and 8) was probably intended. Not corrected — flagged per your instruction not to alter source content.

## 4. Website Requirements Document (acts as the Sitemap)
**File:** `Sai_Yadadri_Seva_Ashram_Website_Requirements_Vinofyx.docx`
A pre-existing draft BRD (prepared by "Vinofyx" — presumably your own earlier scoping work) containing: project objective, a full module/sitemap list, functional requirements, information checklist, non-functional requirements, admin features, deliverables, and a technology stack recommendation. **This is the closest thing to the "Website Sitemap" you mentioned in your original brief — no separate standalone sitemap file exists in the folder.** Treated as authoritative sitemap input; cross-checked against the brochure content below.

## 5. CSR-1 Registration Letter — ⚠️ ENTITY MISMATCH
**File:** `CSR-1_Registration_Letter.pdf` (Govt. of India, Ministry of Corporate Affairs, ROC Delhi, dated 29/01/2026)
This letter registers CSR Registration Number **CSR00103975** for:
> **SRI SHIRIDI SAI SEVA SOCIETY**, 2-135/1, Mavala Village, Adilabad, Telangana – 504001, PAN **AAHTS2350L**

This is a **different legal entity** from Sai Yadadri Seva Ashram (PAN `ABKAS9261K`, Hyderabad — see PAN card below). Name, address, and PAN all differ. **Not guessing which is correct** — flagged for your confirmation (see Open Conflicts below).

## 6. PAN Card (pasted inline in chat — no file saved to disk)
Income Tax Dept / Govt. of India PAN card:
- Name: **SAI YADADRI SEVA ASHRAM**
- PAN: **ABKAS9261K**
- Date of Incorporation/Formation: **14/05/2019**

## 7. Bank Details Card (pasted inline in chat — no file saved to disk)
- Name: Sai Yadadri Seva Ashram
- Bank: State Bank of India
- A/C No: 40304687251
- IFSC: SBIN0006557

✅ **Cross-verified against brochure page 4** — bank name, account number, and IFSC match exactly. High confidence this data is correct.

## Missing / Not Supplied
- Standalone **Website Sitemap** file (substituted with the Requirements doc's module list — confirm this is acceptable).
- **Vector logo** (SVG/AI) — only PDF supplied.
- CSR document for the correct entity (if Sai Yadadri Seva Ashram itself holds CSR-eligible registration, that certificate wasn't provided; the one supplied is for a different society).
- 12A/80G certificates, Society Registration Certificate copy, audit/annual reports, testimonials, event/news content, gallery media — all referenced as "required" in the Requirements doc's checklist but not present in this document set.

## Open Conflicts (listed, not resolved — per your instruction)
1. **CSR entity mismatch**: CSR-1 letter is for "Sri Shiridi Sai Seva Society" (Adilabad, PAN AAHTS2350L), not "Sai Yadadri Seva Ashram" (Hyderabad, PAN ABKAS9261K).
2. **President D. Ashok's mobile number** differs between sources: Committee docx lists `9014826354`; Brochure page 1 lists `94906 75675` (9490675675).
3. **Treasurer K. Vidyasagar Reddy's mobile number** differs: Committee docx lists `9494941636`; Brochure page 1 lists `94906 00600` (9490600600).
4. **Committee roster completeness**: Committee docx has 27 members; the brochure's photo grid shows only 25 (Executive Members 8 & 9 — B. Narayana, Nagendraiah — are absent from the brochure photo page).
