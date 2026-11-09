# Google Play Store Cumulative Installs Dashboard

An interactive Web & Flask Dashboard visualizing the cumulative installs over time for filtered Play Store app categories using a Stacked Area Chart.

## Features & Business Rules
1. **Filtering Logic**:
   - Apps with average rating $\ge 4.2$.
   - App names containing **no numbers**.
   - Categories starting with **'T'** or **'P'** (`TRAVEL_AND_LOCAL`, `PRODUCTIVITY`, `PHOTOGRAPHY`, `TOOLS`, `PERSONALIZATION`, `PARENTING`).
   - Reviews > **1,000**.
   - App size between **20 MB** and **80 MB**.

2. **Legend Translations**:
   - `TRAVEL_AND_LOCAL` $\rightarrow$ **Voyage et local** (French)
   - `PRODUCTIVITY` $\rightarrow$ **Productividad** (Spanish)
   - `PHOTOGRAPHY` $\rightarrow$ **写真** (Japanese)

3. **Color Intensity Highlighting**:
   - Months where total installs grew by **> 25% MoM** are highlighted with increased color saturation/intensity.

4. **Time Gate Restriction**:
   - Displayed strictly between **4:00 PM IST and 6:00 PM IST** (16:00 to 18:00 IST).
   - Dynamic restriction banner outside this time window with a Demo Bypass switch.

## Quick Start
1. Install dependencies:
   ```bash
   pip install flask pandas numpy pytz
   ```
2. Run the application:
   ```bash
   python app.py
   ```
3. Open `http://127.0.0.1:5000` in your browser.
