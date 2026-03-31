import {
  createMessage,
  createProperty,
  deleteProperty,
  fetchCurrentUser,
  fetchInbox,
  fetchMyProperties,
  fetchProperties,
  fetchProperty,
  fetchPublicConfig,
  markMessageAsRead,
  session,
  updateProperty,
  verifyProperty
} from "./api.js";

const placeholderImage =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
      <defs>
        <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#dff6ef" />
          <stop offset="100%" stop-color="#ffe6de" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#g)" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#173630" font-family="Arial" font-size="56" font-weight="700">RoomRadar Property</text>
    </svg>
  `);

const elements = {
  heroSearchForm: document.getElementById("heroSearchForm"),
  heroSearchInput: document.getElementById("heroSearchInput"),
  heroDistanceSelect: document.getElementById("heroDistanceSelect"),
  exploreButton: document.getElementById("exploreButton"),
  filterForm: document.getElementById("filterForm"),
  searchInput: document.getElementById("searchInput"),
  listingModeFilter: document.getElementById("listingModeFilter"),
  propertyTypeFilter: document.getElementById("propertyTypeFilter"),
  minPriceFilter: document.getElementById("minPriceFilter"),
  maxPriceFilter: document.getElementById("maxPriceFilter"),
  distanceFilter: document.getElementById("distanceFilter"),
  sortFilter: document.getElementById("sortFilter"),
  resetFiltersButton: document.getElementById("resetFiltersButton"),
  searchAreaButton: document.getElementById("searchAreaButton"),
  resultsMeta: document.getElementById("resultsMeta"),
  listingCountBadge: document.getElementById("listingCountBadge"),
  listingsGrid: document.getElementById("listingsGrid"),
  map: document.getElementById("map"),
  mapFallback: document.getElementById("mapFallback"),
  propertyDrawer: document.getElementById("propertyDrawer"),
  drawerContent: document.getElementById("drawerContent"),
  closeDrawerButton: document.getElementById("closeDrawerButton"),
  contactModal: document.getElementById("contactModal"),
  contactForm: document.getElementById("contactForm"),
  contactPropertyTitle: document.getElementById("contactPropertyTitle"),
  closeContactModalButton: document.getElementById("closeContactModalButton"),
  appToast: document.getElementById("appToast"),
  userBadge: document.getElementById("userBadge"),
  loginLink: document.getElementById("loginLink"),
  signupLink: document.getElementById("signupLink"),
  logoutButton: document.getElementById("logoutButton"),
  ownerWorkspace: document.getElementById("ownerWorkspace"),
  propertyForm: document.getElementById("propertyForm"),
  ownerFormHeading: document.getElementById("ownerFormHeading"),
  clearOwnerFormButton: document.getElementById("clearOwnerFormButton"),
  ownerListings: document.getElementById("ownerListings"),
  ownerListingMeta: document.getElementById("ownerListingMeta"),
  ownerInboxSection: document.getElementById("ownerInboxSection"),
  messageInbox: document.getElementById("messageInbox"),
  refreshInboxButton: document.getElementById("refreshInboxButton"),
  useMapCenterButton: document.getElementById("useMapCenterButton"),
  geocodeAddressButton: document.getElementById("geocodeAddressButton")
};

const state = {
  user: session.getUser(),
  properties: [],
  selectedProperty: null,
  map: null,
  markers: [],
  infoWindow: null,
  geocoder: null,
  autocomplete: null,
  publicConfig: null,
  isGoogleMapsReady: false,
  currentContactPropertyId: null,
  editingPropertyId: null
};

const debounce = (callback, wait = 400) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), wait);
  };
};

const showToast = (message, isError = false) => {
  elements.appToast.textContent = message;
  elements.appToast.style.background = isError ? "rgba(193, 67, 67, 0.95)" : "rgba(23, 54, 48, 0.92)";
  elements.appToast.classList.remove("hidden");
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => elements.appToast.classList.add("hidden"), 3200);
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatPrice = (price, listingMode) => {
  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(price || 0);

  return listingMode === "rent" ? `${amount}/month` : amount;
};

const getPrimaryImage = (property) => property.images?.[0] || placeholderImage;
const isOwner = (property) => state.user && property.owner && String(property.owner._id || property.owner) === String(state.user.id);
const isOwnerRole = () => state.user && ["owner", "admin"].includes(state.user.role);
const isStudentRole = () => state.user && state.user.role === "student";

const syncAuthUI = () => {
  const loggedIn = Boolean(state.user);

  elements.loginLink.classList.toggle("hidden", loggedIn);
  elements.signupLink.classList.toggle("hidden", loggedIn);
  elements.logoutButton.classList.toggle("hidden", !loggedIn);
  elements.userBadge.classList.toggle("hidden", !loggedIn);
  elements.userBadge.textContent = loggedIn ? `${state.user.name} · ${state.user.role}` : "";
  elements.ownerWorkspace.classList.toggle("hidden", !isOwnerRole());
  elements.ownerInboxSection.classList.toggle("hidden", !isOwnerRole());
};

const hydrateUser = async () => {
  if (!session.getToken()) {
    state.user = null;
    syncAuthUI();
    return;
  }

  try {
    const data = await fetchCurrentUser();
    state.user = {
      id: data.user._id,
      name: data.user.name,
      email: data.user.email,
      phone: data.user.phone,
      role: data.user.role
    };
    session.set({ token: session.getToken(), user: state.user });
  } catch (_error) {
    session.clear();
    state.user = null;
  }

  syncAuthUI();
};

const loadGoogleMaps = (apiKey) =>
  new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    if (!apiKey) {
      reject(new Error("Missing Google Maps API key."));
      return;
    }

    window.__roomRadarMapsReady = () => {
      resolve(window.google.maps);
      delete window.__roomRadarMapsReady;
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=__roomRadarMapsReady`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });

