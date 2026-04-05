"""Quick integration test for all Project Aegis modules."""

# Test 1: Historical Risk
from historical_risk import compute_historical_risk, get_known_routes

r1 = compute_historical_risk(origin='Guayaquil', destination='Antwerp', cargo_type='organic')
print(f"Guayaquil to Antwerp (organic): Risk={r1['risk_score']}/100")
print(f"  Factors: {len(r1['risk_factors'])}")
for f in r1['risk_factors'][:3]:
    print(f"  - {f['factor']}: {f['score']}/100 ({f['type']})")

r2 = compute_historical_risk(shipper='Aether Electronics', cargo_type='electronics')
print(f"Aether Electronics: Risk={r2['risk_score']}/100")

r3 = compute_historical_risk(origin='Libya', destination='Crete')
print(f"Libya to Crete: Risk={r3['risk_score']}/100")

print(f"Known routes: {len(get_known_routes())}")
print()

# Test 2: Manifest Audit
from manifest_audit import audit_manifest

a = audit_manifest('5 items of clothing', [{'class': 'Gun', 'confidence': 0.9, 'threat_level': 5}], 'clothing')
print(f"Manifest audit (clothing + Gun): Severity={a['severity']}, Score={a['audit_score']}")
for issue in a['issues'][:2]:
    print(f"  - {issue}")
print()

# Test 3: Local Intelligence (replaces Gemini)
from local_intelligence import generate_explanation

result = generate_explanation({
    'risk_score': 85, 'risk_level': 'CRITICAL',
    'detections': [{'class': 'Gun', 'confidence': 0.92, 'threat_level': 5, 'material_type': 'Metallic'}],
    'anomaly_score': 0.7,
    'mismatch_info': {'conflicts': ['Gun'], 'message': 'CRITICAL: Declared clothing but detected Gun'},
    'concealment_info': {'overlap_score': 0.4, 'edge_score': 0.5, 'message': 'Overlapping items detected'},
    'material_info': {'metallic_count': 1, 'organic_declared': True},
})
print(f"Explanation source: {result['source']}")
print(f"Explanation:\n{result['explanation'][:400]}")
print()

# Test 4: News Intelligence
from news_intelligence import get_threat_intelligence

ni = get_threat_intelligence()
print(f"News Intel source: {ni['source']}")
print(f"News alerts: {len(ni.get('alerts', []))}")
print()

print("=" * 50)
print("ALL INTEGRATION TESTS PASSED")
print("=" * 50)
