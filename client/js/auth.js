// auth.js - Authentication handler

const auth = {
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  login: async (email, password, requiredRole = null) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.token) {
      // Role validation for specific portals
      if (requiredRole) {
        const role = res.user.role;
        const isAdmin = role === 'super_admin' || role.startsWith('admin_');
        
        if (requiredRole === 'admin' && !isAdmin) {
          throw new Error('Access Denied: This account is not an administrator.');
        } else if (requiredRole === 'user' && role !== 'user') {
          throw new Error('Access Denied: Please use the Admin Portal for management access.');
        } else if (requiredRole !== 'admin' && requiredRole !== 'user' && role !== requiredRole) {
          throw new Error(`Access Denied: This account is not authorized for the ${requiredRole} portal.`);
        }
      }

      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify({
        _id: res.user._id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role
      }));
    }
    return res;
  },

  register: async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    if (res.success && res.token) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify({
        _id: res.user._id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role
      }));
    }
    return res;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  },

  checkProtectedRoute: () => {
    if (!auth.isAuthenticated()) {
      window.location.href = '/login.html';
    }
  },
  
  setupNavbar: () => {
    const user = auth.getUser();
    const navUser = document.getElementById('navUser');
    if (user && navUser) {
      const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
      
      // Enhance role label for admins
      let roleLabel = 'Community Member';
      if (user.role === 'super_admin') {
        roleLabel = 'System Administrator';
      } else if (user.role.startsWith('admin_')) {
        const dept = user.role.split('_')[1];
        roleLabel = `${dept.charAt(0).toUpperCase() + dept.slice(1)} Dept`;
      }

      navUser.innerHTML = `
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
            <span style="color: var(--text-main); font-size: 0.95rem; font-weight: 700;">${user.name}</span>
            <span style="color: var(--primary); font-size: 0.7rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">${roleLabel}</span>
          </div>
          <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #2563eb, #6366f1); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; border: 2px solid white; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);">
            ${initial}
          </div>
          <button onclick="auth.logout()" class="btn" style="padding: 8px 12px; font-size: 0.8rem; background: #f1f5f9; color: var(--text-main); border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: 600;">
            <i class="ph ph-sign-out"></i> Logout
          </button>
        </div>
      `;
    }
  }
};

window.auth = auth;
