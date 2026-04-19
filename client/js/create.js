// create.js - Handles the creation of new complaints

document.addEventListener('DOMContentLoaded', () => {
    auth.checkProtectedRoute();
    auth.setupNavbar();

    const createForm = document.getElementById('createForm');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('submitBtn');

    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const category = document.getElementById('category').value;
        const priority = document.getElementById('priority').value;
        const location = document.getElementById('location').value;
        const description = document.getElementById('description').value;
        const image = document.getElementById('image').value;

        errorAlert.classList.remove('show');
        
        // Loading state
        submitBtn.disabled = true;
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loader"></div>';

        try {
            const res = await api.post('/complaints', {
                title,
                category,
                priority,
                location,
                description,
                image
            });

            if (res.success) {
                window.location.href = '/';
            }
        } catch (err) {
            errorMessage.textContent = err.message || 'Failed to submit report. Please try again.';
            errorAlert.classList.add('show');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
        }
    });
});
