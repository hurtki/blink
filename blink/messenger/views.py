# 3 библиотеки в проекте django, django-rest-framwork, djangorestframework_simplejwt
from django.shortcuts import render
from rest_framework.views import APIView
#from rest_framework.permissions import IsAuthenticated

# страница входа
def login_page(request):
    return render(request, 'messenger/html/login.html')
# страница регистрации 
def register_page(request):
    return render(request, 'messenger/html/register.html')
# страница чата 
def chat_page(request):
    return render(request, 'messenger/html/chat.html') 


class RegisterAPI(APIView):
    def post(self, request):
        pass