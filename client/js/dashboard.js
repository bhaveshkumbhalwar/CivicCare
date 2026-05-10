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

  // Hide "My Reports" tab and "File a Complaint" button for admin users
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role?.startsWith('admin_');
  if (isAdmin) {
    const viewToggle = document.getElementById('viewToggleContainer');
    if (viewToggle) viewToggle.style.display = 'none';
    const heroCreate = document.getElementById('heroCreateContainer');
    if (heroCreate) heroCreate.style.display = 'none';
  }
  
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

async function sendReminder(id) {
  try {
    const res = await api.patch(`/complaints/${id}/remind`);
    showToast(res.message, 'success');
    fetchComplaints(); // Refresh to update button state
  } catch (err) {
    showToast(err.response?.data?.message || 'Failed to send reminder', 'error');
  }
}

function renderDashboardUI(append = false) {
  updateDashboardStats();
  renderComplaints(append);
}

async function updateDashboardStats() {
  try {
    const res = await api.get('/complaints/stats');
    const stats = res.stats || {};
    const total = stats.total || 0;
    const resolved = stats.Resolved || 0;
    
    // Animate Hero Counters
    animateValue("totalCountHero", 0, total, 1200);
    animateValue("resolvedCountHero", 0, resolved, 1500);

    const statsPanel = document.getElementById('statsPanel');
    if (statsPanel) {
      statsPanel.innerHTML = `
        <div class="stat-card">
          <div class="stat-info"><h3>Total Issues</h3><div class="value">${stats.total}</div></div>
          <div class="stat-icon icon-blue"><i class="ph ph-map-pin"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info"><h3>Pending</h3><div class="value">${stats.Pending || 0}</div></div>
          <div class="stat-icon icon-amber"><i class="ph ph-clock"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info"><h3>In Progress</h3><div class="value">${stats['In Progress'] || 0}</div></div>
          <div class="stat-icon icon-indigo"><i class="ph ph-spinner"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info"><h3>Resolved</h3><div class="value">${stats.Resolved || 0}</div></div>
          <div class="stat-icon icon-emerald"><i class="ph ph-check-circle"></i></div>
        </div>
      `;
    }
  } catch (e) {}
}

