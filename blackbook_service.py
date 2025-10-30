import os
import re
import requests
from typing import Dict, Any
import base64


class BlackbookService:
    VIN_PATTERN = re.compile(r'^[A-HJ-NPR-Z0-9]{17}$')
    
    KM_TO_MILES = 0.621371  # Conversion factor
    MILES_TO_KM = 1.60934   # Conversion factor

    def __init__(self):
        self.blackbook_id = os.getenv('BLACKBOOK_ID')
        self.blackbook_password = os.getenv('BLACKBOOK_PASSWORD')
        self.graphql_url = os.getenv('BLACKBOOK_GRAPHQL_URL')
    
    def _convert_km_to_miles(self, km: int) -> int:
        """Convert kilometres to miles for Blackbook API (U.S.-based system)"""
        return int(km * self.KM_TO_MILES)
    
    def _convert_miles_to_km(self, miles: int) -> int:
        """Convert miles to kilometres for display"""
        return int(miles * self.MILES_TO_KM)

    def _get_auth_headers(self) -> Dict[str, str]:
        if not self.blackbook_id or not self.blackbook_password:
            raise ValueError("Blackbook credentials not configured")

        credentials = f"{self.blackbook_id}:{self.blackbook_password}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        return {
            'Authorization': f'Basic {encoded_credentials}',
            'Content-Type': 'application/json'
        }

    def get_schema_info(self) -> Dict[str, Any]:
        try:
            if not self.graphql_url:
                return {
                    'success': False,
                    'error': 'GraphQL URL not configured'
                }

            headers = self._get_auth_headers()

            introspection_query = """
            query IntrospectionQuery {
                __schema {
                    queryType { name }
                    types {
                        name
                        kind
                        fields {
                            name
                            type {
                                name
                                kind
                            }
                        }
                    }
                }
            }
            """

            response = requests.post(
                self.graphql_url,
                json={'query': introspection_query},
                headers=headers,
                timeout=15
            )

            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json()
                }
            else:
                return {
                    'success': False,
                    'error': f'Schema introspection failed: {response.status_code}',
                    'response': response.text
                }

        except Exception as e:
            return {
                'success': False,
                'error': f'Error: {str(e)}'
            }

    def test_credentials(self) -> Dict[str, Any]:
        try:
            if not self.graphql_url:
                return {
                    'success': False,
                    'error': 'GraphQL URL not configured'
                }

            headers = self._get_auth_headers()

            test_query = """
            query TestQuery {
                __typename
            }
            """

            response = requests.post(
                self.graphql_url,
                json={'query': test_query},
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                return {
                    'success': True,
                    'message': 'Credentials are valid and connection successful'
                }
            elif response.status_code == 401:
                return {
                    'success': False,
                    'error': 'Invalid credentials (401 Unauthorized)'
                }
            else:
                return {
                    'success': False,
                    'error': f'Connection failed with status {response.status_code}'
                }

        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Request timeout - check GraphQL URL'
            }
        except requests.exceptions.ConnectionError:
            return {
                'success': False,
                'error': 'Connection error - check GraphQL URL'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Error: {str(e)}'
            }

    def fetch_vehicle_data(self, vin: str, odometer_km: int) -> Dict[str, Any]:
        try:
            if not self.graphql_url:
                return {
                    'success': False,
                    'error': 'GraphQL URL not configured'
                }

            if not vin:
                return {
                    'success': False,
                    'error': 'VIN is required'
                }

            vin_upper = vin.upper()
            if not self.VIN_PATTERN.match(vin_upper):
                return {
                    'success': False,
                    'error': 'VIN must be exactly 17 alphanumeric characters (excluding I, O, Q)'
                }

            if not isinstance(odometer_km, int) or odometer_km < 0:
                return {
                    'success': False,
                    'error': 'Odometer must be a positive number'
                }

            # Convert kilometres to miles for U.S.-based Blackbook API
            odometer_miles = self._convert_km_to_miles(odometer_km)

            headers = self._get_auth_headers()

            query = """
            query GetVehicleData($vin: String!) {
                usedvehicles(vin: $vin) {
                    error_count
                    warning_count
                    message_list {
                        description
                        code
                        type
                    }
                    usedvehicles {
                        vin
                        model_year
                        make
                        model
                        series
                        style
                        description_score
                        base_whole_rough
                        mileage_whole_rough
                        adjusted_whole_rough
                        base_retail_rough
                        mileage_retail_rough
                        adjusted_retail_rough
                        base_tradein_rough
                        mileage_tradein_rough
                        adjusted_tradein_rough
                        uvc
                    }
                }
            }
            """

            variables = {
                'vin': vin_upper
            }

            response = requests.post(
                self.graphql_url,
                json={
                    'query': query,
                    'variables': variables
                },
                headers=headers,
                timeout=15
            )

            if response.status_code == 200:
                data = response.json()

                if 'errors' in data:
                    return {
                        'success': False,
                        'error': f"GraphQL errors: {data['errors']}"
                    }

                result = data.get('data', {}).get('usedvehicles', {})
                error_count = result.get('error_count', 0)
                warning_count = result.get('warning_count', 0)
                vehicles = result.get('usedvehicles', [])
                messages = result.get('message_list', [])

                if error_count > 0:
                    error_messages = [msg.get('description', '') for msg in messages if msg.get('type', '').lower() == 'error']
                    if error_messages:
                        return {
                            'success': False,
                            'error': ', '.join(error_messages)
                        }
                    else:
                        return {
                            'success': False,
                            'error': 'Vehicle lookup failed - please check the VIN and try again'
                        }

                if not vehicles:
                    return {
                        'success': False,
                        'error': 'No vehicle data found for this VIN'
                    }

                vehicle_data = vehicles[0]

                return {
                    'success': True,
                    'data': {
                        'vehicle': vehicle_data,
                        'warning_count': warning_count,
                        'messages': messages,
                        'odometer_km': odometer_km,
                        'odometer_miles': odometer_miles
                    }
                }
            elif response.status_code == 401:
                return {
                    'success': False,
                    'error': 'Invalid credentials'
                }
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error') or error_data.get('message') or str(error_data)
                except:
                    error_msg = response.text or f'HTTP {response.status_code}'

                return {
                    'success': False,
                    'error': f'Blackbook API error ({response.status_code}): {error_msg}'
                }

        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Request timeout'
            }
        except requests.exceptions.ConnectionError:
            return {
                'success': False,
                'error': 'Connection error - unable to reach Blackbook API'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }

    def fetch_pricing_cards(self, vin: str, odometer_km: int) -> Dict[str, Any]:
        """Fetch vehicle data and pricing for all Canadian provinces"""
        try:
            if not self.graphql_url:
                return {
                    'success': False,
                    'error': 'GraphQL URL not configured'
                }

            if not vin:
                return {
                    'success': False,
                    'error': 'VIN is required'
                }

            vin_upper = vin.upper()
            if not self.VIN_PATTERN.match(vin_upper):
                return {
                    'success': False,
                    'error': 'VIN must be exactly 17 alphanumeric characters (excluding I, O, Q)'
                }

            if not isinstance(odometer_km, int) or odometer_km < 0:
                return {
                    'success': False,
                    'error': 'Odometer must be a positive number'
                }
            
            # Convert kilometres to miles for U.S.-based Blackbook API
            odometer_miles = self._convert_km_to_miles(odometer_km)

            headers = self._get_auth_headers()

            # Step 1: Get vehicle info from GraphQL (including auction/wholesale data)
            query = """
            query GetVehicleInfo($vin: String!) {
                usedvehicles(vin: $vin) {
                    error_count
                    warning_count
                    message_list {
                        description
                        code
                        type
                    }
                    usedvehicles {
                        uvc
                        model_year
                        make
                        model
                        publish_date
                        vin
                    }
                }
            }
            """

            variables = {'vin': vin_upper}

            response = requests.post(
                self.graphql_url,
                json={
                    'query': query,
                    'variables': variables
                },
                headers=headers,
                timeout=15
            )

            if response.status_code != 200:
                return {
                    'success': False,
                    'error': f'GraphQL API error: {response.status_code}'
                }

            data = response.json()

            if 'errors' in data:
                return {
                    'success': False,
                    'error': f"GraphQL errors: {data['errors']}"
                }

            result = data.get('data', {}).get('usedvehicles', {})
            error_count = result.get('error_count', 0)
            vehicles = result.get('usedvehicles', [])

            if error_count > 0 or not vehicles:
                return {
                    'success': False,
                    'error': 'No vehicle data found for this VIN'
                }

            vehicle_info = vehicles[0]

            # Step 2: Get pricing for all Canadian provinces
            provinces = [
                'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
                'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
                'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
                'Saskatchewan', 'Yukon'
            ]
            cards = []

            for province in provinces:
                pricing = self._fetch_province_pricing(vin_upper, odometer_miles, province, headers)
                
                if not pricing.get('success'):
                    return pricing  # Return error if any province fails

                card = {
                    'province': province,
                    'vin': vin_upper,
                    'odometer_km': odometer_km,
                    'odometer_miles': odometer_miles,
                    'uvc': vehicle_info.get('uvc'),
                    'year': vehicle_info.get('model_year'),
                    'make': vehicle_info.get('make'),
                    'model': vehicle_info.get('model'),
                    'series': pricing.get('raw_data', {}).get('series', ''),
                    'style': pricing.get('raw_data', {}).get('style', ''),
                    'publish_date': vehicle_info.get('publish_date'),
                    'adjusted_wholesale': pricing.get('adjusted_wholesale'),
                    'adjusted_retail': pricing.get('adjusted_retail'),
                    'adjusted_tradein': pricing.get('adjusted_tradein')
                }
                cards.append(card)

            return {
                'success': True,
                'cards': cards
            }

        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Request timeout'
            }
        except requests.exceptions.ConnectionError:
            return {
                'success': False,
                'error': 'Connection error - unable to reach Blackbook API'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }

    def _fetch_province_pricing(self, vin: str, mileage: int, province: str, headers: Dict[str, str]) -> Dict[str, Any]:
        """Fetch pricing data for a specific province"""
        try:
            if not self.graphql_url:
                return {
                    'success': False,
                    'error': 'GraphQL URL not configured'
                }
            
            # Province code mapping for all Canadian provinces and territories
            province_codes = {
                'Alberta': 'AB',
                'British Columbia': 'BC',
                'Manitoba': 'MB',
                'New Brunswick': 'NB',
                'Newfoundland and Labrador': 'NL',
                'Northwest Territories': 'NT',
                'Nova Scotia': 'NS',
                'Nunavut': 'NU',
                'Ontario': 'ON',
                'Prince Edward Island': 'PE',
                'Quebec': 'QC',
                'Saskatchewan': 'SK',
                'Yukon': 'YT'
            }
            
            province_code = province_codes.get(province, 'ON')

            query = """
            query GetPricing($vin: String!, $mileage: Int!, $province: String!) {
                usedvehicles(vin: $vin, mileage: $mileage, province: $province) {
                    usedvehicles {
                        vin
                        model_year
                        make
                        model
                        series
                        style
                        uvc
                        publish_date
                        description_score
                        adjusted_whole_rough
                        adjusted_retail_rough
                        adjusted_tradein_rough
                    }
                }
            }
            """

            variables = {
                'vin': vin,
                'mileage': mileage,
                'province': province_code
            }

            response = requests.post(
                self.graphql_url,
                json={
                    'query': query,
                    'variables': variables
                },
                headers=headers,
                timeout=15
            )

            if response.status_code != 200:
                return {
                    'success': False,
                    'error': f'Pricing API error for {province}: {response.status_code}'
                }

            data = response.json()

            if 'errors' in data:
                return {
                    'success': False,
                    'error': f"Pricing API errors for {province}: {data['errors']}"
                }

            result = data.get('data', {}).get('usedvehicles', {})
            vehicles = result.get('usedvehicles', [])

            if not vehicles:
                return {
                    'success': False,
                    'error': f'No pricing data found for {province}'
                }

            pricing_data = vehicles[0]

            # Return raw rough condition pricing from Blackbook
            return {
                'success': True,
                'adjusted_wholesale': pricing_data.get('adjusted_whole_rough'),
                'adjusted_retail': pricing_data.get('adjusted_retail_rough'),
                'adjusted_tradein': pricing_data.get('adjusted_tradein_rough'),
                'raw_data': pricing_data  # Include all raw data
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Error fetching {province} pricing: {str(e)}'
            }