# 3 библиотеки в проекте django, django-rest-framwork, djangorestframework_simplejwt
from django.shortcuts import render
from rest_framework import generics
# импортируем сприализатор для обработки регистрайционных данных
from .serializers import RegisterSerializer
# импортируем модель пользователя 
from django.contrib.auth.models import User

# страница входа
def login_page(request):
    return render(request, 'messenger/html/login.html')
# страница регистрации 
def register_page(request):
    return render(request, 'messenger/html/register.html')
# страница чата 
def chat_page(request):
    return render(request, 'messenger/html/chat.html')

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