function renderCategories() {
  let categories = [
    { name: 'Colleges', icon: 'ph-student', color: '#3b82f6' },
    { name: 'Schools', icon: 'ph-backpack', color: '#10b981' },
    { name: 'Societies', icon: 'ph-buildings', color: '#f59e0b' },
    { name: 'Local Vendors', icon: 'ph-storefront', color: '#ef4444' },
    { name: 'Shopkeepers', icon: 'ph-shopping-bag', color: '#8b5cf6' },
    { name: 'Government Services', icon: 'ph-bank', color: '#6366f1' },
    { name: 'Municipal Corporation', icon: 'ph-truck', color: '#f43f5e' }
  ];

  // RBAC: Filter categories for department admins
  if (currentUser?.role && currentUser.role.startsWith('admin_')) {
    const roleMap = {
      admin_colleges: ['Colleges'],
      admin_schools: ['Schools'],
      admin_societies: ['Societies'],
      admin_vendors: ['Local Vendors', 'Shopkeepers'],
      admin_government: ['Government Services'],
      admin_municipality: ['Municipal Corporation']
    };
    const allowed = roleMap[currentUser.role] || [];
    categories = categories.filter(cat => allowed.includes(cat.name));
  }

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
          <span class="badge" style="background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color);">${c.category}</span>
          <span class="badge priority-${c.priority.toLowerCase()}">${c.priority}</span>
        </div>
        <h3 class="card-title">${c.title}</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; height: 3.2em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${c.description}</p>
        
        ${(currentUser?.role === 'super_admin') ? `
          <div style="margin: 12px 0; padding: 10px; background: var(--bg-body); border-radius: 10px; font-size: 0.8rem; color: var(--text-secondary); border: 1.5px dashed var(--border-color); display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="display: flex; align-items: center; gap: 6px;"><i class="ph-bold ph-calendar-blank"></i> Filed: <b>${new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</b></span>
              <span style="display: flex; align-items: center; gap: 6px; color: ${c.status === 'Pending' ? '#f43f5e' : '#10b981'};">
                <i class="ph-bold ph-hourglass-high"></i> 
                <b>${c.status === 'Pending' ? 'Awaiting Action' : (() => {
                  const hours = Math.max(1, Math.round((new Date(c.updatedAt) - new Date(c.createdAt)) / 3600000));
                  return hours > 24 ? `${Math.floor(hours/24)}d response` : `${hours}h response`;
                })()}</b>
              </span>
            </div>
          </div>
        ` : ''}

        ${(currentUser?.role?.startsWith('admin_') && c.lastRemindedAt) ? `
          <div style="margin-bottom: 12px; padding: 8px 12px; background: #fff1f2; color: #e11d48; border-radius: 8px; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 8px; border: 1px solid #fecdd3;">
            <i class="ph-fill ph-warning-circle"></i> URGENT: REMINDER FROM SUPER ADMIN
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <button onclick="handleUpvote('${c._id}')" class="btn" style="background: var(--bg-input); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; color: var(--text-main);">
            <i class="ph ph-thumbs-up"></i> ${c.upvotes?.length || 0}
          </button>
          <div style="display: flex; gap: 8px;">
            ${(currentUser?.role === 'super_admin') ? `<button onclick="openDetails('${c._id}')" class="btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bg-muted); color: var(--text-main); border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer;">Details</button>` : ''}
            ${(currentUser?.role === 'super_admin') ? `
              <button onclick="sendReminder('${c._id}')" class="btn" 
                ${(c.status !== 'Pending' || (new Date() - new Date(c.createdAt) < 2 * 24 * 60 * 60 * 1000)) ? 'disabled' : ''}
                style="padding: 6px 12px; font-size: 0.8rem; background: ${(c.status !== 'Pending' || (new Date() - new Date(c.createdAt) < 2 * 24 * 60 * 60 * 1000)) ? 'var(--bg-body)' : '#f43f5e'}; color: ${(c.status !== 'Pending' || (new Date() - new Date(c.createdAt) < 2 * 24 * 60 * 60 * 1000)) ? 'var(--text-secondary)' : 'white'}; border-radius: 6px; border: ${(c.status !== 'Pending' || (new Date() - new Date(c.createdAt) < 2 * 24 * 60 * 60 * 1000)) ? '1px solid var(--border-color)' : 'none'}; cursor: ${(c.status !== 'Pending' || (new Date() - new Date(c.createdAt) < 2 * 24 * 60 * 60 * 1000)) ? 'not-allowed' : 'pointer'}; display: flex; align-items: center; gap: 4px;">
                <i class="ph ph-bell${(c.status !== 'Pending' || (new Date() - new Date(c.createdAt) < 2 * 24 * 60 * 60 * 1000)) ? '-slash' : ''}"></i> 
                ${c.status !== 'Pending' ? 'Action Taken' : (new Date() - new Date(c.createdAt) < 2 * 24 * 60 * 60 * 1000 ? 'Wait 2d' : 'Remind')}
              </button>` : ''}
            ${(currentUser?.role?.startsWith('admin_')) ? `<button onclick="openAdminUpdateModal('${c._id}')" class="btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--text-main); color: white; border-radius: 6px; border: none; cursor: pointer;">Action</button>` : ''}
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
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
      <h2 style="font-size: 1.5rem; margin: 0; color: var(--text-main);">${c.title}</h2>
      <span class="badge" style="background: ${c.status === 'Resolved' ? '#10b98120' : '#f59e0b20'}; color: ${c.status === 'Resolved' ? '#10b981' : '#f59e0b'}; border: 1px solid currentColor; display: flex; align-items: center; gap: 6px; padding: 6px 12px;">
        <i class="ph-bold ${c.status === 'Resolved' ? 'ph-check-circle' : 'ph-clock'}"></i>
        ${c.status === 'Resolved' ? 'Completed' : 'In Progress'}
      </span>
    </div>
    ${c.image ? `<img src="${c.image}" style="width: 100%; border-radius: 12px; margin-bottom: 1rem; border: 1px solid var(--border-color);">` : ''}
    <p style="margin-bottom: 1.5rem; line-height: 1.6; color: var(--text-secondary);">${c.description}</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: var(--bg-body); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-color); color: var(--text-main);">
      <div><strong style="color: var(--text-secondary); font-size: 0.8rem; display: block; margin-bottom: 4px;">Location</strong> ${c.location}</div>
      <div><strong style="color: var(--text-secondary); font-size: 0.8rem; display: block; margin-bottom: 4px;">Category</strong> ${c.category}</div>
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
  
  if (start === end) {
    obj.textContent = end;
    return;
  }

  let current = start;
  const increment = end > start ? 1 : -1;
  const range = Math.abs(end - start);
  const stepTime = Math.max(Math.floor(duration / range), 10);
  
  const timer = setInterval(function() {
    current += increment;
    obj.textContent = current;
    if (current == end) clearInterval(timer);
  }, stepTime);
}

function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function openCreateModal() {
  if (!auth.isAuthenticated()) {
    window.location.href = '/login.html';
    return;
  }
  document.getElementById('createModal').classList.add('show');
}

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
window.sendReminder = sendReminder;
