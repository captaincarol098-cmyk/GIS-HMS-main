from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import Alert, Barangay, Child, Measurement, Purok, User
from ..routers.barangays import feature
from ..services.analytics import latest_measurements, EXCLUDED_BARANGAYS
from ..utils.who_zscore import calculate_prevalence, classify_risk_level
from sqlalchemy.orm import selectinload
from ..routers.children import age_months


router = APIRouter(prefix="/api/maps", tags=["maps"])


@router.get("/heatmap-points")
async def heatmap_points(barangay_id: UUID | None = None, indicator: str = "wasting", db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role.value == "admin":
        barangay_id = user.barangay_id
    rows = await latest_measurements(db, barangay_id)
    points = []
    for m in rows:
        status = {"wasting": m.whz_status.value, "stunting": m.haz_status.value, "underweight": m.waz_status.value}.get(indicator, m.whz_status.value)
        intensity = 1.0 if status.startswith("severely") else 0.6 if status in {"wasted", "stunted", "underweight"} else 0
        points.append({"lat": m.child.latitude, "lng": m.child.longitude, "intensity": intensity})
    return points


def purok_feature(obj, lat: float, lng: float, props: dict):
    """Create a feature for a purok, using actual geometry if available"""
    # Priority 1: Use actual purok geometry if available
    if obj.geometry and obj.geometry.get("type") == "Polygon":
        return {
            "type": "Feature", 
            "geometry": obj.geometry, 
            "properties": {"id": str(obj.id), "featureType": "purok", **props}
        }
    
    # Priority 2: Create a small square marker around the centroid for puroks without geometry
    hw = 0.003  # Small square for visual marker
    hh = 0.003
    geometry = {
        "type": "Polygon",
        "coordinates": [[[
            lng - hw, lat - hh
        ], [
            lng + hw, lat - hh
        ], [
            lng + hw, lat + hh
        ], [
            lng - hw, lat + hh
        ], [
            lng - hw, lat - hh
        ]]]
    }
    return {"type": "Feature", "geometry": geometry, "properties": {"id": str(obj.id), "featureType": "purok", **props}}


@router.get("/barangay-boundary")
async def get_barangay_boundary(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Get the boundary polygon of the admin's assigned barangay.
    Only for barangay admins - returns their barangay boundary for map display.
    """
    if user.role.value != "admin":
        return {"error": "Only barangay admins can access this endpoint"}
    
    if not user.barangay_id:
        return {"error": "User not assigned to a barangay"}
    
    # Get the barangay
    barangay = await db.get(Barangay, user.barangay_id)
    
    if not barangay:
        return {"error": "Barangay not found"}
    
    # Get measurements for statistics
    measurements = await latest_measurements(db, user.barangay_id)
    prevalence = calculate_prevalence(measurements)
    
    severe_count = sum(1 for m in measurements if m.overall_status.value == "severe_acute_malnutrition")
    moderate_count = sum(1 for m in measurements if m.overall_status.value == "moderate_acute_malnutrition")
    malnutrition_count = severe_count + moderate_count
    total_children = prevalence["sample_size"]
    malnutrition_rate = round((malnutrition_count / total_children * 100), 1) if total_children else 0
    
    # Determine risk level
    if malnutrition_rate >= 30:
        risk_level = "critical"
    elif malnutrition_rate >= 15:
        risk_level = "high"
    else:
        risk_level = "low"
    
    # Get centroid
    lat, lng = 9.118, 125.565
    if barangay.geometry and "coordinates" in barangay.geometry:
        coords = barangay.geometry["coordinates"][0][0][0]
        lng, lat = coords[0], coords[1]
    
    # Return barangay boundary as GeoJSON feature
    return {
        "type": "Feature",
        "geometry": barangay.geometry if barangay.geometry else None,
        "properties": {
            "id": str(barangay.id),
            "name": barangay.name,
            "risk_level": risk_level,
            "prevalence_rate": malnutrition_rate,
            "wasting_rate": prevalence["wasting_rate"],
            "stunting_rate": prevalence["stunting_rate"],
            "underweight_rate": prevalence["underweight_rate"],
            "total_children": total_children,
            "malnutrition_count": malnutrition_count,
            "moderate_count": moderate_count,
            "severe_count": severe_count,
            "lat": lat,
            "lng": lng,
        }
    }


@router.get("/barangay-choropleth")
async def barangay_choropleth(barangay_name: str | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    features = []
    if user.role.value == "super_admin":
        # Exclude barangays not part of Cabadbaran City (e.g. Concepcion)
        query = select(Barangay).where(Barangay.name.notin_(EXCLUDED_BARANGAYS)).order_by(Barangay.name)
        
        # If a specific barangay is requested, filter to it
        if barangay_name:
            query = query.where(Barangay.name == barangay_name)
        
        barangays = (await db.scalars(query)).all()
        
        # OPTIMIZATION: Fetch all latest measurements in ONE query (not per-barangay loop)
        all_measurements = await latest_measurements(db, None)  # No barangay filter = all
        measurements_by_barangay = {}
        for m in all_measurements:
            b_id = m.child.barangay_id
            if b_id not in measurements_by_barangay:
                measurements_by_barangay[b_id] = []
            measurements_by_barangay[b_id].append(m)
        
        # OPTIMIZATION: Batch query alert counts (not per-barangay queries)
        alert_counts_stmt = (
            select(Child.barangay_id, func.count(Alert.id).label("alert_count"))
            .select_from(Alert)
            .join(Child, Child.id == Alert.child_id)
            .where(Alert.is_resolved.is_(False))
            .group_by(Child.barangay_id)
        )
        alert_counts_rows = await db.execute(alert_counts_stmt)
        alert_counts_map = {row[0]: row[1] for row in alert_counts_rows}
        
        for b in barangays:
            # Use pre-fetched measurements
            measurements = measurements_by_barangay.get(b.id, [])
            prevalence = calculate_prevalence(measurements)
            severe_count = sum(1 for m in measurements if m.overall_status.value == "severe_acute_malnutrition")
            moderate_count = sum(1 for m in measurements if m.overall_status.value == "moderate_acute_malnutrition")
            malnutrition_count = severe_count + moderate_count
            total_children = prevalence["sample_size"]
            malnutrition_rate = round((malnutrition_count / total_children * 100), 1) if total_children else 0
            
            # Hotspot Detection Thresholds for Map Visualization
            # High Risk (Red): ≥ 30%
            # Medium Risk (Yellow): 15-29%
            # Low Risk (Green): < 15%
            if malnutrition_rate >= 30:
                risk_level = "critical"  # Red on map
            elif malnutrition_rate >= 15:
                risk_level = "high"  # Yellow on map
            else:
                risk_level = "low"  # Green on map
            
            # Use pre-fetched alert counts
            alert_count = alert_counts_map.get(b.id, 0)
            
            # Use centroid coordinates for static markers on maps
            lat, lng = 9.118, 125.565
            if b.geometry and "coordinates" in b.geometry:
                coords = b.geometry["coordinates"][0][0][0]
                lng, lat = coords[0], coords[1]
                
            features.append(feature(b, {
                "name": b.name,
                "risk_level": risk_level,
                "prevalence_rate": malnutrition_rate,
                "wasting_rate": prevalence["wasting_rate"],
                "total_children": total_children,
                "malnutrition_count": malnutrition_count,
                "moderate_count": moderate_count,
                "severe_count": severe_count,
                "alert_count": alert_count,
                "lat": lat,
                "lng": lng,
            }))
    elif user.role.value == "admin":
        # Get parent barangay for boundary display
        parent_brgy = await db.get(Barangay, user.barangay_id)
        fallback_lat, fallback_lng = 9.118, 125.565
        
        # Add the barangay boundary as a feature so admin sees their barangay polygon
        if parent_brgy and parent_brgy.geometry:
            # Get barangay measurements for stats
            measurements = await latest_measurements(db, user.barangay_id)
            prevalence = calculate_prevalence(measurements)
            severe_count = sum(1 for m in measurements if m.overall_status.value == "severe_acute_malnutrition")
            moderate_count = sum(1 for m in measurements if m.overall_status.value == "moderate_acute_malnutrition")
            malnutrition_count = severe_count + moderate_count
            total_children = prevalence["sample_size"]
            malnutrition_rate = round((malnutrition_count / total_children * 100), 1) if total_children else 0
            
            if malnutrition_rate >= 30:
                risk_level = "critical"
            elif malnutrition_rate >= 15:
                risk_level = "high"
            else:
                risk_level = "low"
            
            # Get barangay center coordinates
            coords = parent_brgy.geometry["coordinates"][0][0][0]
            fallback_lng, fallback_lat = coords[0], coords[1]
            
            # Add barangay boundary feature
            features.append(feature(parent_brgy, {
                "name": parent_brgy.name,
                "risk_level": risk_level,
                "prevalence_rate": malnutrition_rate,
                "wasting_rate": prevalence["wasting_rate"],
                "total_children": total_children,
                "malnutrition_count": malnutrition_count,
                "moderate_count": moderate_count,
                "severe_count": severe_count,
                "alert_count": 0,
                "lat": fallback_lat,
                "lng": fallback_lng,
            }))
        
        # Get puroks
        puroks = (await db.scalars(select(Purok).where(Purok.barangay_id == user.barangay_id).order_by(Purok.name))).all()
        measurements = await latest_measurements(db, user.barangay_id)
            
        def get_centroid_from_polygon(geometry: dict) -> tuple[float, float] | None:
            """Extract centroid from polygon geometry"""
            if not geometry or geometry.get("type") != "Polygon":
                return None
            coords = geometry.get("coordinates", [[]])[0]
            if not coords:
                return None
            # Calculate centroid using the average of all points
            lats = [c[1] for c in coords]
            lngs = [c[0] for c in coords]
            return (sum(lats) / len(lats), sum(lngs) / len(lngs))
        
        for p in puroks:
            subset = [m for m in measurements if m.child.purok_id == p.id]
            prevalence = calculate_prevalence(subset)
            severe_count = sum(1 for m in subset if m.overall_status.value == "severe_acute_malnutrition")
            moderate_count = sum(1 for m in subset if m.overall_status.value == "moderate_acute_malnutrition")
            malnutrition_count = severe_count + moderate_count
            total_children = prevalence["sample_size"]
            malnutrition_rate = round((malnutrition_count / total_children * 100), 1) if total_children else 0
            
            # Hotspot Detection Thresholds for Map Visualization
            # High Risk (Red): ≥ 30%
            # Medium Risk (Yellow): 15-29%
            # Low Risk (Green): < 15%
            if malnutrition_rate >= 30:
                risk_level = "critical"  # Red on map
            elif malnutrition_rate >= 15:
                risk_level = "high"  # Yellow on map
            else:
                risk_level = "low"  # Green on map
            
            # Priority 1: Get centroid from child measurements (most accurate)
            lats = [m.child.latitude for m in subset if m.child.latitude]
            lngs = [m.child.longitude for m in subset if m.child.longitude]
            if lats:
                p_lat = sum(lats) / len(lats)
                p_lng = sum(lngs) / len(lngs)
            # Priority 2: Get centroid from purok geometry (fallback)
            elif p.geometry:
                centroid = get_centroid_from_polygon(p.geometry)
                if centroid:
                    p_lat, p_lng = centroid
                else:
                    p_lat = fallback_lat
                    p_lng = fallback_lng
            # Priority 3: Use barangay fallback
            else:
                p_lat = fallback_lat
                p_lng = fallback_lng
                
            features.append(purok_feature(p, p_lat, p_lng, {
                "name": p.name,
                "risk_level": risk_level,
                "prevalence_rate": malnutrition_rate,
                "wasting_rate": prevalence["wasting_rate"],
                "total_children": total_children,
                "malnutrition_count": malnutrition_count,
                "moderate_count": moderate_count,
                "severe_count": severe_count,
                "alert_count": 0,
                "lat": p_lat,
                "lng": p_lng,
            }))
    return {"type": "FeatureCollection", "features": features}


@router.get("/child-markers")
async def child_markers(barangay_id: UUID | None = None, status_filter: str | None = None, show_sam_only: bool = False, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role.value == "admin":
        barangay_id = user.barangay_id
    stmt = (
        select(Child)
        .options(selectinload(Child.measurements))
        .join(Barangay, Barangay.id == Child.barangay_id)
        .where(Child.is_active.is_(True))
        .where(Barangay.name.notin_(EXCLUDED_BARANGAYS))
    )
    if barangay_id:
        stmt = stmt.where(Child.barangay_id == barangay_id)
    children = (await db.scalars(stmt)).all()
    out = []
    for c in children:
        latest = sorted(c.measurements, key=lambda m: m.measurement_date, reverse=True)[0] if c.measurements else None
        status = latest.overall_status.value if latest else "normal"
        if show_sam_only and status != "severe_acute_malnutrition":
            continue
        if status_filter and status != status_filter:
            continue
        out.append({
            "id": str(c.id),
            "name": c.full_name,
            "lat": c.latitude,
            "lng": c.longitude,
            "overall_status": status,
            "age_months": latest.age_in_months if latest else age_months(c.birth_date),
            "last_measured": latest.measurement_date if latest else None
        })
    return out


@router.get("/cluster-summary")
async def cluster_summary(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Purok)
    if user.role.value == "admin":
        stmt = stmt.where(Purok.barangay_id == user.barangay_id)
    rows = []
    measurements = await latest_measurements(db, user.barangay_id if user.role.value == "admin" else None)
    for p in (await db.scalars(stmt)).all():
        subset = [m for m in measurements if m.child.purok_id == p.id]
        prevalence = calculate_prevalence(subset)
        rows.append({"purok_id": str(p.id), "name": p.name, "centroid_lat": 9.1833, "centroid_lng": 125.5333, "child_count": len(subset), "malnutrition_count": sum(1 for m in subset if m.overall_status.value != "normal"), "prevalence_rate": prevalence["wasting_rate"], "risk_level": classify_risk_level(prevalence)})
    return rows



# ─── GIS ACCURACY ENDPOINTS ────────────────────────────────────────────────────

@router.get("/accuracy/{barangay_id}")
async def get_accuracy(
    barangay_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get latest GIS accuracy for a barangay"""
    from ..services.accuracy import get_latest_accuracy
    
    accuracy = await get_latest_accuracy(db, barangay_id)
    
    if not accuracy:
        return {
            "accuracy_pct": 0,
            "is_reliable": False,
            "message": "No accuracy data available - please verify children count"
        }
    
    return accuracy


@router.get("/accuracy-history/{barangay_id}")
async def get_accuracy_history(
    barangay_id: UUID,
    limit: int = 12,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get accuracy history for a barangay"""
    from ..services.accuracy import get_accuracy_history
    
    history = await get_accuracy_history(db, barangay_id, limit)
    return {"barangay_id": str(barangay_id), "history": history}


@router.get("/accuracy-all")
async def get_all_accuracy(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get latest accuracy for all barangays (super admin only)"""
    from ..services.accuracy import get_all_barangay_accuracy
    
    if user.role.value != "super_admin":
        return {"error": "Only super admin can view all accuracies"}
    
    accuracies = await get_all_barangay_accuracy(db)
    return {"total": len(accuracies), "accuracies": accuracies}


@router.post("/verify-children/{barangay_id}")
async def verify_children_count(
    barangay_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Mark verified count for barangay and calculate accuracy.
    Super admin only.
    
    Request body:
    {
        "verified_count": 150,
        "notes": "Verified on 2026-06-28 by admin"
    }
    """
    from ..services.accuracy import calculate_accuracy
    from datetime import date
    
    # Only super admin can verify
    if user.role.value != "super_admin":
        return {"error": "Only super admin can verify children count"}
    
    verified_count = int(body.get("verified_count", 0))
    notes = body.get("notes", "")
    
    if verified_count <= 0:
        return {"error": "verified_count must be greater than 0"}
    
    try:
        # Calculate and store accuracy
        accuracy = await calculate_accuracy(
            db,
            barangay_id,
            date.today(),
            verified_count,
            created_by_user_id=user.id,
            notes=notes
        )
        
        return {
            "success": True,
            "data": accuracy
        }
    except Exception as e:
        return {
            "error": f"Failed to verify: {str(e)}"
        }