const buildSearchParams = () => {
  const params = {};
  const keyword = elements.searchInput.value.trim();
  const listingMode = elements.listingModeFilter.value;
  const propertyType = elements.propertyTypeFilter.value;
  const minPrice = elements.minPriceFilter.value;
  const maxPrice = elements.maxPriceFilter.value;
  const distance = elements.distanceFilter.value || state.publicConfig?.config?.defaultSearchDistanceKm || 5;
  const sort = elements.sortFilter.value;

  if (keyword) params.college = keyword;
  if (listingMode) params.listingMode = listingMode;
  if (propertyType) params.propertyType = propertyType;
  if (minPrice) params.minPrice = minPrice;
  if (maxPrice) params.maxPrice = maxPrice;
  if (distance) params.distance = distance;
  if (sort) params.sort = sort;

  if (state.map) {
    const center = state.map.getCenter();
    params.lat = center.lat();
    params.lng = center.lng();
  }

  return params;
};

const renderEmptyState = (target, message) => {
  target.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
};

const renderMarkers = () => {
  if (!state.map || !window.google?.maps) {
    return;
  }

  state.markers.forEach((marker) => marker.setMap(null));
  state.markers = [];

  state.properties.forEach((property) => {
    const [lng, lat] = property.location.coordinates;
    const marker = new window.google.maps.Marker({
      map: state.map,
      position: { lat, lng },
      title: property.title
    });

    marker.addListener("click", () => openPropertyDrawer(property._id));
    state.markers.push(marker);
  });
};

