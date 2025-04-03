from django.urls import path, include
# импортируем вьюху 
from . import views


urlpatterns = [
    path('login/', views.login_page, name="login"),
    path('register/', views.register_page, name="register"),
    path('chat/', views.chat_page, name="chat")
]


