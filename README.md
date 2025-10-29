# Event Finder 🎟️

A responsive web app that lets users search for nearby events using the Ticketmaster API.  
Built with a Flask backend and a vanilla JavaScript frontend, the app fetches and displays event and venue details in real time.

DEPLOYED HERE: https://homework2-474822.wl.r.appspot.com/

---

## Features
- Search by **keyword**, **distance**, **category**, and **location**
- Option to **auto-detect user location** via IPInfo API
- Displays results in a sortable table (Date, Event, Genre, Venue)
- Expandable event cards with:
  - Ticket status (color-coded)
  - Price range
  - Links to Ticketmaster and seat maps
- Expandable venue details with address and Google Maps link

---

## Tech Stack
- **Backend:** Python, Flask  
- **Frontend:** HTML, CSS, JavaScript (no frameworks)  
- **APIs:** Ticketmaster Discovery, Google Maps Geocoding, IPInfo.io  
- **Hosting:** Google Cloud App Engine  

---

## Setup
1. Clone the repo  
   ```bash
   git clone <repo-url>
   cd event-finder
   ```
2. Install dependencies  
   ```bash
   pip install -r requirements.txt
   ```
3. Add your API keys in `config.py` (Ticketmaster, Google, IPInfo)
4. Run locally  
   ```bash
   python main.py
   ```
   Then open `http://localhost:8080`
5. Deploy to GCP  
   ```bash
   gcloud app deploy
   ```

---

## Project Structure
```
├── main.py              # Flask backend and API routes
├── templates/
│   └── index.html       # Search form and results
├── static/
│   ├── style.css        # Custom styling
│   └── script.js        # Frontend logic (AJAX, rendering)
├── requirements.txt
└── app.yaml             # GCP deployment config
```

---

## Notes
- All Ticketmaster calls are handled on the server (no client-side API calls)  
- Uses geohash encoding for location-based event searches  
- Default search radius: 10 miles  
- Works best on Chrome  