const renderListings = () => {
  if (!state.properties.length) {
    renderEmptyState(elements.listingsGrid, "No properties matched the current search. Try widening the distance or resetting your filters.");
    return;
  }

  elements.listingsGrid.innerHTML = state.properties
    .map(
      (property) => `
        <article class="listing-card">
          <img src="${escapeHtml(getPrimaryImage(property))}" alt="${escapeHtml(property.title)}" />
          <div class="listing-card-body">
            <div class="listing-card-top">
              <div>
                <h3>${escapeHtml(property.title)}</h3>
                <p class="muted">${escapeHtml(property.address)}, ${escapeHtml(property.city)}</p>
              </div>
              <span class="status-badge status-${escapeHtml(property.verificationStatus)}">${escapeHtml(property.verificationStatus)}</span>
            </div>

            <p class="price-tag">${escapeHtml(formatPrice(property.price, property.listingMode))}</p>
            <div class="chip-row">
              <span class="chip">${escapeHtml(property.propertyType)}</span>
              <span class="chip">${escapeHtml(property.listingMode)}</span>
              <span class="chip">${escapeHtml(property.distanceFromCollege || 0)} km to campus</span>
              ${
                property.distanceFromSearchKm !== null
                  ? `<span class="chip">${escapeHtml(property.distanceFromSearchKm)} km away</span>`
                  : ""
              }
            </div>

            <div class="listing-actions">
              <button class="button button-secondary" type="button" data-view-property="${property._id}">View details</button>
              ${
                isStudentRole() && !isOwner(property)
                  ? `<button class="button button-primary" type="button" data-contact-property="${property._id}">Contact owner</button>`
                  : ""
              }
            </div>
          </div>
        </article>
      `
    )
    .join("");
};

const renderResultsMeta = () => {
  const count = state.properties.length;
  elements.listingCountBadge.textContent = `${count} result${count === 1 ? "" : "s"}`;
  elements.resultsMeta.textContent = count
    ? `${count} properties found near the current search area.`
    : "No matching properties yet in this area.";
};

const loadProperties = async () => {
  elements.resultsMeta.textContent = "Loading listings...";

  try {
    const data = await fetchProperties(buildSearchParams());
    state.properties = data.properties || [];
    renderResultsMeta();
    renderListings();
    renderMarkers();
  } catch (error) {
    renderEmptyState(elements.listingsGrid, error.message);
    elements.resultsMeta.textContent = "Unable to load listings.";
    showToast(error.message, true);
  }
};

const centerMapForQuery = (query) =>
  new Promise((resolve) => {
    if (!query || !state.geocoder || !state.map) {
      resolve(false);
      return;
    }

    state.geocoder.geocode({ address: query }, (results, status) => {
      if (status === "OK" && results[0]) {
        state.map.panTo(results[0].geometry.location);
        state.map.setZoom(14);
        resolve(true);
        return;
      }

      resolve(false);
    });
  });

const openDrawer = () => {
  elements.propertyDrawer.classList.remove("hidden");
  elements.propertyDrawer.setAttribute("aria-hidden", "false");
};

const closeDrawer = () => {
  elements.propertyDrawer.classList.add("hidden");
  elements.propertyDrawer.setAttribute("aria-hidden", "true");
};

const openContactModal = (property) => {
  if (!isStudentRole()) {
    showToast("Log in as a student to contact property owners.", true);
    if (!state.user) {
      setTimeout(() => {
        window.location.href = "/login";
      }, 700);
    }
    return;
  }

  state.currentContactPropertyId = property._id;
  elements.contactPropertyTitle.textContent = property.title;
  elements.contactForm.reset();
  elements.contactModal.classList.remove("hidden");
  elements.contactModal.setAttribute("aria-hidden", "false");
};

const closeContactModal = () => {
  elements.contactModal.classList.add("hidden");
  elements.contactModal.setAttribute("aria-hidden", "true");
  state.currentContactPropertyId = null;
};

