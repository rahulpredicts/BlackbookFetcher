document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('vehicleForm');
    const vinInput = document.getElementById('vin');
    const odometerInput = document.getElementById('odometer');
    const buyingPriceInput = document.getElementById('buyingPrice');
    const marketAdjustmentSlider = document.getElementById('marketAdjustment');
    const adjustmentDisplay = document.getElementById('adjustmentDisplay');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const pricingCardsContainer = document.getElementById('pricingCardsContainer');
    const pricingCardsGrid = document.getElementById('pricingCardsGrid');
    const marketTrendsContainer = document.getElementById('marketTrendsContainer');
    const marketTrendsContent = document.getElementById('marketTrendsContent');
    const vinDecodeContainer = document.getElementById('vinDecodeContainer');
    const vinDecodeContent = document.getElementById('vinDecodeContent');
    const recommendationContainer = document.getElementById('recommendationContainer');
    const recommendationContent = document.getElementById('recommendationContent');
    const provinceSelector = document.getElementById('provinceSelector');
    const marketListingsContainer = document.getElementById('marketListingsContainer');
    const marketListingsGrid = document.getElementById('marketListingsGrid');
    
    // Global variables to store data for re-rendering
    let rawPricingCards = [];  // Store raw card data
    let rawMarketListings = [];  // Store raw listings data
    let currentAvgRetail = 0;  // Store for market listings comparison
    let selectedProvince = 'Ontario';  // Default province for auction recommendations
    let userBuyingPrice = 0;  // User's actual buying price
    
    // Province selector event listener
    if (provinceSelector) {
        provinceSelector.addEventListener('change', function() {
            selectedProvince = this.value;
            // Re-render recommendation with new province
            if (rawPricingCards.length > 0) {
                displayRecommendation(rawPricingCards);
            }
        });
    }

    vinInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const vin = vinInput.value.trim();
        const odometer = parseInt(odometerInput.value);
        const buyingPrice = buyingPriceInput.value ? parseInt(buyingPriceInput.value) : 0;

        if (vin.length !== 17) {
            showError('VIN must be exactly 17 characters');
            return;
        }

        if (isNaN(odometer) || odometer < 0) {
            showError('Please enter a valid odometer reading');
            return;
        }

        // Store buying price globally
        userBuyingPrice = buyingPrice;

        hideMessages();
        showLoading(true);

        const body = {
            vin: vin.trim(),
            mileage: Number(odometer)
        };

        console.log("Sending to /api/pricing-cards:", body);

        try {
            const response = await fetch('/api/pricing-cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            console.log("Status:", response.status);
            console.log("Response:", data);

            showLoading(false);

            if (data.cards && data.cards.length > 0) {
                await displayVinDecode(vinInput.value);
                displayAuctionRecommendation(data.cards);
                displayMarketTrends(data.cards);
                displayPricingCards(data.cards);
                await displayMarketListings(data.cards);
                showSuccess('Pricing data retrieved from Blackbook successfully!');
            } else {
                const errorMsg = data.error || 'Failed to fetch pricing data';
                showError(`Error ${response.status}: ${errorMsg}`);
                console.error("API Error:", errorMsg);
            }
        } catch (error) {
            showLoading(false);
            console.error("Network Error:", error);
            showError('Network error: Unable to connect to the server');
        }
    });

    async function displayVinDecode(vin) {
        try {
            const response = await fetch('/api/decode-vin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vin: vin })
            });

            const data = await response.json();

            if (data.success && data.vehicle_info) {
                const info = data.vehicle_info;
                
                let engineInfo = '';
                if (info.engine || info.displacement) {
                    engineInfo = info.engine || `${info.displacement}L`;
                    if (info.cylinders) engineInfo += ` (${info.cylinders} cyl)`;
                    if (info.engine_config) engineInfo += ` ${info.engine_config}`;
                }
                
                let transmissionInfo = '';
                if (info.transmission) {
                    transmissionInfo = info.transmission;
                    if (info.transmission_speeds) transmissionInfo += ` (${info.transmission_speeds}-speed)`;
                }
                
                vinDecodeContent.innerHTML = `
                    <div class="vin-header">
                        <h3>${info.year} ${info.make} ${info.model}${info.trim ? ' - ' + info.trim : ''}</h3>
                    </div>
                    <div class="vin-decode-grid">
                        ${info.year ? `<div class="vin-item"><span class="vin-label">Year:</span> <span class="vin-value">${info.year}</span></div>` : ''}
                        ${info.make ? `<div class="vin-item"><span class="vin-label">Make:</span> <span class="vin-value">${info.make}</span></div>` : ''}
                        ${info.model ? `<div class="vin-item"><span class="vin-label">Model:</span> <span class="vin-value">${info.model}</span></div>` : ''}
                        ${info.series ? `<div class="vin-item highlight"><span class="vin-label">Series/Grade:</span> <span class="vin-value">${info.series}</span></div>` : ''}
                        ${info.trim_level ? `<div class="vin-item highlight"><span class="vin-label">Trim Level:</span> <span class="vin-value">${info.trim_level}</span></div>` : ''}
                        ${info.trim && !info.trim_level && !info.series ? `<div class="vin-item highlight"><span class="vin-label">Trim:</span> <span class="vin-value">${info.trim}</span></div>` : ''}
                        ${info.body_class ? `<div class="vin-item"><span class="vin-label">Body Type:</span> <span class="vin-value">${info.body_class}</span></div>` : ''}
                        ${engineInfo ? `<div class="vin-item"><span class="vin-label">Engine:</span> <span class="vin-value">${engineInfo}</span></div>` : ''}
                        ${transmissionInfo ? `<div class="vin-item"><span class="vin-label">Transmission:</span> <span class="vin-value">${transmissionInfo}</span></div>` : ''}
                        ${info.drive_type ? `<div class="vin-item"><span class="vin-label">Drive Type:</span> <span class="vin-value">${info.drive_type}</span></div>` : ''}
                        ${info.fuel_type ? `<div class="vin-item"><span class="vin-label">Fuel Type:</span> <span class="vin-value">${info.fuel_type}</span></div>` : ''}
                        ${info.doors ? `<div class="vin-item"><span class="vin-label">Doors:</span> <span class="vin-value">${info.doors}</span></div>` : ''}
                        ${info.seat_rows ? `<div class="vin-item"><span class="vin-label">Seat Rows:</span> <span class="vin-value">${info.seat_rows}</span></div>` : ''}
                        ${info.manufacturer ? `<div class="vin-item"><span class="vin-label">Manufacturer:</span> <span class="vin-value">${info.manufacturer}</span></div>` : ''}
                        ${info.vehicle_type ? `<div class="vin-item"><span class="vin-label">Type:</span> <span class="vin-value">${info.vehicle_type}</span></div>` : ''}
                    </div>
                    <div class="vin-footer">
                        <small>🔍 VIN: ${info.vin} | Data from NHTSA Vehicle Decoder</small>
                    </div>
                `;
                
                vinDecodeContainer.style.display = 'block';
            }
        } catch (error) {
            console.log('VIN decode failed:', error);
        }
    }

    function displayRawData(cards) {
        if (!cards || cards.length === 0) return;

        // Get the first card to show all available fields
        const sampleCard = cards[0];
        const allFields = sampleCard.all_api_fields || {};

        let html = '<div class="raw-data-grid">';
        
        // Display each field from the API
        const fieldKeys = Object.keys(allFields).sort();
        
        fieldKeys.forEach(key => {
            const value = allFields[key];
            const displayValue = value !== null && value !== undefined ? value : 'null';
            
            html += `
                <div class="raw-field">
                    <div class="raw-field-name">${key}</div>
                    <div class="raw-field-value">${displayValue}</div>
                </div>
            `;
        });

        html += '</div>';

        // Add a table showing all provinces for comparison
        html += '<h3 style="margin-top: 30px; margin-bottom: 15px;">All Provinces Data</h3>';
        html += '<div style="overflow-x: auto;"><table class="raw-table">';
        html += '<thead><tr><th>Province</th>';
        
        // Get all unique fields across all cards
        const allFieldNames = new Set();
        cards.forEach(card => {
            const fields = card.all_api_fields || {};
            Object.keys(fields).forEach(key => allFieldNames.add(key));
        });
        
        const sortedFieldNames = Array.from(allFieldNames).sort();
        sortedFieldNames.forEach(field => {
            html += `<th>${field}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Add each province as a row
        cards.forEach(card => {
            html += `<tr><td><strong>${card.province}</strong></td>`;
            const fields = card.all_api_fields || {};
            sortedFieldNames.forEach(field => {
                const value = fields[field];
                const displayValue = value !== null && value !== undefined ? value : '-';
                html += `<td>${displayValue}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';

        rawDataContent.innerHTML = html;
        rawDataContainer.style.display = 'block';
    }

    function displayAuctionRecommendation(cards) {
        if (!cards || cards.length === 0) return;

        // Find the card for the selected province
        const selectedProvinceCard = cards.find(c => c.province === selectedProvince);
        if (!selectedProvinceCard) {
            console.error(`Province ${selectedProvince} not found in cards`);
            return;
        }

        // Use user's actual buying price if provided, otherwise use wholesale estimate
        const hasUserPrice = userBuyingPrice > 0;
        const auctionBuyPrice = hasUserPrice ? userBuyingPrice : (selectedProvinceCard.adjusted_wholesale || 0);
        const selectedProvinceRetail = selectedProvinceCard.adjusted_retail || 0;
        const selectedProvinceWholesale = selectedProvinceCard.adjusted_wholesale || 0;
        const selectedProvinceTradein = selectedProvinceCard.adjusted_tradein || 0;

        // Calculate key metrics for national comparison
        const retailPrices = cards.map(c => c.adjusted_retail || 0);
        const avgRetail = retailPrices.reduce((a, b) => a + b, 0) / retailPrices.length;

        // Find best market to resell (highest retail price)
        const sortedByRetail = [...cards].sort((a, b) => (b.adjusted_retail || 0) - (a.adjusted_retail || 0));
        const bestResaleMarket = sortedByRetail[0];

        // Calculate profit potential (buy at user price or wholesale, sell in best market)
        const bestRetail = bestResaleMarket.adjusted_retail || 0;
        const potentialProfit = bestRetail - auctionBuyPrice;
        const profitMargin = ((potentialProfit / bestRetail) * 100).toFixed(1);
        const wholesaleToRetailSpread = selectedProvinceRetail - auctionBuyPrice;
        const spreadPercentage = ((wholesaleToRetailSpread / selectedProvinceRetail) * 100).toFixed(1);
        
        // Calculate how user's price compares to book values
        const vsWholesale = auctionBuyPrice - selectedProvinceWholesale;
        const vsWholesalePercent = ((vsWholesale / selectedProvinceWholesale) * 100).toFixed(1);
        const vsRetail = auctionBuyPrice - selectedProvinceRetail;
        const vsRetailPercent = ((vsRetail / selectedProvinceRetail) * 100).toFixed(1);

        // Recommendation logic
        let recommendation = '';
        let recommendationClass = '';
        let reasoning = [];

        if (profitMargin >= 10 && spreadPercentage >= 8) {
            recommendation = '✅ STRONG BUY';
            recommendationClass = 'recommendation-buy';
            reasoning.push(`Excellent ${profitMargin}% profit margin`);
            reasoning.push(`Strong ${spreadPercentage}% market spread indicates healthy demand`);
            reasoning.push(`High resale potential in ${bestResaleMarket.province}`);
        } else if (profitMargin >= 7 && spreadPercentage >= 6) {
            recommendation = '👍 BUY';
            recommendationClass = 'recommendation-maybe-buy';
            reasoning.push(`Good ${profitMargin}% profit margin`);
            reasoning.push(`Decent ${spreadPercentage}% market spread`);
            reasoning.push(`Resale opportunity in ${bestResaleMarket.province}`);
        } else if (profitMargin >= 4) {
            recommendation = '⚠️ CAUTIOUS BUY';
            recommendationClass = 'recommendation-neutral';
            reasoning.push(`Moderate ${profitMargin}% profit margin - tight margins`);
            reasoning.push(`Market spread of ${spreadPercentage}% is below ideal`);
            reasoning.push(`Limited profit potential - only buy at discount`);
        } else {
            recommendation = '❌ DO NOT BUY';
            recommendationClass = 'recommendation-no-buy';
            reasoning.push(`Low ${profitMargin}% profit margin - unprofitable`);
            reasoning.push(`Weak market spread indicates low demand`);
            reasoning.push(`High risk of loss at current auction prices`);
        }

        recommendationContent.innerHTML = `
            <div class="recommendation-header ${recommendationClass}">
                <div class="recommendation-verdict">${recommendation}</div>
                <div class="recommendation-subtitle">Based on current market conditions</div>
            </div>

            <div class="recommendation-details">
                ${hasUserPrice ? `
                    <h3>💵 Your Buying Price Analysis</h3>
                    <div class="recommendation-grid">
                        <div class="recommendation-item ${vsWholesale < 0 ? 'highlight' : ''}">
                            <div class="rec-label">vs Wholesale Value</div>
                            <div class="rec-value" style="color: ${vsWholesale < 0 ? '#4CAF50' : vsWholesale > 0 ? '#f44336' : '#666'}">
                                ${vsWholesale < 0 ? '✓' : vsWholesale > 0 ? '✗' : '='} ${vsWholesale < 0 ? '-' : '+'}$${Math.abs(Math.round(vsWholesale)).toLocaleString()}
                            </div>
                            <div class="rec-detail">${vsWholesale < 0 ? `${Math.abs(vsWholesalePercent)}% below wholesale - Great!` : vsWholesale > 0 ? `${vsWholesalePercent}% above wholesale` : 'At wholesale value'}</div>
                        </div>
                        <div class="recommendation-item ${vsRetail < 0 ? 'highlight' : ''}">
                            <div class="rec-label">vs Retail Value</div>
                            <div class="rec-value" style="color: ${vsRetail < 0 ? '#4CAF50' : vsRetail > 0 ? '#f44336' : '#666'}">
                                ${vsRetail < 0 ? '✓' : vsRetail > 0 ? '✗' : '='} ${vsRetail < 0 ? '-' : '+'}$${Math.abs(Math.round(vsRetail)).toLocaleString()}
                            </div>
                            <div class="rec-detail">${vsRetail < 0 ? `${Math.abs(vsRetailPercent)}% below retail` : vsRetail > 0 ? `${vsRetailPercent}% above retail` : 'At retail value'}</div>
                        </div>
                        <div class="recommendation-item">
                            <div class="rec-label">Deal Quality</div>
                            <div class="rec-value" style="color: ${vsWholesale < 0 ? '#4CAF50' : vsWholesale < selectedProvinceWholesale * 0.05 ? '#FF9800' : '#f44336'}">
                                ${vsWholesale < 0 ? '🔥 Excellent' : vsWholesale < selectedProvinceWholesale * 0.05 ? '👍 Fair' : '⚠️ Overpaying'}
                            </div>
                            <div class="rec-detail">${vsWholesale < 0 ? 'Below wholesale is ideal' : vsWholesale < selectedProvinceWholesale * 0.05 ? 'Close to wholesale' : 'Consider negotiating lower'}</div>
                        </div>
                    </div>
                ` : ''}

                <h3>💰 Profit Analysis</h3>
                <div class="recommendation-grid">
                    <div class="recommendation-item">
                        <div class="rec-label">${hasUserPrice ? 'Your Buy Price' : 'Expected Buy Price'}</div>
                        <div class="rec-value">$${Math.round(auctionBuyPrice).toLocaleString()}</div>
                        <div class="rec-detail">${hasUserPrice ? 'Your actual price' : `Wholesale in ${selectedProvince}`}</div>
                    </div>
                    <div class="recommendation-item">
                        <div class="rec-label">Best Resale Market</div>
                        <div class="rec-value">${bestResaleMarket.province}</div>
                        <div class="rec-detail">$${bestRetail.toLocaleString()} retail</div>
                    </div>
                    <div class="recommendation-item highlight">
                        <div class="rec-label">Potential Profit</div>
                        <div class="rec-value">$${Math.round(potentialProfit).toLocaleString()}</div>
                        <div class="rec-detail">${profitMargin}% margin</div>
                    </div>
                    <div class="recommendation-item">
                        <div class="rec-label">Market Spread</div>
                        <div class="rec-value">${spreadPercentage}%</div>
                        <div class="rec-detail">Wholesale to Retail</div>
                    </div>
                </div>

                <h3>📋 Key Reasoning</h3>
                <ul class="recommendation-reasons">
                    ${reasoning.map(reason => `<li>${reason}</li>`).join('')}
                </ul>

                <h3>💡 Strategy</h3>
                <div class="recommendation-strategy">
                    ${recommendation === '✅ STRONG BUY' ? `
                        <p><strong>Action:</strong> This is an excellent auction opportunity in ${selectedProvince}. Buy confidently at or below $${Math.round(auctionBuyPrice).toLocaleString()}.</p>
                        <p><strong>Target:</strong> Resell in ${bestResaleMarket.province} for maximum $${Math.round(potentialProfit).toLocaleString()} profit.</p>
                        <p><strong>Timeline:</strong> Fast turnover expected due to strong market spread.</p>
                    ` : recommendation === '👍 BUY' ? `
                        <p><strong>Action:</strong> Good buy in ${selectedProvince} if you can negotiate below $${Math.round(auctionBuyPrice * 0.97).toLocaleString()} at auction.</p>
                        <p><strong>Target:</strong> Focus on ${bestResaleMarket.province} market for best returns.</p>
                        <p><strong>Timeline:</strong> Moderate holding time, ensure quick sale strategy.</p>
                    ` : recommendation === '⚠️ CAUTIOUS BUY' ? `
                        <p><strong>Action:</strong> Only buy at ${selectedProvince} auctions if price is significantly below $${Math.round(auctionBuyPrice * 0.93).toLocaleString()} (7%+ discount).</p>
                        <p><strong>Risk:</strong> Tight margins - minimal room for error. Must sell quickly.</p>
                        <p><strong>Timeline:</strong> Aim for fast flip to avoid holding costs eating into profits.</p>
                    ` : `
                        <p><strong>Action:</strong> Pass on this auction in ${selectedProvince}. Profit margins too thin to justify risk.</p>
                        <p><strong>Risk:</strong> High chance of breaking even or losing money after expenses.</p>
                        <p><strong>Alternative:</strong> Wait for better opportunities with 10%+ margins or check other provinces.</p>
                    `}
                </div>

                <div class="recommendation-footer">
                    <small>⚠️ This recommendation is based on current market data from Blackbook. Always factor in reconditioning costs, transport, fees, and local market conditions.</small>
                </div>
            </div>
        `;

        recommendationContainer.style.display = 'block';
    }

    function displayMarketTrends(cards) {
        // Calculate market statistics
        const retailPrices = cards.map(c => c.adjusted_retail || 0);
        const tradeinPrices = cards.map(c => c.adjusted_tradein || 0);
        const wholesalePrices = cards.map(c => c.adjusted_wholesale || 0);

        const avgRetail = retailPrices.reduce((a, b) => a + b, 0) / retailPrices.length;
        const avgTradein = tradeinPrices.reduce((a, b) => a + b, 0) / tradeinPrices.length;
        const avgWholesale = wholesalePrices.reduce((a, b) => a + b, 0) / wholesalePrices.length;

        const maxRetail = Math.max(...retailPrices);
        const minRetail = Math.min(...retailPrices);
        const priceRange = maxRetail - minRetail;

        // Find highest and lowest markets
        const sortedByRetail = [...cards].sort((a, b) => (b.adjusted_retail || 0) - (a.adjusted_retail || 0));
        const highestMarket = sortedByRetail[0];
        const lowestMarket = sortedByRetail[sortedByRetail.length - 1];

        // Calculate market spread (retail - wholesale)
        const avgSpread = avgRetail - avgWholesale;
        const spreadPercentage = ((avgSpread / avgRetail) * 100).toFixed(1);

        marketTrendsContent.innerHTML = `
            <div class="trends-grid">
                <div class="trend-card trend-highlight">
                    <div class="trend-icon">🏆</div>
                    <div class="trend-label">Highest Market</div>
                    <div class="trend-value">${highestMarket.province}</div>
                    <div class="trend-detail">$${(highestMarket.adjusted_retail || 0).toLocaleString()} retail</div>
                </div>

                <div class="trend-card trend-highlight">
                    <div class="trend-icon">📉</div>
                    <div class="trend-label">Lowest Market</div>
                    <div class="trend-value">${lowestMarket.province}</div>
                    <div class="trend-detail">$${(lowestMarket.adjusted_retail || 0).toLocaleString()} retail</div>
                </div>

                <div class="trend-card">
                    <div class="trend-icon">💰</div>
                    <div class="trend-label">National Avg Retail</div>
                    <div class="trend-value">$${Math.round(avgRetail).toLocaleString()}</div>
                    <div class="trend-detail">Across all provinces</div>
                </div>

                <div class="trend-card">
                    <div class="trend-icon">🤝</div>
                    <div class="trend-label">National Avg Trade-In</div>
                    <div class="trend-value">$${Math.round(avgTradein).toLocaleString()}</div>
                    <div class="trend-detail">Across all provinces</div>
                </div>

                <div class="trend-card">
                    <div class="trend-icon">🔨</div>
                    <div class="trend-label">National Avg Wholesale</div>
                    <div class="trend-value">$${Math.round(avgWholesale).toLocaleString()}</div>
                    <div class="trend-detail">Auction pricing</div>
                </div>

                <div class="trend-card">
                    <div class="trend-icon">📊</div>
                    <div class="trend-label">Price Range</div>
                    <div class="trend-value">$${Math.round(priceRange).toLocaleString()}</div>
                    <div class="trend-detail">High to low spread</div>
                </div>

                <div class="trend-card">
                    <div class="trend-icon">💹</div>
                    <div class="trend-label">Market Spread</div>
                    <div class="trend-value">${spreadPercentage}%</div>
                    <div class="trend-detail">Retail vs Wholesale</div>
                </div>

                <div class="trend-card">
                    <div class="trend-icon">🎯</div>
                    <div class="trend-label">Price Variance</div>
                    <div class="trend-value">${((priceRange / avgRetail) * 100).toFixed(1)}%</div>
                    <div class="trend-detail">Regional differences</div>
                </div>
            </div>
        `;

        marketTrendsContainer.style.display = 'block';
    }

    function displayPricingCards(cards) {
        // Store raw cards for re-rendering when slider changes
        rawPricingCards = cards;
        
        // Clear existing cards
        pricingCardsGrid.innerHTML = '';

        // Sort cards by retail price (highest to lowest)
        const sortedCards = cards.sort((a, b) => {
            return (b.adjusted_retail || 0) - (a.adjusted_retail || 0);
        });

        // Calculate national averages for comparison
        const avgWholesale = sortedCards.reduce((sum, c) => sum + (c.adjusted_wholesale || 0), 0) / sortedCards.length;
        const avgRetail = sortedCards.reduce((sum, c) => sum + (c.adjusted_retail || 0), 0) / sortedCards.length;
        
        // Store for market listings comparison
        currentAvgRetail = avgRetail;

        // Create a card for each province
        sortedCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'pricing-card';
            cardElement.innerHTML = createCardHTML(card, index, sortedCards.length, avgWholesale, avgRetail);
            pricingCardsGrid.appendChild(cardElement);
        });

        pricingCardsContainer.style.display = 'block';
    }

    function createCardHTML(card, index, totalCards, avgWholesale, avgRetail) {
        const vehicleInfo = `${card.year} ${card.make} ${card.model}`;
        // Get book values
        const wholesalePrice = card.adjusted_wholesale || 0;
        const retailPrice = card.adjusted_retail || 0;
        const tradeinPrice = card.adjusted_tradein || 0;
        
        // Convert miles to km for display
        const odometerKm = card.odometer_km || Math.round((card.mileage || 0) * 1.60934);
        const odometerMiles = card.odometer_miles || card.mileage || 0;

        // Calculate vs national average
        const wholesaleVsAvg = wholesalePrice - avgWholesale;
        const retailVsAvg = retailPrice - avgRetail;
        const profit = retailPrice - wholesalePrice;
        const profitMargin = retailPrice > 0 ? ((profit / retailPrice) * 100).toFixed(1) : 0;

        // Determine opportunity badge
        let opportunityHTML = '';
        if (wholesalePrice < avgWholesale * 0.97 && retailPrice > avgRetail * 1.02) {
            opportunityHTML = '<div class="opportunity-badge excellent">🎯 BEST BUY & SELL MARKET</div>';
        } else if (wholesalePrice < avgWholesale * 0.97) {
            opportunityHTML = '<div class="opportunity-badge buy">💰 BEST AUCTION BUY</div>';
        } else if (retailPrice > avgRetail * 1.02) {
            opportunityHTML = '<div class="opportunity-badge sell">📈 BEST RESALE MARKET</div>';
        } else {
            opportunityHTML = '<div class="opportunity-badge neutral">⚖️ AVERAGE MARKET</div>';
        }

        // Rank indicator
        let rankHTML = '';
        if (index === 0) {
            rankHTML = '<div class="rank-badge top">🏆 #1 HIGHEST RETAIL</div>';
        } else if (index === totalCards - 1) {
            rankHTML = '<div class="rank-badge bottom">💵 #' + totalCards + ' LOWEST RETAIL</div>';
        } else {
            rankHTML = '<div class="rank-badge">#' + (index + 1) + '</div>';
        }

        return `
            ${rankHTML}
            <div class="province-header">
                <h3>📍 ${card.province}</h3>
                ${opportunityHTML}
            </div>
            <div class="pricing-item">
                <div class="pricing-label">Vehicle</div>
                <div class="pricing-value">${vehicleInfo}</div>
                ${card.series ? `<div class="pricing-subtitle">${card.series}${card.style ? ' - ' + card.style : ''}</div>` : ''}
            </div>
            <div class="pricing-item">
                <div class="pricing-label">VIN</div>
                <div class="pricing-value" style="font-size: 0.9rem; letter-spacing: 0.05em;">${card.vin}</div>
            </div>
            <div class="pricing-item">
                <div class="pricing-label">Odometer</div>
                <div class="pricing-value">${odometerKm.toLocaleString()} km</div>
                <div class="pricing-subtitle">${odometerMiles.toLocaleString()} miles</div>
            </div>
            <div class="pricing-item" style="border-top: 2px solid rgba(255,255,255,0.4); padding-top: 15px; margin-top: 15px;">
                <div class="pricing-label">🔨 Wholesale/Auction Price</div>
                <div class="pricing-value" style="font-size: 1.8rem; color: #FF9800;">$${wholesalePrice.toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                <div class="pricing-subtitle">
                    ${wholesaleVsAvg < -100 ? `<span style="color: #4CAF50;">▼ $${Math.abs(Math.round(wholesaleVsAvg)).toLocaleString()} below avg</span>` :
                      wholesaleVsAvg > 100 ? `<span style="color: #f44336;">▲ $${Math.round(wholesaleVsAvg).toLocaleString()} above avg</span>` :
                      '<span style="color: #999;">≈ At national average</span>'}
                </div>
            </div>
            <div class="pricing-item" style="margin-top: 15px;">
                <div class="pricing-label">💰 Retail Market Value</div>
                <div class="pricing-value" style="font-size: 1.8rem; color: #4CAF50;">$${retailPrice.toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                <div class="pricing-subtitle">
                    ${retailVsAvg > 100 ? `<span style="color: #4CAF50;">▲ $${Math.round(retailVsAvg).toLocaleString()} above avg</span>` :
                      retailVsAvg < -100 ? `<span style="color: #f44336;">▼ $${Math.abs(Math.round(retailVsAvg)).toLocaleString()} below avg</span>` :
                      '<span style="color: #999;">≈ At national average</span>'}
                </div>
            </div>
            <div class="pricing-item" style="margin-top: 15px;">
                <div class="pricing-label">🤝 Trade-In Value</div>
                <div class="pricing-value" style="font-size: 1.8rem; color: #2196F3;">$${tradeinPrice.toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                <div class="pricing-subtitle">Dealer trade-in offer</div>
            </div>
            <div class="pricing-item" style="border-top: 2px solid rgba(255,255,255,0.2); padding-top: 15px; margin-top: 15px; background: rgba(255,255,255,0.05); margin-left: -15px; margin-right: -15px; padding-left: 15px; padding-right: 15px; border-radius: 8px;">
                <div class="pricing-label">💵 Profit Potential</div>
                <div class="pricing-value" style="font-size: 1.4rem; ${profitMargin >= 10 ? 'color: #4CAF50;' : profitMargin >= 7 ? 'color: #2196F3;' : 'color: #FF9800;'}">
                    ${profitMargin}% ($${profit.toLocaleString()})
                </div>
                <div class="pricing-subtitle">Buy at auction → Sell retail</div>
            </div>
            <div class="pricing-item" style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; margin-top: 15px;">
                <div class="pricing-label">Updated</div>
                <div class="pricing-value" style="font-size: 0.95rem;">${card.publish_date || 'N/A'}</div>
            </div>
        `;
    }

    function showLoading(show) {
        loadingIndicator.style.display = show ? 'block' : 'none';
        form.querySelector('button[type="submit"]').disabled = show;
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        pricingCardsContainer.style.display = 'none';
        marketTrendsContainer.style.display = 'none';
        vinDecodeContainer.style.display = 'none';
        recommendationContainer.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
    }

    async function displayMarketListings(cards) {
        if (!cards || cards.length === 0) return;

        const firstCard = cards[0];
        const avgRetail = cards.reduce((sum, c) => sum + (c.adjusted_retail_rough || 0), 0) / cards.length;

        try {
            const response = await fetch('/api/market-listings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    year: firstCard.year,
                    make: firstCard.make,
                    model: firstCard.model,
                    blackbook_retail: Math.round(avgRetail)
                })
            });

            const data = await response.json();

            if (data.success && data.listings && data.listings.length > 0) {
                // Calculate market statistics
                const prices = data.listings.map(l => l.price).filter(p => p && !isNaN(p));
                const sortedPrices = [...prices].sort((a, b) => a - b);
                
                const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
                const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const blackbookRetail = Math.round(avgRetail);
                const avgVsBlackbook = avgPrice - blackbookRetail;
                const avgVsBlackbookPct = blackbookRetail > 0 ? ((avgVsBlackbook / blackbookRetail) * 100).toFixed(1) : 0;
                
                // Display market summary
                const marketSummary = document.getElementById('marketSummary');
                marketSummary.innerHTML = `
                    <h3>📊 Real Market Price Analysis</h3>
                    <div class="market-stats">
                        <div class="market-stat">
                            <div class="market-stat-label">Average Asking Price</div>
                            <div class="market-stat-value">$${Math.round(avgPrice).toLocaleString()}</div>
                            <div class="market-stat-sub">${prices.length} listings</div>
                        </div>
                        <div class="market-stat">
                            <div class="market-stat-label">Median Price</div>
                            <div class="market-stat-value">$${Math.round(medianPrice).toLocaleString()}</div>
                            <div class="market-stat-sub">Middle value</div>
                        </div>
                        <div class="market-stat">
                            <div class="market-stat-label">Price Range</div>
                            <div class="market-stat-value" style="font-size: 1.2rem;">$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}</div>
                            <div class="market-stat-sub">Low to high</div>
                        </div>
                        <div class="market-stat">
                            <div class="market-stat-label">vs Blackbook Value</div>
                            <div class="market-stat-value" style="color: ${avgVsBlackbook < 0 ? '#4CAF50' : '#f44336'};">
                                ${avgVsBlackbook < 0 ? '-' : '+'}$${Math.abs(Math.round(avgVsBlackbook)).toLocaleString()}
                            </div>
                            <div class="market-stat-sub">${avgVsBlackbookPct}% ${avgVsBlackbook < 0 ? 'lower' : 'higher'}</div>
                        </div>
                    </div>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-top: 15px;">
                        <strong style="color: #2E7D32;">💡 Market Insight:</strong> 
                        ${avgVsBlackbook < -5000 
                            ? `Real market prices are significantly <strong>lower</strong> than Blackbook estimates. The average asking price is <strong>$${Math.abs(Math.round(avgVsBlackbook)).toLocaleString()} below</strong> book value. This confirms Blackbook values are inflated for the Canadian market.` 
                            : avgVsBlackbook < 0 
                            ? `Real market prices are <strong>slightly lower</strong> than Blackbook estimates by $${Math.abs(Math.round(avgVsBlackbook)).toLocaleString()} on average.`
                            : `Real market prices are <strong>higher</strong> than Blackbook estimates, suggesting strong demand for this vehicle.`}
                    </div>
                `;
                marketSummary.style.display = 'block';
                
                // Store and render market listings
                rawMarketListings = data.listings;
                renderMarketListings(data.listings, blackbookRetail);
                marketListingsContainer.style.display = 'block';
            }
        } catch (error) {
            console.log('Market listings fetch failed:', error);
        }
    }

    function renderMarketListings(listings, blackbookRetailValue) {
        marketListingsGrid.innerHTML = '';
        
        listings.forEach(listing => {
            const listingCard = document.createElement('div');
            listingCard.className = 'market-listing-card';
            
            // Recalculate price difference using current adjusted Blackbook value
            const priceDiff = listing.price - blackbookRetailValue;
            let priceIndicator = '';
            let priceClass = '';
            
            if (priceDiff < -2000) {
                priceIndicator = `<div class="price-indicator excellent">💰 $${Math.abs(Math.round(priceDiff)).toLocaleString()} BELOW Blackbook</div>`;
                priceClass = 'price-excellent';
            } else if (priceDiff < 0) {
                priceIndicator = `<div class="price-indicator good">✅ $${Math.abs(Math.round(priceDiff)).toLocaleString()} below Blackbook</div>`;
                priceClass = 'price-good';
            } else if (priceDiff > 2000) {
                priceIndicator = `<div class="price-indicator high">⚠️ $${Math.round(priceDiff).toLocaleString()} ABOVE Blackbook</div>`;
                priceClass = 'price-high';
            } else {
                priceIndicator = `<div class="price-indicator neutral">≈ At Blackbook value</div>`;
                priceClass = 'price-neutral';
            }
            
            listingCard.innerHTML = `
                <div class="listing-header ${priceClass}">
                    <div class="listing-price">$${listing.price.toLocaleString()}</div>
                    ${priceIndicator}
                </div>
                <div class="listing-details">
                    ${listing.mileage_km ? `<div class="listing-item">📏 ${listing.mileage_km.toLocaleString()} km</div>` : ''}
                    ${listing.location ? `<div class="listing-item">📍 ${listing.location}</div>` : ''}
                    ${listing.is_sample ? '<div class="listing-item" style="font-size: 0.8rem; color: #999;">📊 Sample Data</div>' : ''}
                </div>
                ${listing.url && !listing.is_sample ? `<a href="${listing.url}" target="_blank" class="listing-link">View on AutoTrader →</a>` : ''}
            `;
            
            marketListingsGrid.appendChild(listingCard);
        });
    }

    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        marketListingsContainer.style.display = 'none';
    }
});