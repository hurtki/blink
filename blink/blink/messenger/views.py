from django.shortcuts import render

# страница входа
def login_page(request):
    return render(request, 'messenger/html/login.html')
# страница регистрации 
def register_page(request):
    return render(request, 'messenger/html/register.html')
# страница чата 
def chat_page(request):
    return render(request, 'messenger/html/chat.html')
