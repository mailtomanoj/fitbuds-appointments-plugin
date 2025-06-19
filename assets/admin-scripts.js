document.addEventListener('DOMContentLoaded', () => {
    // Validate form inputs on submit
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            const apiKey = document.getElementById('fitbuds_api_key').value.trim();
            if (!apiKey) {
                e.preventDefault();
                alert('API Key is required.');
            }
        });
    }

    // Live preview for primary color
    const colorInput = document.getElementById('fitbuds_primary_color');
    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            document.documentElement.style.setProperty('--primary-color', e.target.value);
        });
    }
});