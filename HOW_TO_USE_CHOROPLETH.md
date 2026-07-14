# How to Use the Choropleth Map Layer

## Quick Start Guide

### Step 1: Navigate to the Map Page
1. Open the GIS-HMS application
2. Login with your credentials (admin or superadmin)
3. Navigate to the **Map** page from the sidebar

### Step 2: Enable Heatmap Layer
The choropleth toggle appears under the heatmap layer section. First, you need to show the heatmap controls:

**Option A**: Toggle the heatmap button
- Look for the **"⚫ Heatmap OFF"** button at the bottom-left of the map
- Click it to turn it **ON** (becomes "🔴 Heatmap ON")

**Option B**: Switch to Heatmap tile layer
- Use the layer switcher buttons on the bottom-right
- Click **"Heatmap"** button
- This will show minimal basemap with heatmap overlay controls

### Step 3: Enable Choropleth
Once heatmap controls are visible:
1. Look at the **Map Layers** sidebar on the right
2. Scroll down to find the heatmap section (appears below the layer toggles)
3. Find the **"🗺️ Choropleth Map"** checkbox
4. Click to enable choropleth visualization

### Step 4: View the Choropleth Map
You should now see:
- ✅ Barangay polygons colored based on malnutrition prevalence
- ✅ Color scale from yellow (0%) to dark red (>20%)
- ✅ Clear black borders around each barangay
- ✅ OpenStreetMap roads and labels visible through transparent colors
- ✅ Choropleth legend showing color meanings at bottom-left

### Step 5: Interpret the Colors

| Color | Meaning | Prevalence Rate | Action Needed |
|-------|---------|-----------------|---------------|
| 🟥 Dark Red (#800026) | Very High | > 20% | 🚨 URGENT intervention required |
| 🔴 Red (#BD0026) | High | 15-20% | ⚠️ High priority attention |
| 🟠 Orange-Red (#E31A1C) | Moderate-High | 10-15% | ⚠️ Moderate-high priority |
| 🟠 Orange (#FC4E2A) | Moderate | 7-10% | 📋 Monitor closely |
| 🟡 Light Orange (#FD8D3C) | Low-Moderate | 4-7% | 📋 Regular monitoring |
| 🟡 Yellow (#FEB24C) | Low | 2-4% | ✅ Continue monitoring |
| 🟢 Light Yellow (#FED976) | Very Low | 0-2% | ✅ Good status |
| ⚪ Pale Yellow (#FFEDA0) | No Cases | 0% | ✅ Excellent status |

### Step 6: Interact with Barangays
You can still interact with the map:

**Hover**: Mouse over any barangay to see detailed popup with:
- Barangay name
- Risk level
- Total children monitored
- Malnutrition cases
- Prevalence percentage
- SAM/MAM breakdown

**Click**: Click any barangay to navigate to its detail page

### Step 7: Switch Back to Heatmap
To switch from choropleth back to the traditional density heatmap:
1. Uncheck the **"🗺️ Choropleth Map"** checkbox
2. The IDW (Inverse Distance Weighted) heatmap will reappear
3. Use the **"Heatmap Color Mode"** selector to change heatmap colors

## Understanding the Difference

### Choropleth Map (New)
- Shows **exact administrative boundaries** (barangays)
- Colors represent **prevalence rate percentage** (cases ÷ total children)
- Sharp boundaries between regions
- Best for: Comparing malnutrition rates across barangays

### IDW Heatmap (Original)
- Shows **smooth density gradient** based on distance
- Colors represent **absolute case count** (0-4, 5-9, 10-14, etc.)
- Blurred boundaries with fadeout
- Best for: Identifying geographic hotspot clusters

## Tips & Best Practices

### 1. Combined Analysis
For comprehensive analysis:
1. **First**: Use choropleth to identify high-prevalence barangays
2. **Then**: Switch to IDW heatmap to see geographic clustering
3. **Finally**: Click barangays for detailed intervention planning

### 2. Tile Layer Selection
- **Default**: Best for general navigation with choropleth
- **Satellite**: Shows terrain context with prevalence overlay
- **Heatmap**: Minimal distraction, focus on data only

### 3. Reading the Legend
The legend automatically switches:
- **Choropleth ON**: Shows 8 prevalence levels (0% to >20%)
- **Heatmap ON**: Shows 6 intensity tiers (0-4 to 25+ cases)

### 4. For Admins vs Superadmins
**Admin Users**:
- See only their assigned barangay with purok breakdown
- Choropleth shows prevalence within puroks (if data available)

**Superadmin Users**:
- See all 31 barangays across Cabadbaran City
- Choropleth shows city-wide prevalence comparison

## Troubleshooting

### Choropleth not showing?
✅ Check that "🗺️ Choropleth Map" is checked  
✅ Verify heatmap controls are visible (heatmap ON or Heatmap tile layer)  
✅ Ensure there's malnutrition data for the barangays  

### Colors look wrong?
✅ Colors are based on **prevalence rate** (percentage), not absolute counts  
✅ A barangay with 2 cases out of 5 children (40%) will be dark red  
✅ A barangay with 10 cases out of 100 children (10%) will be orange  

### Borders not visible?
✅ Borders are 1.5px dark gray (#333333)  
✅ Zoom in for clearer view  
✅ Try switching tile layers if background is too dark  

### Can't see roads underneath?
✅ Fill opacity is set to 70% (0.7)  
✅ Roads and labels should be visible through the colors  
✅ If not visible, try Default or Terrain tile layer  

## Advanced Usage

### Identifying High-Risk Areas
1. Enable choropleth
2. Look for **dark red** (>20%) and **red** (15-20%) barangays
3. Click on these high-risk barangays
4. Review detailed statistics in the barangay detail page
5. Plan targeted interventions

### Monitoring Progress Over Time
1. Take screenshots of choropleth at regular intervals
2. Compare color changes month-over-month
3. Track which barangays improve (lighter colors) or worsen (darker colors)
4. Export reports with prevalence data

### Combining with Other Layers
You can enable multiple visualization layers:
- ✅ Choropleth Map (prevalence coloring)
- ✅ Malnutrition Hotspots (⚠️ icons)
- ✅ Program Coverage (📍 icons)
- ✅ Health Facilities (🏥 markers)

## Frequently Asked Questions

**Q: Can I use choropleth and heatmap at the same time?**  
A: No, they are mutually exclusive. When choropleth is ON, the IDW heatmap is automatically hidden.

**Q: Does choropleth work on mobile?**  
A: Yes, the choropleth is responsive and works on all devices.

**Q: Can I change the choropleth color scheme?**  
A: Currently uses a fixed red-yellow-green scheme. Custom color schemes may be added in future updates.

**Q: Why do some barangays show no color?**  
A: Barangays with no data or excluded barangays will appear with default gray/transparent fill.

**Q: Can I export the choropleth map?**  
A: Use browser screenshot tools (Windows: Win+Shift+S) to capture the map. PDF export feature may be added later.

**Q: Does prevalence rate include both SAM and MAM?**  
A: Yes, prevalence rate = (SAM + MAM) / Total Children × 100%

---

**Need Help?**  
Contact your system administrator or refer to the technical documentation in `CHOROPLETH_IMPLEMENTATION.md`

**Version**: 1.0  
**Last Updated**: 2026-07-14
