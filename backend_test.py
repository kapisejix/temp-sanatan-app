#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class SanatanSaathiAPITester:
    def __init__(self, base_url="https://integrated-platform-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_credentials = {
            "email": "admin@sanatansaathi.com",
            "password": "SanatanAdmin@2026"
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) <= 5:
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    elif isinstance(response_data, list):
                        print(f"   Response: Array with {len(response_data)} items")
                    return True, response_data
                except:
                    return True, response.text[:200]
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login and get token"""
        print("\n" + "="*50)
        print("TESTING ADMIN AUTHENTICATION")
        print("="*50)
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/admin/login",
            200,
            data=self.admin_credentials
        )
        
        if success and isinstance(response, dict) and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Token received: {self.token[:20]}...")
            return True
        else:
            print(f"   ❌ Login failed - no token in response")
            return False

    def test_dashboard_stats(self):
        """Test dashboard stats API"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD STATS")
        print("="*50)
        
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "admin/dashboard",
            200
        )
        
        if success and isinstance(response, dict):
            required_fields = ['total_content', 'published', 'draft', 'users', 'admins']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️  Missing fields: {missing_fields}")
            else:
                print(f"   ✅ All required dashboard fields present")
                print(f"   📊 Stats: {response.get('total_content', 0)} content, {response.get('users', 0)} users")
        
        return success

    def test_languages_api(self):
        """Test languages API - should return 12 languages"""
        print("\n" + "="*50)
        print("TESTING LANGUAGES API")
        print("="*50)
        
        success, response = self.run_test(
            "Languages List",
            "GET",
            "languages",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   📋 Found {len(response)} languages")
            if len(response) >= 12:
                print(f"   ✅ Expected 12+ languages, got {len(response)}")
                # Show first few languages
                for i, lang in enumerate(response[:5]):
                    if isinstance(lang, dict):
                        print(f"      {i+1}. {lang.get('label', 'Unknown')} ({lang.get('code', 'N/A')})")
            else:
                print(f"   ⚠️  Expected 12+ languages, got {len(response)}")
        
        return success

    def test_content_by_language(self):
        """Test content items by language API"""
        print("\n" + "="*50)
        print("TESTING CONTENT BY LANGUAGE")
        print("="*50)
        
        success, response = self.run_test(
            "Content Items by Language (Chalisa, Hindi)",
            "GET",
            "content/items-by-lang?category=chalisa&lang=hi",
            200
        )
        
        if success:
            if isinstance(response, dict) and 'items' in response:
                items = response['items']
                print(f"   📚 Found {len(items)} chalisa items in Hindi")
                if len(items) > 0:
                    first_item = items[0]
                    print(f"   📖 First item: {first_item.get('title_hi', 'No title')}")
            elif isinstance(response, list):
                print(f"   📚 Found {len(response)} chalisa items in Hindi")
        
        return success

    def test_preview_render(self):
        """Test preview render API"""
        print("\n" + "="*50)
        print("TESTING PREVIEW RENDER")
        print("="*50)
        
        sample_verses = [
            {
                "verse_num": 1,
                "verse_type": "shloka",
                "sanskrit_text": "श्री गुरु चरन सरोज रज, निज मन मुकुर सुधारि।",
                "transliteration": "Shri guru charan saroj raj, nij man mukur sudhari.",
                "meaning": "With the dust of Guru's lotus feet, I clean the mirror of my mind."
            }
        ]
        
        success, response = self.run_test(
            "Preview Render",
            "POST",
            "admin/preview/render",
            200,
            data={
                "title": "Test Preview",
                "verses": sample_verses,
                "language": "hi",
                "mode": "beginner"
            }
        )
        
        if success and isinstance(response, dict):
            if 'verses' in response:
                print(f"   ✅ Preview rendered with {len(response['verses'])} verses")
            else:
                print(f"   ⚠️  Preview response missing 'verses' field")
        
        return success

    def test_granth_apis(self):
        """Test Granth-related APIs"""
        print("\n" + "="*50)
        print("TESTING GRANTH APIS")
        print("="*50)
        
        # Test granth books list
        success1, books_response = self.run_test(
            "Granth Books List",
            "GET",
            "granth/books",
            200
        )
        
        book_id = None
        if success1 and isinstance(books_response, list) and len(books_response) > 0:
            book_id = books_response[0].get('_id')
            print(f"   📚 Found {len(books_response)} granth books")
            print(f"   📖 First book: {books_response[0].get('title_en', 'Unknown')}")
        
        # Test hierarchy if we have a book ID
        success2 = True
        if book_id:
            success2, hierarchy_response = self.run_test(
                f"Granth Hierarchy for book {book_id}",
                "GET",
                f"granth/hierarchy/{book_id}",
                200
            )
            
            if success2 and isinstance(hierarchy_response, dict):
                chapters = hierarchy_response.get('chapters', [])
                print(f"   📑 Found {len(chapters)} chapters in book")
                
                # Test chapter verses if we have chapters
                if len(chapters) > 0:
                    chapter_id = chapters[0].get('id')
                    if chapter_id:
                        success3, verses_response = self.run_test(
                            f"Chapter Verses for chapter {chapter_id}",
                            "GET",
                            f"granth/chapter-verses/{chapter_id}",
                            200
                        )
                        
                        if success3 and isinstance(verses_response, dict):
                            verses = verses_response.get('verses', [])
                            print(f"   📝 Found {len(verses)} verses in chapter")
        
        return success1 and success2

    def test_import_wizard_api(self):
        """Test Import Wizard API endpoint"""
        print("\n" + "="*50)
        print("TESTING IMPORT WIZARD API")
        print("="*50)
        
        # Test if the import wizard endpoint exists (we expect it might fail without file upload)
        success, response = self.run_test(
            "Import Wizard Endpoint Check",
            "POST",
            "admin/import-wizard",
            400  # Expecting 400 because we're not sending a file
        )
        
        if success:
            print(f"   ✅ Import Wizard endpoint exists and responds correctly")
        else:
            print(f"   ⚠️  Import Wizard endpoint may not be implemented")
        
        return True  # Don't fail the test suite for this

    def test_vedas_apis(self):
        """Test Vedas-related APIs"""
        print("\n" + "="*50)
        print("TESTING VEDAS APIS")
        print("="*50)
        
        # Test vedas books list - should return 4 veda books
        success1, books_response = self.run_test(
            "Vedas Books List",
            "GET",
            "vedas/books",
            200
        )
        
        veda_book_id = None
        if success1 and isinstance(books_response, list):
            print(f"   📚 Found {len(books_response)} veda books")
            if len(books_response) >= 4:
                print(f"   ✅ Expected 4+ veda books, got {len(books_response)}")
                # Look for Rig Veda specifically
                for book in books_response:
                    if 'rig' in book.get('title_en', '').lower() or 'ऋग्वेद' in book.get('title_hi', ''):
                        veda_book_id = book.get('_id')
                        print(f"   📖 Found Rig Veda: {book.get('title_en', 'Unknown')} (ID: {veda_book_id})")
                        break
                if not veda_book_id and len(books_response) > 0:
                    veda_book_id = books_response[0].get('_id')
                    print(f"   📖 Using first book: {books_response[0].get('title_en', 'Unknown')} (ID: {veda_book_id})")
            else:
                print(f"   ⚠️  Expected 4+ veda books, got {len(books_response)}")
        
        # Test hierarchy if we have a book ID
        success2 = True
        if veda_book_id:
            success2, hierarchy_response = self.run_test(
                f"Vedas Hierarchy for book {veda_book_id}",
                "GET",
                f"vedas/hierarchy/{veda_book_id}",
                200
            )
            
            if success2 and isinstance(hierarchy_response, dict):
                chapters = hierarchy_response.get('chapters', [])
                print(f"   📑 Found {len(chapters)} chapters/mandalas in book")
                
                # Test chapter verses if we have chapters
                if len(chapters) > 0:
                    chapter_id = chapters[0].get('id')
                    if chapter_id:
                        success3, verses_response = self.run_test(
                            f"Vedas Chapter Verses for chapter {chapter_id} (Hindi)",
                            "GET",
                            f"vedas/chapter-verses/{chapter_id}?lang=hi",
                            200
                        )
                        
                        if success3 and isinstance(verses_response, dict):
                            verses = verses_response.get('verses', [])
                            print(f"   📝 Found {len(verses)} verses in chapter")
                            if len(verses) > 0:
                                first_verse = verses[0]
                                print(f"   📜 First verse has Sanskrit text: {bool(first_verse.get('text_sa'))}")
                                print(f"   📜 First verse has meaning: {bool(first_verse.get('display_meaning'))}")
        
        return success1 and success2

    def test_vedachat_apis(self):
        """Test VedaChat-related APIs"""
        print("\n" + "="*50)
        print("TESTING VEDACHAT APIS")
        print("="*50)
        
        # Test knowledge stats
        success1, stats_response = self.run_test(
            "VedaChat Knowledge Stats",
            "GET",
            "vedachat/knowledge-stats",
            200
        )
        
        if success1 and isinstance(stats_response, dict):
            required_fields = ['total_documents', 'total_verses', 'total_books', 'total_content']
            missing_fields = [field for field in required_fields if field not in stats_response]
            if missing_fields:
                print(f"   ⚠️  Missing fields: {missing_fields}")
            else:
                print(f"   ✅ All required knowledge stats fields present")
                print(f"   📊 Stats: {stats_response.get('total_documents', 0)} docs, {stats_response.get('total_verses', 0)} verses, {stats_response.get('total_books', 0)} books")
        
        return success1

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Sanatan Saathi API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"👤 Admin Email: {self.admin_credentials['email']}")
        
        # Test authentication first
        if not self.test_admin_login():
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Run all other tests
        test_methods = [
            self.test_dashboard_stats,
            self.test_languages_api,
            self.test_content_by_language,
            self.test_preview_render,
            self.test_granth_apis,
            self.test_vedas_apis,
            self.test_vedachat_apis,
            self.test_import_wizard_api
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"\n❌ Test {test_method.__name__} failed with exception: {e}")
        
        # Print final results
        print("\n" + "="*60)
        print("FINAL TEST RESULTS")
        print("="*60)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"✅ Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = SanatanSaathiAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())