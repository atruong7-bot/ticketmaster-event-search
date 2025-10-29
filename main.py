from flask import Flask, render_template, request, jsonify
import requests
import json
import os
from geolib import geohash
from dotenv import load_dotenv

app = Flask(__name__)

# Load API keys from environment variables
load_dotenv()
TICKETMASTER_API_KEY = os.getenv("TICKETMASTER_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

@app.route("/ipinfo")
def ipinfo_proxy():
    token = os.getenv("IPINFO_KEY")
    if not token:
        return jsonify({"error": "Missing IPInfo token"}), 500

    try:
        res = requests.get(f"https://ipinfo.io/json?token={token}", timeout=5)
        res.raise_for_status()
        return jsonify(res.json())
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search')
def search_events():
    """
    Main search endpoint that handles event search
    Uses GET method as required by assignment
    """
    # Get form parameters
    keyword = request.args.get('keyword', '')
    distance = request.args.get('distance', '10')
    category = request.args.get('category', 'Default')
    location = request.args.get('location', '')
    
    # Validate required fields
    if not keyword:
        return jsonify({'error': 'Keyword is required'}), 400
    if not location:
        return jsonify({'error': 'Location is required'}), 400
    
    try:
        # Get geocoding for location using Google Maps API
        geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
        geocode_params = {
            'address': location,
            'key': GOOGLE_API_KEY
        }
        geocode_response = requests.get(geocode_url, params=geocode_params)
        geocode_data = geocode_response.json()
        
        if not geocode_data.get('results'):
            return jsonify({'error': 'Location not found'}), 400
        
        # Extract lat/lng and convert to geohash
        lat = geocode_data['results'][0]['geometry']['location']['lat']
        lng = geocode_data['results'][0]['geometry']['location']['lng']
        geo_hash = geohash.encode(str(lat), str(lng), 7)
        
        # Prepare Ticketmaster API parameters
        tm_params = {
            'apikey': TICKETMASTER_API_KEY,
            'keyword': keyword,
            'geoPoint': geo_hash,
            'radius': distance,
            'unit': 'miles'
        }
        
        # Add segment ID based on category (from assignment Table 1)
        segment_map = {
            'Music': 'KZFzniwnSyZfZ7v7nJ',
            'Sports': 'KZFzniwnSyZfZ7v7nE',
            'Arts & Theatre': 'KZFzniwnSyZfZ7v7na',
            'Film': 'KZFzniwnSyZfZ7v7nn',
            'Miscellaneous': 'KZFzniwnSyZfZ7v7n1'
        }
        
        if category != 'Default':
            tm_params['segmentId'] = segment_map.get(category)
        
        # Call Ticketmaster API Event Search
        tm_url = "https://app.ticketmaster.com/discovery/v2/events.json"
        tm_response = requests.get(tm_url, params=tm_params)
        tm_data = tm_response.json()
        
        return jsonify(tm_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/event/<event_id>')
def get_event_details(event_id):
    """
    Get detailed information for a specific event
    Required by assignment section 2.3.1
    """
    try:
        url = f"https://app.ticketmaster.com/discovery/v2/events/{event_id}"
        params = {'apikey': TICKETMASTER_API_KEY}
        response = requests.get(url, params=params)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/venue')
def get_venue_details():
    """
    Get detailed information for a specific venue
    Required by assignment section 2.3
    """
    venue_name = request.args.get('keyword', '')
    try:
        url = "https://app.ticketmaster.com/discovery/v2/venues"
        params = {
            'apikey': TICKETMASTER_API_KEY,
            'keyword': venue_name
        }
        response = requests.get(url, params=params)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))  
    app.run(host='0.0.0.0', port=port, debug=True)

