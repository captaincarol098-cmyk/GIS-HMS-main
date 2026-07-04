from ..models import Alert
from ..models.entities import AlertType, Severity


def alerts_for_measurement(child, measurement):
    alerts = []
    if measurement.whz_status == "severely_wasted":
        alerts.append(Alert(child_id=child.id, measurement_id=measurement.id, alert_type=AlertType.severe_wasting, severity=Severity.critical, message=f"{child.full_name} has severe wasting and needs immediate intervention."))
    if measurement.haz_status == "severely_stunted":
        alerts.append(Alert(child_id=child.id, measurement_id=measurement.id, alert_type=AlertType.severe_stunting, severity=Severity.high, message=f"{child.full_name} is severely stunted."))
    if measurement.waz_status == "severely_underweight":
        alerts.append(Alert(child_id=child.id, measurement_id=measurement.id, alert_type=AlertType.severe_underweight, severity=Severity.high, message=f"{child.full_name} is severely underweight."))
    return alerts
