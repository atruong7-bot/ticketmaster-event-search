// Global variables
let currentEvents = [];
let currentSort = { column: null, direction: "asc" };

// DOM elements
const form = document.getElementById("searchForm");
const keywordInput = document.getElementById("keyword");
const distanceInput = document.getElementById("distance");
const categorySelect = document.getElementById("category");
const locationInput = document.getElementById("location");
const autoDetectCheckbox = document.getElementById("autoDetect");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const loadingSpinner = document.getElementById("loadingSpinner");
const resultsContainer = document.getElementById("resultsContainer");
const noResults = document.getElementById("noResults");
const resultsTable = document.getElementById("resultsTable");
const resultsBody = document.getElementById("resultsBody");
const eventDetails = document.getElementById("eventDetails");
const venueDetails = document.getElementById("venueDetails");
const locationRow = document.getElementById("locationRow");

// Initialize the page
document.addEventListener("DOMContentLoaded", function () {
  initializeEventListeners();
});

function initializeEventListeners() {
  // Form submission
  form.addEventListener("submit", handleFormSubmit);

  // Clear button
  clearBtn.addEventListener("click", clearForm);

  // Auto-detect checkbox
  autoDetectCheckbox.addEventListener("change", handleAutoDetectChange);

  // Table sorting
  document.querySelectorAll(".sortable").forEach((header) => {
    header.addEventListener("click", handleSort);
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();

  // Validate form
  if (!validateForm()) {
    return;
  }

  // Show loading state
  showLoading();
  hideResults();
  hideEventDetails();
  hideVenueDetails();

  document.getElementById("venueToggleBtn").classList.add("hidden");
  document.getElementById("venueToggleBtn").classList.remove("active");

  try {
    let location = locationInput.value.trim();

    // Handle auto-detect location
    if (autoDetectCheckbox.checked) {
      const userLocation = await getUserLocation();
      location = `${userLocation.city}, ${userLocation.region}`;
    }

    // Build search parameters
    const params = new URLSearchParams({
      keyword: keywordInput.value.trim(),
      distance: distanceInput.value || "10",
      category: categorySelect.value,
      location: location,
    });

    // Make API call to Flask backend
    const response = await fetch(`/search?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Search failed");
    }

    // Display results
    displayResults(data);
  } catch (error) {
    console.error("Search error:", error);
    showError("Search failed: " + error.message);
  } finally {
    hideLoading();
  }
}

function validateForm() {
  let isValid = true;

  // Validate keyword
  if (!keywordInput.value.trim()) {
    showError("keyword-error");
    isValid = false;
  } else {
    hideError("keyword-error");
  }

  // Validate location (only if auto-detect is not checked)
  if (!autoDetectCheckbox.checked && !locationInput.value.trim()) {
    showError("location-error");
    isValid = false;
  } else {
    hideError("location-error");
  }

  return isValid;
}

function validateKeyword() {
  if (!keywordInput.value.trim()) {
    showError("keyword-error");
  } else {
    hideError("keyword-error");
  }
}

function validateLocation() {
  if (!autoDetectCheckbox.checked && !locationInput.value.trim()) {
    showError("location-error");
  } else {
    hideError("location-error");
  }
}

function showError(errorId) {
  const errorElement = document.getElementById(errorId);
  errorElement.classList.add("show");
}

function hideError(errorId) {
  const errorElement = document.getElementById(errorId);
  errorElement.classList.remove("show");
}

function clearForm() {
  // Reset form fields
  form.reset();

  // Reset to default values
  distanceInput.placeholder = "10";
  categorySelect.value = "Default";
  autoDetectCheckbox.checked = false;

  // Handle auto-detect change
  handleAutoDetectChange();

  // Hide all results and details
  hideResults();
  hideEventDetails();
  hideVenueDetails();
  hideLoading();

  // Hide error tooltips
  hideError("keyword-error");
  hideError("location-error");

  // Reset button state
  searchBtn.textContent = "SEARCH";
  searchBtn.disabled = false;

  hideVenueDetails();
  document.getElementById("venueToggleBtn").classList.add("hidden");
}

function handleAutoDetectChange() {
  if (autoDetectCheckbox.checked) {
    locationInput.value = "";
    locationInput.required = false;
    locationInput.style.display = "none";
    hideError("location-error");
  } else {
    locationInput.style.display = "block";
    locationInput.required = true;
  }
}

async function getUserLocation() {
  try {
    const response = await fetch("/ipinfo");
    const data = await response.json();

    if (data.loc) {
      const [lat, lng] = data.loc.split(",");
      return {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        city: data.city,
        region: data.region,
        country: data.country,
      };
    } else {
      throw new Error("Location not found in response");
    }
  } catch (error) {
    console.error("Error getting user location:", error);
    throw new Error("Unable to detect location. Please enter manually.");
  }
}

function displayResults(data) {
  if (
    !data._embedded ||
    !data._embedded.events ||
    data._embedded.events.length === 0
  ) {
    showNoResults();
    return;
  }

  currentEvents = data._embedded.events;
  populateTable(currentEvents);
  showResults();
}

function populateTable(events) {
  resultsBody.innerHTML = "";

  events.forEach((event) => {
    const row = document.createElement("tr");

    // Extract event data
    const eventData = extractEventData(event);

    row.innerHTML = `
            <td>${eventData.dateTime}</td>
            <td>${eventData.icon}</td>
            <td><a href="#" class="event-link" onclick="fetchAndShowEventDetails('${event.id}')">${eventData.name}</a></td>
            <td>${eventData.genre}</td>
            <td>${eventData.venueName}</td>
        `;

    resultsBody.appendChild(row);
  });
}

function extractEventData(event) {
  // Extract date and time
  let date = "N/A";
  if (event.dates && event.dates.start) {
    const start = event.dates.start;
    if (start.localDate && start.localTime) {
      date = formatDate(`${start.localDate}T${start.localTime}`);
    } else if (start.dateTime) {
      date = formatDate(start.dateTime);
    } else if (start.localDate) {
      date = formatDate(`${start.localDate}T00:00:00`);
    }
  }

  // Extract icon (image)
  let icon = "";
  if (event.images && event.images.length > 0) {
    icon = `<img src="${event.images[0].url}" alt="Event" class="event-icon">`;
  }

  // Extract genre
  let genre = "";
  if (event.classifications && event.classifications.length > 0) {
    const classification = event.classifications[0];

    const genreParts = [
      classification.subGenre?.name,
      classification.genre?.name,
      classification.segment?.name,
      classification.subType?.name,
      classification.type?.name,
    ].filter((part) => part && part !== "Undefined" && part !== "Other");

    genre = genreParts.length > 0 ? genreParts.join(" | ") : "N/A";
  }

  // Extract venue name
  let venueName = "";
  if (
    event._embedded &&
    event._embedded.venues &&
    event._embedded.venues.length > 0
  ) {
    venueName = event._embedded.venues[0].name;
  }

  return {
    dateTime: date,
    icon,
    name: event.name || "N/A",
    genre: genre || "N/A",
    venueName: venueName || "N/A",
  };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return dateStr;
  }
}

function handleSort(e) {
  const column = e.target.getAttribute("data-sort");

  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    currentSort.column = column;
    currentSort.direction = "asc";
  }

  sortEvents(currentEvents, column, currentSort.direction);
  populateTable(currentEvents);
}

function sortEvents(events, column, direction) {
  events.sort((a, b) => {
    let aValue = "";
    let bValue = "";

    switch (column) {
      case "event":
        aValue = a.name || "";
        bValue = b.name || "";
        break;
      case "genre":
        aValue = extractEventData(a).genre;
        bValue = extractEventData(b).genre;
        break;
      case "venue":
        aValue = extractEventData(a).venueName;
        bValue = extractEventData(b).venueName;
        break;
    }

    if (direction === "asc") {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });
}

async function fetchAndShowEventDetails(eventId) {
  hideVenueDetails();
  document.getElementById("venueToggleBtn").classList.remove("active");
  document.getElementById("venueToggleBtn").classList.remove("hidden");

  try {
    const response = await fetch(`/event/${eventId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch event details");
    }

    displayEventDetails(data);
    scrollToEventDetails();

    if (
      data._embedded &&
      data._embedded.venues &&
      data._embedded.venues.length > 0 &&
      data._embedded.venues[0].name
    ) {
      const venueBtn = document.getElementById("venueToggleBtn");
      venueBtn.classList.remove("hidden");
      venueBtn.classList.remove("active");
    } else {
      const venueBtn = document.getElementById("venueToggleBtn");
      venueBtn.classList.add("hidden");
      venueBtn.classList.remove("active");
    }
  } catch (error) {
    console.error("Error fetching event details:", error);
    showError("Failed to load event details: " + error.message);
  }
}

function displayEventDetails(event) {
  const eventData = extractDetailedEventData(event);

  // Store venue name globally so the button knows what to fetch
  currentVenueName = eventData.venueName;

  eventDetails.innerHTML = `
    <div class="event-details-header">${event.name}</div>
    <div class="event-details-left">
      ${
        eventData.date !== "N/A"
          ? `
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${eventData.date}</span>
        </div>
      `
          : ""
      }

      ${
        eventData.artists !== "N/A"
          ? `
        <div class="detail-row">
          <span class="detail-label">Artist/Team</span>
          <span class="detail-value">${eventData.artists}</span>
        </div>
      `
          : ""
      }

      ${
        eventData.venue !== "N/A"
          ? `
        <div class="detail-row">
          <span class="detail-label">Venue</span>
          <span class="detail-value">${eventData.venue}</span>
        </div>
      `
          : ""
      }

      ${
        eventData.genre !== "N/A"
          ? `
        <div class="detail-row">
          <span class="detail-label">Genres</span>
          <span class="detail-value">${eventData.genre}</span>
        </div>
      `
          : ""
      }
      <div class="detail-row">
        <span class="detail-label">Ticket Status</span>
        <span class="detail-value ${
          eventData.statusClass === "status-onsale"
            ? "ticket-status-onsale"
            : "ticket-status-other"
        }">${eventData.status}</span>
      </div>
      ${
        eventData.priceRange
          ? `
        <div class="detail-row">
          <span class="detail-label">Ticket Price</span>
          <span class="detail-value">${eventData.priceRange}</span>
        </div>
      `
          : ""
      }
      <div class="detail-row">
        <span class="detail-label">Buy Ticket At</span>
        <span class="detail-value"><a href="${
          event.url
        }" target="_blank" style="color:#5dade2;">Ticketmaster</a></span>
      </div>
    </div>
    ${
      eventData.seatMap
        ? `
        <div class="event-details-right">
          <img src="${eventData.seatMap}" alt="Seat Map">
        </div>
      `
        : ""
    }
  `;

  showEventDetails();

  const venueToggleBtn = document.getElementById("venueToggleBtn");
  venueToggleBtn.classList.remove("hidden");
  venueToggleBtn.classList.remove("active");
}

async function toggleVenueDetails(venueName) {
  const venueSection = document.getElementById("venueDetails");
  const btn = document.getElementById("venueToggleBtn");

  if (venueSection.classList.contains("hidden")) {
    await fetchAndShowVenueDetails(venueName);
    btn.classList.add("active");

    btn.classList.add("hidden");
  }
}

function extractDetailedEventData(event) {
  // Extract date and time
  let date = "N/A";
  if (event.dates && event.dates.start) {
    const start = event.dates.start;
    if (start.localDate && start.localTime) {
      date = formatDate(`${start.localDate}T${start.localTime}`);
    } else if (start.localDate) {
      date = formatDate(`${start.localDate}T00:00:00`);
    }
  }

  // Extract artists/teams
  let artists = "N/A";
  if (event._embedded && event._embedded.attractions) {
    artists = event._embedded.attractions
      .map((attr) => {
        const artistName = attr.name || "N/A";
        const artistUrl = attr.url || null;
        if (artistUrl) {
          return `<a href="${artistUrl}" target="_blank">${artistName}</a>`;
        } else {
          return artistName;
        }
      })
      .join(" | ");
  }

  // Extract venue
  let venue = "N/A";
  let venueName = "";
  if (
    event._embedded &&
    event._embedded.venues &&
    event._embedded.venues.length > 0
  ) {
    venue = event._embedded.venues[0].name;
    venueName = venue;
  }

  // Extract genre
  let genre = "N/A";
  if (event.classifications && event.classifications.length > 0) {
    const classification = event.classifications[0];

    const genreParts = [
      classification.subGenre?.name,
      classification.genre?.name,
      classification.segment?.name,
      classification.subType?.name,
      classification.type?.name,
    ].filter((part) => part && part !== "Undefined" && part !== "Other");

    genre = genreParts.length > 0 ? genreParts.join(" | ") : "N/A";
  }

  // Extract price range
  let priceRange = null;
  if (event.priceRanges && event.priceRanges.length > 0) {
    const price = event.priceRanges[0];
    priceRange = `$${price.min} - $${price.max}`;
  }

  // Extract ticket status
  let status = "N/A";
  let statusClass = "";
  if (event.dates && event.dates.status && event.dates.status.code) {
    const rawStatus = event.dates.status.code;
    statusClass = getStatusClass(rawStatus);

    // Format status for display
    switch (rawStatus.toLowerCase()) {
      case "onsale":
        status = "On Sale";
        break;
      case "offsale":
        status = "Off Sale";
        break;
      case "cancelled":
        status = "Cancelled";
        break;
      case "postponed":
        status = "Postponed";
        break;
      case "rescheduled":
        status = "Rescheduled";
        break;
      default:
        // Capitalize first letter as fallback
        status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
    }
  }

  // Extract seat map
  let seatMap = null;
  if (event.seatmap && event.seatmap.staticUrl) {
    seatMap = event.seatmap.staticUrl;
  }

  return {
    date,
    artists,
    venue,
    venueName,
    genre,
    priceRange,
    status,
    statusClass,
    seatMap,
  };
}

function getStatusClass(status) {
  const statusLower = status.toLowerCase();
  if (statusLower.includes("onsale")) return "status-onsale";
  if (statusLower.includes("offsale")) return "status-offsale";
  if (statusLower.includes("cancelled")) return "status-cancelled";
  if (statusLower.includes("postponed")) return "status-postponed";
  if (statusLower.includes("rescheduled")) return "status-rescheduled";
  return "";
}

async function fetchAndShowVenueDetails(venueName) {
  try {
    const response = await fetch(
      `/venue?keyword=${encodeURIComponent(venueName)}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch venue details");
    }

    if (
      data._embedded &&
      data._embedded.venues &&
      data._embedded.venues.length > 0
    ) {
      displayVenueDetails(data._embedded.venues[0]);
    } else {
      hideVenueDetails();
      const venueBtn = document.getElementById("venueToggleBtn");
      venueBtn.classList.add("hidden");
      venueBtn.classList.remove("active");

      console.warn("No venue details found for this event.");
    }
  } catch (error) {
    console.error("Error fetching venue details:", error);
    hideVenueDetails();
    const venueBtn = document.getElementById("venueToggleBtn");
    venueBtn.classList.add("hidden");
    venueBtn.classList.remove("active");
    showError("Failed to load venue details: " + error.message);
  }
}

function displayVenueDetails(venue) {
  const venueData = extractVenueData(venue);

  venueDetails.innerHTML = `
    <div class="venue-card">
      <h2 class="venue-title">${venueData.name}</h2>
      <div class="venue-logo">
        ${
          venue.images && venue.images.length > 0
            ? `<img src="${venue.images[0].url}" alt="${venueData.name} logo">`
            : ""
        }
      </div>
      <div class="venue-info">
        <div class="venue-left">
          <p class="venue-address">
            Address: ${venueData.address}<br>
            ${venueData.city}<br>
            ${venueData.postalCode}
          </p>
          <a class="venue-map-link" href="${venueData.mapUrl}" target="_blank">
            Open in Google Maps
          </a>
        </div>
        <div class="venue-divider"></div>
        <div class="venue-right">
          <a class="venue-more-link" href="${venue.url}" target="_blank">
            More events at this venue
          </a>
        </div>
      </div>
    </div>
  `;

  showVenueDetails();
}

function extractVenueData(venue) {
  const name = venue.name || "N/A";
  const address = venue.address ? venue.address.line1 || "N/A" : "N/A";
  const city = venue.city
    ? `${venue.city.name}, ${venue.state ? venue.state.stateCode : ""}`
    : "N/A";
  const postalCode = venue.postalCode || "N/A";

  // Build Google Maps URL
  const fullAddress = `${name}, ${address}, ${city}, ${postalCode}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    fullAddress
  )}`;

  return {
    name,
    address,
    city,
    postalCode,
    mapUrl,
  };
}

// Utility functions
function showLoading() {
  loadingSpinner.classList.remove("hidden");
}

function hideLoading() {
  loadingSpinner.classList.add("hidden");
}

function showResults() {
  resultsContainer.classList.remove("hidden");
  noResults.classList.add("hidden");
}

function hideResults() {
  resultsContainer.classList.add("hidden");
  noResults.classList.add("hidden");
}

function showNoResults() {
  noResults.classList.remove("hidden");
  resultsContainer.classList.add("hidden");
}

function showEventDetails() {
  eventDetails.classList.remove("hidden");
}

function hideEventDetails() {
  eventDetails.classList.add("hidden");
}

function showVenueDetails() {
  venueDetails.classList.remove("hidden");
}

function hideVenueDetails() {
  venueDetails.classList.add("hidden");
}

function scrollToEventDetails() {
  setTimeout(() => {
    eventDetails.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

function showError(message) {
  alert(message); // Simple error display - can be enhanced
}
