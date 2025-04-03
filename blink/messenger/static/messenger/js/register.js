document.addEventListener('DOMContentLoaded', function() {
    const registerButton = document.getElementById('register-button');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    registerButton.addEventListener('click', async function() {
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const password2 = document.getElementById('password2').value.trim();

        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        if (!username || !email || !password || !password2) {
            showError('Пожалуйста, заполните все поля');
            return;
        }

        if (password !== password2) {
            showError('Пароли не совпадают');
            return;
        }

        try {
            const response = await fetch('/api/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    password2: password2
                })
            });

            const data = await response.json();

            if (!response.ok) {
                handleRegistrationErrors(data);
                return;
            }

            showSuccess('Регистрация прошла успешно!');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);

        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            showError('Ошибка соединения с сервером');
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
    }

    function handleRegistrationErrors(errors) {
        if (errors.non_field_errors) {
            showError(errors.non_field_errors[0]);
        } else {
            let errorText = '';
            if (errors.username) errorText += errors.username[0] + '\n';
            if (errors.email) errorText += errors.email[0] + '\n';
            if (errors.password) errorText += errors.password[0] + '\n';
            showError(errorText.trim());
        }
    }
});