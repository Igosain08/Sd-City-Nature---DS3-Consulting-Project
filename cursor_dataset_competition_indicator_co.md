# Dataset competition indicator column
_Exported on 10/02/2026 at 14:58:22 GMT-8 from Cursor (2.4.22)_

---

**User**

i also want to add a column to the dataset indicating whether that observation was during the competition or not something like a OHE

---

**Cursor**

Checking the dataset and notebook to determine how we can add a competition indicator column.


Searching for City Nature Challenge dates and where the dataset is finalized so we can add the competition indicator.


Checking where `df_clean` is created and whether the notebook uses a specific competition date range:


Adding a `during_competition` column (binary, like one-hot for competition vs not). Checking the notebook's cell indices after the date-conversion cell:


Counting cells to find the correct index:


Adding a new notebook cell after the date-conversion cell to create the competition indicator column.


Summary of what was added:

**New code cell in `data.ipynb` (after the date conversion cell):**

- **Column:** `during_competition` — binary (0/1), like a one-hot for “competition” vs “not competition.”
- **Rule:** `1` if `observed_on` falls in a City Nature Challenge window, else `0`.
- **Windows used:**
  - **2024:** April 26–29  
  - **2025:** April 25–28  

The cell uses `observed_on` (already converted to datetime) and adds the column to `df`, so it is kept when `df_clean` is created from `df` later in the notebook. The cell also prints counts for during vs not during competition.

If you want to change the definition (e.g., only 2025, or different dates), say which years/dates and we can adjust the cell.

---

**User**

where is this, i cant find it

---

**Cursor**

The competition indicator is in **`data.ipynb`** in this spot:

1. Go to the **"## 3. Data Type Validation & Conversion"** section.
2. You’ll see the code cell that converts date columns and prints *"Date range: 2024-03-01..."*.
3. The **next code cell** (directly below that one) is the one that adds `during_competition`. It starts with:
   - `# Add binary indicator: 1 = observation during City Nature Challenge, 0 = not`
   - `# CNC 2024: April 26-29; CNC 2025: April 25-28`
   - `cnc_windows = [`
4. The cell right **below** that is the one that prints *"Checking boolean columns..."*.

So: scroll to **Section 3**, then go **one cell down** from the “Convert date columns to datetime” cell. That middle cell is the competition indicator.

You can also use **Ctrl+F (or Cmd+F)** in the notebook and search for **`during_competition`** to jump to that cell.

---

**User**

this is our current page-wise plan but i think page 2 and page 4 are pretty much the same thing. your thoughts?ExploratoryAnalysis.tsx — Page 1
Spatial, taxonomic, and user-based exploratory data analysis.
Sections:
Observation scatter map (all points rendered on MapWrapper)
Taxonomic breakdown bar chart (Recharts or Plotly)
Observations-over-time line chart
User contribution distribution (histogram of observations per user)
API Endpoints consumed:
GET /api/exploratory/observations
GET /api/exploratory/taxonomy-summary
GET /api/exploratory/temporal-trends
HotspotAnalysis.tsx — Page 2
Over-sampled hotspot identification and under-sampled gap detection.
Sections:
Hex-binned choropleth map showing observation density
Biodiversity yield map (species/observation ratio per hex)
Ranked list of top over-sampled and under-sampled zones
API Endpoints consumed:
GET /api/hotspots/hexbins
GET /api/hotspots/gaps
CityComparison.tsx — Page 3
Comparative analysis of San Diego vs. San Antonio vs. Los Angeles.
Sections:
Side-by-side stats table (total observations, unique species, participants)
Multi-year trend charts (Plotly or Recharts)
Spatial distribution comparison maps (one MapWrapper per city or a tabbed view)
API Endpoints consumed:
GET /api/comparison/city-stats
GET /api/comparison/yearly-trends
StrategyRecommendations.tsx — Page 4
Priority zones, timing windows, and habitat-based participant guidance.
Sections:
Interactive priority zone map with clickable zone polygons
Timing heatmap (day × hour matrix showing optimal observation windows)
Habitat-based recommendation cards
Exportable participant guide summary
API Endpoints consumed:
GET /api/strategy/priority-zones
GET /api/strategy/timing-windows


---

**Cursor**

You’re right that Page 2 and Page 4 overlap a lot.

**Where they overlap**
- Both are about **where to focus**: Page 2 with “over-sampled / under-sampled zones,” Page 4 with “priority zones.”
- The same geography (e.g. hexbins or zones) can power both: one page as “here’s the analysis,” the other as “here’s where to go.”
- So two separate pages can feel like the same map with different labels.

