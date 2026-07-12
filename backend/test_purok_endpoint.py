"""
Quick test script to verify purok endpoint is working
Run this after starting the backend server:
python test_purok_endpoint.py
"""
import requests

BASE_URL = "http://localhost:8200"

# Test health endpoint first
try:
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"✅ Health check: {response.json()}")
except Exception as e:
    print(f"❌ Backend not running: {e}")
    exit(1)

# Test purok list endpoint
try:
    response = requests.get(f"{BASE_URL}/api/puroks")
    if response.status_code == 200:
        puroks = response.json()
        print(f"✅ Purok list: Found {len(puroks)} puroks")
        if puroks:
            first_purok = puroks[0]
            print(f"   First purok: {first_purok.get('name')} - Barangay: {first_purok.get('barangay_name', 'MISSING')}")
            
            # Test detail endpoint
            purok_id = first_purok.get('id')
            detail_response = requests.get(f"{BASE_URL}/api/puroks/{purok_id}")
            if detail_response.status_code == 200:
                detail = detail_response.json()
                print(f"✅ Purok detail: {detail.get('name')} - Barangay: {detail.get('barangay_name', 'MISSING')}")
            else:
                print(f"❌ Purok detail failed: {detail_response.status_code}")
                print(f"   Error: {detail_response.text}")
    else:
        print(f"❌ Purok list failed: {response.status_code}")
        print(f"   Error: {response.text}")
except Exception as e:
    print(f"❌ Test failed: {e}")
