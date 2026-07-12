# Admin Map - Interactive Features

## 🎯 Overview
Admin users now have a dedicated, feature-rich map interface focused on their barangay with interactive purok exploration.

## ✨ New Features

### 1. **Hover Preview** 🖱️
When hovering over a purok polygon:
- **Instant popup** appears with quick stats
- Shows:
  - 📍 Purok name
  - 👶 Total children count
  - 🚨 Active malnutrition cases
  - ⚠️ Risk level (color-coded)
  - 🖱️ "Click for full details" hint
- **Styled tooltip**:
  - White background with orange border
  - Clean, modern design
  - Easy to read stats

### 2. **Full Details Modal** 📋
When clicking on a purok polygon:
- **Complete modal** opens with comprehensive information

#### Modal Sections:

**A. Statistics Dashboard (Top Cards)**
- 🔵 **Total Children**: All monitored children
- 🔴 **Active Cases**: SAM + MAM cases
- 🟣 **Households**: Number of families
- 🟠 **Risk Level**: Overall risk status

**B. Nutritional Status Distribution**
- 🟢 **Normal**: Healthy children count
- 🟠 **MAM**: Moderate Acute Malnutrition
- 🔴 **SAM**: Severe Acute Malnutrition
- Visual grid layout with color coding

**C. Demographics**
- 👶 **Age Groups**:
  - 0-6 months
  - 6-24 months
  - 24-59 months
- ⚤ **Gender Split**:
  - 👦 Male count
  - 👧 Female count

**D. Purok Information**
- Purok code
- Barangay name
- Leader name
- Total population
- Contact number
- Assigned BNS (Barangay Nutrition Scholar)
- Notes (if any)

**E. Children List**
- Scrollable list of all children in purok
- Shows:
  - Child name
  - Age (months) and gender icons
  - Current nutritional status (color-coded badge)
- Max height with scroll for long lists

## 🎨 Visual Design

### Color Coding
- **Orange** (#f97316): Purok boundaries
- **Green**: Normal/healthy status
- **Orange/Yellow**: Moderate risk/MAM
- **Red**: High risk/critical/SAM
- **Blue**: Information/children count
- **Purple**: Households
- **Teal**: Purok details section

### Interactions
1. **Default state**: Orange boundary, light fill
2. **Hover state**: Darker orange, brighter fill + tooltip
3. **Click**: Opens full modal overlay

### Tooltips
- **Permanent labels**: Purok names always visible on map
- **Hover tooltips**: Rich preview with stats
- **Smooth animations**: Fade in/out effects

## 🔧 Technical Implementation

### Files Modified:
- `frontend/components/map/AdminMapView.tsx`

### Key Functions:
```typescript
// Hover preview with stats
layer.bindTooltip(hoverContent, {
  permanent: false,
  direction: 'top',
  className: 'purok-hover-tooltip'
});

// Click handler for modal
layer.on('click', (e) => {
  onPurokClick(props.id, props.name);
});
```

### Data Sources:
- **Hover data**: From GeoJSON properties (backend choropleth)
- **Modal data**: From `/api/puroks/{id}` endpoint
- **Children list**: From `/api/children?purok_id={id}` query

## 📊 Data Displayed

### From Backend (`/api/puroks/{id}`):
```json
{
  "id": "uuid",
  "name": "Purok 1",
  "code": "P001",
  "barangay_name": "Poblacion 1",
  "leader": "Juan Dela Cruz",
  "population": 250,
  "contact_number": "0912-345-6789",
  "assigned_bns": "Maria Santos",
  "household_count": 50,
  "active_cases": 5,
  "risk_level": "medium",
  "nutrition_status": {
    "normal": 40,
    "at_risk": 3,
    "critical": 2
  },
  "age_distribution": {
    "0-6": 10,
    "6-24": 20,
    "24-59": 15
  },
  "gender_distribution": {
    "male": 23,
    "female": 22
  },
  "prevalence": {
    "wasting_rate": 8.5
  }
}
```

## 🚀 User Experience Flow

1. **Admin logs in** → Sees map focused on their barangay
2. **Views puroks** → Orange polygons clearly visible
3. **Hovers over purok** → Quick preview tooltip appears
4. **Clicks purok** → Full details modal opens
5. **Reviews data** → All stats, demographics, children list
6. **Closes modal** → Returns to map view
7. **Repeats** → Can explore all puroks in their barangay

## 💡 Benefits

✅ **Quick insights**: Hover for instant stats
✅ **Deep dive**: Click for comprehensive details
✅ **No page navigation**: Everything in modal
✅ **Fast interaction**: Smooth, responsive UI
✅ **Complete data**: All purok info in one place
✅ **Visual clarity**: Color-coded status indicators
✅ **Easy scanning**: Organized sections with icons
✅ **Accessible**: Large text, clear labels

## 🔍 Use Cases

### Daily Monitoring
- Quick hover to check which puroks need attention
- Click for detailed review of high-risk puroks

### Planning
- Review demographics for targeted interventions
- Check which puroks have most cases

### Reporting
- Gather comprehensive data per purok
- Export mental model for reports

### Team Coordination
- Share purok-specific data with BNS
- Identify areas needing home visits

## 📱 Responsive Design
- Works on desktop and tablets
- Modal scrolls for small screens
- Touch-friendly click areas
- Readable fonts at all sizes
