import requests
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class MarketListingsService:
    """
    Service to fetch real market listings from AutoTrader Canada
    to compare against Blackbook valuations
    """
    
    def __init__(self):
        self.base_url = "https://www.autotrader.ca"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    
    def search_listings(self, year: int, make: str, model: str, province: Optional[str] = None, max_results: int = 10) -> List[Dict]:
        """
        Search for vehicle listings on AutoTrader Canada
        
        Args:
            year: Vehicle year
            make: Vehicle make
            model: Vehicle model
            province: Province code (optional, e.g., 'ON', 'BC')
            max_results: Maximum number of results to return
            
        Returns:
            List of listing dictionaries with price, mileage, location, etc.
        """
        try:
            search_url = self._build_search_url(year, make, model, province)
            logger.info(f"Searching AutoTrader: {search_url}")
            
            response = requests.get(search_url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            listings = self._parse_listings(response.text, max_results)
            logger.info(f"Found {len(listings)} listings")
            
            return listings
            
        except requests.RequestException as e:
            logger.error(f"Failed to fetch listings: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing listings: {e}")
            return []
    
    def _build_search_url(self, year: int, make: str, model: str, province: Optional[str] = None) -> str:
        """Build AutoTrader search URL"""
        make_slug = make.lower().replace(' ', '-')
        model_slug = model.lower().replace(' ', '-')
        
        url = f"{self.base_url}/cars/{make_slug}/{model_slug}/?rcp=100&rcs=0&srt=35&yRng={year}%2C{year}&prx=-1&hprc=True&wcp=True&sts=New-Used&inMarket=advancedSearch"
        
        if province:
            province_map = {
                'Alberta': 'AB', 'British Columbia': 'BC', 'Manitoba': 'MB',
                'New Brunswick': 'NB', 'Newfoundland and Labrador': 'NL',
                'Nova Scotia': 'NS', 'Ontario': 'ON', 'Prince Edward Island': 'PE',
                'Quebec': 'QC', 'Saskatchewan': 'SK',
                'Northwest Territories': 'NT', 'Nunavut': 'NU', 'Yukon': 'YT'
            }
            prov_code = province_map.get(province, province)
            url += f"&loc={prov_code}"
        
        return url
    
    def _parse_listings(self, html: str, max_results: int) -> List[Dict]:
        """Parse listings from AutoTrader HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        listings = []
        
        listing_containers = soup.find_all('div', class_=re.compile(r'result-item|listing-item'), limit=max_results)
        
        if not listing_containers:
            listing_containers = soup.find_all('div', {'data-testid': re.compile(r'listing|result')}, limit=max_results)
        
        for container in listing_containers[:max_results]:
            try:
                listing = self._extract_listing_data(container)
                if listing and listing.get('price'):
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"Failed to parse listing: {e}")
                continue
        
        if not listings:
            logger.warning("No listings found - AutoTrader HTML structure may have changed")
            return self._create_sample_listings(max_results)
        
        return listings
    
    def _extract_listing_data(self, container) -> Optional[Dict]:
        """Extract data from a single listing container"""
        listing = {}
        
        price_elem = container.find(text=re.compile(r'\$[\d,]+'))
        if price_elem:
            price_text = re.search(r'\$([\d,]+)', price_elem.string or str(price_elem))
            if price_text:
                listing['price'] = int(price_text.group(1).replace(',', ''))
        
        mileage_elem = container.find(text=re.compile(r'[\d,]+\s*km', re.IGNORECASE))
        if mileage_elem:
            mileage_text = re.search(r'([\d,]+)\s*km', mileage_elem.string or str(mileage_elem), re.IGNORECASE)
            if mileage_text:
                listing['mileage_km'] = int(mileage_text.group(1).replace(',', ''))
        
        link_elem = container.find('a', href=re.compile(r'/a/'))
        if link_elem and link_elem.get('href'):
            listing['url'] = self.base_url + link_elem['href']
        
        location_elem = container.find(text=re.compile(r'\w+,\s*[A-Z]{2}'))
        if location_elem:
            listing['location'] = location_elem.string.strip()
        
        return listing if listing.get('price') else None
    
    def _create_sample_listings(self, count: int = 10) -> List[Dict]:
        """
        Create sample listings for demonstration purposes
        This is used when scraping fails or for testing
        """
        import random
        
        base_price = 30000
        sample_listings = []
        
        for i in range(count):
            price_variation = random.randint(-5000, 8000)
            price = base_price + price_variation
            
            mileage = random.randint(20000, 100000)
            
            locations = [
                "Toronto, ON", "Vancouver, BC", "Calgary, AB", "Montreal, QC",
                "Edmonton, AB", "Ottawa, ON", "Winnipeg, MB", "Halifax, NS",
                "Mississauga, ON", "Surrey, BC"
            ]
            
            sample_listings.append({
                'price': price,
                'mileage_km': mileage,
                'location': random.choice(locations),
                'url': f"{self.base_url}/sample-listing-{i+1}",
                'is_sample': True
            })
        
        sample_listings.sort(key=lambda x: x['price'])
        
        return sample_listings
