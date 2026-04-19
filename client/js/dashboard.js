// dashboard.js - Smart Civic Portal Logic (Restored)
let complaintsList = [];
let currentUser = null;
let currentView = 'all'; 
let currentPage = 1;
let currentLimit = 6;
let totalComplaints = 0;
let activeCategory = null;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  auth.checkProtectedRoute();
  auth.setupNavbar();
  currentUser = auth.getUser();
  
  await fetchComplaints();
  renderCategories();
  
  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      fetchComplaints();
    }, 500);
  });

  document.getElementById('statusFilter')?.addEventListener('change', () => {
    currentPage = 1;
    fetchComplaints();
  });

  document.getElementById('sortBy')?.addEventListener('change', () => {
    currentPage = 1;
    fetchComplaints();
  });

  document.getElementById('createForm')?.addEventListener('submit', handleCreateSubmit);
  document.getElementById('statusUpdateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('updateTargetId').value;
    const status = document.getElementById('updateStatusSelect').value;
    const adminNote = document.getElementById('updateAdminNote').value;
    await handleStatusUpdate(id, status, adminNote);
  });
});

async function fetchComplaints(append = false) {
  const container = document.getElementById('complaintsContainer');
  if (!append) {
    container.innerHTML = Array(4).fill(0).map((_, i) => `
      <div class="complaint-card glass shimmer animate-fade-up" style="animation-delay: ${i * 0.1}s; height: 220px; border-radius: 20px; padding: 24px;">
        <div style="display: flex; gap: 8px; margin-bottom: 20px;">
          <div style="width: 100px; height: 24px; background: rgba(0,0,0,0.05); border-radius: 8px;"></div>
          <div style="width: 80px; height: 24px; background: rgba(0,0,0,0.05); border-radius: 8px;"></div>
        </div>
        <div style="width: 80%; height: 28px; background: rgba(0,0,0,0.05); border-radius: 8px; margin-bottom: 12px;"></div>
        <div style="width: 100%; height: 16px; background: rgba(0,0,0,0.05); border-radius: 6px;"></div>
      </div>
    `).join('');
  }
  
  try {
    const search = document.getElementById('searchInput')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const sortBy = document.getElementById('sortBy')?.value || 'recent';
    const sortParams = sortBy === 'upvotes' ? '-upvotesCount' : '-createdAt';

    let endpoint = currentView === 'my' 
      ? `/complaints/my` 
      : `/complaints?page=${currentPage}&limit=${currentLimit}&sort=${sortParams}&search=${encodeURIComponent(search)}&status=${status}`;

    if (activeCategory && currentView !== 'my') {
      endpoint += `&category=${encodeURIComponent(activeCategory)}`;
    }

    const res = await api.get(endpoint);
    const newComplaints = res.complaints || [];
    
    if (append) {
      complaintsList = [...complaintsList, ...newComplaints];
    } else {
      complaintsList = newComplaints;
    }

    totalComplaints = res.pagination?.total || complaintsList.length;
    renderDashboardUI(append);
    updatePaginationUI(res.pagination);
  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1/-1;">Error: ${err.message}</div>`;
  }
}

function renderDashboardUI(append = false) {
  updateDashboardStats();
  renderComplaints(append);
}

async function updateDashboardStats() {
  try {
    const res = await api.get('/complaints/stats');
    const stats = res.stats || { total: 0, Resolved: 0, Pending: 0 };
    
    // Animate Hero Counters
    animateValue("totalCountHero", 0, stats.total, 1200);
    animateValue("resolvedCountHero", 0, stats.Resolved, 1500);

    const statsPanel = document.getElementById('statsPanel');
    if (statsPanel) {
      statsPanel.innerHTML = `
        <div class="stat-card">
          <div class="stat-info"><h3>Total Issues</h3><div class="value">${stats.total}</div></div>
          <div class="stat-icon" style="background: #eff6ff; color: #3b82f6;"><i class="ph ph-map-pin"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info"><h3>Pending</h3><div class="value">${stats.Pending || 0}</div></div>
          <div class="stat-icon" style="background: #fffbeb; color: #d97706;"><i class="ph ph-clock"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info"><h3>Resolved</h3><div class="value">${stats.Resolved || 0}</div></div>
          <div class="stat-icon" style="background: #ecfdf5; color: #059669;"><i class="ph ph-check-circle"></i></div>
        </div>
      `;
    }
  } catch (e) {}
}

function renderCategories() {
  const categories = [
    { name: 'Colleges', icon: 'ph-student', color: '#3b82f6' },
    { name: 'Schools', icon: 'ph-backpack', color: '#10b981' },
    { name: 'Societies', icon: 'ph-buildings', color: '#f59e0b' },
    { name: 'Local Vendors', icon: 'ph-storefront', color: '#ef4444' },
    { name: 'Shopkeepers', icon: 'ph-shopping-bag', color: '#8b5cf6' },
    { name: 'Government Services', icon: 'ph-bank', color: '#6366f1' }
  ];
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  grid.innerHTML = categories.map(cat => `
    <div class="category-card ${activeCategory === cat.name ? 'active-cat' : ''}" onclick="toggleCategoryFilter('${cat.name}')">
      <div class="cat-icon-container" style="background: ${cat.color}20; color: ${cat.color}"><i class="ph ${cat.icon}"></i></div>
      <div class="cat-name">${cat.name}</div>
    </div>
  `).join('');
}

function toggleCategoryFilter(catName) {
  activeCategory = activeCategory === catName ? null : catName;
  currentPage = 1;
  renderCategories();
  fetchComplaints();
}