const renderDrawer = (property) => {
  state.selectedProperty = property;

  const ownerControls = isOwner(property)
    ? `
        <button class="button button-secondary" type="button" data-edit-property="${property._id}">Edit listing</button>
        <button class="button button-ghost" type="button" data-delete-property="${property._id}">Delete listing</button>
      `
    : "";

  const adminControls =
    state.user?.role === "admin"
      ? `
          <button class="button button-secondary" type="button" data-verify-property="${property._id}" data-status="verified">Approve</button>
          <button class="button button-ghost" type="button" data-verify-property="${property._id}" data-status="rejected">Reject</button>
        `
      : "";

  const studentControl =
    isStudentRole() && !isOwner(property)
      ? `<button class="button button-primary" type="button" data-contact-property="${property._id}">Contact owner</button>`
      : "";

  elements.drawerContent.innerHTML = `
    <div class="drawer-body">
      <div class="drawer-media">
        <img src="${escapeHtml(getPrimaryImage(property))}" alt="${escapeHtml(property.title)}" />
      </div>

      <div class="listing-card-top">
        <div>
          <h2>${escapeHtml(property.title)}</h2>
          <p class="muted">${escapeHtml(property.address)}, ${escapeHtml(property.city)}, ${escapeHtml(property.state || "")}</p>
        </div>
        <span class="status-badge status-${escapeHtml(property.verificationStatus)}">${escapeHtml(property.verificationStatus)}</span>
      </div>

      <p class="price-tag">${escapeHtml(formatPrice(property.price, property.listingMode))}</p>
      <p class="muted">${escapeHtml(property.description)}</p>

      <div class="detail-grid">
        <div><strong>Type</strong><p class="muted">${escapeHtml(property.propertyType)} · ${escapeHtml(property.listingMode)}</p></div>
        <div><strong>College</strong><p class="muted">${escapeHtml(property.nearbyCollege || "Not specified")}</p></div>
        <div><strong>Distance</strong><p class="muted">${escapeHtml(property.distanceFromCollege || 0)} km from campus</p></div>
        <div><strong>Rooms</strong><p class="muted">${escapeHtml(property.bedrooms || 0)} bed · ${escapeHtml(property.bathrooms || 0)} bath</p></div>
      </div>

      <div>
        <strong>Furnishing</strong>
        <p class="muted">${escapeHtml(property.furnishing || "Not specified")}</p>
      </div>

      <div>
        <strong>Amenities</strong>
        <div class="chip-row">
          ${
            property.amenities?.length
              ? property.amenities.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")
              : '<span class="muted">No amenities listed.</span>'
          }
        </div>
      </div>

      <div>
        <strong>Owner contact</strong>
        <p class="muted">${escapeHtml(property.owner?.name || "Property owner")}</p>
        <p class="muted">${escapeHtml(property.contactPhone || property.owner?.phone || "No phone listed")}</p>
        <p class="muted">${escapeHtml(property.contactEmail || property.owner?.email || "No email listed")}</p>
      </div>

      <div class="inline-actions">
        ${studentControl}
        ${ownerControls}
        ${adminControls}
      </div>
    </div>
  `;

  openDrawer();
};

const openPropertyDrawer = async (propertyId) => {
  try {
    const existing = state.properties.find((property) => property._id === propertyId);
    if (existing) {
      renderDrawer(existing);
      return;
    }

    const data = await fetchProperty(propertyId);
    renderDrawer(data.property);
  } catch (error) {
    showToast(error.message, true);
  }
};