**What’s different**
- **Page 2** = more **analytical**: density, biodiversity yield, ranked lists (good for “why” and for analysts).
- **Page 4** = more **actionable**: priority map + **when** (timing heatmap) + **what** (habitat cards) + **exportable guide** (for participants).

So the overlap is mainly the **spatial “priority” piece**; timing and habitat are only on Page 4.

**Options**

1. **Merge into one “Strategy & Hotspots” page (recommended)**  
   One page that does:
   - Hex/choropleth + biodiversity yield (from current Page 2).
   - Ranked over-/under-sampled zones (from Page 2).
   - Same geography reframed as **priority zones** (from Page 4) with clickable polygons if you want.
   - **Timing heatmap** (day × hour).
   - **Habitat-based recommendation cards**.
   - **Exportable participant guide** (PDF/print).

   One URL, one story: “Here’s the coverage, here are the priority areas, here’s when and what to do, and here’s your guide.”

2. **Keep two pages but split roles clearly**  
   - **Page 2** = “Coverage & gaps” only: hex density, yield, ranked zones, no “go here” framing. For understanding data quality/coverage.  
   - **Page 4** = “Participant strategy” only: priority map (fed by same or derived data), timing heatmap, habitat cards, export. No duplicate choropleth/ranked list.

3. **Drop the duplicate map from one page**  
   If you keep both pages, avoid showing the same “priority zone” map twice. For example: Page 2 = only hex + ranked list (no “priority zone” map); Page 4 = priority zone map + timing + habitat + export.

**Recommendation**  
Merge into **one Strategy & Hotspots page** (Option 1). You keep the analytical content (hexbins, gaps, ranked zones) and add timing, habitat, and export in one place, so it’s clearer for users and you don’t maintain two almost-identical spatial views. If you want, we can turn this into a concrete section layout and component list for that single page.

---

**User**

can you give a page wise breakdown for option 2

---

**Cursor**

Here’s a **page-wise breakdown for Option 2** (two pages, clear split between analysis and strategy):

---

## **Page 1 — ExploratoryAnalysis.tsx**  
*Spatial, taxonomic, and user-based EDA (unchanged)*

| Section | Content |
|--------|--------|
| Observation scatter map | All points on MapWrapper |
| Taxonomic breakdown | Bar chart (Recharts/Plotly) |
| Observations over time | Line chart |
| User contribution distribution | Histogram of observations per user |

**APIs:**  
`GET /api/exploratory/observations`  
`GET /api/exploratory/taxonomy-summary`  
`GET /api/exploratory/temporal-trends`

**Role:** General exploration and context. No prioritization.

---

## **Page 2 — HotspotAnalysis.tsx**  
*“Coverage & Gaps” — diagnostic only*

| Section | Content | Purpose |
|--------|--------|--------|
| Hex-binned choropleth | Observation density by hex | Show where data is concentrated |
| Biodiversity yield map | Species/observation ratio per hex | Show data “efficiency” per area |
| Ranked lists | Top over-sampled zones, top under-sampled (gap) zones | Explicit rankings for analysts |
| *(Optional)* Short summary | e.g. “X hexes over-sampled, Y hexes under-sampled” | Quick takeaway |

**APIs:**  
`GET /api/hotspots/hexbins`  
`GET /api/hotspots/gaps`

**Role:** Answer “Where is our data strong/weak?” No “go here” framing, no timing or habitat. For understanding coverage and data quality.

---

## **Page 3 — CityComparison.tsx**  
*Comparative analysis (unchanged)*

| Section | Content |
|--------|--------|
| Side-by-side stats table | Totals: observations, unique species, participants (SD vs SA vs LA) |
| Multi-year trend charts | Plotly/Recharts |
| Spatial comparison | One MapWrapper per city or tabbed view |

**APIs:**  
`GET /api/comparison/city-stats`  
`GET /api/comparison/yearly-trends`

**Role:** Compare cities; no prioritization.

---

## **Page 4 — StrategyRecommendations.tsx**  
*“Participant Strategy” — actionable only*

| Section | Content | Purpose |
|--------|--------|--------|
| Priority zone map | Single interactive map with clickable zone polygons; zones derived from gap/hotspot logic (e.g. “prioritize gaps” or “prioritize high-yield hexes”) | “Where to go” for participants |
| Timing heatmap | Day × hour matrix of optimal observation windows | “When to go” |
| Habitat-based recommendation cards | Cards per habitat/ecotype with what to look for and where it fits on the map | “What to look for” |
| Exportable participant guide | Summary (e.g. PDF/print) of priority zones + timing + habitat tips | Takeaway for field use |

