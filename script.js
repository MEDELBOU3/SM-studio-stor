// Sketchfab API Configuration
const API_TOKEN = '6177405fb1f843809a9a7b03987edd21'; // REPLACE WITH YOUR API TOKEN!
const API_URL = 'https://api.sketchfab.com/v3';
const ITEMS_PER_PAGE = 18; // Lower for testing pagination visibility

// --- STATE MANAGEMENT ---
let currentPage = 1;
let totalModels = 10000;
let currentQuery = '';
let currentSort = '-publishedAt'; // Default to recent
let currentFormat = 'all';
let currentCategory = '';
let wishlist = JSON.parse(localStorage.getItem('modelHubProWishlist')) || [];
let isLoading = { models: false, featured: false, singleModel: false, wishlist: false };
let currentView = 'grid'; // 'grid' or 'wishlist'

// --- DOM ELEMENT CACHE (ensure these match IDs in HTML) ---
const elements = {
    // Header & Nav
    homeLinkLogo: document.getElementById('homeLinkLogo'),
    homeLinkNav: document.getElementById('homeLinkNav'),
    exploreLinkNav: document.getElementById('exploreLinkNav'),
    categoriesLinkNav: document.getElementById('categoriesLinkNav'),
    searchInput: document.getElementById('searchInput'),
    searchButton: document.getElementById('searchButton'),
    showWishlistBtn: document.getElementById('showWishlistBtn'),
    wishlistCounter: document.getElementById('wishlistCounter'),
    // Main Content
    mainSectionTitle: document.getElementById('mainSectionTitle'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    filterBar: document.getElementById('filterBar'),
    sortSelect: document.getElementById('sortSelect'),
    formatSelect: document.getElementById('formatSelect'),
    modelsGrid: document.getElementById('modelsGrid'),
    paginationContainer: document.getElementById('paginationContainer'),
    pagination: document.querySelector('.pagination-container .pagination'),
    // Featured Slider
    featuredSlider: document.getElementById('featuredSlider'),
    sliderPrevBtn: document.getElementById('sliderPrev'),
    sliderNextBtn: document.getElementById('sliderNext'),
    // Categories
    categoriesGrid: document.getElementById('categoriesGrid'), // Assuming you might populate this dynamically
    // Modal
    modalOverlay: document.getElementById('modelViewerOverlay'),
    closeViewerBtn: document.getElementById('closeViewerBtn'),
    iframeLoader: document.getElementById('iframeLoaderMessage'),
    sketchfabIframe: document.getElementById('sketchfabViewer'),
    // Modal Sidebar Elements (ensure IDs match)
    modelTitleSidebar: document.getElementById('modelTitleSidebar'),
    modelArtistAvatarSidebar: document.getElementById('modelArtistAvatarSidebar'),
    modelArtistNameSidebar: document.getElementById('modelArtistNameSidebar'),
    modelArtistBioSidebar: document.getElementById('modelArtistBioSidebar'),
    modelViewCountSidebar: document.getElementById('modelViewCountSidebar'),
    modelLikeCountSidebar: document.getElementById('modelLikeCountSidebar'),
    modelFaceCountSidebar: document.getElementById('modelFaceCountSidebar'),
    modelTagsSidebar: document.getElementById('modelTagsSidebar'),
    downloadModelBtnSidebar: document.getElementById('downloadModelBtnSidebar'),
    viewerWishlistBtnSidebar: document.getElementById('viewerWishlistBtnSidebar'),
    modelDescriptionSidebar: document.getElementById('modelDescriptionSidebar'),
    technicalDetailsListSidebar: document.getElementById('technicalDetailsListSidebar'), // For LIs
    modelFormatsSidebar: document.getElementById('modelFormatsSidebar'),
    modelVertexCountSidebar: document.getElementById('modelVertexCountSidebar'),
    modelRiggedSidebar: document.getElementById('modelRiggedSidebar'),
    modelAnimatedSidebar: document.getElementById('modelAnimatedSidebar'),
    modelLicenseSidebar: document.getElementById('modelLicenseSidebar'),
    reviewCountSidebar: document.getElementById('reviewCountSidebar'),
    reviewsListSidebar: document.getElementById('reviewsListSidebar'),
    // Footer
    currentYearFooter: document.getElementById('currentYearFooter'),
    footerNewAdditionsLink: document.getElementById('footerNewAdditionsLink'),
};


// --- UTILITIES ---
function sanitizeHTML(str) {
    if (str === null || typeof str === 'undefined') return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

function updateWishlistCounter() {
    const count = wishlist.length;
    elements.wishlistCounter.textContent = count;
    elements.wishlistCounter.style.display = count > 0 ? 'flex' : 'none';
}


// --- API CALLS ---
async function makeApiCall(url, type) {
    if (isLoading[type]) {
        console.warn(`API Call (${type}): Already in progress. Aborting.`);
        return null; // Or throw an error, or return a specific object
    }
    isLoading[type] = true;
    console.log(`API Call (${type}) URL:`, url);

    try {
        const response = await fetch(url, { headers: { 'Authorization': `Token ${API_TOKEN}` } });
        if (!response.ok) {
            let errorDetail = `HTTP error ${response.status}`;
            try { errorDetail = (await response.json()).detail || errorDetail; } catch (e) {}
            console.error(`API Call (${type}) Error:`, errorDetail);
            isLoading[type] = false;
            return { error: true, status: response.status, detail: errorDetail };
        }
        const data = await response.json();
        console.log(`API Call (${type}) Response:`, data);
        isLoading[type] = false;
        return data;
    } catch (error) {
        console.error(`API Call (${type}) Network/JS Error:`, error);
        isLoading[type] = false;
        return { error: true, detail: "Network error or invalid JSON response." };
    }
}

async function fetchModelsSearch(query = currentQuery, page = currentPage, sort = currentSort, category = currentCategory, format = currentFormat) {
    const offset = (page - 1) * ITEMS_PER_PAGE;
    let apiUrl = `${API_URL}/search?type=models&count=${ITEMS_PER_PAGE}&cursor=${offset}&downloadable=true&sort_by=${sort}`;
    if (query) apiUrl += `&q=${encodeURIComponent(query)}`;
    if (category) apiUrl += `&tags=${encodeURIComponent(category)}`;
    if (format && format !== 'all') apiUrl += `&tags=${encodeURIComponent(format)}`;
    
    const data = await makeApiCall(apiUrl, 'models');
    if (data && !data.error) {
        totalModels = 100; // Mock value for testing
        return data.results?.models || data.results || [];
    }
    totalModels = 0;
    return [];
}

/*async function fetchModelsSearch(query = currentQuery, page = currentPage, sort = currentSort, category = currentCategory, format = currentFormat) {
    const offset = (page - 1) * ITEMS_PER_PAGE;
    let apiUrl = `${API_URL}/search?type=models&count=${ITEMS_PER_PAGE}&cursor=${offset}&downloadable=true&sort_by=${sort}`;
    if (query) apiUrl += `&q=${encodeURIComponent(query)}`;
    if (category) apiUrl += `&tags=${encodeURIComponent(category)}`;
    if (format && format !== 'all') apiUrl += `&tags=${encodeURIComponent(format)}`; // Using tags as format hint
    
    const data = await makeApiCall(apiUrl, 'models');
    if (data && !data.error) {
        totalModels = data.results?.totalSize || data.totalSize || 0;
        return data.results?.models || data.results || [];
    }
    totalModels = 0; // Reset on error
    return []; // Return empty array on error
}*/

async function fetchSingleModel(uid) {
    return makeApiCall(`${API_URL}/models/${uid}`, 'singleModel');
}

async function fetchDownloadInfo(uid) {
    return makeApiCall(`${API_URL}/models/${uid}/download`, 'downloadInfo');
}

// --- UI RENDERING ---
function displayMessage(container, message, type = 'info') {
    // types: 'info', 'loading', 'error'
    let iconClass = 'fas fa-info-circle';
    if (type === 'loading') iconClass = 'fas fa-spinner fa-spin';
    else if (type === 'error') iconClass = 'fas fa-exclamation-triangle';
    
    container.innerHTML = `<div class="models-grid__message" data-message-type="${type}"><i class="${iconClass}"></i> ${message}</div>`;
}



function renderModelCard(model) {
    if (!model || !model.uid) { console.warn("renderModelCard: Incomplete model data", model); return null; }
    
    const isWishlisted = wishlist.includes(model.uid);
    const card = document.createElement('div'); card.className = 'model-card'; card.dataset.uid = model.uid; card.tabIndex = 0;

    const phBg = '1A1E29', phTxt = 'A0AEC0'; // Theme colors
    const name = sanitizeHTML(model.name || "Untitled Model");
    const initial = name?.[0]?.toUpperCase() || 'M';
    const thumb = model.thumbnails?.images?.find(i=>i.width>=400)?.url || model.thumbnails?.images?.[0]?.url || `https://placehold.co/400x250/${phBg}/${phTxt}?text=${initial}&font=lato&font-size=90`;
    const artist = sanitizeHTML(model.user?.displayName || model.user?.username || 'Unknown Artist');
    const artistInitial = artist?.[0]?.toUpperCase() || 'U';
    const avatar = model.user?.avatar?.images?.[0]?.url || `https://placehold.co/40x40/${phBg}/${phTxt}?text=${artistInitial}&font=lato`;

    let badgesHTML = '';
    if (model.publishedAt && new Date(model.publishedAt) > new Date(Date.now() - 7*24*60*60*1000)) {
        badgesHTML += '<span class="badge badge--new">New</span>';
    }
    if (model.staffpickedAt) { // staffpickedAt exists for staff picks
        badgesHTML += '<span class="badge badge--staff-pick">Staff Pick</span>';
    }

    card.innerHTML = `
        <figure class="model-card__figure">
            <img src="${thumb}" alt="Preview of ${name}" class="model-card__image" loading="lazy">
            ${badgesHTML ? `<div class="model-card__badges">${badgesHTML}</div>` : ''}
            <div class="model-card__actions">
                <button class="model-card__action-btn view-details-btn" title="View Details" aria-label="View details for ${name}"><i class="fas fa-search-plus"></i></button>
                <button class="model-card__action-btn wishlist-toggle-btn ${isWishlisted ? 'is-active' : ''}" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}" aria-label="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'} ${name}" data-uid="${model.uid}">
                    <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
        </figure>
        <div class="model-card__body">
            <h3 class="model-card__title" title="${name}">${name}</h3>
            <div class="model-card__artist">
                <img src="${avatar}" alt="${artist}" class="model-card__artist-avatar">
                <span>${artist}</span>
            </div>
            <div class="model-card__meta">
                <span class="model-card__stat"><i class="fas fa-eye"></i> ${model.viewCount?.toLocaleString() || 0}</span>
                <span class="model-card__stat"><i class="fas fa-thumbs-up"></i> ${model.likeCount?.toLocaleString() || 0}</span>
                <span class="model-card__free-tag"><i class="fas fa-download"></i> Free</span>
            </div>
        </div>`;

    card.addEventListener('click', (e) => { if (!e.target.closest('.model-card__action-btn')) openModal(model.uid); });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.target.closest('.model-card__action-btn')) openModal(model.uid); }});
    card.querySelector('.wishlist-toggle-btn').addEventListener('click', (e) => { e.stopPropagation(); handleWishlistToggle(model.uid, e.currentTarget); });
    
    return card;
}

