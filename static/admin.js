document.addEventListener('DOMContentLoaded', function() {
    const testBtn = document.getElementById('testCredentialsBtn');
    const testLoadingIndicator = document.getElementById('testLoadingIndicator');
    const testErrorMessage = document.getElementById('testErrorMessage');
    const testSuccessMessage = document.getElementById('testSuccessMessage');

    testBtn.addEventListener('click', async function() {
        hideMessages();
        showLoading(true);

        try {
            const response = await fetch('/api/test-credentials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            showLoading(false);

            if (data.success) {
                showSuccess(data.message || 'Credentials are valid and connection successful!');
            } else {
                showError(data.error || 'Failed to validate credentials');
            }
        } catch (error) {
            showLoading(false);
            showError('Network error: Unable to connect to the server');
        }
    });

    function showLoading(show) {
        testLoadingIndicator.style.display = show ? 'block' : 'none';
        testBtn.disabled = show;
    }

    function showError(message) {
        testErrorMessage.textContent = message;
        testErrorMessage.style.display = 'block';
    }

    function showSuccess(message) {
        testSuccessMessage.textContent = message;
        testSuccessMessage.style.display = 'block';
    }

    function hideMessages() {
        testErrorMessage.style.display = 'none';
        testSuccessMessage.style.display = 'none';
    }
});