**APIs:**  
`GET /api/strategy/priority-zones` *(can use hexbin/gap data under the hood)*  
`GET /api/strategy/timing-windows`

**Role:** Answer “Where should I go, when, and what for?” No duplicate choropleth or ranked list; those stay on Page 2.

---

## **Summary: Option 2 split**

| Page | Focus | Audience |
|------|--------|----------|
| 1 | Exploration | Everyone |
| 2 | **Coverage & gaps** (diagnostic) | Analysts / internal |
| 3 | City comparison | Everyone |
| 4 | **Participant strategy** (actionable) | Participants / organizers |

Page 2 = “here’s the analysis”; Page 4 = “here’s what to do,” with no duplicated maps or ranked zone lists between them.

---

**User**

write it in the same way i had pasted it. like thisExploratoryAnalysis.tsx — Page 1
Spatial, taxonomic, and user-based exploratory data analysis.
Sections:
Observation scatter map (all points rendered on MapWrapper)
Taxonomic breakdown bar chart (Recharts or Plotly)
Observations-over-time line chart
User contribution distribution (histogram of observations per user)
API Endpoints consumed:
GET /api/exploratory/observations
GET /api/exploratory/taxonomy-summary
GET /api/exploratory/temporal-trends
HotspotAnalysis.tsx — Page 2
Over-sampled hotspot identification and under-sampled gap detection.
Sections:
Hex-binned choropleth map showing observation density
Biodiversity yield map (species/observation ratio per hex)
Ranked list of top over-sampled and under-sampled zones
API Endpoints consumed:
GET /api/hotspots/hexbins
GET /api/hotspots/gaps
CityComparison.tsx — Page 3
Comparative analysis of San Diego vs. San Antonio vs. Los Angeles.
Sections:
Side-by-side stats table (total observations, unique species, participants)
Multi-year trend charts (Plotly or Recharts)
Spatial distribution comparison maps (one MapWrapper per city or a tabbed view)
API Endpoints consumed:
GET /api/comparison/city-stats
GET /api/comparison/yearly-trends
StrategyRecommendations.tsx — Page 4
Priority zones, timing windows, and habitat-based participant guidance.
Sections:
Interactive priority zone map with clickable zone polygons
Timing heatmap (day × hour matrix showing optimal observation windows)
Habitat-based recommendation cards
Exportable participant guide summary
API Endpoints consumed:
GET /api/strategy/priority-zones
GET /api/strategy/timing-windows


---

**Cursor**

**ExploratoryAnalysis.tsx — Page 1**  
Spatial, taxonomic, and user-based exploratory data analysis.

Sections:
- Observation scatter map (all points rendered on MapWrapper)
- Taxonomic breakdown bar chart (Recharts or Plotly)
- Observations-over-time line chart
- User contribution distribution (histogram of observations per user)

API Endpoints consumed:
- GET /api/exploratory/observations
- GET /api/exploratory/taxonomy-summary
- GET /api/exploratory/temporal-trends

---

**HotspotAnalysis.tsx — Page 2**  
Coverage and gap analysis: where data is concentrated and where it is missing (diagnostic only; no “go here” framing).

Sections:
- Hex-binned choropleth map showing observation density
- Biodiversity yield map (species/observation ratio per hex)
- Ranked list of top over-sampled and top under-sampled (gap) zones

API Endpoints consumed:
- GET /api/hotspots/hexbins
- GET /api/hotspots/gaps

---

**CityComparison.tsx — Page 3**  
Comparative analysis of San Diego vs. San Antonio vs. Los Angeles.

Sections:
- Side-by-side stats table (total observations, unique species, participants)
- Multi-year trend charts (Plotly or Recharts)
- Spatial distribution comparison maps (one MapWrapper per city or a tabbed view)

API Endpoints consumed:
- GET /api/comparison/city-stats
- GET /api/comparison/yearly-trends

---

**StrategyRecommendations.tsx — Page 4**  
Participant-facing strategy: priority zones, timing windows, and habitat-based guidance (actionable only; no duplicate choropleth or ranked list from Page 2).

Sections:
- Interactive priority zone map with clickable zone polygons
- Timing heatmap (day × hour matrix showing optimal observation windows)
- Habitat-based recommendation cards
- Exportable participant guide summary

API Endpoints consumed:
- GET /api/strategy/priority-zones
- GET /api/strategy/timing-windows