// --- MAIN DATA LOADING & DISPLAY FUNCTION ---
async function loadAndDisplayModels(scrollToGrid = false) {
    if (currentView === 'grid') {
        const models = await fetchModelsSearch();
        populateModelsGrid(models);
        updatePaginationUI();
    } else if (currentView === 'wishlist') {
        await switchToWishlistViewMode(); // This handles its own population
    }
    if (scrollToGrid) {
        document.getElementById('modelsSection')?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
}


async function populateModelsGrid(models) {
    elements.modelsGrid.innerHTML = ''; // Clear previous content
    if (!models || models.length === 0) {
        const message = currentView === 'wishlist' ? 
            (wishlist.length === 0 ? "Your wishlist is empty. Start exploring!" : "Error loading wishlist items.") :
            "No models found matching your criteria.";
        displayMessage(elements.modelsGrid, message, 'info');
        return;
    }
    const fragment = document.createDocumentFragment();
    models.forEach(model => {
        const card = renderModelCard(model);
        if (card) fragment.appendChild(card);
    });
    elements.modelsGrid.appendChild(fragment);
}

async function populateFeaturedSlider() {
    displayMessage(elements.featuredSlider, "Loading spotlight assets...", 'loading');
    const featuredModels = await fetchModelsSearch('', 1, '-likeCount'); // Use likeCount for "featured"
    elements.featuredSlider.innerHTML = ''; // Clear loading
    if (featuredModels && featuredModels.length > 0) {
        featuredModels.slice(0, 8).forEach(model => {
            const card = renderModelCard(model); // Reuse model card rendering
            if (card) { // Modify for slider context if needed (e.g. class)
                card.classList.add('featured-slider__item');
                card.classList.remove('model-card'); // Or keep both if styles don't clash
                 // Simpler event for slider items to directly open modal
                card.addEventListener('click', () => openModal(model.uid));
                elements.featuredSlider.appendChild(card);
            }
        });
         // Reset scroll position after populating
        elements.featuredSlider.scrollLeft = 0;
        checkSliderControls();
    } else {
        displayMessage(elements.featuredSlider, "No spotlight assets available right now.", 'info');
    }
}
function checkSliderControls() {
    if (!elements.sliderPrevBtn || !elements.sliderNextBtn || !elements.featuredSlider) return;
    elements.sliderPrevBtn.disabled = elements.featuredSlider.scrollLeft <= 0;
    elements.sliderNextBtn.disabled = elements.featuredSlider.scrollLeft + elements.featuredSlider.clientWidth >= elements.featuredSlider.scrollWidth - 5; // 5px buffer
}


function updatePaginationUI() {
    if (!elements.pagination) { console.error('Pagination UI element not found'); return; }
    elements.pagination.innerHTML = '';
    const totalPages = Math.ceil(totalModels / ITEMS_PER_PAGE);

    console.log(`Pagination UI Update: currentPage=${currentPage}, totalModels=${totalModels}, totalPages=${totalPages}`);

    if (totalPages <= 1 || currentView === 'wishlist') {
        elements.paginationContainer.style.display = 'none';
        return;
    }

    elements.paginationContainer.style.display = 'flex';

    const createButton = (text, page, ariaLabel, isDisabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.className = 'pagination__button';
        if (text.includes('chevron')) btn.classList.add('pagination__button--icon');
        if (isActive) btn.classList.add('is-active');
        btn.innerHTML = text;
        btn.setAttribute('aria-label', ariaLabel);
        btn.disabled = isDisabled;
        btn.addEventListener('click', () => { currentPage = page; loadAndDisplayModels(true); });
        return btn;
    };
    const createEllipsis = () => { const span = document.createElement('span'); span.className = 'pagination__ellipsis'; span.innerHTML = '…'; return span; };

    if (currentPage > 1) elements.pagination.appendChild(createButton('<i class="fas fa-chevron-left"></i>', currentPage - 1, 'Previous page'));

    const pageRange = [];
    const range = 2; // Number of pages around current page
    let start = Math.max(1, currentPage - range);
    let end = Math.min(totalPages, currentPage + range);

    if (totalPages > (range * 2 + 1)) { // Check if we need ellipsis
        if (currentPage > range + 1) pageRange.push(1, '...');
        for (let i = start; i <= end; i++) pageRange.push(i);
        if (currentPage < totalPages - range) pageRange.push('...', totalPages);
    } else {
        for (let i = 1; i <= totalPages; i++) pageRange.push(i);
    }
    
    pageRange.forEach(p => {
        if (p === '...') elements.pagination.appendChild(createEllipsis());
        else elements.pagination.appendChild(createButton(p.toString(), `Go to page ${p}`, p, false, p === currentPage));
    });

    if (currentPage < totalPages) elements.pagination.appendChild(createButton('<i class="fas fa-chevron-right"></i>', currentPage + 1, 'Next page'));
}


async function openModal(uid) {
    elements.sketchfabIframe.src = 'about:blank'; // Clear previous
    elements.sketchfabIframe.style.visibility = 'hidden'; // Hide while loading
    elements.iframeLoader.classList.add('is-visible');
    elements.iframeLoader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading 3D Preview...';

    const modelData = await fetchSingleModel(uid);
    
    elements.modalOverlay.classList.add('is-visible');
    document.body.style.overflow = 'hidden';

    if (modelData && !modelData.error) {
        // Populate Sidebar
        elements.modelTitleSidebar.textContent = sanitizeHTML(modelData.name);
        const artistName = sanitizeHTML(modelData.user?.displayName || modelData.user?.username || 'Artist');
        const artistInitial = artistName?.[0]?.toUpperCase() || 'A';
        elements.modelArtistAvatarSidebar.src = modelData.user?.avatar?.images?.[0]?.url || `https://placehold.co/44x44/1A1E29/A0AEC0?text=${artistInitial}&font=lato`;
        elements.modelArtistNameSidebar.textContent = artistName;
        elements.modelArtistBioSidebar.textContent = sanitizeHTML(modelData.user?.shortBio || "3D Creator");

        elements.modelViewCountSidebar.textContent = modelData.viewCount?.toLocaleString() || '0';
        elements.modelLikeCountSidebar.textContent = modelData.likeCount?.toLocaleString() || '0';
        elements.modelFaceCountSidebar.textContent = modelData.faceCount?.toLocaleString() || '0';

        elements.modelDescriptionSidebar.innerHTML = modelData.description ? sanitizeHTML(modelData.description).replace(/\n/g, '<br>') : 'No description provided for this asset.';

        elements.modelTagsSidebar.innerHTML = '';
        if (modelData.tags?.length > 0) {
            modelData.tags.slice(0, 7).forEach(tag => {
                const tagEl = document.createElement('button'); tagEl.className = 'modal__tag';
                tagEl.textContent = sanitizeHTML(tag.name);
                tagEl.addEventListener('click', () => {
                    closeModal();
                    switchToGridView(); 
                    currentQuery = ''; currentCategory = tag.slug || tag.name.toLowerCase().replace(/\s+/g, '-');
                    currentPage = 1; elements.searchInput.value = '';
                    document.querySelectorAll('.category-card').forEach(cc => cc.classList.toggle('is-active', cc.dataset.category === currentCategory));
                    loadAndDisplayModels(); document.getElementById('modelsSection')?.scrollIntoView({behavior:'smooth'});
                });
                elements.modelTagsSidebar.appendChild(tagEl);
            });
        } else { elements.modelTagsSidebar.innerHTML = '<p class="modal__reviews-placeholder" style="margin-bottom:0;">No tags.</p>'; }
        
        // Tech Details
        elements.modelVertexCountSidebar.textContent = modelData.vertexCount?.toLocaleString() || 'N/A';
        elements.modelRiggedSidebar.textContent = modelData.isRigged ? 'Yes' : (modelData.tags.some(t => t.name.toLowerCase().includes('rigged')) ? 'Likely' : 'No/Unk');
        elements.modelAnimatedSidebar.textContent = modelData.animationCount > 0 ? `Yes (${modelData.animationCount})` : (modelData.tags.some(t => t.name.toLowerCase().includes('animated')) ? 'Likely' : 'No/Unk');
        elements.modelLicenseSidebar.textContent = modelData.license?.label || "Check Source";
        
        const downloadInfo = await fetchDownloadInfo(uid);
        let formatsText = 'Unavailable';
        if (downloadInfo && !downloadInfo.error) {
            let fmts = [];
            if(downloadInfo.gltf) fmts.push('glTF');
            if(downloadInfo.usdz) fmts.push('USDZ');
            if(downloadInfo.source) fmts.push('Source Archive');
            if(fmts.length > 0) formatsText = fmts.join(', ');
        }
        elements.modelFormatsSidebar.textContent = formatsText;

        const isWishlisted = wishlist.includes(uid);
        elements.viewerWishlistBtnSidebar.classList.toggle('is-active', isWishlisted);
        elements.viewerWishlistBtnSidebar.querySelector('i').className = `fas fa-heart ${isWishlisted ? '' : 'far'}`; // Solid if active, regular otherwise
        elements.viewerWishlistBtnSidebar.querySelector('span').textContent = isWishlisted ? ' In Wishlist' : ' Add to Wishlist';
        elements.viewerWishlistBtnSidebar.dataset.uid = uid;
        elements.downloadModelBtnSidebar.dataset.uid = uid;
        
        elements.reviewCountSidebar.textContent = modelData.commentCount?.toLocaleString() || '0';
        elements.reviewsListSidebar.innerHTML = modelData.commentCount > 0 ? 
            '<p class="modal__reviews-placeholder">Review display would be here.</p>' : // Implement review fetching if API allows
            '<p class="modal__reviews-placeholder">No reviews for this asset yet.</p>';

        // Load Iframe
        const embedUrl = `https://sketchfab.com/models/${uid}/embed?autostart=1&ui_theme=dark&ui_controls=1&ui_infos=0&ui_watermark=0&transparent=1&scrollwheel=1&preload=1`;
        elements.sketchfabIframe.onload = () => {
            console.log("Iframe Content Loaded:", uid);
            elements.iframeLoader.classList.remove('is-visible');
            elements.sketchfabIframe.style.visibility = 'visible';
        };
        elements.sketchfabIframe.onerror = (e) => {
            console.error("Iframe Load Error:", uid, e);
            elements.iframeLoader.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error loading 3D preview.';
            elements.sketchfabIframe.style.visibility = 'hidden';
        };
        elements.sketchfabIframe.src = embedUrl;

    } else {
        // Handle error if modelData failed to load
        elements.iframeLoader.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Could not load model details.';
        elements.modelTitleSidebar.textContent = "Error";
        // Maybe provide a link to Sketchfab page as fallback
        elements.modelDescriptionSidebar.innerHTML = `<p>There was an error loading the details for this model. You can try viewing it directly on <a href="https://sketchfab.com/models/${uid}" target="_blank" rel="noopener noreferrer">Sketchfab</a>.</p>`;

    }
}

function closeModal() {
    elements.modalOverlay.classList.remove('is-visible');
    elements.sketchfabIframe.src = 'about:blank'; // IMPORTANT: Stops the iframe content
    elements.sketchfabIframe.style.visibility = 'hidden'; // Ensure it's hidden for next open
    document.body.style.overflow = 'auto';
}

// --- ACTIONS ---
function handleSearch() {
    switchToGridViewMode(); // Ensure correct view
    currentQuery = elements.searchInput.value.trim();
    currentPage = 1; // Reset to first page for new search
    currentCategory = ''; // Clear category filter on new search
    document.querySelectorAll('.category-card.is-active').forEach(c => c.classList.remove('is-active'));
    loadAndDisplayModels();
}

function handleFilterChange() { // For sort and format
    if (currentView === 'grid') {
        currentSort = elements.sortSelect.value;
        currentFormat = elements.formatSelect.value;
        currentPage = 1;
        loadAndDisplayModels();
    }
}

function handleCategorySelect(categorySlug) {
    switchToGridViewMode();
    currentCategory = categorySlug;
    currentQuery = ''; elements.searchInput.value = ''; currentPage = 1;
    document.querySelectorAll('.category-card').forEach(c => c.classList.toggle('is-active', c.dataset.category === categorySlug));
    loadAndDisplayModels();
    document.getElementById('modelsSection')?.scrollIntoView({behavior:'smooth'});
}

function handleWishlistToggle(uid, buttonElement) {
    const index = wishlist.indexOf(uid);
    let modelName = "this model"; // Fallback
    // Try to get model name for aria-label from different contexts
    if(buttonElement?.classList.contains('wishlist-toggle-btn')){ // Card button
        modelName = buttonElement.closest('.model-card')?.querySelector('.model-card__title')?.textContent || modelName;
    } else if (elements.viewerWishlistBtnSidebar.dataset.uid === uid){ // Modal button
        modelName = elements.modelTitleSidebar.textContent || modelName;
    }


    if (index > -1) wishlist.splice(index, 1);
    else wishlist.push(uid);
    localStorage.setItem('modelHubProWishlist', JSON.stringify(wishlist));
    updateWishlistCounter();

    // Update button style on card if it exists
    const gridCardButton = elements.modelsGrid.querySelector(`.wishlist-toggle-btn[data-uid="${uid}"]`);
    if (gridCardButton) {
        const isNowWishlisted = wishlist.includes(uid);
        gridCardButton.classList.toggle('is-active', isNowWishlisted);
        gridCardButton.querySelector('i').className = `fa-heart ${isNowWishlisted ? 'fas' : 'far'}`;
        const actionText = isNowWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist';
        gridCardButton.title = actionText;
        gridCardButton.setAttribute('aria-label', `${actionText} ${modelName}`);
    }

    // Update button style in modal if open and matches
    if (elements.modalOverlay.classList.contains('is-visible') && elements.viewerWishlistBtnSidebar.dataset.uid === uid) {
        const isNowWishlisted = wishlist.includes(uid);
        elements.viewerWishlistBtnSidebar.classList.toggle('is-active', isNowWishlisted);
        elements.viewerWishlistBtnSidebar.querySelector('i').className = `fa-heart ${isNowWishlisted ? 'fas' : 'far'}`;
        elements.viewerWishlistBtnSidebar.querySelector('span').textContent = isNowWishlisted ? ' In Wishlist' : ' Add to Wishlist';
    }
    
    if (currentView === 'wishlist' && index > -1) { // If item was removed while on wishlist view
        loadAndDisplayModels(); // Re-render wishlist
    }
}

async function handleDownload(uid) {
    const info = await fetchDownloadInfo(uid);
    if (info && !info.error && info.gltf?.url) {
        const link = document.createElement('a'); link.href = info.gltf.url;
        link.download = `${uid}_${sanitizeHTML(elements.modelTitleSidebar.textContent).replace(/\s+/g, '_') || 'model'}.zip`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } else {
        alert("GLTF download not available. Original source or other formats might be available on Sketchfab.");
        console.warn("Download info for " + uid + ": ", info);
    }
}


// --- VIEW MANAGEMENT ---
function switchToGridViewMode(resetAllFilters = false) {
    currentView = 'grid';
    elements.mainSectionTitle.textContent = "Discover Free Assets";
    elements.filterBar.style.display = 'flex';
    elements.paginationContainer.style.display = 'flex'; // updatePaginationUI will handle final state
    elements.showWishlistBtn.classList.remove('is-active');

    if (resetAllFilters) {
        currentQuery = ''; currentCategory = ''; currentSort = '-publishedAt'; currentFormat = 'all'; currentPage = 1;
        elements.searchInput.value = ''; elements.sortSelect.value = '-publishedAt'; elements.formatSelect.value = 'all';
        document.querySelectorAll('.category-card.is-active').forEach(c => c.classList.remove('is-active'));
        elements.clearFiltersBtn.style.display = 'none';
    } else {
         elements.clearFiltersBtn.style.display = (currentQuery || currentCategory) ? 'flex' : 'none';
    }
}

async function switchToWishlistViewMode() {
    currentView = 'wishlist';
    elements.mainSectionTitle.textContent = "My Wishlist";
    elements.filterBar.style.display = 'none';
    elements.paginationContainer.style.display = 'none';
    elements.showWishlistBtn.classList.add('is-active');
    elements.clearFiltersBtn.style.display = 'none';
    document.querySelectorAll('.category-card.is-active').forEach(c => c.classList.remove('is-active'));


    displayMessage(elements.modelsGrid, "Loading your wishlist...", 'loading');
    if (wishlist.length === 0) {
        populateModelsGrid([]); // Will show "wishlist empty"
        return;
    }
    
    isLoading.wishlist = true;
    try {
        // Fetch details for ALL wishlisted models. This can be many API calls.
        // For very large wishlists, consider paginating the wishlist itself or fetching in batches.
        const modelDetailsPromises = wishlist.map(uid => fetchSingleModel(uid));
        const results = await Promise.all(modelDetailsPromises);
        const validModels = results.filter(model => model && !model.error);
        populateModelsGrid(validModels);
    } catch (error) {
        console.error("Error loading full wishlist:", error);
        displayMessage(elements.modelsGrid, "Could not load all wishlist items.", 'error');
    } finally {
        isLoading.wishlist = false;
    }
}



// --- EVENT LISTENERS SETUP ---
function initializeEventListeners() {
    // Navigation
    [elements.homeLinkLogo, elements.homeLinkNav].forEach(el => el.addEventListener('click', (e) => {
        e.preventDefault(); switchToGridViewMode(true); window.scrollTo({top:0, behavior:'smooth'});
    }));
    elements.exploreLinkNav.addEventListener('click', (e) => {
        e.preventDefault(); switchToGridViewMode(); document.getElementById('modelsSection')?.scrollIntoView({behavior:'smooth'});
    });
    elements.categoriesLinkNav.addEventListener('click', (e) => {
        e.preventDefault(); switchToGridViewMode(); document.getElementById('categoriesSection')?.scrollIntoView({behavior:'smooth'});
    });

    // Search
    elements.searchButton.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });

    // Filters
    elements.sortSelect.addEventListener('change', handleFilterChange);
    elements.formatSelect.addEventListener('change', handleFilterChange);
    elements.clearFiltersBtn.addEventListener('click', () => switchToGridViewMode(true));

    // Categories
    document.querySelectorAll('.category-card').forEach(card => { // Use querySelectorAll as elements.categoriesGrid isn't for cards directly
        card.addEventListener('click', () => handleCategorySelect(card.dataset.category));
        card.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCategorySelect(card.dataset.category); } });
    });

    // Featured Slider
    elements.sliderPrevBtn.addEventListener('click', () => {
        const itemWidth = elements.featuredSlider.querySelector('.featured-slider__item')?.offsetWidth || 350;
        elements.featuredSlider.scrollBy({ left: -(itemWidth + 24), behavior: 'smooth' }); // 24px for gap
    });
    elements.sliderNextBtn.addEventListener('click', () => {
        const itemWidth = elements.featuredSlider.querySelector('.featured-slider__item')?.offsetWidth || 350;
        elements.featuredSlider.scrollBy({ left: itemWidth + 24, behavior: 'smooth' });
    });
    elements.featuredSlider.addEventListener('scroll', debounce(checkSliderControls, 150)); // Update buttons on scroll

    // Wishlist
    elements.showWishlistBtn.addEventListener('click', () => {
        if (currentView !== 'wishlist') switchToWishlistViewMode();
        else switchToGridViewMode(true); // Toggle back to home/grid
    });

    // Modal
    elements.closeViewerBtn.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', (e) => { if (e.target === elements.modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && elements.modalOverlay.classList.contains('is-visible')) closeModal(); });
    elements.downloadModelBtnSidebar.addEventListener('click', () => { if(elements.downloadModelBtnSidebar.dataset.uid) handleDownload(elements.downloadModelBtnSidebar.dataset.uid); });
    elements.viewerWishlistBtnSidebar.addEventListener('click', () => { if(elements.viewerWishlistBtnSidebar.dataset.uid) handleWishlistToggle(elements.viewerWishlistBtnSidebar.dataset.uid, elements.viewerWishlistBtnSidebar); });

    // Footer
    if (elements.currentYearFooter) elements.currentYearFooter.textContent = new Date().getFullYear();
    if (elements.footerNewAdditionsLink) {
        elements.footerNewAdditionsLink.addEventListener('click', (e) => {
            e.preventDefault(); switchToGridViewMode(true); // Reset to grid
            elements.sortSelect.value = '-publishedAt'; // Set sort to recent
            currentSort = '-publishedAt';
            loadAndDisplayModels(true);
        });
    }
}


// --- INITIALIZATION ---
async function initializeApp() {
    console.log("ModelHub Pro Initializing...");
    console.log('elements.pagination:', elements.pagination);
    initializeEventListeners();
    updateWishlistCounter();
    
    // Default view:
    switchToGridViewMode(true); // Start with grid, reset filters
    
    // Initial data load
    await populateFeaturedSlider(); // Load featured assets
    // loadAndDisplayModels() is called by switchToGridViewMode
    
    console.log("ModelHub Pro Initialized.");
}

document.addEventListener('DOMContentLoaded', initializeApp);