const loadMyListings = async () => {
  if (!isOwnerRole()) {
    return;
  }

  try {
    const data = await fetchMyProperties();
    const properties = data.properties || [];
    elements.ownerListingMeta.textContent = `${properties.length} listing${properties.length === 1 ? "" : "s"}`;

    if (!properties.length) {
      renderEmptyState(elements.ownerListings, "You have not added any listings yet.");
      return;
    }

    elements.ownerListings.innerHTML = properties
      .map(
        (property) => `
          <article class="owner-card">
            <img src="${escapeHtml(getPrimaryImage(property))}" alt="${escapeHtml(property.title)}" />
            <div class="owner-card-body">
              <div class="owner-card-top">
                <div>
                  <h3>${escapeHtml(property.title)}</h3>
                  <p class="muted">${escapeHtml(property.city)} · ${escapeHtml(property.propertyType)}</p>
                </div>
                <span class="status-badge status-${escapeHtml(property.verificationStatus)}">${escapeHtml(property.verificationStatus)}</span>
              </div>
              <p class="price-tag">${escapeHtml(formatPrice(property.price, property.listingMode))}</p>
              <div class="owner-card-actions">
                <button class="button button-secondary" type="button" data-view-property="${property._id}">View</button>
                <button class="button button-ghost" type="button" data-edit-property="${property._id}">Edit</button>
                <button class="button button-ghost" type="button" data-delete-property="${property._id}">Delete</button>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  } catch (error) {
    renderEmptyState(elements.ownerListings, error.message);
  }
};

const loadInboxMessages = async () => {
  if (!isOwnerRole()) {
    return;
  }

  try {
    const data = await fetchInbox();
    const messages = data.messages || [];

    if (!messages.length) {
      renderEmptyState(elements.messageInbox, "No student inquiries yet.");
      return;
    }

    elements.messageInbox.innerHTML = messages
      .map(
        (message) => `
          <article class="message-card">
            <div class="message-card-body">
              <div class="owner-card-top">
                <div>
                  <h3>${escapeHtml(message.property?.title || "Listing inquiry")}</h3>
                  <p class="muted">${escapeHtml(message.student?.name || message.name)} · ${escapeHtml(message.student?.email || message.email)}</p>
                </div>
                <span class="status-badge ${message.status === "read" ? "status-verified" : "status-pending"}">${escapeHtml(message.status)}</span>
              </div>
              <p>${escapeHtml(message.message)}</p>
              <p class="muted">Phone: ${escapeHtml(message.phone || "Not shared")}</p>
              ${
                message.status === "new"
                  ? `<div class="message-actions"><button class="button button-secondary" type="button" data-message-read="${message._id}">Mark as read</button></div>`
                  : ""
              }
            </div>
          </article>
        `
      )
      .join("");
  } catch (error) {
    renderEmptyState(elements.messageInbox, error.message);
  }
};

const resetOwnerForm = () => {
  elements.propertyForm.reset();
  elements.ownerFormHeading.textContent = "Add a property";
  elements.clearOwnerFormButton.classList.add("hidden");
  state.editingPropertyId = null;
};

const populateOwnerForm = async (propertyId) => {
  const data = await fetchProperty(propertyId);
  const property = data.property;

  Object.entries({
    title: property.title,
    listingMode: property.listingMode,
    propertyType: property.propertyType,
    price: property.price,
    description: property.description,
    address: property.address,
    city: property.city,
    state: property.state,
    landmark: property.landmark,
    nearbyCollege: property.nearbyCollege,
    distanceFromCollege: property.distanceFromCollege,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    furnishing: property.furnishing,
    contactPhone: property.contactPhone,
    contactEmail: property.contactEmail,
    images: property.images?.join(", "),
    amenities: property.amenities?.join(", "),
    latitude: property.location.coordinates[1],
    longitude: property.location.coordinates[0]
  }).forEach(([key, value]) => {
    const input = elements.propertyForm.elements.namedItem(key);
    if (input) {
      input.value = value ?? "";
    }
  });

  elements.ownerFormHeading.textContent = "Edit property";
  elements.clearOwnerFormButton.classList.remove("hidden");
  state.editingPropertyId = propertyId;
  elements.propertyForm.scrollIntoView({ behavior: "smooth", block: "start" });
};

const submitOwnerForm = async (event) => {
  event.preventDefault();

  const formData = new FormData(elements.propertyForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    if (state.editingPropertyId) {
      await updateProperty(state.editingPropertyId, payload);
      showToast("Listing updated successfully.");
    } else {
      await createProperty(payload);
      showToast("Listing created and submitted for verification.");
    }

    resetOwnerForm();
    await Promise.all([loadMyListings(), loadProperties()]);
  } catch (error) {
    showToast(error.message, true);
  }
};

const geocodeOwnerAddress = async () => {
  if (!state.geocoder || !window.google?.maps) {
    showToast("Google Maps is required to geocode an address.", true);
    return;
  }

  const address = [
    elements.propertyForm.elements.namedItem("address").value,
    elements.propertyForm.elements.namedItem("city").value,
    elements.propertyForm.elements.namedItem("state").value
  ]
    .filter(Boolean)
    .join(", ");

  if (!address) {
    showToast("Add an address first.", true);
    return;
  }

  state.geocoder.geocode({ address }, (results, status) => {
    if (status !== "OK" || !results[0]) {
      showToast("Address could not be geocoded.", true);
      return;
    }

    const location = results[0].geometry.location;
    elements.propertyForm.elements.namedItem("latitude").value = location.lat().toFixed(6);
    elements.propertyForm.elements.namedItem("longitude").value = location.lng().toFixed(6);
    state.map?.panTo(location);
    showToast("Coordinates filled from address.");
  });
};

const bindEvents = () => {
  elements.exploreButton.addEventListener("click", () => {
    document.getElementById("dashboardSection").scrollIntoView({ behavior: "smooth" });
  });

  elements.heroSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    elements.searchInput.value = elements.heroSearchInput.value;
    elements.distanceFilter.value = elements.heroDistanceSelect.value;
    await centerMapForQuery(elements.searchInput.value.trim());

    document.getElementById("dashboardSection").scrollIntoView({ behavior: "smooth" });
    await loadProperties();
  });

  elements.filterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await centerMapForQuery(elements.searchInput.value.trim());
    await loadProperties();
  });

  elements.resetFiltersButton.addEventListener("click", async () => {
    elements.filterForm.reset();
    elements.distanceFilter.value = state.publicConfig?.config?.defaultSearchDistanceKm || 5;
    await loadProperties();
  });

  elements.searchAreaButton?.addEventListener("click", loadProperties);
  elements.closeDrawerButton.addEventListener("click", closeDrawer);
  elements.closeContactModalButton.addEventListener("click", closeContactModal);
  elements.contactModal.addEventListener("click", (event) => {
    if (event.target === elements.contactModal) {
      closeContactModal();
    }
  });

  elements.logoutButton.addEventListener("click", () => {
    session.clear();
    state.user = null;
    syncAuthUI();
    showToast("You have been logged out.");
    setTimeout(() => window.location.reload(), 500);
  });

  elements.contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(elements.contactForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      await createMessage({
        ...payload,
        propertyId: state.currentContactPropertyId
      });
      closeContactModal();
      showToast("Inquiry sent to the property owner.");
    } catch (error) {
      showToast(error.message, true);
    }
  });

  if (elements.propertyForm) {
    elements.propertyForm.addEventListener("submit", submitOwnerForm);
    elements.clearOwnerFormButton.addEventListener("click", resetOwnerForm);
    elements.useMapCenterButton?.addEventListener("click", () => {
      if (!state.map) {
        showToast("Map center is not available yet.", true);
        return;
      }
      const center = state.map.getCenter();
      elements.propertyForm.elements.namedItem("latitude").value = center.lat().toFixed(6);
      elements.propertyForm.elements.namedItem("longitude").value = center.lng().toFixed(6);
      showToast("Map center copied into the form.");
    });
    elements.geocodeAddressButton?.addEventListener("click", geocodeOwnerAddress);
  }

  elements.refreshInboxButton?.addEventListener("click", loadInboxMessages);

  document.body.addEventListener("click", async (event) => {
    const viewButton = event.target.closest("[data-view-property]");
    if (viewButton) {
      await openPropertyDrawer(viewButton.dataset.viewProperty);
      return;
    }

    const contactButton = event.target.closest("[data-contact-property]");
    if (contactButton) {
      const propertyId = contactButton.dataset.contactProperty;
      const property = state.properties.find((item) => item._id === propertyId) || state.selectedProperty;
      if (property) {
        openContactModal(property);
      }
      return;
    }

    const editButton = event.target.closest("[data-edit-property]");
    if (editButton) {
      closeDrawer();
      await populateOwnerForm(editButton.dataset.editProperty);
      return;
    }

    const deleteButton = event.target.closest("[data-delete-property]");
    if (deleteButton) {
      const propertyId = deleteButton.dataset.deleteProperty;
      const confirmed = window.confirm("Delete this listing permanently?");
      if (!confirmed) {
        return;
      }

      try {
        await deleteProperty(propertyId);
        closeDrawer();
        showToast("Listing deleted.");
        await Promise.all([loadProperties(), loadMyListings()]);
      } catch (error) {
        showToast(error.message, true);
      }
      return;
    }

    const verifyButton = event.target.closest("[data-verify-property]");
    if (verifyButton) {
      try {
        await verifyProperty(verifyButton.dataset.verifyProperty, verifyButton.dataset.status);
        showToast(`Listing ${verifyButton.dataset.status}.`);
        await Promise.all([loadProperties(), loadMyListings()]);
        closeDrawer();
      } catch (error) {
        showToast(error.message, true);
      }
      return;
    }

    const markReadButton = event.target.closest("[data-message-read]");
    if (markReadButton) {
      try {
        await markMessageAsRead(markReadButton.dataset.messageRead);
        await loadInboxMessages();
        showToast("Inquiry marked as read.");
      } catch (error) {
        showToast(error.message, true);
      }
    }
  });
};

const initializeAutocomplete = () => {
  if (!window.google?.maps?.places) {
    return;
  }

  const options = {
    fields: ["formatted_address", "geometry", "name"],
    types: ["establishment"]
  };

  state.autocomplete = new window.google.maps.places.Autocomplete(elements.searchInput, options);
  state.autocomplete.addListener("place_changed", () => {
    const place = state.autocomplete.getPlace();
    if (!place.geometry) {
      return;
    }

    const location = place.geometry.location;
    state.map.panTo(location);
    state.map.setZoom(14);
    elements.heroSearchInput.value = place.name || place.formatted_address || "";
  });

  if (elements.heroSearchInput) {
    const heroAutocomplete = new window.google.maps.places.Autocomplete(elements.heroSearchInput, options);
    heroAutocomplete.addListener("place_changed", () => {
      const place = heroAutocomplete.getPlace();
      if (!place.geometry) {
        return;
      }

      const location = place.geometry.location;
      state.map.panTo(location);
      state.map.setZoom(14);
      elements.searchInput.value = place.name || place.formatted_address || "";
    });
  }
};

const initializeMap = async () => {
  if (!elements.map || !elements.mapFallback) {
    return;
  }

  const config = state.publicConfig?.config;

  try {
    await loadGoogleMaps(config.googleMapsApiKey);
    state.isGoogleMapsReady = true;
    elements.mapFallback.classList.add("hidden");
    state.map = new window.google.maps.Map(elements.map, {
      center: config.defaultMapCenter,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
    state.geocoder = new window.google.maps.Geocoder();
    state.infoWindow = new window.google.maps.InfoWindow();
    initializeAutocomplete();

    const debouncedSearch = debounce(loadProperties, 600);
    state.map.addListener("idle", () => {
      debouncedSearch();
    });
  } catch (_error) {
    elements.mapFallback.classList.remove("hidden");
    elements.map.innerHTML = "";
  }
};

const init = async () => {
  bindEvents();
  syncAuthUI();
  await hydrateUser();

  try {
    state.publicConfig = await fetchPublicConfig();
    elements.distanceFilter.value = state.publicConfig.config.defaultSearchDistanceKm;
    elements.heroDistanceSelect.value = String(state.publicConfig.config.defaultSearchDistanceKm);
  } catch (error) {
    showToast(error.message, true);
  }

  await initializeMap();
  await loadProperties();

  if (isOwnerRole()) {
    await Promise.all([loadMyListings(), loadInboxMessages()]);
  }
};

init();
