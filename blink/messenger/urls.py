from django.urls import path, include
# импортируем вьюху 
from . import views


urlpatterns = [
    path('login/', views.login_page),
    path('register/', views.register_page),
    path('login/', views.chat_page),
]