function renderComplaints() {
  const container = document.getElementById('complaintsContainer');
  if (!container) return;
  document.getElementById('complaintCountLabel').textContent = totalComplaints;
  
  if (complaintsList.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem;">No reports found.</div>';
    return;
  }
  container.innerHTML = complaintsList.map((c, i) => `
    <article class="complaint-card animate-fade-up" style="animation-delay: ${(i%6)*0.1}s">
      <div class="card-body">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span class="badge" style="background: #f1f5f9; color: var(--text-secondary);">${c.category}</span>
          <span class="badge priority-${c.priority.toLowerCase()}">${c.priority}</span>
        </div>
        <h3 class="card-title">${c.title}</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; height: 3.2em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${c.description}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; border-top: 1px solid #f1f5f9; padding-top: 1rem;">
          <button onclick="handleUpvote('${c._id}')" class="btn" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; cursor: pointer;">
            <i class="ph ph-thumbs-up"></i> ${c.upvotes?.length || 0}
          </button>
          <div style="display: flex; gap: 8px;">
            <button onclick="openDetails('${c._id}')" class="btn" style="padding: 6px 12px; font-size: 0.8rem; background: #e2e8f0; border-radius: 6px; border: none; cursor: pointer;">Details</button>
            ${(currentUser?.role?.startsWith('admin_') || currentUser?.role === 'super_admin') ? `<button onclick="openAdminUpdateModal('${c._id}')" class="btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--text-main); color: white; border-radius: 6px; border: none; cursor: pointer;">Action</button>` : ''}
          </div>
        </div>
      </div>
    </article>
  `).join('');
}

function openDetails(id) {
  const c = complaintsList.find(x => x._id === id);
  if (!c) return;
  const body = document.getElementById('modalBody');
  const footer = document.getElementById('modalFooter');
  document.getElementById('detailsId').textContent = `#${id.slice(-6).toUpperCase()}`;
  body.innerHTML = `
    <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">${c.title}</h2>
    ${c.image ? `<img src="${c.image}" style="width: 100%; border-radius: 12px; margin-bottom: 1rem;">` : ''}
    <p style="margin-bottom: 1rem; line-height: 1.6;">${c.description}</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: #f8fafc; padding: 1rem; border-radius: 12px;">
      <div><strong>Location:</strong> ${c.location}</div>
      <div><strong>Category:</strong> ${c.category}</div>
      <div><strong>Status:</strong> ${c.status}</div>
      <div><strong>Priority:</strong> ${c.priority}</div>
    </div>
  `;
  footer.innerHTML = `
    <button onclick="handleUpvote('${c._id}')" class="btn btn-primary" style="padding: 8px 20px;">Support Issue</button>
  `;
  document.getElementById('detailsModal').classList.add('show');
}

function openAdminUpdateModal(id) {
  document.getElementById('updateTargetId').value = id;
  const c = complaintsList.find(x => x._id === id);
  document.getElementById('updateStatusSelect').value = c.status;
  document.getElementById('updateAdminNote').value = c.adminNote || '';
  document.getElementById('adminUpdateModal').classList.add('show');
}

async function handleStatusUpdate(id, status, adminNote) {
  try {
    const res = await api.patch(`/admin/complaints/${id}/status`, { status, adminNote });
    if (res.success) {
      closeModal('adminUpdateModal');
      fetchComplaints();
      showToast('Status updated!');
    }
  } catch (e) { showToast(e.message, 'error'); }
}

async function handleUpvote(id) {
  try {
    const res = await api.patch(`/complaints/${id}/upvote`);
    if (res.success) fetchComplaints();
  } catch (e) {}
}

async function handleCreateSubmit(e) {
  e.preventDefault();
  const data = {
    title: document.getElementById('cTitle').value,
    description: document.getElementById('cDescription').value,
    category: document.getElementById('cCategory').value,
    location: document.getElementById('cLocation').value,
    priority: document.getElementById('cPriority').value,
    image: document.getElementById('cImage').value
  };
  try {
    await api.post('/complaints', data);
    closeModal('createModal');
    fetchComplaints();
    showToast('Success!');
  } catch (e) { showToast(e.message, 'error'); }
}

function selectPriority(level) {
  document.getElementById('cPriority').value = level;
  document.querySelectorAll('.priority-option').forEach(opt => opt.classList.toggle('selected', opt.textContent === level));
}

function setView(view) {
  currentView = view;
  currentPage = 1;
  document.getElementById('viewAllBtn').classList.toggle('active', view === 'all');
  document.getElementById('viewMyBtn').classList.toggle('active', view === 'my');
  fetchComplaints();
}

function updatePaginationUI(p) {
  const container = document.getElementById('paginationContainer');
  container.style.display = (p && p.page < p.totalPages) ? 'flex' : 'none';
}

async function loadMore() {
  currentPage++;
  await fetchComplaints(true);
}

function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  if (!obj) return;
  const range = end - start;
  let current = start;
  const increment = end > start ? 1 : -1;
  const stepTime = Math.abs(Math.floor(duration / Math.max(range, 1))) || 50;
  const timer = setInterval(function() {
    current += increment;
    obj.textContent = current;
    if (current == end) clearInterval(timer);
  }, stepTime);
}

function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} show`;
  toast.innerHTML = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}

window.openDetails = openDetails;
window.openAdminUpdateModal = openAdminUpdateModal;
window.handleStatusUpdate = handleStatusUpdate;
window.handleUpvote = handleUpvote;
window.closeModal = closeModal;
window.openCreateModal = openCreateModal;
window.selectPriority = selectPriority;
window.setView = setView;
window.loadMore = loadMore;
window.toggleCategoryFilter = toggleCategoryFilter;
window.fetchComplaints = fetchComplaints;
