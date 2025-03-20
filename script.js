  // Sketchfab API Configuration
    const API_TOKEN = '6177405fb1f843809a9a7b03987edd21';
    const API_URL = 'https://api.sketchfab.com/v3';
    const ITEMS_PER_PAGE = 80;
    
    // State Management
    let currentPage = 1;
    let totalPages = 1;
    let currentQuery = '';
    let currentSort = 'recent';
    let currentPriceFilter = 'all';
    let currentFormat = 'all';
    let currentCategory = '';
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // DOM Elements
    const elements = {
        modelsGrid: document.getElementById('modelsGrid'),
        searchInput: document.getElementById('searchInput'),
        sortSelect: document.getElementById('sortSelect'),
        formatSelect: document.getElementById('formatSelect'),
        modelViewer: document.getElementById('modelViewer'),
        closeViewer: document.getElementById('closeViewer'),
        sketchfabViewer: document.getElementById('sketchfabViewer'),
        modelTitle: document.getElementById('modelTitle'),
        modelTags: document.getElementById('modelTags'),
        modelFormat: document.getElementById('modelFormat'),
        modelPolygons: document.getElementById('modelPolygons'),
        modelTextures: document.getElementById('modelTextures'),
        modelRigged: document.getElementById('modelRigged'),
        modelAnimation: document.getElementById('modelAnimation'),
        modelLicense: document.getElementById('modelLicense'),
        modelDescription: document.getElementById('modelDescription'),
        artistName: document.getElementById('artistName'),
        modelPrice: document.getElementById('modelPrice'),
        sliderPrev: document.getElementById('sliderPrev'),
        sliderNext: document.getElementById('sliderNext'),
        featuredSlider: document.getElementById('featuredSlider'),
        pagination: document.querySelector('.pagination'),
        priceTags: document.querySelectorAll('.filter-tag'),
        categoryCards: document.querySelectorAll('.category-card'),
        wishlistBtn: document.querySelector('.wishlist-btn'),
        addToCartBtn: document.querySelector('.btn-primary.btn-block')
    };
    
    // Fetch Models from Sketchfab API
    async function fetchModels(query = '', page = 1, sort = '-publishedAt', category = '') {
        let url = `${API_URL}/models?count=${ITEMS_PER_PAGE}&cursor=${(page - 1) * ITEMS_PER_PAGE}`;
        if (query) url += `&q=${encodeURIComponent(query)}`;
        if (category) url += `&tag=${encodeURIComponent(category)}`; // Using tags for broader support
        url += `&sort_by=${sort}`;
    
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Token ${API_TOKEN}` }
            });
            const data = await response.json();
            totalPages = Math.ceil(data.total / ITEMS_PER_PAGE) || 1; // Ensure at least 1 page
            return data.results || [];
        } catch (error) {
            console.error('Error fetching models:', error);
            totalPages = 1; // Reset to 1 on error
            return [];
        }
    }
    
    // Fetch a Single Model by UID
    async function fetchModelByUid(uid) {
        try {
            const response = await fetch(`${API_URL}/models/${uid}`, {
                headers: { 'Authorization': `Token ${API_TOKEN}` }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching model details:', error);
            return null;
        }
    }
    
    // Render Models to Grid
    function renderModels(models) {
        elements.modelsGrid.innerHTML = '';
        if (models.length === 0) {
            elements.modelsGrid.innerHTML = '<p>No models found.</p>';
        } else {
            models.forEach(model => {
                const isFree = !model.price || model.isDownloadable;
                const isWishlisted = wishlist.includes(model.uid);
                const modelCard = document.createElement('div');
                modelCard.className = 'model-card';
                modelCard.dataset.uid = model.uid;
    
                const badgeHTML = model.isFeatured ? '<div class="badge featured">Featured</div>' :
                                (new Date(model.publishedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ?
                                '<div class="badge new">New</div>' : '';
    
                modelCard.innerHTML = `
                    <img src="${model.thumbnails.images[0].url}" class="model-img" alt="${model.name}">
                    ${badgeHTML}
                    <div class="model-info">
                        <h3 class="model-title">${model.name}</h3>
                        <div class="model-meta">
                            <span>by ${model.user.username}</span>
                            <div class="model-rating">
                                <i class="fas fa-star star"></i>
                                <span>${(model.likeCount / Math.max(model.viewCount, 1) * 100).toFixed(1)} (${model.viewCount})</span>
                            </div>
                        </div>
                        <div class="model-price ${isFree ? 'free' : ''}">
                            ${isFree ? 'Free' : model.price ? `$${model.price}` : 'N/A'}
                            <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" data-uid="${model.uid}">
                                <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
                            </button>
                        </div>
                    </div>
                `;
    
                modelCard.addEventListener('click', (e) => {
                    if (e.target.classList.contains('wishlist-btn')) {
                        toggleWishlist(model.uid);
                    } else {
                        openModelViewer(model.uid);
                    }
                });
                elements.modelsGrid.appendChild(modelCard);
            });
        }
    }
    
    // Render Featured Slider (Clickable)
    async function renderFeaturedSlider() {
        const featuredModels = await fetchModels('', 1, '-likeCount');
        elements.featuredSlider.innerHTML = '';
        featuredModels.slice(0, 5).forEach(model => {
            const card = document.createElement('div');
            card.className = 'featured-card';
            card.dataset.uid = model.uid;
            card.innerHTML = `
                <img src="${model.thumbnails.images[0].url}" class="featured-img" alt="${model.name}">
                <div class="featured-overlay">
                    <h3 class="featured-title">${model.name}</h3>
                    <div class="featured-artist">
                        <img src="${model.user.avatar.images[0].url}" class="artist-avatar" alt="${model.user.username}">
                        <span>by ${model.user.username}</span>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => openModelViewer(model.uid));
            elements.featuredSlider.appendChild(card);
        });
    }
    
    // Update Pagination
    function updatePagination() {
        if (!elements.pagination) {
            console.error('Pagination element not found in DOM');
            return;
        }
        
        elements.pagination.innerHTML = '';
        const maxVisiblePages = 5;
        const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
        if (totalPages <= 1) {
            elements.pagination.style.display = 'none';
            return;
        } else {
            elements.pagination.style.display = 'flex';
        }
    
        if (startPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn';
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Prev';
            prevBtn.addEventListener('click', () => {
                currentPage--;
                loadModels();
            });
            elements.pagination.appendChild(prevBtn);
        }
    
        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => {
                currentPage = i;
                loadModels();
            });
            elements.pagination.appendChild(btn);
        }
    
        if (endPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn';
            nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
            nextBtn.addEventListener('click', () => {
                currentPage++;
                loadModels();
            });
            elements.pagination.appendChild(nextBtn);
        }
    }
    
    // Open Model Viewer
    async function openModelViewer(uid) {
        const model = await fetchModelByUid(uid);
        if (!model) return;
    
        elements.modelViewer.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    
        elements.modelTitle.textContent = model.name;
        elements.modelFormat.textContent = 'GLTF';
        elements.modelPolygons.textContent = model.faceCount.toLocaleString();
        elements.modelTextures.textContent = '4K PBR';
        elements.modelRigged.textContent = model.tags.some(t => t.name.toLowerCase().includes('rigged')) ? 'Yes' : 'No';
        elements.modelAnimation.textContent = model.animationCount > 0 ? `Yes (${model.animationCount} animations)` : 'No';
        elements.modelLicense.textContent = model.isDownloadable ? 'Standard' : 'Restricted';
        elements.modelDescription.textContent = model.description || 'No description available.';
        elements.artistName.textContent = model.user.username;
        elements.modelPrice.textContent = model.price ? `$${model.price}` : 'Free';
        elements.modelPrice.className = `price-display ${!model.price || model.isDownloadable ? 'free' : ''}`;
    
        elements.modelTags.innerHTML = '';
        model.tags.slice(0, 5).forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'model-tag';
            tagElement.textContent = tag.name;
            elements.modelTags.appendChild(tagElement);
        });
    
        const isWishlisted = wishlist.includes(uid);
        elements.wishlistBtn.innerHTML = `<i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>`;
        elements.wishlistBtn.classList.toggle('active', isWishlisted);
        elements.wishlistBtn.dataset.uid = uid;
        elements.addToCartBtn.textContent = cart.includes(uid) ? 'In Cart' : 'Add to Cart';
        elements.addToCartBtn.dataset.uid = uid;
    
        const existingDownloadBtn = elements.modelViewer.querySelector('.btn-accent.btn-block');
        if (existingDownloadBtn) existingDownloadBtn.remove();
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-accent btn-block';
        downloadBtn.textContent = 'Download';
        downloadBtn.addEventListener('click', () => downloadModel(uid));
        elements.addToCartBtn.insertAdjacentElement('afterend', downloadBtn);
    
        elements.sketchfabViewer.src = `https://sketchfab.com/models/${uid}/embed?autostart=1&ui_controls=0`;
    }
    
    // Download Model
    async function downloadModel(uid) {
        try {
            const response = await fetch(`${API_URL}/models/${uid}/download`, {
                headers: { 'Authorization': `Token ${API_TOKEN}` }
            });
            const data = await response.json();
            if (data.gltf?.url) {
                window.open(data.gltf.url, '_blank');
            } else {
                alert('Download not available for this model');
            }
        } catch (error) {
            alert('Error initiating download. Authentication may be required.');
        }
    }
    
    // Toggle Wishlist
    async function toggleWishlist(uid) {
        if (wishlist.includes(uid)) {
            wishlist = wishlist.filter(id => id !== uid);
        } else {
            wishlist.push(uid);
        }
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        renderModels(await fetchModels(currentQuery, currentPage, getSortParam(), currentCategory));
        updatePagination(); // Ensure pagination updates after wishlist change
        if (elements.modelViewer.style.display === 'flex') {
            const isWishlisted = wishlist.includes(uid);
            elements.wishlistBtn.innerHTML = `<i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>`;
            elements.wishlistBtn.classList.toggle('active', isWishlisted);
        }
    }
    
    // Toggle Cart
    function toggleCart(uid) {
        if (cart.includes(uid)) {
            cart = cart.filter(id => id !== uid);
        } else {
            cart.push(uid);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        elements.addToCartBtn.textContent = cart.includes(uid) ? 'In Cart' : 'Add to Cart';
    }
    
    // Get Sort Parameter
    function getSortParam() {
        switch (currentSort) {
            case 'popular': return '-likeCount';
            case 'recent': return '-publishedAt';
            case 'price-low': return 'price';
            case 'price-high': return '-price';
            case 'rating': return '-likeCount';
            default: return '-publishedAt';
        }
    }
    
    // Load Models with Filters
    async function loadModels() {
        const sortParam = getSortParam();
        const models = await fetchModels(currentQuery, currentPage, sortParam, currentCategory);
    
        // Client-side filtering
        let filteredModels = models;
        if (currentPriceFilter === 'free') {
            filteredModels = filteredModels.filter(m => !m.price || m.isDownloadable);
        } else if (currentPriceFilter === 'premium') {
            filteredModels = filteredModels.filter(m => m.price && !m.isDownloadable);
        }
    
        if (currentFormat !== 'all') {
            filteredModels = filteredModels.filter(m => m.tags.some(t => t.name.toLowerCase().includes(currentFormat)));
        }
    
        renderModels(filteredModels);
        updatePagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Event Listeners
    elements.searchInput.addEventListener('input', () => {
        clearTimeout(elements.searchInput.timeout);
        elements.searchInput.timeout = setTimeout(() => {
            currentQuery = elements.searchInput.value;
            currentPage = 1;
            loadModels();
        }, 500);
    });
    
    elements.sortSelect.addEventListener('change', () => {
        currentSort = elements.sortSelect.value;
        currentPage = 1;
        loadModels();
    });
    
    elements.formatSelect.addEventListener('change', () => {
        currentFormat = elements.formatSelect.value;
        currentPage = 1;
        loadModels();
    });
    
    elements.priceTags.forEach(tag => {
        tag.addEventListener('click', () => {
            elements.priceTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentPriceFilter = tag.textContent.toLowerCase();
            currentPage = 1;
            loadModels();
        });
    });
    
    elements.categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            currentCategory = card.querySelector('.category-name').textContent.toLowerCase();
            currentPage = 1;
            loadModels();
        });
    });
    
    elements.closeViewer.addEventListener('click', () => {
        elements.modelViewer.style.display = 'none';
        elements.sketchfabViewer.src = '';
        document.body.style.overflow = 'auto';
    });
    
    elements.sliderPrev.addEventListener('click', () => {
        elements.featuredSlider.scrollBy({ left: -370, behavior: 'smooth' });
    });
    
    elements.sliderNext.addEventListener('click', () => {
        elements.featuredSlider.scrollBy({ left: 370, behavior: 'smooth' });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === elements.modelViewer) {
            elements.modelViewer.style.display = 'none';
            elements.sketchfabViewer.src = '';
            document.body.style.overflow = 'auto';
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modelViewer.style.display === 'flex') {
            elements.modelViewer.style.display = 'none';
            elements.sketchfabViewer.src = '';
            document.body.style.overflow = 'auto';
        }
    });
    
    elements.wishlistBtn.addEventListener('click', () => {
        toggleWishlist(elements.wishlistBtn.dataset.uid);
    });
    
    elements.addToCartBtn.addEventListener('click', () => {
        toggleCart(elements.addToCartBtn.dataset.uid);
    });
    
    // Initialize Page
    document.addEventListener('DOMContentLoaded', async () => {
        await renderFeaturedSlider();
        await loadModels();
        elements.priceTags[0].classList.add('active'); // Default to "All"
    });
