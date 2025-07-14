#!/usr/bin/env python3
"""
Backend API Testing Suite for Rewards and Recognition System
Tests all backend components systematically
"""

import requests
import json
import time
from typing import Dict, Any, Optional

# Configuration
BACKEND_URL = "https://5bd755cb-8dfc-4f2c-a17b-2ac9828a6e03.preview.emergentagent.com/api"
TEST_USER_EMAIL = "sarah.johnson@techcorp.com"
TEST_USER_PASSWORD = "SecurePass123!"
TEST_USER_FIRST_NAME = "Sarah"
TEST_USER_LAST_NAME = "Johnson"
TEST_USER_DEPARTMENT = "Engineering"
TEST_USER_COMPANY = "TechCorp Solutions"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = {}
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test results"""
        self.test_results[test_name] = {
            "success": success,
            "message": message,
            "details": details
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_user_registration(self) -> bool:
        """Test user registration endpoint"""
        print("\n=== Testing User Registration ===")
        
        registration_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "first_name": TEST_USER_FIRST_NAME,
            "last_name": TEST_USER_LAST_NAME,
            "department": TEST_USER_DEPARTMENT,
            "company": TEST_USER_COMPANY
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/register",
                json=registration_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 201 or response.status_code == 200:
                user_data = response.json()
                self.user_id = user_data.get("id")
                
                # Verify response structure
                required_fields = ["id", "email", "first_name", "last_name", "role", "points_balance"]
                missing_fields = [field for field in required_fields if field not in user_data]
                
                if missing_fields:
                    self.log_test("User Registration", False, f"Missing fields in response: {missing_fields}", user_data)
                    return False
                
                # Verify data integrity
                if user_data["email"] != TEST_USER_EMAIL:
                    self.log_test("User Registration", False, "Email mismatch in response", user_data)
                    return False
                
                self.log_test("User Registration", True, "User registered successfully", user_data)
                return True
                
            elif response.status_code == 400 and "already registered" in response.text:
                self.log_test("User Registration", True, "User already exists (expected for repeated tests)", response.json())
                return True
            else:
                self.log_test("User Registration", False, f"Registration failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("User Registration", False, f"Registration request failed: {str(e)}")
            return False
    
    def test_user_login(self) -> bool:
        """Test user login and JWT token generation"""
        print("\n=== Testing User Login ===")
        
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                token_data = response.json()
                
                # Verify token response structure
                required_fields = ["access_token", "token_type", "expires_in"]
                missing_fields = [field for field in required_fields if field not in token_data]
                
                if missing_fields:
                    self.log_test("User Login", False, f"Missing fields in token response: {missing_fields}", token_data)
                    return False
                
                if token_data["token_type"] != "bearer":
                    self.log_test("User Login", False, "Invalid token type", token_data)
                    return False
                
                self.auth_token = token_data["access_token"]
                self.log_test("User Login", True, "Login successful, JWT token generated", {"token_length": len(self.auth_token)})
                return True
            else:
                self.log_test("User Login", False, f"Login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Login request failed: {str(e)}")
            return False
    
    def test_jwt_authentication(self) -> bool:
        """Test JWT token validation with protected endpoint"""
        print("\n=== Testing JWT Authentication ===")
        
        if not self.auth_token:
            self.log_test("JWT Authentication", False, "No auth token available")
            return False
        
        try:
            # Test with valid token
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{BACKEND_URL}/users/me", headers=headers)
            
            if response.status_code == 200:
                user_data = response.json()
                if user_data.get("email") == TEST_USER_EMAIL:
                    self.log_test("JWT Authentication", True, "JWT token validation successful", {"user_id": user_data.get("id")})
                    self.user_id = user_data.get("id")
                    
                    # Test with invalid token
                    invalid_headers = {"Authorization": "Bearer invalid_token"}
                    invalid_response = self.session.get(f"{BACKEND_URL}/users/me", headers=invalid_headers)
                    
                    if invalid_response.status_code == 401:
                        self.log_test("JWT Authentication - Invalid Token", True, "Invalid token properly rejected")
                        return True
                    else:
                        self.log_test("JWT Authentication - Invalid Token", False, "Invalid token not properly rejected", invalid_response.status_code)
                        return False
                else:
                    self.log_test("JWT Authentication", False, "Token validation returned wrong user", user_data)
                    return False
            else:
                self.log_test("JWT Authentication", False, f"Token validation failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("JWT Authentication", False, f"JWT authentication test failed: {str(e)}")
            return False
    
    def test_user_profile_management(self) -> bool:
        """Test user profile retrieval and updates"""
        print("\n=== Testing User Profile Management ===")
        
        if not self.auth_token:
            self.log_test("User Profile Management", False, "No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            # Test profile retrieval
            response = self.session.get(f"{BACKEND_URL}/users/me", headers=headers)
            
            if response.status_code != 200:
                self.log_test("User Profile Management", False, f"Profile retrieval failed with status {response.status_code}", response.text)
                return False
            
            profile_data = response.json()
            original_department = profile_data.get("department")
            
            # Test profile update
            update_data = {
                "department": "Product Management",
                "company": "TechCorp Solutions Updated"
            }
            
            update_response = self.session.put(
                f"{BACKEND_URL}/users/me",
                json=update_data,
                headers={**headers, "Content-Type": "application/json"}
            )
            
            if update_response.status_code == 200:
                updated_profile = update_response.json()
                
                if (updated_profile.get("department") == "Product Management" and 
                    updated_profile.get("company") == "TechCorp Solutions Updated"):
                    self.log_test("User Profile Management", True, "Profile update successful", updated_profile)
                    return True
                else:
                    self.log_test("User Profile Management", False, "Profile update data mismatch", updated_profile)
                    return False
            else:
                self.log_test("User Profile Management", False, f"Profile update failed with status {update_response.status_code}", update_response.text)
                return False
                
        except Exception as e:
            self.log_test("User Profile Management", False, f"Profile management test failed: {str(e)}")
            return False
    
    def test_user_preferences_system(self) -> bool:
        """Test user preferences update and retrieval"""
        print("\n=== Testing User Preferences System ===")
        
        if not self.auth_token:
            self.log_test("User Preferences System", False, "No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}", "Content-Type": "application/json"}
        
        try:
            # Test preferences categories endpoint
            categories_response = self.session.get(f"{BACKEND_URL}/preferences/categories")
            if categories_response.status_code != 200:
                self.log_test("User Preferences System", False, "Categories endpoint failed", categories_response.text)
                return False
            
            categories = categories_response.json()
            if not isinstance(categories, list) or len(categories) == 0:
                self.log_test("User Preferences System", False, "Invalid categories response", categories)
                return False
            
            # Test reward types endpoint
            reward_types_response = self.session.get(f"{BACKEND_URL}/preferences/reward-types")
            if reward_types_response.status_code != 200:
                self.log_test("User Preferences System", False, "Reward types endpoint failed", reward_types_response.text)
                return False
            
            reward_types = reward_types_response.json()
            if not isinstance(reward_types, list) or len(reward_types) == 0:
                self.log_test("User Preferences System", False, "Invalid reward types response", reward_types)
                return False
            
            # Test preferences update
            preferences_data = {
                "categories": ["electronics", "fitness", "education"],
                "price_range": {"min": 25.0, "max": 500.0},
                "interests": ["technology", "health", "learning"],
                "gift_occasions": ["birthday", "work anniversary", "achievement"],
                "reward_types": ["physical_product", "digital_product", "experience"],
                "notification_preferences": {
                    "email_notifications": True,
                    "recognition_alerts": True,
                    "recommendation_updates": False
                }
            }
            
            update_response = self.session.put(
                f"{BACKEND_URL}/users/me/preferences",
                json=preferences_data,
                headers=headers
            )
            
            if update_response.status_code == 200:
                updated_user = update_response.json()
                user_preferences = updated_user.get("preferences", {})
                
                # Verify preferences were saved correctly
                if (user_preferences.get("categories") == preferences_data["categories"] and
                    user_preferences.get("price_range") == preferences_data["price_range"]):
                    self.log_test("User Preferences System", True, "Preferences updated successfully", user_preferences)
                    return True
                else:
                    self.log_test("User Preferences System", False, "Preferences update data mismatch", user_preferences)
                    return False
            else:
                self.log_test("User Preferences System", False, f"Preferences update failed with status {update_response.status_code}", update_response.text)
                return False
                
        except Exception as e:
            self.log_test("User Preferences System", False, f"Preferences system test failed: {str(e)}")
            return False
    
    def test_rewards_catalog_management(self) -> bool:
        """Test rewards listing, filtering, and sample data seeding"""
        print("\n=== Testing Rewards Catalog Management ===")
        
        try:
            # Test admin seed rewards functionality
            seed_response = self.session.post(f"{BACKEND_URL}/admin/seed-rewards")
            
            if seed_response.status_code != 200:
                self.log_test("Rewards Catalog Management", False, f"Seed rewards failed with status {seed_response.status_code}", seed_response.text)
                return False
            
            # Wait a moment for data to be inserted
            time.sleep(1)
            
            # Test rewards listing
            rewards_response = self.session.get(f"{BACKEND_URL}/rewards")
            
            if rewards_response.status_code != 200:
                self.log_test("Rewards Catalog Management", False, f"Rewards listing failed with status {rewards_response.status_code}", rewards_response.text)
                return False
            
            rewards = rewards_response.json()
            if not isinstance(rewards, list) or len(rewards) == 0:
                self.log_test("Rewards Catalog Management", False, "No rewards found after seeding", rewards)
                return False
            
            # Test filtering by category
            category_response = self.session.get(f"{BACKEND_URL}/rewards?category=electronics")
            if category_response.status_code == 200:
                category_rewards = category_response.json()
                electronics_rewards = [r for r in category_rewards if r.get("category") == "electronics"]
                
                if len(electronics_rewards) > 0:
                    self.log_test("Rewards Catalog - Category Filter", True, f"Found {len(electronics_rewards)} electronics rewards")
                else:
                    self.log_test("Rewards Catalog - Category Filter", False, "No electronics rewards found", category_rewards)
            
            # Test filtering by reward type
            type_response = self.session.get(f"{BACKEND_URL}/rewards?reward_type=physical_product")
            if type_response.status_code == 200:
                type_rewards = type_response.json()
                physical_rewards = [r for r in type_rewards if r.get("reward_type") == "physical_product"]
                
                if len(physical_rewards) > 0:
                    self.log_test("Rewards Catalog - Type Filter", True, f"Found {len(physical_rewards)} physical product rewards")
                else:
                    self.log_test("Rewards Catalog - Type Filter", False, "No physical product rewards found", type_rewards)
            
            # Verify reward structure
            sample_reward = rewards[0]
            required_fields = ["id", "title", "description", "category", "reward_type", "points_required", "price"]
            missing_fields = [field for field in required_fields if field not in sample_reward]
            
            if missing_fields:
                self.log_test("Rewards Catalog Management", False, f"Missing fields in reward structure: {missing_fields}", sample_reward)
                return False
            
            self.log_test("Rewards Catalog Management", True, f"Rewards catalog working correctly with {len(rewards)} rewards", {"sample_reward": sample_reward})
            return True
            
        except Exception as e:
            self.log_test("Rewards Catalog Management", False, f"Rewards catalog test failed: {str(e)}")
            return False
    
    def test_recommendation_engine(self) -> bool:
        """Test personalized recommendations based on user preferences"""
        print("\n=== Testing Recommendation Engine ===")
        
        if not self.auth_token:
            self.log_test("Recommendation Engine", False, "No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            # Get recommendations
            recommendations_response = self.session.get(f"{BACKEND_URL}/recommendations", headers=headers)
            
            if recommendations_response.status_code != 200:
                self.log_test("Recommendation Engine", False, f"Recommendations failed with status {recommendations_response.status_code}", recommendations_response.text)
                return False
            
            recommendations_data = recommendations_response.json()
            
            # Verify response structure
            required_fields = ["rewards", "reason", "confidence_score"]
            missing_fields = [field for field in required_fields if field not in recommendations_data]
            
            if missing_fields:
                self.log_test("Recommendation Engine", False, f"Missing fields in recommendations response: {missing_fields}", recommendations_data)
                return False
            
            rewards = recommendations_data.get("rewards", [])
            confidence_score = recommendations_data.get("confidence_score", 0)
            reason = recommendations_data.get("reason", "")
            
            # Verify recommendations structure
            if not isinstance(rewards, list):
                self.log_test("Recommendation Engine", False, "Rewards should be a list", recommendations_data)
                return False
            
            if not (0 <= confidence_score <= 1):
                self.log_test("Recommendation Engine", False, f"Invalid confidence score: {confidence_score}", recommendations_data)
                return False
            
            if not reason:
                self.log_test("Recommendation Engine", False, "Missing recommendation reason", recommendations_data)
                return False
            
            # Test that recommendations respect user preferences (if any rewards returned)
            if len(rewards) > 0:
                sample_reward = rewards[0]
                required_reward_fields = ["id", "title", "category", "reward_type", "price"]
                missing_reward_fields = [field for field in required_reward_fields if field not in sample_reward]
                
                if missing_reward_fields:
                    self.log_test("Recommendation Engine", False, f"Missing fields in recommended reward: {missing_reward_fields}", sample_reward)
                    return False
            
            self.log_test("Recommendation Engine", True, f"Recommendations working correctly with {len(rewards)} recommendations", {
                "confidence_score": confidence_score,
                "reason": reason,
                "reward_count": len(rewards)
            })
            return True
            
        except Exception as e:
            self.log_test("Recommendation Engine", False, f"Recommendation engine test failed: {str(e)}")
            return False
    
    def test_database_models(self) -> bool:
        """Verify all models are properly structured by testing data integrity"""
        print("\n=== Testing Database Models ===")
        
        try:
            # Test User model through registration response
            if "User Registration" in self.test_results and self.test_results["User Registration"]["success"]:
                user_data = self.test_results["User Registration"]["details"]
                
                # Verify User model fields
                user_required_fields = ["id", "email", "first_name", "last_name", "role", "points_balance", "created_at"]
                user_missing_fields = [field for field in user_required_fields if field not in user_data]
                
                if user_missing_fields:
                    self.log_test("Database Models - User", False, f"User model missing fields: {user_missing_fields}")
                    return False
                
                # Verify data types
                if not isinstance(user_data.get("points_balance"), int):
                    self.log_test("Database Models - User", False, "points_balance should be integer")
                    return False
                
                self.log_test("Database Models - User", True, "User model structure validated")
            
            # Test Reward model through rewards listing
            if "Rewards Catalog Management" in self.test_results and self.test_results["Rewards Catalog Management"]["success"]:
                reward_data = self.test_results["Rewards Catalog Management"]["details"]["sample_reward"]
                
                # Verify Reward model fields
                reward_required_fields = ["id", "title", "description", "category", "reward_type", "points_required", "price", "created_at"]
                reward_missing_fields = [field for field in reward_required_fields if field not in reward_data]
                
                if reward_missing_fields:
                    self.log_test("Database Models - Reward", False, f"Reward model missing fields: {reward_missing_fields}")
                    return False
                
                # Verify data types
                if not isinstance(reward_data.get("points_required"), int):
                    self.log_test("Database Models - Reward", False, "points_required should be integer")
                    return False
                
                if not isinstance(reward_data.get("price"), (int, float)):
                    self.log_test("Database Models - Reward", False, "price should be numeric")
                    return False
                
                self.log_test("Database Models - Reward", True, "Reward model structure validated")
            
            # Test UserPreferences model through preferences update
            if "User Preferences System" in self.test_results and self.test_results["User Preferences System"]["success"]:
                preferences_data = self.test_results["User Preferences System"]["details"]
                
                # Verify UserPreferences structure
                expected_preference_fields = ["categories", "price_range", "interests", "reward_types"]
                preferences_missing_fields = [field for field in expected_preference_fields if field not in preferences_data]
                
                if preferences_missing_fields:
                    self.log_test("Database Models - UserPreferences", False, f"UserPreferences model missing fields: {preferences_missing_fields}")
                    return False
                
                # Verify price_range structure
                price_range = preferences_data.get("price_range", {})
                if not isinstance(price_range, dict) or "min" not in price_range or "max" not in price_range:
                    self.log_test("Database Models - UserPreferences", False, "Invalid price_range structure")
                    return False
                
                self.log_test("Database Models - UserPreferences", True, "UserPreferences model structure validated")
            
            self.log_test("Database Models", True, "All database models properly structured and validated")
            return True
            
        except Exception as e:
            self.log_test("Database Models", False, f"Database models test failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🚀 Starting Backend API Testing Suite")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test sequence based on dependencies
        test_sequence = [
            ("User Authentication System", [
                self.test_user_registration,
                self.test_user_login,
                self.test_jwt_authentication
            ]),
            ("User Profile Management", [self.test_user_profile_management]),
            ("User Preferences System", [self.test_user_preferences_system]),
            ("Rewards Catalog Management", [self.test_rewards_catalog_management]),
            ("Recommendation Engine", [self.test_recommendation_engine]),
            ("Database Models", [self.test_database_models])
        ]
        
        overall_results = {}
        
        for component_name, tests in test_sequence:
            print(f"\n{'='*20} {component_name} {'='*20}")
            component_success = True
            
            for test_func in tests:
                try:
                    result = test_func()
                    if not result:
                        component_success = False
                except Exception as e:
                    print(f"❌ FAIL {test_func.__name__}: Unexpected error - {str(e)}")
                    component_success = False
            
            overall_results[component_name] = component_success
        
        # Print summary
        print("\n" + "="*60)
        print("🏁 BACKEND TESTING SUMMARY")
        print("="*60)
        
        total_tests = len(overall_results)
        passed_tests = sum(1 for success in overall_results.values() if success)
        
        for component, success in overall_results.items():
            status = "✅ WORKING" if success else "❌ FAILED"
            print(f"{status} {component}")
        
        print(f"\nOverall Result: {passed_tests}/{total_tests} components working")
        
        if passed_tests == total_tests:
            print("🎉 All backend components are working correctly!")
        else:
            print("⚠️  Some backend components need attention")
        
        return overall_results

def main():
    """Main test execution"""
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Return exit code based on results
    all_passed = all(results.values())
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit(main())