const api_endpoint = "http://127.0.0.1:8000/api/token/";
        
        document.addEventListener('DOMContentLoaded', function() {
            const loginButton = document.getElementById('login-button');
            const errorMessage = document.getElementById('error-message');
            const successMessage = document.getElementById('success-message');
            
            loginButton.addEventListener('click', async function() {
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value.trim();
                
                // Сброс сообщений
                errorMessage.style.display = 'none';
                successMessage.style.display = 'none';
                
                // Проверка ввода
                if (!username || !password) {
                    errorMessage.textContent = 'Пожалуйста, заполните все поля';
                    errorMessage.style.display = 'block';
                    return;
                }
                
                try {
                    // Отправка запроса на сервер
                    const response = await fetch(api_endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            username: username,
                            password: password
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                        // Обработка ошибки
                        if (data.detail === "No active account found with the given credentials") {
                            errorMessage.textContent = 'Неверное имя пользователя или пароль';
                        } else {
                            errorMessage.textContent = 'Ошибка входа: ' + (data.detail || 'Попробуйте позже');
                        }
                        errorMessage.style.display = 'block';
                        return;
                    }
                    
                    // Успешный вход
                    if (data.refresh && data.access) {
                        // Сохранение токенов в localStorage
                        localStorage.setItem('refreshToken', data.refresh);
                        localStorage.setItem('accessToken', data.access);
                        
                        // Показ сообщения об успехе
                        successMessage.textContent = 'Вход выполнен успешно!';
                        successMessage.style.display = 'block';
                        
                        // Перенаправление на главную страницу через 1 секунду
                        setTimeout(function() {
                            // Замените на реальный URL вашей главной страницы
                            window.location.href = '/dashboard'; 
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Ошибка при выполнении запроса:', error);
                    errorMessage.textContent = 'Ошибка соединения с сервером';
                    errorMessage.style.display = 'block';
                }
            });
        });