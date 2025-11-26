#!/usr/bin/env python3
"""
Test script for authentication endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_registration():
    """Test user registration"""
    print("\\n=== Testing User Registration ===")
    
    payload = {
        "email": "testuser@ezbooks.com",
        "password": "securepass123",
        "name": "Test User"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            data = response.json()
            print("✅ Registration successful!")
            print(f"User ID: {data['user']['userId']}")
            print(f"Token: {data['access_token'][:50]}...")
            return data['access_token']
        else:
            print(f"❌ Registration failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_login():
    """Test user login"""
    print("\\n=== Testing User Login ===")
    
    payload = {
        "email": "testuser@ezbooks.com",
        "password": "securepass123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=payload
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")
            print(f"Token: {data['access_token'][:50]}...")
            return data['access_token']
        else:
            print(f"❌ Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_protected_endpoint(token):
    """Test accessing protected endpoint"""
    print("\\n=== Testing Protected Endpoint (/auth/me) ===")
    
    if not token:
        print("❌ No token available")
        return
    
    try:
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Protected endpoint accessible!")
            print(f"User: {data['email']}")
            print(f"Tier: {data['tier']}")
            print(f"Usage: {data['usage']}/{data['limit']}")
        else:
            print(f"❌ Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")


def test_without_auth():
    """Test accessing protected endpoint without auth"""
    print("\\n=== Testing Without Authentication ===")
    
    try:
        response = requests.get(f"{BASE_URL}/receipts/")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401 or response.status_code == 403:
            print("✅ Correctly rejected unauthenticated request")
        else:
            print(f"⚠️  Unexpected response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("🧪 Testing EzBooks Authentication System")
    print("=" * 50)
    
    # Test registration
    token = test_registration()
    
    # Test login
    if not token:
        token = test_login()
    
    # Test protected endpoint with auth
    if token:
        test_protected_endpoint(token)
    
    # Test without auth
    test_without_auth()
    
    print("\\n" + "=" * 50)
    print("✅ Testing complete!")
